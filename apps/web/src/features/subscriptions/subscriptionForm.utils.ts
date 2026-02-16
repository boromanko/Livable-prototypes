import type { BillingScope, SubscriptionItem, SubscriptionStatus } from '../../api';
import { getTodayDateInputValue, toDateInputValue } from '../../lib/format/date';
import { subscriptionStatusOptions } from '../../lib/subscriptions/status';

export type SubscriptionFormState = {
  accountId: string;
  scope: BillingScope;
  propertyIds: string[];
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  paymentMethodId: string;
  pricingIds: string[];
};

export type SubscriptionFormValidationState = {
  accountError: boolean;
  propertyError: boolean;
  startDateError: boolean;
  pricingsError: boolean;
  hasErrors: boolean;
};

export { subscriptionStatusOptions };

export function buildInitialSubscriptionFormState(
  defaultAccountId?: string,
  defaultPricingIds?: string[],
  defaultScope: BillingScope = 'ACCOUNT'
): SubscriptionFormState {
  return {
    accountId: defaultAccountId ?? '',
    scope: defaultScope,
    propertyIds: [],
    startDate: getTodayDateInputValue(),
    endDate: '',
    status: 'DRAFT',
    paymentMethodId: '',
    pricingIds: defaultPricingIds ?? []
  };
}

export function buildFormStateFromSubscription(
  subscription: SubscriptionItem
): SubscriptionFormState {
  const properties = subscription.properties;
  const propertyIds =
    subscription.scope === 'PROPERTY'
      ? properties.map((property) => property.id)
      : [];

  return {
    accountId: subscription.account.id,
    scope: subscription.scope,
    propertyIds,
    startDate: toDateInputValue(subscription.startDate),
    endDate: toDateInputValue(subscription.endDate),
    status: subscription.status,
    paymentMethodId: subscription.paymentMethod?.id ?? '',
    pricingIds: subscription.pricings.map((pricing) => pricing.id)
  };
}

export function canSubmitSubscriptionForm(formState: SubscriptionFormState): boolean {
  return !getSubscriptionFormValidationState(formState).hasErrors;
}

export function getSubscriptionFormValidationState(
  formState: SubscriptionFormState
): SubscriptionFormValidationState {
  const accountError = formState.accountId.trim() === '';
  const startDateError = formState.startDate.trim() === '';
  const propertyError = formState.scope === 'PROPERTY' && formState.propertyIds.length === 0;
  const pricingsError = formState.pricingIds.length === 0;
  const hasErrors = accountError || startDateError || propertyError || pricingsError;

  return {
    accountError,
    propertyError,
    startDateError,
    pricingsError,
    hasErrors
  };
}
