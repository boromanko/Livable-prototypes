import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult
} from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { api } from './services';
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
  SubscriptionAvailabilityPreviewPayload,
  SubscriptionAvailabilityPreviewResponse,
  SubscriptionTransferEligibilityPayload,
  SubscriptionTransferEligibilityResponse,
  SubscriptionsQueryParams,
  SubscriptionsResponse,
  UpdatePropertyUnitsPayload,
  UpdatePropertyUnitsResponse,
  UpdatePricingPayload,
  UpdateSubscriptionPayload,
  UpsertPricingResponse,
  UpsertSubscriptionResponse
} from './types';

export function useHealthQuery(): UseQueryResult<HealthResponse, Error> {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: api.health
  });
}

export function useAccountsQuery(
  params: AccountsQueryParams
): UseQueryResult<AccountsResponse, Error> {
  return useQuery({
    queryKey: queryKeys.admin.accounts(params),
    queryFn: () => api.getAccounts(params)
  });
}

export function usePropertiesQuery(
  params: PropertiesQueryParams,
  options?: { enabled?: boolean }
): UseQueryResult<PropertiesResponse, Error> {
  return useQuery({
    queryKey: queryKeys.admin.properties(params),
    queryFn: () => api.getProperties(params),
    enabled: options?.enabled ?? true
  });
}

export function useProductsQuery(): UseQueryResult<ProductsResponse, Error> {
  return useQuery({
    queryKey: queryKeys.admin.productsAll,
    queryFn: api.getProducts
  });
}

export function usePaymentMethodsQuery(
  params: PaymentMethodsQueryParams,
  options?: { enabled?: boolean }
): UseQueryResult<PaymentMethodsResponse, Error> {
  return useQuery({
    queryKey: queryKeys.admin.paymentMethods(params),
    queryFn: () => api.getPaymentMethods(params),
    enabled: options?.enabled ?? true
  });
}

export function usePricingsQuery(
  params: PricingsQueryParams
): UseQueryResult<PricingsResponse, Error> {
  return useQuery({
    queryKey: queryKeys.admin.pricings(params),
    queryFn: () => api.getPricings(params)
  });
}

export function usePricingsTreeQuery(): UseQueryResult<PricingsTreeResponse, Error> {
  return useQuery({
    queryKey: queryKeys.admin.pricingsTreeAll,
    queryFn: api.getPricingsTree
  });
}

export function useSubscriptionsQuery(
  params: SubscriptionsQueryParams
): UseQueryResult<SubscriptionsResponse, Error> {
  return useQuery({
    queryKey: queryKeys.admin.subscriptions(params),
    queryFn: () => api.getSubscriptions(params)
  });
}

export function useSubscriptionTransferEligibilityQuery(
  subscriptionId: string,
  payload: SubscriptionTransferEligibilityPayload,
  options?: { enabled?: boolean }
): UseQueryResult<SubscriptionTransferEligibilityResponse, Error> {
  return useQuery({
    queryKey: queryKeys.admin.subscriptionTransferEligibility(subscriptionId, payload),
    queryFn: () => api.getSubscriptionTransferEligibility(subscriptionId, payload),
    enabled: options?.enabled ?? true
  });
}

export function useSubscriptionAvailabilityPreviewQuery(
  payload: SubscriptionAvailabilityPreviewPayload,
  options?: { enabled?: boolean }
): UseQueryResult<SubscriptionAvailabilityPreviewResponse, Error> {
  return useQuery({
    queryKey: queryKeys.admin.subscriptionAvailabilityPreview(payload),
    queryFn: () => api.getSubscriptionAvailabilityPreview(payload),
    enabled: options?.enabled ?? true
  });
}

export function useCreatePricingMutation(): UseMutationResult<
  UpsertPricingResponse,
  Error,
  CreatePricingPayload
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createPricing,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.pricingsAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.pricingsTreeAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.productsAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.subscriptionsAll })
      ]);
    }
  });
}

export function useUpdatePricingMutation(): UseMutationResult<
  UpsertPricingResponse,
  Error,
  { pricingId: string; payload: UpdatePricingPayload }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pricingId, payload }) => api.updatePricing(pricingId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.pricingsAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.pricingsTreeAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.subscriptionsAll })
      ]);
    }
  });
}

export function useDeletePricingMutation(): UseMutationResult<
  DeletePricingResponse,
  Error,
  string
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deletePricing,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.pricingsAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.pricingsTreeAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.productsAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.subscriptionsAll })
      ]);
    }
  });
}

export function useCreateSubscriptionMutation(): UseMutationResult<
  UpsertSubscriptionResponse,
  Error,
  CreateSubscriptionPayload
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createSubscription,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.subscriptionsAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.pricingsTreeAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.accountsAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.propertiesAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.pricingsAll })
      ]);
    }
  });
}

export function useUpdateSubscriptionMutation(): UseMutationResult<
  UpsertSubscriptionResponse,
  Error,
  { subscriptionId: string; payload: UpdateSubscriptionPayload }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ subscriptionId, payload }) =>
      api.updateSubscription(subscriptionId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.subscriptionsAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.pricingsTreeAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.accountsAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.propertiesAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.pricingsAll })
      ]);
    }
  });
}

export function useBulkSubscriptionsMutation(): UseMutationResult<
  SubscriptionBulkResponse,
  Error,
  SubscriptionBulkPayload
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.bulkSubscriptions,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.subscriptionsAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.pricingsTreeAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.accountsAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.propertiesAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.pricingsAll })
      ]);
    }
  });
}

export function useUpdatePropertyUnitsMutation(): UseMutationResult<
  UpdatePropertyUnitsResponse,
  Error,
  { propertyId: string; payload: UpdatePropertyUnitsPayload }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ propertyId, payload }) => api.updatePropertyUnits(propertyId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.propertiesAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.accountsAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.pricingsTreeAll })
      ]);
    }
  });
}
