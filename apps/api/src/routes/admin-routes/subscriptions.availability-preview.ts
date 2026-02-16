import type { FastifyReply } from 'fastify';
import { prisma } from '@stripe-integration/db';
import { uniqueIds } from '../../services/subscription-rules.js';

type SubscriptionStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CANCELED';
type BillingScope = 'ACCOUNT' | 'PROPERTY';

type AvailabilityPreviewPayload = {
  accountId: string;
  scope: BillingScope;
  propertyIds?: string[];
  pricingIds?: string[];
  propertyOptionIds?: string[];
  pricingOptionIds?: string[];
  startDate: Date;
  endDate?: Date | null;
  status?: SubscriptionStatus;
  excludeSubscriptionId?: string;
};

type AvailabilityItem = {
  id: string;
  available: boolean;
  reason: string | null;
};

type ExistingSubscriptionSnapshot = {
  id: string;
  scope: BillingScope;
  startDate: Date;
  endDate: Date | null;
  propertyIds: string[];
  productIds: Set<string>;
};

const DATE_INFINITY = new Date('9999-12-31T23:59:59.999Z');

function normalizeIds(ids?: string[]): string[] {
  return uniqueIds((ids ?? []).map((id) => id.trim()).filter((id) => id !== ''));
}

function rangesOverlap(
  leftStart: Date,
  leftEnd: Date | null,
  rightStart: Date,
  rightEnd: Date | null
): boolean {
  return !(leftStart > (rightEnd ?? DATE_INFINITY) || rightStart > (leftEnd ?? DATE_INFINITY));
}

function getProductLabelById(input: {
  productByPricingId: Map<string, { productId: string; product: { code: string; name: string } }>;
  productId: string;
}): string {
  const { productByPricingId, productId } = input;

  for (const pricing of productByPricingId.values()) {
    if (pricing.productId !== productId) {
      continue;
    }

    if (pricing.product.code.trim() !== '') {
      return pricing.product.code;
    }

    if (pricing.product.name.trim() !== '') {
      return pricing.product.name;
    }

    return productId;
  }

  return productId;
}

function findFirstIntersection(left: Set<string>, right: Set<string>): string | null {
  for (const value of left) {
    if (right.has(value)) {
      return value;
    }
  }

  return null;
}

function getScopeConflictMessage(scope: BillingScope, productLabel: string): string {
  if (scope === 'ACCOUNT') {
    return `Conflicting account-level subscription for product ${productLabel} already exists in overlapping date range`;
  }

  return `Conflicting property-level subscription for product ${productLabel} already exists for one or more selected properties in overlapping date range`;
}

function buildExistingSubscriptionSnapshots(
  subscriptions: Array<{
    id: string;
    scope: BillingScope;
    startDate: Date;
    endDate: Date | null;
    targetProperties: Array<{ propertyId: string }>;
    subscriptionItems: Array<{ pricing: { productId: string } }>;
  }>
): ExistingSubscriptionSnapshot[] {
  return subscriptions.map((subscription) => ({
    id: subscription.id,
    scope: subscription.scope,
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    propertyIds: uniqueIds(subscription.targetProperties.map((target) => target.propertyId)),
    productIds: new Set(subscription.subscriptionItems.map((item) => item.pricing.productId))
  }));
}

function evaluatePricingAvailability(input: {
  pricingId: string;
  selectedPricingIds: string[];
  selectedPropertyIds: string[];
  scope: BillingScope;
  startDate: Date;
  endDate: Date | null;
  existingSubscriptions: ExistingSubscriptionSnapshot[];
  productByPricingId: Map<string, { productId: string; product: { code: string; name: string } }>;
}): AvailabilityItem {
  const {
    pricingId,
    selectedPricingIds,
    selectedPropertyIds,
    scope,
    startDate,
    endDate,
    existingSubscriptions,
    productByPricingId
  } = input;
  const pricing = productByPricingId.get(pricingId);

  if (!pricing) {
    return {
      id: pricingId,
      available: false,
      reason: 'Pricing is not available'
    };
  }

  const candidatePricingIds = selectedPricingIds.includes(pricingId)
    ? selectedPricingIds
    : [...selectedPricingIds, pricingId];
  const candidateProductIds = candidatePricingIds
    .map((id) => productByPricingId.get(id)?.productId)
    .filter((productId): productId is string => Boolean(productId));

  const duplicateProductId = findDuplicateValue(candidateProductIds);
  if (duplicateProductId) {
    const productLabel = getProductLabelById({ productByPricingId, productId: duplicateProductId });
    return {
      id: pricingId,
      available: false,
      reason: `Subscription cannot contain multiple pricings for the same product: ${productLabel}`
    };
  }

  const candidateProductIdSet = new Set(candidateProductIds);

  for (const existing of existingSubscriptions) {
    if (existing.scope !== scope) {
      continue;
    }

    if (!rangesOverlap(startDate, endDate, existing.startDate, existing.endDate)) {
      continue;
    }

    if (scope === 'PROPERTY') {
      if (selectedPropertyIds.length === 0) {
        continue;
      }

      const hasPropertyIntersection = selectedPropertyIds.some((propertyId) =>
        existing.propertyIds.includes(propertyId)
      );
      if (!hasPropertyIntersection) {
        continue;
      }
    }

    const conflictingProductId = findFirstIntersection(existing.productIds, candidateProductIdSet);
    if (!conflictingProductId) {
      continue;
    }

    const productLabel = getProductLabelById({ productByPricingId, productId: conflictingProductId });
    return {
      id: pricingId,
      available: false,
      reason: getScopeConflictMessage(scope, productLabel)
    };
  }

  return {
    id: pricingId,
    available: true,
    reason: null
  };
}

function evaluatePropertyAvailability(input: {
  propertyId: string;
  selectedPricingIds: string[];
  startDate: Date;
  endDate: Date | null;
  existingSubscriptions: ExistingSubscriptionSnapshot[];
  accountPropertyIds: Set<string>;
  productByPricingId: Map<string, { productId: string; product: { code: string; name: string } }>;
}): AvailabilityItem {
  const {
    propertyId,
    selectedPricingIds,
    startDate,
    endDate,
    existingSubscriptions,
    accountPropertyIds,
    productByPricingId
  } = input;

  if (!accountPropertyIds.has(propertyId)) {
    return {
      id: propertyId,
      available: false,
      reason: 'Property does not belong to selected account'
    };
  }

  const selectedProductIds = new Set(
    selectedPricingIds
      .map((pricingId) => productByPricingId.get(pricingId)?.productId)
      .filter((productId): productId is string => Boolean(productId))
  );
  if (selectedProductIds.size === 0) {
    return {
      id: propertyId,
      available: true,
      reason: null
    };
  }

  for (const existing of existingSubscriptions) {
    if (existing.scope !== 'PROPERTY') {
      continue;
    }

    if (!rangesOverlap(startDate, endDate, existing.startDate, existing.endDate)) {
      continue;
    }

    if (!existing.propertyIds.includes(propertyId)) {
      continue;
    }

    const conflictingProductId = findFirstIntersection(existing.productIds, selectedProductIds);
    if (!conflictingProductId) {
      continue;
    }

    const productLabel = getProductLabelById({ productByPricingId, productId: conflictingProductId });
    return {
      id: propertyId,
      available: false,
      reason: getScopeConflictMessage('PROPERTY', productLabel)
    };
  }

  return {
    id: propertyId,
    available: true,
    reason: null
  };
}

function findDuplicateValue(values: string[]): string | null {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      return value;
    }

    seen.add(value);
  }

  return null;
}

function toReasonById(items: AvailabilityItem[]): Record<string, string | null> {
  return Object.fromEntries(items.map((item) => [item.id, item.reason]));
}

export async function getSubscriptionAvailabilityPreview(
  payload: AvailabilityPreviewPayload,
  reply: FastifyReply
) {
  const account = await prisma.account.findUnique({
    where: { id: payload.accountId },
    select: { id: true }
  });
  if (!account) {
    reply.status(400).send({ message: 'Account not found' });
    return null;
  }

  const selectedPropertyIds = normalizeIds(payload.scope === 'PROPERTY' ? payload.propertyIds : []);
  const selectedPricingIds = normalizeIds(payload.pricingIds);
  const propertyOptionIds = normalizeIds(payload.propertyOptionIds);
  const pricingOptionIds = normalizeIds(payload.pricingOptionIds);
  const allRequestedPricingIds = uniqueIds([...selectedPricingIds, ...pricingOptionIds]);

  const [accountProperties, pricingLookupEntries, existingSubscriptions] = await Promise.all([
    prisma.property.findMany({
      where: {
        accountId: payload.accountId
      },
      select: {
        id: true
      }
    }),
    allRequestedPricingIds.length > 0
      ? prisma.pricing.findMany({
          where: {
            id: {
              in: allRequestedPricingIds
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
        })
      : Promise.resolve([]),
    prisma.subscription.findMany({
      where: {
        accountId: payload.accountId,
        status: {
          in: ['DRAFT', 'ACTIVE', 'PAUSED']
        },
        ...(payload.excludeSubscriptionId
          ? {
              id: {
                not: payload.excludeSubscriptionId
              }
            }
          : {})
      },
      select: {
        id: true,
        scope: true,
        startDate: true,
        endDate: true,
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
    })
  ]);

  const accountPropertyIds = new Set(accountProperties.map((property) => property.id));
  const productByPricingId = new Map(
    pricingLookupEntries.map((pricing) => [pricing.id, pricing])
  );
  const existingSnapshots = buildExistingSubscriptionSnapshots(existingSubscriptions);

  const pricingIdsToEvaluate = uniqueIds([...pricingOptionIds, ...selectedPricingIds]);
  const propertyIdsToEvaluate = uniqueIds([...propertyOptionIds, ...selectedPropertyIds]);

  const pricingAvailability = pricingIdsToEvaluate.map((pricingId) =>
    evaluatePricingAvailability({
      pricingId,
      selectedPricingIds,
      selectedPropertyIds,
      scope: payload.scope,
      startDate: payload.startDate,
      endDate: payload.endDate ?? null,
      existingSubscriptions: existingSnapshots,
      productByPricingId
    })
  );
  const propertyAvailability =
    payload.scope === 'PROPERTY'
      ? propertyIdsToEvaluate.map((propertyId) =>
          evaluatePropertyAvailability({
            propertyId,
            selectedPricingIds,
            startDate: payload.startDate,
            endDate: payload.endDate ?? null,
            existingSubscriptions: existingSnapshots,
            accountPropertyIds,
            productByPricingId
          })
        )
      : propertyIdsToEvaluate.map((propertyId) => ({
          id: propertyId,
          available: accountPropertyIds.has(propertyId),
          reason: accountPropertyIds.has(propertyId)
            ? null
            : 'Property does not belong to selected account'
        }));

  const pricingReasonById = toReasonById(pricingAvailability);
  const propertyReasonById = toReasonById(propertyAvailability);
  const invalidSelectedPricingIds = selectedPricingIds.filter(
    (pricingId) => pricingReasonById[pricingId] !== null
  );
  const invalidSelectedPropertyIds = selectedPropertyIds.filter(
    (propertyId) => propertyReasonById[propertyId] !== null
  );
  const hasRequiredSelection =
    selectedPricingIds.length > 0 &&
    (payload.scope === 'ACCOUNT' || selectedPropertyIds.length > 0);

  return {
    canSave:
      hasRequiredSelection &&
      invalidSelectedPricingIds.length === 0 &&
      invalidSelectedPropertyIds.length === 0,
    invalidSelectedPricingIds,
    invalidSelectedPropertyIds,
    pricingAvailability,
    propertyAvailability
  };
}
