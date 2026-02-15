import { useMemo } from 'react';
import type { PricingTreeItem, PricingType, ProductItem } from '../../api';
import type { PricingSortField, SortDirection } from './pricingsTab.utils';
import {
  buildProductOrderBySortedPricings,
  buildVisibleProducts,
  comparePricings,
  countActivePricingFilters,
  getPricingTreeMinWidth,
  getProductTierColumnCount,
  groupPricingsByProductId,
  hasStructuredPricingFilters,
  matchesPricingFilters
} from './pricingsTab.utils';

type UsePricingsViewModelInput = {
  pricings: PricingTreeItem[];
  products: ProductItem[];
  search: string;
  typeFilter: 'ALL' | PricingType;
  productIdFilter: string[];
  accountIdFilter: string[];
  sortBy: PricingSortField;
  sortDirection: SortDirection;
  groupByProduct: boolean;
};

export function usePricingsViewModel(input: UsePricingsViewModelInput) {
  const {
    pricings,
    products,
    search,
    typeFilter,
    productIdFilter,
    accountIdFilter,
    sortBy,
    sortDirection,
    groupByProduct
  } = input;

  const filteredPricings = useMemo(
    () =>
      pricings.filter((pricing) =>
        matchesPricingFilters(pricing, search, typeFilter, productIdFilter, accountIdFilter)
      ),
    [accountIdFilter, pricings, productIdFilter, search, typeFilter]
  );

  const sortedPricings = useMemo(
    () => [...filteredPricings].sort((left, right) => comparePricings(left, right, sortBy, sortDirection)),
    [filteredPricings, sortBy, sortDirection]
  );

  const flatPricings = useMemo(() => sortedPricings, [sortedPricings]);

  const flatTierColumnCount = useMemo(() => getProductTierColumnCount(flatPricings), [flatPricings]);

  const pricingsByProductId = useMemo(() => groupPricingsByProductId(sortedPricings), [sortedPricings]);

  const productOrderBySortedPricings = useMemo(
    () => buildProductOrderBySortedPricings(sortedPricings),
    [sortedPricings]
  );

  const hasAppliedStructuredFilters = useMemo(
    () => hasStructuredPricingFilters(typeFilter, productIdFilter, accountIdFilter),
    [accountIdFilter, productIdFilter, typeFilter]
  );

  const visibleProducts = useMemo(
    () =>
      buildVisibleProducts({
        products,
        pricingsByProductId,
        hasAppliedStructuredFilters,
        productIdFilter,
        productOrderBySortedPricings,
        search
      }),
    [
      hasAppliedStructuredFilters,
      productIdFilter,
      productOrderBySortedPricings,
      products,
      pricingsByProductId,
      search
    ]
  );

  const minTreeWidthPx = useMemo(
    () =>
      getPricingTreeMinWidth({
        groupByProduct,
        flatTierColumnCount,
        visibleProducts,
        pricingsByProductId
      }),
    [flatTierColumnCount, groupByProduct, pricingsByProductId, visibleProducts]
  );

  const activeFiltersCount = useMemo(
    () => countActivePricingFilters(typeFilter, productIdFilter, accountIdFilter),
    [accountIdFilter, productIdFilter, typeFilter]
  );

  return {
    flatPricings,
    flatTierColumnCount,
    pricingsByProductId,
    visibleProducts,
    minTreeWidthPx,
    activeFiltersCount
  };
}
