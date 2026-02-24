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
  | 'scope'
  | 'property'
  | 'units'
  | 'status'
  | 'pricings';
export type SubscriptionsSortDirection = 'asc' | 'desc';

export function getSubscriptionProperties(
  subscription: SubscriptionItem
): SubscriptionItem['properties'] {
  return subscription.properties;
}

export function getBulkActionLabel(action: SubscriptionBulkAction | null): string {
  switch (action) {
    case 'DELETE_SUBSCRIPTIONS':
      return 'Delete subscriptions';
    case 'ADD_PRICING':
      return 'New pricing';
    case 'REPLACE_PRICINGS':
      return 'Replace pricings';
    case 'DELETE_PRICING':
      return 'Delete pricing';
    case 'MANAGE_PRICINGS':
      return 'Manage pricings';
    case 'UPDATE_STATUS':
      return 'Change status';
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
  field: SubscriptionsSortField,
  accountTotalBillableUnitsById: Record<string, number>
): number {
  if (field === 'account') {
    return left.account.companyName.localeCompare(right.account.companyName);
  }

  if (field === 'scope') {
    const leftPriority = left.scope === 'ACCOUNT' ? 0 : 1;
    const rightPriority = right.scope === 'ACCOUNT' ? 0 : 1;
    return leftPriority - rightPriority;
  }

  if (field === 'property') {
    const leftPropertiesCount = getSubscriptionProperties(left).length;
    const rightPropertiesCount = getSubscriptionProperties(right).length;
    return leftPropertiesCount - rightPropertiesCount;
  }

  if (field === 'units') {
    const leftUnits = getSubscriptionUnitsCount(left, accountTotalBillableUnitsById);
    const rightUnits = getSubscriptionUnitsCount(right, accountTotalBillableUnitsById);
    return leftUnits - rightUnits;
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
  statusFilter: SubscriptionStatus[];
  accountIdsFilter: string[];
  pricingIdsFilter: string[];
};

export function buildSubscriptionsQueryParams(
  input: BuildSubscriptionsQueryParamsInput
): SubscriptionsQueryParams {
  const {
    page,
    pageSize,
    search,
    scopeFilter,
    statusFilter,
    accountIdsFilter,
    pricingIdsFilter
  } = input;

  return {
    page: page + 1,
    pageSize,
    search: search || undefined,
    scope: scopeFilter === 'ALL' ? undefined : scopeFilter,
    statuses: statusFilter.length > 0 ? statusFilter : undefined,
    accountIds: accountIdsFilter.length > 0 ? accountIdsFilter : undefined,
    pricingIds: pricingIdsFilter.length > 0 ? pricingIdsFilter : undefined
  };
}

export function sortSubscriptionRows(
  rows: SubscriptionItem[],
  sortField: SubscriptionsSortField | null,
  sortDirection: SubscriptionsSortDirection,
  accountTotalBillableUnitsById: Record<string, number>
): SubscriptionItem[] {
  if (!sortField) {
    return rows;
  }

  const sorted = [...rows];
  sorted.sort((left, right) => {
    const result = compareSubscriptionRows(left, right, sortField, accountTotalBillableUnitsById);
    return sortDirection === 'asc' ? result : -result;
  });

  return sorted;
}

function getSubscriptionUnitsCount(
  subscription: SubscriptionItem,
  accountTotalBillableUnitsById: Record<string, number>
): number {
  if (subscription.scope === 'ACCOUNT') {
    return accountTotalBillableUnitsById[subscription.account.id] ?? 0;
  }

  return subscription.properties.reduce((sum, property) => sum + property.billableUnits, 0);
}

export function toggleSelectedId(selectedIds: string[], subscriptionId: string): string[] {
  if (selectedIds.includes(subscriptionId)) {
    return selectedIds.filter((id) => id !== subscriptionId);
  }

  return [...selectedIds, subscriptionId];
}
