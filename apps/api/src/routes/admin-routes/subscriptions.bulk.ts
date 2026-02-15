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

type SubscriptionBulkAction =
  | 'DELETE_SUBSCRIPTIONS'
  | 'ADD_PRICING'
  | 'REPLACE_PRICINGS'
  | 'DELETE_PRICING';

export type SubscriptionBulkPayload = {
  action: SubscriptionBulkAction;
  subscriptionIds: string[];
  pricingIds?: string[];
};

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

const STATUS_PARTICIPATING_IN_CONFLICTS = new Set(['DRAFT', 'ACTIVE', 'PAUSED']);

function actionNeedsPricingIds(action: SubscriptionBulkAction): boolean {
  return action === 'ADD_PRICING' || action === 'REPLACE_PRICINGS' || action === 'DELETE_PRICING';
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

function getValidationMessage(subscriptionId: string, error: string): string {
  return `Bulk action would violate subscription rules for ${subscriptionId}: ${error}`;
}

export async function applySubscriptionBulkAction(
  payload: SubscriptionBulkPayload,
  reply: FastifyReply
) {
  const subscriptionIds = uniqueIds(payload.subscriptionIds);
  const subscriptionsExist = await validateExistingSubscriptions(subscriptionIds);

  if (!subscriptionsExist) {
    reply.status(400).send({ message: 'One or more subscriptionIds are invalid' });
    return null;
  }

  const pricingIds = uniqueIds(payload.pricingIds ?? []);
  const needsPricingIds = actionNeedsPricingIds(payload.action);
  if (needsPricingIds) {
    const pricingsExist = await validateExistingPricings(pricingIds);
    if (!pricingsExist) {
      reply.status(400).send({ message: 'One or more pricingIds are invalid' });
      return null;
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

  const targetSubscriptionsById = await loadSubscriptionsByIds(subscriptionIds);
  const missingSubscriptionId = subscriptionIds.find((id) => !targetSubscriptionsById.has(id));
  if (missingSubscriptionId) {
    reply.status(400).send({ message: `Subscription ${missingSubscriptionId} was not found` });
    return null;
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
  const currentPricingIdsBySubscription = new Map<string, string[]>();
  for (const link of existingLinks) {
    const current = currentPricingIdsBySubscription.get(link.subscriptionId) ?? [];
    current.push(link.pricingId);
    currentPricingIdsBySubscription.set(link.subscriptionId, current);
  }

  let pricingLookup = new Map<string, PricingLookupItem>();
  let replacementPricingIds: string[] = [];

  if (payload.action === 'REPLACE_PRICINGS') {
    pricingLookup = await loadPricingLookupByIds(prisma, pricingIds);
    const replacementValidation = validatePricingSelection({
      pricingIds,
      pricingLookup
    });

    if (replacementValidation.error) {
      reply.status(400).send({ message: replacementValidation.error });
      return null;
    }

    replacementPricingIds = replacementValidation.normalizedPricingIds;
  } else {
    pricingLookup = await loadPricingLookupByIds(prisma, [
      ...existingLinks.map((link) => link.pricingId),
      ...pricingIds
    ]);
  }

  const pricingIdsToDelete = new Set(pricingIds);
  const preparedCandidates: PreparedBulkCandidate[] = [];

  for (const subscriptionId of subscriptionIds) {
    const subscription = targetSubscriptionsById.get(subscriptionId);
    if (!subscription) {
      reply.status(400).send({ message: `Subscription ${subscriptionId} was not found` });
      return null;
    }

    const currentPricingIds =
      currentPricingIdsBySubscription.get(subscriptionId) ??
      subscription.subscriptionItems.map((item) => item.pricingId);

    const nextPricingIds =
      payload.action === 'ADD_PRICING'
        ? [...currentPricingIds, ...pricingIds]
        : payload.action === 'REPLACE_PRICINGS'
          ? replacementPricingIds
          : currentPricingIds.filter((pricingId) => !pricingIdsToDelete.has(pricingId));

    const selectionValidation = validatePricingSelection({
      pricingIds: nextPricingIds,
      pricingLookup
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
    const conflictError = await validateSubscriptionCandidate(prisma, candidate);
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

  if (payload.action === 'ADD_PRICING') {
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
          replacementPricingIds.map((pricingId) => ({
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
}
