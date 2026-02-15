import type { SubscriptionBulkAction, SubscriptionItem } from '../../api';
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
