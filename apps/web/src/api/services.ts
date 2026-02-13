import { apiRequest } from './http';
import type {
  AccountsQueryParams,
  AccountsResponse,
  CreatePricingPayload,
  CreateSubscriptionPayload,
  DeletePricingResponse,
  HealthResponse,
  PaymentMethodsQueryParams,
  PaymentMethodsResponse,
  PricingsQueryParams,
  PricingsTreeResponse,
  PricingsResponse,
  ProductsResponse,
  PropertiesQueryParams,
  PropertiesResponse,
  SubscriptionBulkPayload,
  SubscriptionBulkResponse,
  SubscriptionsQueryParams,
  SubscriptionsResponse,
  UpdatePropertyUnitsPayload,
  UpdatePropertyUnitsResponse,
  UpdatePricingPayload,
  UpdateSubscriptionPayload,
  UpsertPricingResponse,
  UpsertSubscriptionResponse
} from './types';

export const api = {
  health: (): Promise<HealthResponse> => apiRequest('/api/health'),

  getAccounts: (params: AccountsQueryParams): Promise<AccountsResponse> =>
    apiRequest('/api/admin/accounts', { query: params }),

  getProperties: (params: PropertiesQueryParams): Promise<PropertiesResponse> =>
    apiRequest('/api/admin/properties', { query: params }),

  updatePropertyUnits: (
    propertyId: string,
    payload: UpdatePropertyUnitsPayload
  ): Promise<UpdatePropertyUnitsResponse> =>
    apiRequest(`/api/admin/properties/${propertyId}/units`, {
      method: 'PATCH',
      body: payload
    }),

  getPaymentMethods: (params: PaymentMethodsQueryParams): Promise<PaymentMethodsResponse> =>
    apiRequest('/api/admin/payment-methods', { query: params }),

  getProducts: (): Promise<ProductsResponse> => apiRequest('/api/admin/products'),

  getPricings: (params: PricingsQueryParams): Promise<PricingsResponse> =>
    apiRequest('/api/admin/pricings', { query: params }),

  getPricingsTree: (): Promise<PricingsTreeResponse> => apiRequest('/api/admin/pricings-tree'),

  createPricing: (payload: CreatePricingPayload): Promise<UpsertPricingResponse> =>
    apiRequest('/api/admin/pricings', {
      method: 'POST',
      body: payload
    }),

  updatePricing: (
    pricingId: string,
    payload: UpdatePricingPayload
  ): Promise<UpsertPricingResponse> =>
    apiRequest(`/api/admin/pricings/${pricingId}`, {
      method: 'PATCH',
      body: payload
    }),

  deletePricing: (pricingId: string): Promise<DeletePricingResponse> =>
    apiRequest(`/api/admin/pricings/${pricingId}`, {
      method: 'DELETE'
    }),

  getSubscriptions: (params: SubscriptionsQueryParams): Promise<SubscriptionsResponse> =>
    apiRequest('/api/admin/subscriptions', { query: params }),

  createSubscription: (
    payload: CreateSubscriptionPayload
  ): Promise<UpsertSubscriptionResponse> =>
    apiRequest('/api/admin/subscriptions', {
      method: 'POST',
      body: payload
    }),

  updateSubscription: (
    subscriptionId: string,
    payload: UpdateSubscriptionPayload
  ): Promise<UpsertSubscriptionResponse> =>
    apiRequest(`/api/admin/subscriptions/${subscriptionId}`, {
      method: 'PATCH',
      body: payload
    }),

  bulkSubscriptions: (
    payload: SubscriptionBulkPayload
  ): Promise<SubscriptionBulkResponse> =>
    apiRequest('/api/admin/subscriptions/bulk', {
      method: 'POST',
      body: payload
    })
};
