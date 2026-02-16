import type { PricingTreeSubscriptionSummary, SubscriptionItem } from '../../api';
import type { PricingFormSubscriptionOption } from './components/PricingFormSections';

type SubscriptionSyncPlan = {
  nextIds: string[];
  subscriptionIdsToAttach: string[];
  subscriptionIdsToDetach: string[];
};

export function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter((id) => id.trim() !== '')));
}

export function formatPropertiesCount(count: number): string {
  return count === 1 ? '1 property' : `${count} properties`;
}

export function buildSubscriptionOptions(
  subscriptions: SubscriptionItem[],
  defaultSubscriptions: PricingTreeSubscriptionSummary[] | undefined
): PricingFormSubscriptionOption[] {
  const byId = new Map<string, PricingFormSubscriptionOption>();

  for (const subscription of subscriptions) {
    byId.set(subscription.id, {
      id: subscription.id,
      accountName: subscription.account.companyName,
      scope: subscription.scope,
      status: subscription.status,
      propertiesLabel:
        subscription.scope === 'ACCOUNT'
          ? 'All properties'
          : formatPropertiesCount(subscription.properties.length)
    });
  }

  for (const subscription of defaultSubscriptions ?? []) {
    if (byId.has(subscription.id)) {
      continue;
    }

    byId.set(subscription.id, {
      id: subscription.id,
      accountName: subscription.account.companyName,
      scope: subscription.scope,
      status: subscription.status,
      propertiesLabel: subscription.coverageLabel
    });
  }

  return Array.from(byId.values());
}

export function getBlockedSubscriptionIds(
  productId: string,
  pricingId: string | null,
  subscriptions: SubscriptionItem[]
): string[] {
  if (productId.trim() === '') {
    return [];
  }

  return subscriptions
    .filter((subscription) =>
      subscription.pricings.some(
        (pricing) => pricing.product.id === productId && pricing.id !== (pricingId ?? '')
      )
    )
    .map((subscription) => subscription.id);
}

export function buildSubscriptionSyncPlan(
  initialSubscriptionIds: string[],
  nextSubscriptionIds: string[]
): SubscriptionSyncPlan {
  const nextIds = uniqueIds(nextSubscriptionIds);
  const nextIdSet = new Set(nextIds);
  const previousIds = uniqueIds(initialSubscriptionIds);
  const previousIdSet = new Set(previousIds);

  return {
    nextIds,
    subscriptionIdsToAttach: nextIds.filter((subscriptionId) => !previousIdSet.has(subscriptionId)),
    subscriptionIdsToDetach: previousIds.filter((subscriptionId) => !nextIdSet.has(subscriptionId))
  };
}

export function getSubscriptionConflictMessage(
  subscriptionIds: string[],
  subscriptionById: Map<string, { accountName: string }>
): string {
  const labels = subscriptionIds
    .map((id) => subscriptionById.get(id)?.accountName ?? id)
    .slice(0, 3);
  const suffix = subscriptionIds.length > labels.length ? ', ...' : '';

  return `Selected subscriptions already have a pricing for this product: ${labels.join(', ')}${suffix}. Remove conflicting subscriptions before saving.`;
}
