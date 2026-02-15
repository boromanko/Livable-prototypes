import type { FastifyInstance } from 'fastify';
import { prisma } from '@stripe-integration/db';
import type { Prisma } from '@stripe-integration/db';
import {
  createSubscriptionBodySchema,
  subscriptionBulkBodySchema,
  subscriptionListQuerySchema,
  subscriptionParamsSchema,
  updateSubscriptionBodySchema
} from '../../schemas/subscription.js';
import {
  loadPricingLookupByIds,
  type SubscriptionCandidate,
  uniqueIds,
  validatePricingSelection,
  validateSubscriptionCandidate
} from '../../services/subscription-rules.js';

const subscriptionInclude = {
  account: {
    select: {
      id: true,
      companyName: true,
      email: true
    }
  },
  property: {
    select: {
      id: true,
      address: true,
      billableUnits: true
    }
  },
  paymentMethod: {
    select: {
      id: true,
      type: true,
      label: true,
      last4: true,
      isDefault: true
    }
  },
  subscriptionItems: {
    orderBy: {
      createdAt: 'asc'
    },
    include: {
      pricing: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          tiers: {
            orderBy: {
              fromUnit: 'asc'
            }
          }
        }
      }
    }
  }
} as const;

type SubscriptionWithRelations = Prisma.SubscriptionGetPayload<{
  include: typeof subscriptionInclude;
}>;

function toSubscriptionResponse(subscription: SubscriptionWithRelations) {
  return {
    id: subscription.id,
    scope: subscription.scope,
    status: subscription.status,
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    createdAt: subscription.createdAt,
    account: subscription.account,
    property: subscription.property,
    paymentMethod: subscription.paymentMethod,
    pricings: subscription.subscriptionItems.map((item) => ({
      id: item.pricing.id,
      product: item.pricing.product,
      internalName: item.pricing.internalName,
      type: item.pricing.type,
      fixedAmountCents: item.pricing.fixedAmountCents,
      minimumPriceCents: item.pricing.minimumPriceCents,
      currency: item.pricing.currency,
      billingInterval: item.pricing.billingInterval,
      isActive: item.pricing.isActive,
      quantity: item.quantity,
      tiers: item.pricing.tiers.map((tier) => ({
        id: tier.id,
        fromUnit: tier.fromUnit,
        toUnit: tier.toUnit,
        unitAmountCents: tier.unitAmountCents
      }))
    }))
  };
}

async function validateExistingSubscriptions(subscriptionIds: string[]): Promise<boolean> {
  const uniqueSubscriptionIds = uniqueIds(subscriptionIds);
  const count = await prisma.subscription.count({
    where: {
      id: {
        in: uniqueSubscriptionIds
      }
    }
  });

  return count === uniqueSubscriptionIds.length;
}

async function validateExistingPricings(pricingIds: string[]): Promise<boolean> {
  const uniquePricingIds = uniqueIds(pricingIds);
  const count = await prisma.pricing.count({
    where: {
      id: {
        in: uniquePricingIds
      }
    }
  });

  return count === uniquePricingIds.length;
}

export async function registerAdminSubscriptionsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/admin/subscriptions', async (request) => {
    const query = subscriptionListQuerySchema.parse(request.query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const skip = (page - 1) * pageSize;

    const where: Prisma.SubscriptionWhereInput = {};

    if (query.accountId) {
      where.accountId = query.accountId;
    }

    if (query.propertyId) {
      where.propertyId = query.propertyId;
    }

    if (query.scope) {
      where.scope = query.scope;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.startFrom || query.startTo) {
      where.startDate = {
        gte: query.startFrom,
        lte: query.startTo
      };
    }

    if (query.search) {
      where.OR = [
        { account: { companyName: { contains: query.search } } },
        { account: { email: { contains: query.search } } },
        { property: { address: { contains: query.search } } }
      ];
    }

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
    const candidate: SubscriptionCandidate = {
      accountId: payload.accountId,
      scope: payload.scope,
      propertyId: payload.propertyId ?? null,
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
          propertyId: candidate.scope === 'PROPERTY' ? candidate.propertyId : null,
          startDate: candidate.startDate,
          endDate: candidate.endDate,
          status: candidate.status,
          paymentMethodId: candidate.paymentMethodId
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

    const candidate = createSubscriptionBodySchema.parse({
      accountId: existing.accountId,
      scope: payload.scope ?? existing.scope,
      propertyId:
        payload.propertyId !== undefined ? payload.propertyId : existing.propertyId,
      startDate: payload.startDate ?? existing.startDate,
      endDate: payload.endDate !== undefined ? payload.endDate : existing.endDate,
      status: payload.status ?? existing.status,
      paymentMethodId:
        payload.paymentMethodId !== undefined
          ? payload.paymentMethodId
          : existing.paymentMethodId,
      pricingIds:
        payload.pricingIds ?? existing.subscriptionItems.map((item) => item.pricingId)
    });

    const normalizedCandidate: SubscriptionCandidate = {
      accountId: candidate.accountId,
      scope: candidate.scope,
      propertyId: candidate.propertyId ?? null,
      startDate: candidate.startDate,
      endDate: candidate.endDate ?? null,
      status: candidate.status,
      paymentMethodId: candidate.paymentMethodId ?? null,
      pricingIds: candidate.pricingIds
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
          propertyId:
            normalizedCandidate.scope === 'PROPERTY'
              ? normalizedCandidate.propertyId
              : null,
          startDate: normalizedCandidate.startDate,
          endDate: normalizedCandidate.endDate,
          status: normalizedCandidate.status,
          paymentMethodId: normalizedCandidate.paymentMethodId
        }
      });

      await tx.subscriptionPricing.deleteMany({
        where: { subscriptionId: id }
      });

      await tx.subscriptionPricing.createMany({
        data: normalizedCandidate.pricingIds.map((pricingId) => ({
          subscriptionId: id,
          pricingId,
          quantity: 1
        }))
      });

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
    const subscriptionIds = uniqueIds(payload.subscriptionIds);

    const subscriptionsExist = await validateExistingSubscriptions(subscriptionIds);
    if (!subscriptionsExist) {
      reply.status(400).send({ message: 'One or more subscriptionIds are invalid' });
      return;
    }

    const pricingIds = uniqueIds(payload.pricingIds ?? []);
    const needsPricingIds =
      payload.action === 'ADD_PRICING' ||
      payload.action === 'REPLACE_PRICINGS' ||
      payload.action === 'DELETE_PRICING';

    if (needsPricingIds) {
      const pricingsExist = await validateExistingPricings(pricingIds);
      if (!pricingsExist) {
        reply.status(400).send({ message: 'One or more pricingIds are invalid' });
        return;
      }
    }

    if (payload.action === 'DELETE_SUBSCRIPTIONS') {
      const deleted = await prisma.subscription.deleteMany({
        where: {
          id: {
            in: subscriptionIds
          }
        }
      });

      return {
        action: payload.action,
        targetedSubscriptions: subscriptionIds.length,
        deletedSubscriptions: deleted.count
      };
    }

    if (payload.action === 'ADD_PRICING') {
      const existingLinks = await prisma.subscriptionPricing.findMany({
        where: {
          subscriptionId: {
            in: subscriptionIds
          }
        },
        select: {
          subscriptionId: true,
          pricingId: true
        }
      });

      const pricingLookup = await loadPricingLookupByIds(prisma, [
        ...pricingIds,
        ...existingLinks.map((link) => link.pricingId)
      ]);

      const existingPricingIdsBySubscription = new Map<string, string[]>();
      for (const link of existingLinks) {
        const current = existingPricingIdsBySubscription.get(link.subscriptionId) ?? [];
        current.push(link.pricingId);
        existingPricingIdsBySubscription.set(link.subscriptionId, current);
      }

      for (const subscriptionId of subscriptionIds) {
        const currentPricingIds = existingPricingIdsBySubscription.get(subscriptionId) ?? [];
        const nextPricingIds = [...currentPricingIds, ...pricingIds];
        const nextSelectionValidation = validatePricingSelection({
          pricingIds: nextPricingIds,
          pricingLookup
        });

        if (nextSelectionValidation.error) {
          reply.status(400).send({
            message: `Bulk action would violate pricing rules for subscription ${subscriptionId}: ${nextSelectionValidation.error}`
          });
          return;
        }
      }

      const existingSet = new Set(
        existingLinks.map((link) => `${link.subscriptionId}:${link.pricingId}`)
      );

      const newLinks = subscriptionIds.flatMap((subscriptionId) =>
        pricingIds
          .filter((pricingId) => !existingSet.has(`${subscriptionId}:${pricingId}`))
          .map((pricingId) => ({
            subscriptionId,
            pricingId,
            quantity: 1
          }))
      );

      if (newLinks.length > 0) {
        await prisma.subscriptionPricing.createMany({
          data: newLinks
        });
      }

      return {
        action: payload.action,
        targetedSubscriptions: subscriptionIds.length,
        targetedPricings: pricingIds.length,
        createdLinks: newLinks.length
      };
    }

    if (payload.action === 'REPLACE_PRICINGS') {
      const pricingLookup = await loadPricingLookupByIds(prisma, pricingIds);
      const nextSelectionValidation = validatePricingSelection({
        pricingIds,
        pricingLookup
      });

      if (nextSelectionValidation.error) {
        reply.status(400).send({ message: nextSelectionValidation.error });
        return;
      }

      const [deletedLinks, createdLinks] = await prisma.$transaction([
        prisma.subscriptionPricing.deleteMany({
          where: {
            subscriptionId: {
              in: subscriptionIds
            }
          }
        }),
        prisma.subscriptionPricing.createMany({
          data: subscriptionIds.flatMap((subscriptionId) =>
            pricingIds.map((pricingId) => ({
              subscriptionId,
              pricingId,
              quantity: 1
            }))
          )
        })
      ]);

      return {
        action: payload.action,
        targetedSubscriptions: subscriptionIds.length,
        targetedPricings: pricingIds.length,
        deletedLinks: deletedLinks.count,
        createdLinks: createdLinks.count
      };
    }

    const existingLinks = await prisma.subscriptionPricing.findMany({
      where: {
        subscriptionId: {
          in: subscriptionIds
        }
      },
      select: {
        subscriptionId: true,
        pricingId: true
      }
    });
    const pricingLookup = await loadPricingLookupByIds(
      prisma,
      existingLinks.map((link) => link.pricingId)
    );
    const pricingIdsToDelete = new Set(pricingIds);
    const existingPricingIdsBySubscription = new Map<string, string[]>();
    for (const link of existingLinks) {
      const current = existingPricingIdsBySubscription.get(link.subscriptionId) ?? [];
      current.push(link.pricingId);
      existingPricingIdsBySubscription.set(link.subscriptionId, current);
    }

    for (const subscriptionId of subscriptionIds) {
      const currentPricingIds = existingPricingIdsBySubscription.get(subscriptionId) ?? [];
      const nextPricingIds = currentPricingIds.filter(
        (pricingId) => !pricingIdsToDelete.has(pricingId)
      );
      const nextSelectionValidation = validatePricingSelection({
        pricingIds: nextPricingIds,
        pricingLookup
      });

      if (nextSelectionValidation.error) {
        reply.status(400).send({
          message: `Bulk action would violate pricing rules for subscription ${subscriptionId}: ${nextSelectionValidation.error}`
        });
        return;
      }
    }

    const deletedLinks = await prisma.subscriptionPricing.deleteMany({
      where: {
        subscriptionId: {
          in: subscriptionIds
        },
        pricingId: {
          in: pricingIds
        }
      }
    });

    return {
      action: payload.action,
      targetedSubscriptions: subscriptionIds.length,
      targetedPricings: pricingIds.length,
      deletedLinks: deletedLinks.count
    };
  });
}
