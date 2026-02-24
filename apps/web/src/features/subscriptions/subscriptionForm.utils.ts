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
  pricingIds: string[];
};

export type SubscriptionFormValidationState = {
  accountError: boolean;
  propertyError: boolean;
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
    startDate: toDateInputValue(subscription.startDate) || getTodayDateInputValue(),
    endDate: toDateInputValue(subscription.endDate),
    status: subscription.status,
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
  const propertyError = formState.scope === 'PROPERTY' && formState.propertyIds.length === 0;
  const pricingsError = formState.pricingIds.length === 0;
  const hasErrors = accountError || propertyError || pricingsError;

  return {
    accountError,
    propertyError,
    pricingsError,
    hasErrors
  };
}
