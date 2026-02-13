import type { FastifyInstance } from 'fastify';
import { PricingType, prisma } from '@stripe-integration/db';
import type { Prisma } from '@stripe-integration/db';
import {
  createPricingBodySchema,
  normalizeTiers,
  pricingListQuerySchema,
  pricingParamsSchema,
  updatePricingBodySchema
} from '../schemas/pricing.js';
import {
  accountsLookupQuerySchema,
  paymentMethodsLookupQuerySchema,
  propertyParamsSchema,
  propertiesLookupQuerySchema,
  updatePropertyUnitsBodySchema
} from '../schemas/lookup.js';
import {
  createSubscriptionBodySchema,
  subscriptionBulkBodySchema,
  subscriptionListQuerySchema,
  subscriptionParamsSchema,
  updateSubscriptionBodySchema
} from '../schemas/subscription.js';
import {
  validateTierStructure
} from '../services/pricing-calculator.js';
import {
  resolvePricingTree
} from '../services/pricing-resolution.js';

const pricingInclude = {
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
  },
  _count: {
    select: {
      subscriptionLink: true
    }
  }
} as const;

type PricingWithRelations = Prisma.PricingGetPayload<{
  include: typeof pricingInclude;
}>;

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

const pricingTreeInclude = {
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
  },
  subscriptionLink: {
    include: {
      subscription: {
        select: {
          id: true,
          scope: true,
          status: true,
          createdAt: true,
          accountId: true,
          propertyId: true,
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
              accountId: true,
              address: true,
              billableUnits: true
            }
          }
        }
      }
    }
  }
} as const;

type SubscriptionCandidate = {
  accountId: string;
  scope: 'ACCOUNT' | 'PROPERTY';
  propertyId: string | null;
  startDate: Date;
  endDate: Date | null;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CANCELED';
  paymentMethodId: string | null;
  pricingIds: string[];
};

function toPricingResponse(pricing: PricingWithRelations) {
  return {
    id: pricing.id,
    product: pricing.product,
    internalName: pricing.internalName,
    type: pricing.type,
    fixedAmountCents: pricing.fixedAmountCents,
    minimumPriceCents: pricing.minimumPriceCents,
    currency: pricing.currency,
    billingInterval: pricing.billingInterval,
    isActive: pricing.isActive,
    createdAt: pricing.createdAt,
    subscriptionsCount: pricing._count.subscriptionLink,
    tiers: pricing.tiers.map((tier) => ({
      id: tier.id,
      fromUnit: tier.fromUnit,
      toUnit: tier.toUnit,
      unitAmountCents: tier.unitAmountCents
    }))
  };
}

function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

function findDuplicateIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id);
      continue;
    }

    seen.add(id);
  }

  return Array.from(duplicates);
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

async function validateSubscriptionCandidate(candidate: SubscriptionCandidate): Promise<string | null> {
  const account = await prisma.account.findUnique({
    where: { id: candidate.accountId },
    select: { id: true }
  });

  if (!account) {
    return 'Account not found';
  }

  if (candidate.scope === 'PROPERTY') {
    if (!candidate.propertyId) {
      return 'propertyId is required for PROPERTY scope';
    }

    const property = await prisma.property.findUnique({
      where: { id: candidate.propertyId },
      select: {
        id: true,
        accountId: true
      }
    });

    if (!property) {
      return 'Property not found';
    }

    if (property.accountId !== candidate.accountId) {
      return 'Property does not belong to the selected account';
    }
  }

  if (candidate.scope === 'ACCOUNT' && candidate.propertyId) {
    return 'propertyId must be null for ACCOUNT scope';
  }

  if (candidate.paymentMethodId) {
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: candidate.paymentMethodId },
      select: {
        id: true,
        accountId: true
      }
    });

    if (!paymentMethod) {
      return 'Payment method not found';
    }

    if (paymentMethod.accountId !== candidate.accountId) {
      return 'Payment method does not belong to the selected account';
    }
  }

  const duplicatePricingIds = findDuplicateIds(candidate.pricingIds);
  if (duplicatePricingIds.length > 0) {
    return `Duplicate pricingIds are not allowed: ${duplicatePricingIds.join(', ')}`;
  }

  const normalizedPricingIds = uniqueIds(candidate.pricingIds);

  const pricings = await prisma.pricing.findMany({
    where: {
      id: {
        in: normalizedPricingIds
      }
    },
    select: {
      id: true,
      productId: true,
      product: {
        select: {
          code: true,
          name: true
        }
      }
    }
  });

  if (pricings.length !== normalizedPricingIds.length) {
    return 'One or more pricingIds are invalid';
  }

  const pricingByProductId = new Map<string, (typeof pricings)[number][]>();
  for (const pricing of pricings) {
    const current = pricingByProductId.get(pricing.productId) ?? [];
    current.push(pricing);
    pricingByProductId.set(pricing.productId, current);
  }

  const duplicateProducts = Array.from(pricingByProductId.values())
    .filter((items) => items.length > 1)
    .map((items) => items[0])
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => item.product.code || item.product.name || item.productId);

  if (duplicateProducts.length > 0) {
    return `Subscription cannot contain multiple pricings for the same product: ${duplicateProducts.join(', ')}`;
  }

  return null;
}

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

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/admin/accounts', async (request) => {
    const query = accountsLookupQuerySchema.parse(request.query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const skip = (page - 1) * pageSize;

    const where: Prisma.AccountWhereInput = {};

    if (query.search) {
      where.OR = [
        { companyName: { contains: query.search } },
        { email: { contains: query.search } }
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.account.findMany({
        where,
        select: {
          id: true,
          companyName: true,
          email: true,
          createdAt: true,
          properties: {
            select: {
              billableUnits: true
            }
          },
          _count: {
            select: {
              properties: true,
              subscriptions: true
            }
          }
        },
        orderBy: { companyName: 'asc' },
        skip,
        take: pageSize
      }),
      prisma.account.count({ where })
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        companyName: item.companyName,
        email: item.email,
        createdAt: item.createdAt,
        propertiesCount: item._count.properties,
        subscriptionsCount: item._count.subscriptions,
        totalBillableUnits: item.properties.reduce(
          (sum, property) => sum + property.billableUnits,
          0
        )
      })),
      page,
      pageSize,
      total
    };
  });

  app.get('/api/admin/properties', async (request, reply) => {
    const query = propertiesLookupQuerySchema.parse(request.query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const skip = (page - 1) * pageSize;

    const account = await prisma.account.findUnique({
      where: { id: query.accountId },
      select: { id: true }
    });

    if (!account) {
      reply.status(404).send({ message: 'Account not found' });
      return;
    }

    const where: Prisma.PropertyWhereInput = {
      accountId: query.accountId
    };

    if (query.search) {
      where.address = { contains: query.search };
    }

    const [items, total] = await prisma.$transaction([
      prisma.property.findMany({
        where,
        select: {
          id: true,
          accountId: true,
          address: true,
          billableUnits: true,
          createdAt: true,
          _count: {
            select: {
              subscriptions: true
            }
          }
        },
        orderBy: { address: 'asc' },
        skip,
        take: pageSize
      }),
      prisma.property.count({ where })
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        accountId: item.accountId,
        address: item.address,
        billableUnits: item.billableUnits,
        createdAt: item.createdAt,
        subscriptionsCount: item._count.subscriptions
      })),
      page,
      pageSize,
      total
    };
  });

  app.patch('/api/admin/properties/:id/units', async (request, reply) => {
    const { id } = propertyParamsSchema.parse(request.params);
    const payload = updatePropertyUnitsBodySchema.parse(request.body);

    const existing = await prisma.property.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existing) {
      reply.status(404).send({ message: 'Property not found' });
      return;
    }

    const updated = await prisma.property.update({
      where: { id },
      data: {
        billableUnits: payload.billableUnits
      },
      select: {
        id: true,
        accountId: true,
        address: true,
        billableUnits: true,
        createdAt: true,
        _count: {
          select: {
            subscriptions: true
          }
        }
      }
    });

    return {
      item: {
        id: updated.id,
        accountId: updated.accountId,
        address: updated.address,
        billableUnits: updated.billableUnits,
        createdAt: updated.createdAt,
        subscriptionsCount: updated._count.subscriptions
      }
    };
  });

  app.get('/api/admin/products', async () => {
    const items = await prisma.product.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            pricings: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        description: item.description,
        isActive: item.isActive,
        createdAt: item.createdAt,
        pricingsCount: item._count.pricings
      }))
    };
  });

  app.get('/api/admin/payment-methods', async (request, reply) => {
    const query = paymentMethodsLookupQuerySchema.parse(request.query);

    const account = await prisma.account.findUnique({
      where: { id: query.accountId },
      select: { id: true }
    });

    if (!account) {
      reply.status(404).send({ message: 'Account not found' });
      return;
    }

    const items = await prisma.paymentMethod.findMany({
      where: {
        accountId: query.accountId
      },
      select: {
        id: true,
        accountId: true,
        type: true,
        label: true,
        last4: true,
        isDefault: true,
        createdAt: true
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
    });

    return {
      items
    };
  });

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

    const validationError = await validateSubscriptionCandidate(candidate);

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

    const validationError = await validateSubscriptionCandidate(normalizedCandidate);

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
          },
          pricingId: {
            in: pricingIds
          }
        },
        select: {
          subscriptionId: true,
          pricingId: true
        }
      });

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

  app.get('/api/admin/pricings-tree', async () => {
    const pricingItems = await prisma.pricing.findMany({
      include: pricingTreeInclude,
      orderBy: [{ createdAt: 'desc' }]
    });

    const accountIds = Array.from(new Set(
      pricingItems
        .flatMap((pricing) => pricing.subscriptionLink.map((link) => link.subscription.accountId))
    ));

    const properties = accountIds.length
      ? await prisma.property.findMany({
          where: {
            accountId: {
              in: accountIds
            }
          },
          select: {
            id: true,
            accountId: true,
            address: true,
            billableUnits: true
          },
          orderBy: [{ address: 'asc' }]
        })
      : [];

    const normalizedPricings = pricingItems.map((pricing) => ({
      id: pricing.id,
      product: pricing.product,
      internalName: pricing.internalName,
      type: pricing.type,
      fixedAmountCents: pricing.fixedAmountCents,
      minimumPriceCents: pricing.minimumPriceCents,
      currency: pricing.currency,
      billingInterval: pricing.billingInterval,
      isActive: pricing.isActive,
      createdAt: pricing.createdAt,
      subscriptionsCount: pricing.subscriptionLink.length,
      tiers: pricing.tiers.map((tier) => ({
        fromUnit: tier.fromUnit,
        toUnit: tier.toUnit,
        unitAmountCents: tier.unitAmountCents
      })),
      subscriptions: pricing.subscriptionLink.map((link) => ({
        id: link.subscription.id,
        scope: link.subscription.scope,
        status: link.subscription.status,
        createdAt: link.subscription.createdAt,
        accountId: link.subscription.accountId,
        propertyId: link.subscription.propertyId,
        account: link.subscription.account
      }))
    }));

    const tiersByPricingId = new Map(
      pricingItems.map((pricing) => [
        pricing.id,
        pricing.tiers.map((tier) => ({
          id: tier.id,
          fromUnit: tier.fromUnit,
          toUnit: tier.toUnit,
          unitAmountCents: tier.unitAmountCents
        }))
      ])
    );

    const items = resolvePricingTree(normalizedPricings, properties).map((item) => ({
      ...item,
      tiers: tiersByPricingId.get(item.id) ?? []
    }));

    return {
      items
    };
  });

  app.get('/api/admin/pricings', async (request) => {
    const query = pricingListQuerySchema.parse(request.query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PricingWhereInput = {};

    if (query.productId) {
      where.productId = query.productId;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.search) {
      where.OR = [
        { internalName: { contains: query.search } },
        { product: { name: { contains: query.search } } },
        { product: { code: { contains: query.search } } }
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.pricing.findMany({
        where,
        include: pricingInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.pricing.count({ where })
    ]);

    return {
      items: items.map(toPricingResponse),
      page,
      pageSize,
      total
    };
  });

  app.post('/api/admin/pricings', async (request, reply) => {
    const payload = createPricingBodySchema.parse(request.body);
    const normalizedTiers = payload.type === 'TIERED' ? normalizeTiers(payload.tiers ?? []) : [];

    if (payload.type === 'TIERED') {
      try {
        validateTierStructure(normalizedTiers);
      } catch (error) {
        reply.status(400).send({
          message: error instanceof Error ? error.message : 'Invalid tiered pricing structure'
        });
        return;
      }
    }

    const createdPricing = await prisma.$transaction(async (tx) => {
      const created = await tx.pricing.create({
        data: {
          productId: payload.productId,
          internalName: payload.internalName,
          type: payload.type,
          fixedAmountCents: payload.type === 'FIXED' ? payload.fixedAmountCents : null,
          minimumPriceCents: payload.minimumPriceCents ?? null,
          currency: payload.currency.toLowerCase(),
          billingInterval: payload.billingInterval,
          isActive: payload.isActive
        }
      });

      if (normalizedTiers.length > 0) {
        await tx.pricingTier.createMany({
          data: normalizedTiers.map((tier) => ({
            pricingId: created.id,
            fromUnit: tier.fromUnit,
            toUnit: tier.toUnit,
            unitAmountCents: tier.unitAmountCents
          }))
        });
      }

      return tx.pricing.findUniqueOrThrow({
        where: { id: created.id },
        include: pricingInclude
      });
    });

    reply.status(201).send({
      item: toPricingResponse(createdPricing)
    });
  });

  app.patch('/api/admin/pricings/:id', async (request, reply) => {
    const { id } = pricingParamsSchema.parse(request.params);
    const payload = updatePricingBodySchema.parse(request.body);

    const existing = await prisma.pricing.findUnique({
      where: { id },
      include: {
        tiers: {
          orderBy: { fromUnit: 'asc' }
        }
      }
    });

    if (!existing) {
      reply.status(404).send({ message: 'Pricing not found' });
      return;
    }

    const targetType = payload.type ?? existing.type;
    const existingTiers = existing.tiers.map((tier) => ({
      fromUnit: tier.fromUnit,
      toUnit: tier.toUnit,
      unitAmountCents: tier.unitAmountCents
    }));

    const candidatePayload = {
      productId: existing.productId,
      internalName: payload.internalName ?? existing.internalName,
      type: targetType,
      fixedAmountCents:
        payload.fixedAmountCents !== undefined
          ? payload.fixedAmountCents
          : existing.fixedAmountCents,
      minimumPriceCents:
        payload.minimumPriceCents !== undefined
          ? payload.minimumPriceCents
          : existing.minimumPriceCents,
      currency: (payload.currency ?? existing.currency).toLowerCase(),
      billingInterval: payload.billingInterval ?? existing.billingInterval,
      isActive: payload.isActive ?? existing.isActive,
      tiers:
        targetType === PricingType.FIXED
          ? []
          : payload.tiers ?? existingTiers
    };

    const validated = createPricingBodySchema.parse(candidatePayload);
    const normalizedTiers =
      validated.type === 'TIERED' ? normalizeTiers(validated.tiers ?? []) : [];

    if (validated.type === 'TIERED') {
      try {
        validateTierStructure(normalizedTiers);
      } catch (error) {
        reply.status(400).send({
          message: error instanceof Error ? error.message : 'Invalid tiered pricing structure'
        });
        return;
      }
    }

    const updatedPricing = await prisma.$transaction(async (tx) => {
      await tx.pricing.update({
        where: { id },
        data: {
          internalName: validated.internalName,
          type: validated.type,
          fixedAmountCents: validated.type === 'FIXED' ? validated.fixedAmountCents : null,
          minimumPriceCents: validated.minimumPriceCents ?? null,
          currency: validated.currency.toLowerCase(),
          billingInterval: validated.billingInterval,
          isActive: validated.isActive
        }
      });

      await tx.pricingTier.deleteMany({
        where: { pricingId: id }
      });

      if (normalizedTiers.length > 0) {
        await tx.pricingTier.createMany({
          data: normalizedTiers.map((tier) => ({
            pricingId: id,
            fromUnit: tier.fromUnit,
            toUnit: tier.toUnit,
            unitAmountCents: tier.unitAmountCents
          }))
        });
      }

      return tx.pricing.findUniqueOrThrow({
        where: { id },
        include: pricingInclude
      });
    });

    return {
      item: toPricingResponse(updatedPricing)
    };
  });

  app.delete('/api/admin/pricings/:id', async (request, reply) => {
    const { id } = pricingParamsSchema.parse(request.params);

    const existing = await prisma.pricing.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existing) {
      reply.status(404).send({ message: 'Pricing not found' });
      return;
    }

    await prisma.pricing.delete({
      where: { id }
    });

    return {
      deleted: true,
      id
    };
  });
}
