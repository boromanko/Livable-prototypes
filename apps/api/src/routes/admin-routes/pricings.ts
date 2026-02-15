import type { FastifyInstance } from 'fastify';
import { PricingType, prisma } from '@stripe-integration/db';
import type { Prisma } from '@stripe-integration/db';
import {
  createPricingBodySchema,
  normalizeTiers,
  pricingListQuerySchema,
  pricingParamsSchema,
  updatePricingBodySchema
} from '../../schemas/pricing.js';
import { validateTierStructure } from '../../services/pricing-calculator.js';
import { resolvePricingTree } from '../../services/pricing-resolution.js';

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

type SqliteTableRow = {
  name: string;
};

type SqliteForeignKeyRow = {
  table: string;
  from: string;
};

function quoteSqlIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function cleanupUnknownPricingReferences(
  tx: Prisma.TransactionClient,
  pricingId: string
): Promise<void> {
  const tables = await tx.$queryRawUnsafe<SqliteTableRow[]>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';"
  );

  for (const table of tables) {
    if (table.name === 'pricings') {
      continue;
    }

    const foreignKeys = await tx.$queryRawUnsafe<SqliteForeignKeyRow[]>(
      `PRAGMA foreign_key_list(${quoteSqlIdentifier(table.name)});`
    );

    const pricingReferences = foreignKeys.filter((key) => key.table === 'pricings');
    for (const reference of pricingReferences) {
      const deleteSql = `DELETE FROM ${quoteSqlIdentifier(table.name)} WHERE ${quoteSqlIdentifier(reference.from)} = ?`;
      await tx.$executeRawUnsafe(deleteSql, pricingId);
    }
  }
}

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

export async function registerAdminPricingsRoutes(app: FastifyInstance): Promise<void> {
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
      productId: payload.productId ?? existing.productId,
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
          productId: validated.productId,
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

  app.delete('/api/admin/pricings/:id', async (request) => {
    const { id } = pricingParamsSchema.parse(request.params);

    const deletedPricingCount = await prisma.$transaction(async (tx) => {
      // Defensive cleanup for legacy local DBs that may still contain
      // old tables with FK references to "pricings".
      await cleanupUnknownPricingReferences(tx, id);

      // Be explicit about link cleanup to avoid relying on DB-level cascade behavior.
      await tx.subscriptionPricing.deleteMany({
        where: { pricingId: id }
      });

      await tx.pricingTier.deleteMany({
        where: { pricingId: id }
      });

      const deleted = await tx.pricing.deleteMany({
        where: { id }
      });

      return deleted.count;
    });

    return {
      deleted: deletedPricingCount > 0,
      id
    };
  });
}
