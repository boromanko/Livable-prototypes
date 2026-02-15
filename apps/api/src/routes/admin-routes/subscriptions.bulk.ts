import type { FastifyReply } from 'fastify';
import { prisma } from '@stripe-integration/db';
import {
  loadPricingLookupByIds,
  uniqueIds,
  validatePricingSelection
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

function actionNeedsPricingIds(action: SubscriptionBulkAction): boolean {
  return action === 'ADD_PRICING' || action === 'REPLACE_PRICINGS' || action === 'DELETE_PRICING';
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

  if (payload.action === 'ADD_PRICING') {
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

    const pricingLookup = await loadPricingLookupByIds(prisma, [
      ...pricingIds,
      ...existingLinks.map((link) => link.pricingId)
    ]);

    const existingPricingIdsBySubscription = new Map<string, string[]>();
    for (const link of existingLinks) {
      const current = existingPricingIdsBySubscription.get(link.subscriptionId) ?? [];
      current.push(link.pricingId);
      existingPricingIdsBySubscription.set(link.subscriptionId, current);
    }

    for (const subscriptionId of subscriptionIds) {
      const currentPricingIds = existingPricingIdsBySubscription.get(subscriptionId) ?? [];
      const nextPricingIds = [...currentPricingIds, ...pricingIds];
      const nextSelectionValidation = validatePricingSelection({
        pricingIds: nextPricingIds,
        pricingLookup
      });

      if (nextSelectionValidation.error) {
        reply.status(400).send({
          message: `Bulk action would violate pricing rules for subscription ${subscriptionId}: ${nextSelectionValidation.error}`
        });
        return null;
      }
    }

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
    const pricingLookup = await loadPricingLookupByIds(prisma, pricingIds);
    const nextSelectionValidation = validatePricingSelection({
      pricingIds,
      pricingLookup
    });

    if (nextSelectionValidation.error) {
      reply.status(400).send({ message: nextSelectionValidation.error });
      return null;
    }

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
  const pricingLookup = await loadPricingLookupByIds(
    prisma,
    existingLinks.map((link) => link.pricingId)
  );
  const pricingIdsToDelete = new Set(pricingIds);
  const existingPricingIdsBySubscription = new Map<string, string[]>();
  for (const link of existingLinks) {
    const current = existingPricingIdsBySubscription.get(link.subscriptionId) ?? [];
    current.push(link.pricingId);
    existingPricingIdsBySubscription.set(link.subscriptionId, current);
  }

  for (const subscriptionId of subscriptionIds) {
    const currentPricingIds = existingPricingIdsBySubscription.get(subscriptionId) ?? [];
    const nextPricingIds = currentPricingIds.filter((pricingId) => !pricingIdsToDelete.has(pricingId));
    const nextSelectionValidation = validatePricingSelection({
      pricingIds: nextPricingIds,
      pricingLookup
    });

    if (nextSelectionValidation.error) {
      reply.status(400).send({
        message: `Bulk action would violate pricing rules for subscription ${subscriptionId}: ${nextSelectionValidation.error}`
      });
      return null;
    }
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
