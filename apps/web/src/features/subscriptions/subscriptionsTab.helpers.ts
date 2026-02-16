import type {
  BillingScope,
  PricingItem,
  SubscriptionItem,
  SubscriptionPricingItem,
  SubscriptionStatus
} from '../../api';
import { api } from '../../api';
import { buildSubscriptionsQueryParams } from './subscriptionsTab.utils';
import { subscriptionStatusOptions } from '../../lib/subscriptions/status';

type SubscriptionsFiltersSnapshot = {
  search: string;
  scopeFilter: 'ALL' | BillingScope;
  statusFilter: SubscriptionStatus[];
  accountIdsFilter: string[];
  pricingIdsFilter: string[];
};

type ManagePricingChanges = {
  addPricingIds: string[];
  removePricingIds: string[];
};

export function buildSubscriptionsFiltersKey(filters: SubscriptionsFiltersSnapshot): string {
  const {
    search,
    scopeFilter,
    statusFilter,
    accountIdsFilter,
    pricingIdsFilter
  } = filters;

  return JSON.stringify({
    search,
    scopeFilter,
    statusFilter: [...statusFilter].sort(),
    accountIdsFilter: [...accountIdsFilter].sort(),
    pricingIdsFilter: [...pricingIdsFilter].sort()
  });
}

export async function loadAllMatchingSubscriptionIds(
  filters: SubscriptionsFiltersSnapshot
): Promise<string[]> {
  const expandedPageSize = 100;
  const firstPage = await api.getSubscriptions(
    buildSubscriptionsQueryParams({
      page: 0,
      pageSize: expandedPageSize,
      ...filters
    })
  );
  const allIds = firstPage.items.map((item) => item.id);
  const totalPages = Math.ceil(firstPage.total / expandedPageSize);

  if (totalPages <= 1) {
    return allIds;
  }

  const otherPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_value, index) =>
      api.getSubscriptions(
        buildSubscriptionsQueryParams({
          page: index + 1,
          pageSize: expandedPageSize,
          ...filters
        })
      )
    )
  );

  for (const pageResponse of otherPages) {
    for (const item of pageResponse.items) {
      allIds.push(item.id);
    }
  }

  return Array.from(new Set(allIds));
}

export function toPricingItem(pricing: SubscriptionPricingItem): PricingItem {
  return {
    id: pricing.id,
    product: pricing.product,
    internalName: pricing.internalName,
    type: pricing.type,
    fixedAmountCents: pricing.fixedAmountCents,
    minimumPriceCents: pricing.minimumPriceCents,
    currency: pricing.currency,
    billingInterval: pricing.billingInterval,
    isActive: pricing.isActive,
    createdAt: '',
    subscriptionsCount: 0,
    tiers: pricing.tiers
  };
}

export function buildEmptyStatusCounts(): Record<SubscriptionStatus, number> {
  return {
    DRAFT: 0,
    ACTIVE: 0,
    PAUSED: 0,
    CANCELED: 0
  };
}

export function getSingleSelectedStatus(
  statusCounts: Record<SubscriptionStatus, number>
): SubscriptionStatus | null {
  const nonZeroStatuses = subscriptionStatusOptions.filter((status) => statusCounts[status] > 0);
  return nonZeroStatuses.length === 1 ? nonZeroStatuses[0] : null;
}

export function getSubscriptionDisplayName(subscription: SubscriptionItem): string {
  const companyName = subscription.account.companyName.trim();
  if (companyName !== '') {
    return companyName;
  }

  return subscription.id;
}

export function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter((id) => id.trim() !== '')));
}

export function haveSameIdSet(left: string[], right: string[]): boolean {
  const leftUnique = uniqueIds(left);
  const rightUnique = uniqueIds(right);

  if (leftUnique.length !== rightUnique.length) {
    return false;
  }

  const rightSet = new Set(rightUnique);
  return leftUnique.every((id) => rightSet.has(id));
}

export function buildManagePricingChanges(
  initialPricingIds: string[],
  currentPricingIds: string[]
): ManagePricingChanges {
  const uniqueInitialPricingIds = uniqueIds(initialPricingIds);
  const uniqueCurrentPricingIds = uniqueIds(currentPricingIds);
  const currentPricingSet = new Set(uniqueCurrentPricingIds);
  const initialPricingSet = new Set(uniqueInitialPricingIds);

  return {
    addPricingIds: uniqueCurrentPricingIds.filter((pricingId) => !initialPricingSet.has(pricingId)),
    removePricingIds: uniqueInitialPricingIds.filter((pricingId) => !currentPricingSet.has(pricingId))
  };
}
