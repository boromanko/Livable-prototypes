import type { BillingScope, SubscriptionItem, SubscriptionStatus } from '../../api';
import { toDateInputValue } from '../../lib/format/date';

export type SubscriptionFormState = {
  accountId: string;
  scope: BillingScope;
  propertyId: string;
  startDate: string;
  endDate: string;
  hasEndDate: boolean;
  status: SubscriptionStatus;
  paymentMethodId: string;
  pricingIds: string[];
};

export const subscriptionStatusOptions: SubscriptionStatus[] = [
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'CANCELED'
];
export const subscriptionScopeOptions: BillingScope[] = ['ACCOUNT', 'PROPERTY'];

export function buildInitialSubscriptionFormState(
  defaultAccountId?: string,
  defaultPricingIds?: string[],
  defaultScope: BillingScope = 'ACCOUNT'
): SubscriptionFormState {
  return {
    accountId: defaultAccountId ?? '',
    scope: defaultScope,
    propertyId: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    hasEndDate: false,
    status: 'DRAFT',
    paymentMethodId: '',
    pricingIds: defaultPricingIds ?? []
  };
}

export function buildFormStateFromSubscription(
  subscription: SubscriptionItem
): SubscriptionFormState {
  return {
    accountId: subscription.account.id,
    scope: subscription.scope,
    propertyId: subscription.property?.id ?? '',
    startDate: toDateInputValue(subscription.startDate),
    endDate: toDateInputValue(subscription.endDate),
    hasEndDate: Boolean(subscription.endDate),
    status: subscription.status,
    paymentMethodId: subscription.paymentMethod?.id ?? '',
    pricingIds: subscription.pricings.map((pricing) => pricing.id)
  };
}

export function canSubmitSubscriptionForm(formState: SubscriptionFormState): boolean {
  if (!formState.accountId) {
    return false;
  }

  if (!formState.startDate) {
    return false;
  }

  if (formState.scope === 'PROPERTY' && !formState.propertyId) {
    return false;
  }

  if (formState.pricingIds.length === 0) {
    return false;
  }

  if (formState.hasEndDate && !formState.endDate) {
    return false;
  }

  return true;
}
