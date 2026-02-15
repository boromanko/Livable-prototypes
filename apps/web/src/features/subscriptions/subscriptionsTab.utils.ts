import type {
  BillingScope,
  SubscriptionBulkAction,
  SubscriptionItem,
  SubscriptionStatus,
  SubscriptionsQueryParams
} from '../../api';
import { getApiErrorMessage } from '../../lib/errors/getApiErrorMessage';

export type SubscriptionsSortField =
  | 'account'
  | 'property'
  | 'startDate'
  | 'endDate'
  | 'status'
  | 'pricings';
export type SubscriptionsSortDirection = 'asc' | 'desc';

export function getBulkActionLabel(action: SubscriptionBulkAction | null): string {
  switch (action) {
    case 'DELETE_SUBSCRIPTIONS':
      return 'Delete subscriptions';
    case 'ADD_PRICING':
      return 'Add pricing';
    case 'REPLACE_PRICINGS':
      return 'Replace pricings';
    case 'DELETE_PRICING':
      return 'Delete pricing';
    default:
      return 'Apply action';
  }
}

export function getBulkErrorMessage(error: unknown): string {
  return getApiErrorMessage(error, {
    defaultMessage: 'Bulk action failed',
    statusMessagePrefix: 'Bulk action failed with status'
  });
}

export function compareSubscriptionRows(
  left: SubscriptionItem,
  right: SubscriptionItem,
  field: SubscriptionsSortField
): number {
  if (field === 'account') {
    return left.account.companyName.localeCompare(right.account.companyName);
  }

  if (field === 'property') {
    return (left.property?.address ?? '').localeCompare(right.property?.address ?? '');
  }

  if (field === 'startDate') {
    const leftValue = Date.parse(left.startDate);
    const rightValue = Date.parse(right.startDate);
    return leftValue - rightValue;
  }

  if (field === 'endDate') {
    const leftValue = left.endDate ? Date.parse(left.endDate) : Number.POSITIVE_INFINITY;
    const rightValue = right.endDate ? Date.parse(right.endDate) : Number.POSITIVE_INFINITY;
    return leftValue - rightValue;
  }

  if (field === 'status') {
    return left.status.localeCompare(right.status);
  }

  return left.pricings.length - right.pricings.length;
}

type BuildSubscriptionsQueryParamsInput = {
  page: number;
  pageSize: number;
  search: string;
  scopeFilter: 'ALL' | BillingScope;
  statusFilter: 'ALL' | SubscriptionStatus;
  accountIdFilter: string;
};

export function buildSubscriptionsQueryParams(
  input: BuildSubscriptionsQueryParamsInput
): SubscriptionsQueryParams {
  const { page, pageSize, search, scopeFilter, statusFilter, accountIdFilter } = input;

  return {
    page: page + 1,
    pageSize,
    search: search || undefined,
    scope: scopeFilter === 'ALL' ? undefined : scopeFilter,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    accountId: accountIdFilter || undefined
  };
}

export function sortSubscriptionRows(
  rows: SubscriptionItem[],
  sortField: SubscriptionsSortField | null,
  sortDirection: SubscriptionsSortDirection
): SubscriptionItem[] {
  if (!sortField) {
    return rows;
  }

  const sorted = [...rows];
  sorted.sort((left, right) => {
    const result = compareSubscriptionRows(left, right, sortField);
    return sortDirection === 'asc' ? result : -result;
  });

  return sorted;
}

export function filterSelectedIdsToVisible(selectedIds: string[], visibleIds: string[]): string[] {
  if (visibleIds.length === 0) {
    return [];
  }

  const visibleSet = new Set(visibleIds);
  return selectedIds.filter((id) => visibleSet.has(id));
}

export function toggleSelectedId(selectedIds: string[], subscriptionId: string): string[] {
  if (selectedIds.includes(subscriptionId)) {
    return selectedIds.filter((id) => id !== subscriptionId);
  }

  return [...selectedIds, subscriptionId];
}

export function toggleVisibleSelectedIds(
  selectedIds: string[],
  visibleIds: string[],
  allVisibleSelected: boolean
): string[] {
  if (allVisibleSelected) {
    return selectedIds.filter((id) => !visibleIds.includes(id));
  }

  const next = new Set(selectedIds);
  for (const id of visibleIds) {
    next.add(id);
  }
  return Array.from(next);
}

export function requiresPricingSelection(action: SubscriptionBulkAction | null): boolean {
  return action === 'ADD_PRICING' || action === 'REPLACE_PRICINGS' || action === 'DELETE_PRICING';
}
