import { prisma } from '@stripe-integration/db';
import type { Prisma } from '@stripe-integration/db';
import { uniqueIds } from '../../services/subscription-rules.js';

export const subscriptionInclude = {
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

export type SubscriptionWithRelations = Prisma.SubscriptionGetPayload<{
  include: typeof subscriptionInclude;
}>;

export function toSubscriptionResponse(subscription: SubscriptionWithRelations) {
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

export type SubscriptionListQuery = {
  accountId?: string;
  propertyId?: string;
  scope?: 'ACCOUNT' | 'PROPERTY';
  status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CANCELED';
  search?: string;
  startFrom?: Date;
  startTo?: Date;
};

export function buildSubscriptionsWhere(query: SubscriptionListQuery): Prisma.SubscriptionWhereInput {
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

  return where;
}

export async function validateExistingSubscriptions(subscriptionIds: string[]): Promise<boolean> {
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

export async function validateExistingPricings(pricingIds: string[]): Promise<boolean> {
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
