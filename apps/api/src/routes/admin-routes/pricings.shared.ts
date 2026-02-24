import { prisma } from '@stripe-integration/db';
import type { Prisma } from '@stripe-integration/db';

export const pricingInclude = {
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

export type PricingWithRelations = Prisma.PricingGetPayload<{
  include: typeof pricingInclude;
}>;

export const pricingTreeInclude = {
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
          targetProperties: {
            select: {
              propertyId: true
            },
            orderBy: {
              propertyId: 'asc'
            }
          },
          account: {
            select: {
              id: true,
              companyName: true,
              email: true
            }
          }
        }
      }
    }
  }
} as const;

export function toPricingResponse(pricing: PricingWithRelations) {
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

export type PricingListQuery = {
  productId?: string;
  type?: 'FIXED' | 'METERED';
  search?: string;
};

export function buildPricingsWhere(query: PricingListQuery): Prisma.PricingWhereInput {
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

  return where;
}

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

export async function cleanupUnknownPricingReferences(
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

export async function listPricingsWithPagination(input: {
  page: number;
  pageSize: number;
  where: Prisma.PricingWhereInput;
}) {
  const { page, pageSize, where } = input;
  const skip = (page - 1) * pageSize;

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
}
