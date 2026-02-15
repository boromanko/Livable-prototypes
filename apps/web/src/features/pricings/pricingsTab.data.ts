import {
  useAccountsQuery,
  useBulkSubscriptionsMutation,
  useDeletePricingMutation,
  usePricingsTreeQuery,
  useProductsQuery,
  type PricingType
} from '../../api';
import type { PricingSortField, SortDirection } from './pricingsTab.utils';
import { usePricingsViewModel } from './pricingsTab.view-model';

type UsePricingsTabDataInput = {
  search: string;
  typeFilter: 'ALL' | PricingType;
  productIdFilter: string[];
  accountIdFilter: string[];
  sortBy: PricingSortField;
  sortDirection: SortDirection;
  groupByProduct: boolean;
};

export function usePricingsTabData(input: UsePricingsTabDataInput) {
  const {
    search,
    typeFilter,
    productIdFilter,
    accountIdFilter,
    sortBy,
    sortDirection,
    groupByProduct
  } = input;

  const accountsQuery = useAccountsQuery({ page: 1, pageSize: 100 });
  const productsQuery = useProductsQuery();
  const pricingsTreeQuery = usePricingsTreeQuery();
  const deleteMutation = useDeletePricingMutation();
  const bulkMutation = useBulkSubscriptionsMutation();

  const {
    flatPricings,
    flatTierColumnCount,
    pricingsByProductId,
    visibleProducts,
    minTreeWidthPx,
    activeFiltersCount
  } = usePricingsViewModel({
    pricings: pricingsTreeQuery.data?.items ?? [],
    products: productsQuery.data?.items ?? [],
    search,
    typeFilter,
    productIdFilter,
    accountIdFilter,
    sortBy,
    sortDirection,
    groupByProduct
  });

  return {
    flatPricings,
    flatTierColumnCount,
    pricingsByProductId,
    visibleProducts,
    minTreeWidthPx,
    activeFiltersCount,
    productOptions: productsQuery.data?.items ?? [],
    accountOptions: accountsQuery.data?.items ?? [],
    productsLoading: productsQuery.isPending,
    accountsLoading: accountsQuery.isPending,
    isTreeLoading: productsQuery.isPending || pricingsTreeQuery.isPending,
    hasTreeError: productsQuery.isError || pricingsTreeQuery.isError,
    isTreeEmpty: groupByProduct ? visibleProducts.length === 0 : flatPricings.length === 0,
    isDeletePending: deleteMutation.isPending,
    deletePricing: (pricingId: string) => deleteMutation.mutateAsync(pricingId),
    detachPricing: (inputValue: { subscriptionId: string; pricingId: string }) =>
      bulkMutation.mutateAsync({
        action: 'DELETE_PRICING',
        subscriptionIds: [inputValue.subscriptionId],
        pricingIds: [inputValue.pricingId]
      })
  };
}
