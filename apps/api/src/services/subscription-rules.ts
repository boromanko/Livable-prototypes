import type { Prisma } from '@stripe-integration/db';

export type SubscriptionCandidate = {
  accountId: string;
  scope: 'ACCOUNT' | 'PROPERTY';
  propertyIds: string[];
  startDate: Date;
  endDate: Date | null;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CANCELED';
  paymentMethodId: string | null;
  pricingIds: string[];
  excludeSubscriptionId?: string;
};

export type PricingLookupItem = {
  id: string;
  productId: string;
  product: {
    code: string;
    name: string;
  };
};

type SubscriptionRulesDb = Pick<
  Prisma.TransactionClient,
  'account' | 'property' | 'paymentMethod' | 'pricing' | 'subscription'
>;

type PricingLookupDb = Pick<Prisma.TransactionClient, 'pricing'>;

function getPricingProductLabel(pricing: PricingLookupItem): string {
  if (pricing.product.code.trim() !== '') {
    return pricing.product.code;
  }

  if (pricing.product.name.trim() !== '') {
    return pricing.product.name;
  }

  return pricing.productId;
}

export function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

export function findDuplicateIds(ids: string[]): string[] {
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

export async function loadPricingLookupByIds(
  db: PricingLookupDb,
  pricingIds: string[]
): Promise<Map<string, PricingLookupItem>> {
  const normalizedIds = uniqueIds(pricingIds);
  if (normalizedIds.length === 0) {
    return new Map();
  }

  const pricings = await db.pricing.findMany({
    where: {
      id: {
        in: normalizedIds
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

  return new Map(pricings.map((pricing) => [pricing.id, pricing]));
}

export function validatePricingSelection(input: {
  pricingIds: string[];
  pricingLookup: Map<string, PricingLookupItem>;
  requireAtLeastOne?: boolean;
}): { normalizedPricingIds: string[]; error: string | null } {
  const requireAtLeastOne = input.requireAtLeastOne ?? true;
  const duplicatePricingIds = findDuplicateIds(input.pricingIds);
  const normalizedPricingIds = uniqueIds(input.pricingIds);

  if (duplicatePricingIds.length > 0) {
    return {
      normalizedPricingIds,
      error: `Duplicate pricingIds are not allowed: ${duplicatePricingIds.join(', ')}`
    };
  }

  if (requireAtLeastOne && normalizedPricingIds.length === 0) {
    return {
      normalizedPricingIds,
      error: 'Subscription must contain at least one pricing'
    };
  }

  const selectedPricings = normalizedPricingIds
    .map((pricingId) => input.pricingLookup.get(pricingId))
    .filter((pricing): pricing is PricingLookupItem => Boolean(pricing));

  if (selectedPricings.length !== normalizedPricingIds.length) {
    return {
      normalizedPricingIds,
      error: 'One or more pricingIds are invalid'
    };
  }

  const pricingByProductId = new Map<string, PricingLookupItem[]>();
  for (const pricing of selectedPricings) {
    const current = pricingByProductId.get(pricing.productId) ?? [];
    current.push(pricing);
    pricingByProductId.set(pricing.productId, current);
  }

  const duplicateProducts = Array.from(pricingByProductId.values())
    .filter((items) => items.length > 1)
    .map((items) => items[0])
    .filter((item): item is PricingLookupItem => Boolean(item))
    .map(getPricingProductLabel);

  if (duplicateProducts.length > 0) {
    return {
      normalizedPricingIds,
      error: `Subscription cannot contain multiple pricings for the same product: ${duplicateProducts.join(', ')}`
    };
  }

  return {
    normalizedPricingIds,
    error: null
  };
}

export async function validateSubscriptionCandidate(
  db: SubscriptionRulesDb,
  candidate: SubscriptionCandidate
): Promise<string | null> {
  const duplicatePropertyIds = findDuplicateIds(candidate.propertyIds);
  if (duplicatePropertyIds.length > 0) {
    return `Duplicate propertyIds are not allowed: ${duplicatePropertyIds.join(', ')}`;
  }

  const normalizedPropertyIds = uniqueIds(candidate.propertyIds);

  const account = await db.account.findUnique({
    where: { id: candidate.accountId },
    select: { id: true }
  });

  if (!account) {
    return 'Account not found';
  }

  if (candidate.scope === 'PROPERTY') {
    if (normalizedPropertyIds.length === 0) {
      return 'propertyIds are required for PROPERTY scope';
    }

    const properties = await db.property.findMany({
      where: {
        id: {
          in: normalizedPropertyIds
        }
      },
      select: {
        id: true,
        accountId: true
      }
    });

    if (properties.length !== normalizedPropertyIds.length) {
      return 'One or more propertyIds are invalid';
    }

    const hasForeignProperty = properties.some(
      (property) => property.accountId !== candidate.accountId
    );
    if (hasForeignProperty) {
      return 'One or more properties do not belong to the selected account';
    }
  }

  if (candidate.scope === 'ACCOUNT' && normalizedPropertyIds.length > 0) {
    return 'propertyIds must be empty for ACCOUNT scope';
  }

  if (candidate.paymentMethodId) {
    const paymentMethod = await db.paymentMethod.findUnique({
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

  const pricingLookup = await loadPricingLookupByIds(db, candidate.pricingIds);
  const pricingValidation = validatePricingSelection({
    pricingIds: candidate.pricingIds,
    pricingLookup
  });

  if (pricingValidation.error) {
    return pricingValidation.error;
  }

  const candidatePricings = pricingValidation.normalizedPricingIds
    .map((pricingId) => pricingLookup.get(pricingId))
    .filter((pricing): pricing is PricingLookupItem => Boolean(pricing));
  const candidateProductIds = new Set(candidatePricings.map((pricing) => pricing.productId));
  const candidateProductLabelById = new Map(
    candidatePricings.map((pricing) => [pricing.productId, getPricingProductLabel(pricing)])
  );

  const accountProperties = await db.property.findMany({
    where: { accountId: candidate.accountId },
    select: { id: true }
  });
  const accountPropertyIds = new Set(accountProperties.map((property) => property.id));
  const candidateScopePropertyIds =
    candidate.scope === 'ACCOUNT'
      ? accountProperties.map((property) => property.id)
      : normalizedPropertyIds;

  const existingSubscriptions = await db.subscription.findMany({
    where: {
      accountId: candidate.accountId,
      status: {
        in: ['DRAFT', 'ACTIVE', 'PAUSED']
      },
      ...(candidate.excludeSubscriptionId
        ? {
            id: {
              not: candidate.excludeSubscriptionId
            }
          }
        : {})
    },
    select: {
      id: true,
      scope: true,
      status: true,
      startDate: true,
      endDate: true,
      propertyId: true,
      targetProperties: {
        select: {
          propertyId: true
        }
      },
      subscriptionItems: {
        select: {
          pricing: {
            select: {
              productId: true
            }
          }
        }
      }
    }
  });

  for (const existing of existingSubscriptions) {
    if (existing.scope !== candidate.scope) {
      continue;
    }

    if (
      candidate.startDate > (existing.endDate ?? new Date('9999-12-31T23:59:59.999Z')) ||
      existing.startDate > (candidate.endDate ?? new Date('9999-12-31T23:59:59.999Z'))
    ) {
      continue;
    }

    const existingProductIds = new Set(
      existing.subscriptionItems.map((item) => item.pricing.productId)
    );
    const conflictingProductId = Array.from(candidateProductIds).find((productId) =>
      existingProductIds.has(productId)
    );
    if (!conflictingProductId) {
      continue;
    }

    if (candidate.scope === 'ACCOUNT') {
      return `Conflicting account-level subscription for product ${candidateProductLabelById.get(conflictingProductId) ?? conflictingProductId} already exists in overlapping date range`;
    }

    const existingPropertyIds = uniqueIds([
      ...(existing.propertyId ? [existing.propertyId] : []),
      ...existing.targetProperties.map((target) => target.propertyId)
    ]).filter((propertyId) => accountPropertyIds.has(propertyId));

    const hasPropertyIntersection = candidateScopePropertyIds.some((propertyId) =>
      existingPropertyIds.includes(propertyId)
    );
    if (!hasPropertyIntersection) {
      continue;
    }

    return `Conflicting property-level subscription for product ${candidateProductLabelById.get(conflictingProductId) ?? conflictingProductId} already exists for one or more selected properties in overlapping date range`;
  }

  return null;
}
