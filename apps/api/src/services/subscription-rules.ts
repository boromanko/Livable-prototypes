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
  'account' | 'property' | 'paymentMethod' | 'pricing'
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

  return pricingValidation.error;
}
