import type { FastifyInstance } from 'fastify';
import { prisma } from '@stripe-integration/db';
import {
  createSubscriptionBodySchema,
  subscriptionBulkBodySchema,
  subscriptionListQuerySchema,
  subscriptionParamsSchema,
  updateSubscriptionBodySchema
} from '../../schemas/subscription.js';
import {
  type SubscriptionCandidate,
  validateSubscriptionCandidate
} from '../../services/subscription-rules.js';
import { applySubscriptionBulkAction } from './subscriptions.bulk.js';
import {
  buildSubscriptionsWhere,
  getLegacyPropertyIdForSubscription,
  normalizePropertySelection,
  subscriptionInclude,
  toSubscriptionResponse
} from './subscriptions.shared.js';

export async function registerAdminSubscriptionsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/admin/subscriptions', async (request) => {
    const query = subscriptionListQuerySchema.parse(request.query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const skip = (page - 1) * pageSize;

    const where = buildSubscriptionsWhere(query);

    const [items, total] = await prisma.$transaction([
      prisma.subscription.findMany({
        where,
        include: subscriptionInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.subscription.count({ where })
    ]);

    return {
      items: items.map(toSubscriptionResponse),
      page,
      pageSize,
      total
    };
  });

  app.post('/api/admin/subscriptions', async (request, reply) => {
    const payload = createSubscriptionBodySchema.parse(request.body);
    const propertyIds =
      payload.scope === 'PROPERTY'
        ? normalizePropertySelection({
            propertyId: payload.propertyId ?? null,
            propertyIds: payload.propertyIds
          })
        : [];

    const candidate: SubscriptionCandidate = {
      accountId: payload.accountId,
      scope: payload.scope,
      propertyIds,
      startDate: payload.startDate,
      endDate: payload.endDate ?? null,
      status: payload.status,
      paymentMethodId: payload.paymentMethodId ?? null,
      pricingIds: payload.pricingIds
    };

    const validationError = await validateSubscriptionCandidate(prisma, candidate);
    if (validationError) {
      reply.status(400).send({ message: validationError });
      return;
    }

    const created = await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.create({
        data: {
          accountId: candidate.accountId,
          scope: candidate.scope,
          propertyId: getLegacyPropertyIdForSubscription(candidate.scope, candidate.propertyIds),
          startDate: candidate.startDate,
          endDate: candidate.endDate,
          status: candidate.status,
          paymentMethodId: candidate.paymentMethodId,
          targetProperties:
            candidate.scope === 'PROPERTY' && candidate.propertyIds.length > 0
              ? {
                  create: candidate.propertyIds.map((propertyId) => ({ propertyId }))
                }
              : undefined
        }
      });

      await tx.subscriptionPricing.createMany({
        data: candidate.pricingIds.map((pricingId) => ({
          subscriptionId: subscription.id,
          pricingId,
          quantity: 1
        }))
      });

      return tx.subscription.findUniqueOrThrow({
        where: { id: subscription.id },
        include: subscriptionInclude
      });
    });

    reply.status(201).send({
      item: toSubscriptionResponse(created)
    });
  });

  app.patch('/api/admin/subscriptions/:id', async (request, reply) => {
    const { id } = subscriptionParamsSchema.parse(request.params);
    const payload = updateSubscriptionBodySchema.parse(request.body);

    const existing = await prisma.subscription.findUnique({
      where: { id },
      include: {
        targetProperties: {
          select: {
            propertyId: true
          },
          orderBy: {
            propertyId: 'asc'
          }
        },
        subscriptionItems: {
          select: {
            pricingId: true
          }
        }
      }
    });

    if (!existing) {
      reply.status(404).send({ message: 'Subscription not found' });
      return;
    }

    const existingPropertyIds = existing.targetProperties.map((target) => target.propertyId);
    if (
      existingPropertyIds.length === 0 &&
      existing.scope === 'PROPERTY' &&
      existing.propertyId
    ) {
      existingPropertyIds.push(existing.propertyId);
    }

    const nextScope = payload.scope ?? existing.scope;
    const hasPropertySelectionUpdate =
      payload.propertyId !== undefined || payload.propertyIds !== undefined;
    const nextPropertyIds =
      nextScope === 'PROPERTY'
        ? hasPropertySelectionUpdate
          ? normalizePropertySelection({
              propertyId: payload.propertyId ?? null,
              propertyIds: payload.propertyIds
            })
          : existingPropertyIds
        : [];

    const candidate = createSubscriptionBodySchema.parse({
      accountId: existing.accountId,
      scope: nextScope,
      propertyId: null,
      propertyIds: nextPropertyIds,
      startDate: payload.startDate ?? existing.startDate,
      endDate: payload.endDate !== undefined ? payload.endDate : existing.endDate,
      status: payload.status ?? existing.status,
      paymentMethodId:
        payload.paymentMethodId !== undefined ? payload.paymentMethodId : existing.paymentMethodId,
      pricingIds: payload.pricingIds ?? existing.subscriptionItems.map((item) => item.pricingId)
    });

    const normalizedCandidate: SubscriptionCandidate = {
      accountId: candidate.accountId,
      scope: candidate.scope,
      propertyIds:
        candidate.scope === 'PROPERTY'
          ? normalizePropertySelection({
              propertyId: candidate.propertyId ?? null,
              propertyIds: candidate.propertyIds
            })
          : [],
      startDate: candidate.startDate,
      endDate: candidate.endDate ?? null,
      status: candidate.status,
      paymentMethodId: candidate.paymentMethodId ?? null,
      pricingIds: candidate.pricingIds,
      excludeSubscriptionId: id
    };

    const validationError = await validateSubscriptionCandidate(prisma, normalizedCandidate);
    if (validationError) {
      reply.status(400).send({ message: validationError });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id },
        data: {
          scope: normalizedCandidate.scope,
          propertyId: getLegacyPropertyIdForSubscription(
            normalizedCandidate.scope,
            normalizedCandidate.propertyIds
          ),
          startDate: normalizedCandidate.startDate,
          endDate: normalizedCandidate.endDate,
          status: normalizedCandidate.status,
          paymentMethodId: normalizedCandidate.paymentMethodId
        }
      });

      await tx.subscriptionPricing.deleteMany({
        where: { subscriptionId: id }
      });

      await tx.subscriptionProperty.deleteMany({
        where: { subscriptionId: id }
      });

      await tx.subscriptionPricing.createMany({
        data: normalizedCandidate.pricingIds.map((pricingId) => ({
          subscriptionId: id,
          pricingId,
          quantity: 1
        }))
      });

      if (
        normalizedCandidate.scope === 'PROPERTY' &&
        normalizedCandidate.propertyIds.length > 0
      ) {
        await tx.subscriptionProperty.createMany({
          data: normalizedCandidate.propertyIds.map((propertyId) => ({
            subscriptionId: id,
            propertyId
          }))
        });
      }

      return tx.subscription.findUniqueOrThrow({
        where: { id },
        include: subscriptionInclude
      });
    });

    return {
      item: toSubscriptionResponse(updated)
    };
  });

  app.post('/api/admin/subscriptions/bulk', async (request, reply) => {
    const payload = subscriptionBulkBodySchema.parse(request.body);
    const result = await applySubscriptionBulkAction(payload, reply);

    if (!result) {
      return;
    }

    return result;
  });
}
