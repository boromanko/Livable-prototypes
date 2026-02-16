import type { FastifyReply } from 'fastify';
import { prisma } from '@stripe-integration/db';
import { uniqueIds } from '../../services/subscription-rules.js';
import { validateExistingSubscriptions } from './subscriptions.shared.js';

export type SubscriptionStatusPreviewPayload = {
  subscriptionIds: string[];
};

type SubscriptionStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CANCELED';

type StatusCounts = Record<SubscriptionStatus, number>;

function normalizeSubscriptionIds(subscriptionIds: string[]): string[] {
  return uniqueIds(subscriptionIds.map((id) => id.trim()).filter((id) => id !== ''));
}

export function buildSubscriptionStatusCounts(
  statuses: Array<{ status: SubscriptionStatus }>
): StatusCounts {
  const counts: StatusCounts = {
    DRAFT: 0,
    ACTIVE: 0,
    PAUSED: 0,
    CANCELED: 0
  };

  for (const item of statuses) {
    counts[item.status] += 1;
  }

  return counts;
}

export async function getSubscriptionStatusPreview(
  payload: SubscriptionStatusPreviewPayload,
  reply: FastifyReply
) {
  const subscriptionIds = normalizeSubscriptionIds(payload.subscriptionIds);
  const subscriptionsExist = await validateExistingSubscriptions(subscriptionIds);

  if (!subscriptionsExist) {
    reply.status(400).send({ message: 'One or more subscriptionIds are invalid' });
    return null;
  }

  const statuses = await prisma.subscription.findMany({
    where: {
      id: {
        in: subscriptionIds
      }
    },
    select: {
      status: true
    }
  });

  return {
    targetedSubscriptions: subscriptionIds.length,
    statusCounts: buildSubscriptionStatusCounts(statuses)
  };
}
