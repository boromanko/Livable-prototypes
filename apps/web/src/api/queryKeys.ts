import type {
  AccountsQueryParams,
  PaymentMethodsQueryParams,
  PricingsQueryParams,
  PropertiesQueryParams,
  SubscriptionAvailabilityPreviewPayload,
  SubscriptionTransferEligibilityPayload,
  SubscriptionsQueryParams
} from './types';

const adminBaseKey = ['admin'] as const;

export const queryKeys = {
  health: ['health'] as const,
  admin: {
    all: adminBaseKey,
    accountsAll: [...adminBaseKey, 'accounts'] as const,
    accounts: (params: AccountsQueryParams) => [...adminBaseKey, 'accounts', params] as const,
    propertiesAll: [...adminBaseKey, 'properties'] as const,
    properties: (params: PropertiesQueryParams) =>
      [...adminBaseKey, 'properties', params] as const,
    paymentMethodsAll: [...adminBaseKey, 'paymentMethods'] as const,
    paymentMethods: (params: PaymentMethodsQueryParams) =>
      [...adminBaseKey, 'paymentMethods', params] as const,
    productsAll: [...adminBaseKey, 'products'] as const,
    pricingsAll: [...adminBaseKey, 'pricings'] as const,
    pricings: (params: PricingsQueryParams) => [...adminBaseKey, 'pricings', params] as const,
    pricingsTreeAll: [...adminBaseKey, 'pricingsTree'] as const,
    subscriptionsAll: [...adminBaseKey, 'subscriptions'] as const,
    subscriptions: (params: SubscriptionsQueryParams) =>
      [...adminBaseKey, 'subscriptions', params] as const,
    subscription: (subscriptionId: string) =>
      [...adminBaseKey, 'subscriptions', subscriptionId] as const,
    subscriptionTransferEligibility: (
      subscriptionId: string,
      payload: SubscriptionTransferEligibilityPayload
    ) => [...adminBaseKey, 'subscriptions', subscriptionId, 'transferEligibility', payload] as const,
    subscriptionAvailabilityPreview: (payload: SubscriptionAvailabilityPreviewPayload) =>
      [...adminBaseKey, 'subscriptions', 'availabilityPreview', payload] as const
  }
};
