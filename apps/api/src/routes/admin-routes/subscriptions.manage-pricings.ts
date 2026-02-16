import type { FastifyReply } from 'fastify';
import { prisma } from '@stripe-integration/db';
import {
  loadPricingLookupByIds,
  uniqueIds,
  validatePricingSelection,
  validateSubscriptionCandidate,
  type PricingLookupItem,
  type SubscriptionCandidate
} from '../../services/subscription-rules.js';
import {
  validateExistingPricings,
  validateExistingSubscriptions
} from './subscriptions.shared.js';

const STATUS_PARTICIPATING_IN_CONFLICTS = new Set(['DRAFT', 'ACTIVE', 'PAUSED']);

type BulkSubscriptionSnapshot = {
  id: string;
  accountId: string;
  scope: 'ACCOUNT' | 'PROPERTY';
  startDate: Date;
  endDate: Date | null;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CANCELED';
  paymentMethodId: string | null;
  targetProperties: Array<{ propertyId: string }>;
  subscriptionItems: Array<{ pricingId: string }>;
};

type PreparedBulkCandidate = {
  subscription: BulkSubscriptionSnapshot;
  candidate: SubscriptionCandidate;
  propertyIds: Set<string>;
  productIds: Set<string>;
  productLabelById: Map<string, string>;
};

type ManagePricingsPreviewLink = {
  subscriptionId: string;
  pricing: {
    id: string;
    product: {
      id: string;
      code: string;
      name: string;
    };
    internalName: string;
    type: 'FIXED' | 'TIERED';
    fixedAmountCents: number | null;
    minimumPriceCents: number | null;
    currency: string;
    billingInterval: string;
    isActive: boolean;
    tiers: Array<{
      id: string;
      fromUnit: number;
      toUnit: number | null;
      unitAmountCents: number;
    }>;
  };
};

type ManagePricingsPreviewItem = ManagePricingsPreviewLink['pricing'] & {
  usageCount: number;
};

export type ManagePricingsPreviewPayload = {
  subscriptionIds: string[];
};

export type ManagePricingsBulkPayload = {
  action: 'MANAGE_PRICINGS';
  subscriptionIds: string[];
  addPricingIds?: string[];
  removePricingIds?: string[];
};

function normalizeIdList(ids: string[]): string[] {
  return uniqueIds(ids.map((id) => id.trim()).filter((id) => id !== ''));
}

function getValidationMessage(subscriptionId: string, error: string): string {
  return `Bulk action would violate subscription rules for ${subscriptionId}: ${error}`;
}

function getSnapshotPropertyIds(snapshot: BulkSubscriptionSnapshot): string[] {
  if (snapshot.scope !== 'PROPERTY') {
    return [];
  }

  return uniqueIds(snapshot.targetProperties.map((target) => target.propertyId));
}

function pricingProductLabel(pricing: PricingLookupItem): string {
  if (pricing.product.code.trim() !== '') {
    return pricing.product.code;
  }

  if (pricing.product.name.trim() !== '') {
    return pricing.product.name;
  }

  return pricing.productId;
}

function rangesOverlap(
  leftStart: Date,
  leftEnd: Date | null,
  rightStart: Date,
  rightEnd: Date | null
): boolean {
  const infinity = new Date('9999-12-31T23:59:59.999Z');
  return !(leftStart > (rightEnd ?? infinity) || rightStart > (leftEnd ?? infinity));
}

function findFirstIntersection(left: Set<string>, right: Set<string>): string | null {
  for (const value of left) {
    if (right.has(value)) {
      return value;
    }
  }

  return null;
}

function findBulkConflict(candidates: PreparedBulkCandidate[]): {
  subscriptionId: string;
  message: string;
} | null {
  for (let leftIndex = 0; leftIndex < candidates.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < candidates.length; rightIndex += 1) {
      const left = candidates[leftIndex];
      const right = candidates[rightIndex];

      if (left.subscription.accountId !== right.subscription.accountId) {
        continue;
      }

      if (left.subscription.scope !== right.subscription.scope) {
        continue;
      }

      if (
        !rangesOverlap(
          left.subscription.startDate,
          left.subscription.endDate,
          right.subscription.startDate,
          right.subscription.endDate
        )
      ) {
        continue;
      }

      if (
        !STATUS_PARTICIPATING_IN_CONFLICTS.has(left.subscription.status) &&
        !STATUS_PARTICIPATING_IN_CONFLICTS.has(right.subscription.status)
      ) {
        continue;
      }

      const conflictingProductId = findFirstIntersection(left.productIds, right.productIds);
      if (!conflictingProductId) {
        continue;
      }

      const productLabel =
        left.productLabelById.get(conflictingProductId) ??
        right.productLabelById.get(conflictingProductId) ??
        conflictingProductId;

      if (left.subscription.scope === 'ACCOUNT') {
        return {
          subscriptionId: right.subscription.id,
          message: `Conflicting account-level subscription for product ${productLabel} already exists in overlapping date range`
        };
      }

      const hasPropertyIntersection =
        findFirstIntersection(left.propertyIds, right.propertyIds) !== null;
      if (!hasPropertyIntersection) {
        continue;
      }

      return {
        subscriptionId: right.subscription.id,
        message: `Conflicting property-level subscription for product ${productLabel} already exists for one or more selected properties in overlapping date range`
      };
    }
  }

  return null;
}

function buildSubscriptionCandidate(
  subscription: BulkSubscriptionSnapshot,
  pricingIds: string[]
): SubscriptionCandidate {
  return {
    accountId: subscription.accountId,
    scope: subscription.scope,
    propertyIds: getSnapshotPropertyIds(subscription),
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    status: subscription.status,
    paymentMethodId: subscription.paymentMethodId,
    pricingIds,
    excludeSubscriptionId: subscription.id
  };
}

function buildPreparedCandidate(
  subscription: BulkSubscriptionSnapshot,
  candidate: SubscriptionCandidate,
  pricingLookup: Map<string, PricingLookupItem>
): PreparedBulkCandidate {
  const productIds = new Set<string>();
  const productLabelById = new Map<string, string>();

  for (const pricingId of candidate.pricingIds) {
    const pricing = pricingLookup.get(pricingId);
    if (!pricing) {
      continue;
    }

    productIds.add(pricing.productId);
    productLabelById.set(pricing.productId, pricingProductLabel(pricing));
  }

  return {
    subscription,
    candidate,
    propertyIds: new Set(candidate.propertyIds),
    productIds,
    productLabelById
  };
}

async function loadSubscriptionsByIds(
  subscriptionIds: string[]
): Promise<Map<string, BulkSubscriptionSnapshot>> {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      id: {
        in: subscriptionIds
      }
    },
    select: {
      id: true,
      accountId: true,
      scope: true,
      startDate: true,
      endDate: true,
      status: true,
      paymentMethodId: true,
      targetProperties: {
        select: {
          propertyId: true
        }
      },
      subscriptionItems: {
        select: {
          pricingId: true
        }
      }
    }
  });

  return new Map(subscriptions.map((subscription) => [subscription.id, subscription]));
}

export function applyManagePricingsDelta(
  currentPricingIds: string[],
  addPricingIds: string[],
  removePricingIds: string[]
): string[] {
  const removeSet = new Set(normalizeIdList(removePricingIds));
  const normalizedCurrent = normalizeIdList(currentPricingIds);
  const normalizedAdditions = normalizeIdList(addPricingIds);

  const next = normalizedCurrent.filter((pricingId) => !removeSet.has(pricingId));
  const nextSet = new Set(next);

  for (const pricingId of normalizedAdditions) {
    if (nextSet.has(pricingId)) {
      continue;
    }

    next.push(pricingId);
    nextSet.add(pricingId);
  }

  return next;
}

export function replaceCurrentPricingsForAddedProducts(
  currentPricingIds: string[],
  addPricingIds: string[],
  pricingLookup: Map<string, PricingLookupItem>
): string[] {
  const addPricingIdSet = new Set(normalizeIdList(addPricingIds));
  const addedProductIds = new Set(
    normalizeIdList(addPricingIds)
      .map((pricingId) => pricingLookup.get(pricingId)?.productId)
      .filter((productId): productId is string => Boolean(productId))
  );

  if (addedProductIds.size === 0) {
    return normalizeIdList(currentPricingIds);
  }

  return normalizeIdList(currentPricingIds).filter((pricingId) => {
    if (addPricingIdSet.has(pricingId)) {
      return true;
    }

    const productId = pricingLookup.get(pricingId)?.productId;
    if (!productId) {
      return true;
    }

    return !addedProductIds.has(productId);
  });
}

export function buildManagePricingsPreviewItems(
  links: ManagePricingsPreviewLink[]
): ManagePricingsPreviewItem[] {
  const usageByPricingId = new Map<string, Set<string>>();
  const pricingById = new Map<string, ManagePricingsPreviewLink['pricing']>();

  for (const link of links) {
    const usage = usageByPricingId.get(link.pricing.id) ?? new Set<string>();
    usage.add(link.subscriptionId);
    usageByPricingId.set(link.pricing.id, usage);

    if (!pricingById.has(link.pricing.id)) {
      pricingById.set(link.pricing.id, link.pricing);
    }
  }

  return Array.from(pricingById.values())
    .map((pricing) => ({
      ...pricing,
      usageCount: usageByPricingId.get(pricing.id)?.size ?? 0
    }))
    .sort((left, right) => left.internalName.localeCompare(right.internalName));
}

export async function getManagePricingsPreview(
  payload: ManagePricingsPreviewPayload,
  reply: FastifyReply
) {
  const subscriptionIds = normalizeIdList(payload.subscriptionIds);
  const subscriptionsExist = await validateExistingSubscriptions(subscriptionIds);

  if (!subscriptionsExist) {
    reply.status(400).send({ message: 'One or more subscriptionIds are invalid' });
    return null;
  }

  const links = await prisma.subscriptionPricing.findMany({
    where: {
      subscriptionId: {
        in: subscriptionIds
      }
    },
    select: {
      subscriptionId: true,
      pricing: {
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true
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
  });

  return {
    targetedSubscriptions: subscriptionIds.length,
    items: buildManagePricingsPreviewItems(links)
  };
}

export async function applyManagePricingsBulkAction(
  payload: ManagePricingsBulkPayload,
  reply: FastifyReply
) {
  const subscriptionIds = normalizeIdList(payload.subscriptionIds);
  const subscriptionsExist = await validateExistingSubscriptions(subscriptionIds);

  if (!subscriptionsExist) {
    reply.status(400).send({ message: 'One or more subscriptionIds are invalid' });
    return null;
  }

  const addPricingIds = normalizeIdList(payload.addPricingIds ?? []);
  const removePricingIds = normalizeIdList(payload.removePricingIds ?? []);
  const touchedPricingIds = uniqueIds([...addPricingIds, ...removePricingIds]);

  if (touchedPricingIds.length === 0) {
    return {
      action: payload.action,
      targetedSubscriptions: subscriptionIds.length,
      targetedPricings: 0,
      deletedLinks: 0,
      createdLinks: 0
    };
  }

  const pricingsExist = await validateExistingPricings(touchedPricingIds);
  if (!pricingsExist) {
    reply.status(400).send({ message: 'One or more pricingIds are invalid' });
    return null;
  }

  const targetSubscriptionsById = await loadSubscriptionsByIds(subscriptionIds);
  const missingSubscriptionId = subscriptionIds.find((id) => !targetSubscriptionsById.has(id));
  if (missingSubscriptionId) {
    reply.status(400).send({ message: `Subscription ${missingSubscriptionId} was not found` });
    return null;
  }

  const currentPricingIds = Array.from(targetSubscriptionsById.values()).flatMap((subscription) =>
    subscription.subscriptionItems.map((item) => item.pricingId)
  );
  const pricingLookup = await loadPricingLookupByIds(prisma, [
    ...currentPricingIds,
    ...addPricingIds
  ]);

  const preparedCandidates: PreparedBulkCandidate[] = [];

  for (const subscriptionId of subscriptionIds) {
    const subscription = targetSubscriptionsById.get(subscriptionId);
    if (!subscription) {
      reply.status(400).send({ message: `Subscription ${subscriptionId} was not found` });
      return null;
    }

    const nextPricingIds = applyManagePricingsDelta(
      replaceCurrentPricingsForAddedProducts(
        subscription.subscriptionItems.map((item) => item.pricingId),
        addPricingIds,
        pricingLookup
      ),
      addPricingIds,
      removePricingIds
    );

    const selectionValidation = validatePricingSelection({
      pricingIds: nextPricingIds,
      pricingLookup,
      requireAtLeastOne: false
    });

    if (selectionValidation.error) {
      reply.status(400).send({
        message: getValidationMessage(subscriptionId, selectionValidation.error)
      });
      return null;
    }

    const candidate = buildSubscriptionCandidate(
      subscription,
      selectionValidation.normalizedPricingIds
    );
    const conflictError = await validateSubscriptionCandidate(prisma, candidate, {
      requireAtLeastOnePricing: false
    });
    if (conflictError) {
      reply.status(400).send({
        message: getValidationMessage(subscriptionId, conflictError)
      });
      return null;
    }

    preparedCandidates.push(
      buildPreparedCandidate(subscription, candidate, pricingLookup)
    );
  }

  const bulkConflict = findBulkConflict(preparedCandidates);
  if (bulkConflict) {
    reply.status(400).send({
      message: getValidationMessage(bulkConflict.subscriptionId, bulkConflict.message)
    });
    return null;
  }

  const linksToCreate = preparedCandidates.flatMap(({ subscription, candidate }) =>
    candidate.pricingIds.map((pricingId) => ({
      subscriptionId: subscription.id,
      pricingId,
      quantity: 1
    }))
  );

  const [deletedLinks, createdLinks] = await prisma.$transaction(async (tx) => {
    const deleted = await tx.subscriptionPricing.deleteMany({
      where: {
        subscriptionId: {
          in: subscriptionIds
        }
      }
    });

    if (linksToCreate.length === 0) {
      return [deleted.count, 0] as const;
    }

    const created = await tx.subscriptionPricing.createMany({
      data: linksToCreate
    });

    return [deleted.count, created.count] as const;
  });

  return {
    action: payload.action,
    targetedSubscriptions: subscriptionIds.length,
    targetedPricings: touchedPricingIds.length,
    deletedLinks,
    createdLinks
  };
}
