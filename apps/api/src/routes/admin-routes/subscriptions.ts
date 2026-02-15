import type { FastifyInstance } from 'fastify';
import { prisma } from '@stripe-integration/db';
import {
  createSubscriptionBodySchema,
  subscriptionBulkBodySchema,
  subscriptionListQuerySchema,
  subscriptionParamsSchema,
  subscriptionTransferEligibilityBodySchema,
  updateSubscriptionBodySchema
} from '../../schemas/subscription.js';
import {
  type SubscriptionCandidate,
  uniqueIds,
  validateSubscriptionCandidate
} from '../../services/subscription-rules.js';
import { applySubscriptionBulkAction } from './subscriptions.bulk.js';
import {
  buildSubscriptionsWhere,
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
          startDate: candidate.startDate,
          endDate: candidate.endDate,
          status: candidate.status,
          paymentMethodId: candidate.paymentMethodId
        }
      });

      if (candidate.scope === 'PROPERTY' && candidate.propertyIds.length > 0) {
        await tx.subscriptionProperty.createMany({
          data: candidate.propertyIds.map((propertyId) => ({
            subscriptionId: subscription.id,
            propertyId
          }))
        });
      }

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

    const nextAccountId = payload.accountId ?? existing.accountId;
    const hasAccountUpdate = payload.accountId !== undefined;
    const hasAccountChanged = hasAccountUpdate && payload.accountId !== existing.accountId;
    const nextScope = payload.scope ?? existing.scope;
    const hasPropertySelectionUpdate = payload.propertyIds !== undefined;
    const nextPropertyIds =
      nextScope === 'PROPERTY'
        ? hasPropertySelectionUpdate
          ? normalizePropertySelection({
              propertyIds: payload.propertyIds
            })
          : hasAccountChanged
            ? []
            : existingPropertyIds
        : [];
    const nextPaymentMethodId =
      payload.paymentMethodId !== undefined
        ? payload.paymentMethodId
        : hasAccountChanged
          ? null
          : existing.paymentMethodId;

    const candidate = createSubscriptionBodySchema.parse({
      accountId: nextAccountId,
      scope: nextScope,
      propertyIds: nextPropertyIds,
      startDate: payload.startDate ?? existing.startDate,
      endDate: payload.endDate !== undefined ? payload.endDate : existing.endDate,
      status: payload.status ?? existing.status,
      paymentMethodId: nextPaymentMethodId,
      pricingIds: payload.pricingIds ?? existing.subscriptionItems.map((item) => item.pricingId)
    });

    const normalizedCandidate: SubscriptionCandidate = {
      accountId: candidate.accountId,
      scope: candidate.scope,
      propertyIds:
        candidate.scope === 'PROPERTY'
          ? normalizePropertySelection({
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
          accountId: normalizedCandidate.accountId,
          scope: normalizedCandidate.scope,
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

  app.post('/api/admin/subscriptions/:id/transfer-eligibility', async (request, reply) => {
    const { id } = subscriptionParamsSchema.parse(request.params);
    const payload = subscriptionTransferEligibilityBodySchema.parse(request.body);

    const existing = await prisma.subscription.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existing) {
      reply.status(404).send({ message: 'Subscription not found' });
      return;
    }

    const accountIds = uniqueIds(payload.accountIds.filter((accountId) => accountId.trim() !== ''));
    const accounts = await prisma.account.findMany({
      where: {
        id: {
          in: accountIds
        }
      },
      select: {
        id: true,
        _count: {
          select: {
            properties: true
          }
        }
      }
    });
    const accountById = new Map(accounts.map((account) => [account.id, account]));
    const normalizedPropertyIds =
      payload.scope === 'PROPERTY'
        ? normalizePropertySelection({
            propertyIds: payload.propertyIds
          })
        : [];

    const items = await Promise.all(
      accountIds.map(async (accountId) => {
        const account = accountById.get(accountId);
        if (!account) {
          return {
            accountId,
            eligible: false,
            reason: 'Account not found'
          };
        }

        if (payload.scope === 'PROPERTY' && normalizedPropertyIds.length === 0) {
          if (account._count.properties === 0) {
            return {
              accountId,
              eligible: false,
              reason: 'Account has no properties for PROPERTY scope'
            };
          }

          return {
            accountId,
            eligible: true,
            reason: null
          };
        }

        const candidate: SubscriptionCandidate = {
          accountId,
          scope: payload.scope,
          propertyIds: normalizedPropertyIds,
          startDate: payload.startDate,
          endDate: payload.endDate ?? null,
          status: payload.status,
          paymentMethodId: null,
          pricingIds: payload.pricingIds,
          excludeSubscriptionId: id
        };
        const validationError = await validateSubscriptionCandidate(prisma, candidate);

        return {
          accountId,
          eligible: !validationError,
          reason: validationError
        };
      })
    );

    return {
      items
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
