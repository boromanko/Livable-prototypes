import { prisma } from '@stripe-integration/db';
import { resolvePricingTree } from '../../services/pricing-resolution.js';
import { pricingTreeInclude } from './pricings.shared.js';
import { uniqueIds } from '../../services/subscription-rules.js';

export async function loadResolvedPricingTreeItems() {
  const pricingItems = await prisma.pricing.findMany({
    include: pricingTreeInclude,
    orderBy: [{ createdAt: 'desc' }]
  });

  const accountIds = Array.from(
    new Set(
      pricingItems.flatMap((pricing) =>
        pricing.subscriptionLink.map((link) => link.subscription.accountId)
      )
    )
  );

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
      propertyIds: uniqueIds([
        ...(link.subscription.propertyId ? [link.subscription.propertyId] : []),
        ...link.subscription.targetProperties.map((target) => target.propertyId)
      ]),
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

  return resolvePricingTree(normalizedPricings, properties).map((item) => ({
    ...item,
    tiers: tiersByPricingId.get(item.id) ?? []
  }));
}
