import type { PricingTreeItem, ProductItem } from '../../api';
import { PRODUCT_DISPLAY_PRIORITY } from './pricingsTab.constants';
import type { SortDirection, PricingSortField } from './pricingsTab.types';

function getPricingSortPriceCents(pricing: PricingTreeItem): number | null {
  if (pricing.type === 'FIXED') {
    return pricing.fixedAmountCents;
  }

  return pricing.tiers[0]?.unitAmountCents ?? null;
}

function compareNullableNumbers(left: number | null, right: number | null, direction: SortDirection): number {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return direction === 'ASC' ? left - right : right - left;
}

function compareStrings(left: string, right: string, direction: SortDirection): number {
  const compare = left.localeCompare(right, undefined, { sensitivity: 'base' });
  return direction === 'ASC' ? compare : -compare;
}

export function comparePricings(
  left: PricingTreeItem,
  right: PricingTreeItem,
  sortBy: PricingSortField,
  sortDirection: SortDirection
): number {
  let primaryCompare = 0;

  if (sortBy === 'NAME') {
    primaryCompare = compareStrings(left.internalName, right.internalName, sortDirection);
  } else if (sortBy === 'PRICE') {
    primaryCompare = compareNullableNumbers(
      getPricingSortPriceCents(left),
      getPricingSortPriceCents(right),
      sortDirection
    );
  } else if (sortBy === 'SUBSCRIPTIONS') {
    const leftCount = left.subscriptionsCount;
    const rightCount = right.subscriptionsCount;
    primaryCompare = sortDirection === 'ASC' ? leftCount - rightCount : rightCount - leftCount;
  }

  if (primaryCompare !== 0) {
    return primaryCompare;
  }

  const byName = left.internalName.localeCompare(right.internalName, undefined, {
    sensitivity: 'base'
  });

  if (byName !== 0) {
    return byName;
  }

  return left.id.localeCompare(right.id);
}

export function groupPricingsByProductId(sortedPricings: PricingTreeItem[]): Map<string, PricingTreeItem[]> {
  const grouped = new Map<string, PricingTreeItem[]>();

  for (const pricing of sortedPricings) {
    const current = grouped.get(pricing.product.id) ?? [];
    current.push(pricing);
    grouped.set(pricing.product.id, current);
  }

  return grouped;
}

export function buildProductOrderBySortedPricings(
  sortedPricings: PricingTreeItem[]
): Map<string, number> {
  const order = new Map<string, number>();

  for (let index = 0; index < sortedPricings.length; index += 1) {
    const productId = sortedPricings[index]?.product.id;
    if (productId && !order.has(productId)) {
      order.set(productId, index);
    }
  }

  return order;
}

type BuildVisibleProductsArgs = {
  products: ProductItem[];
  pricingsByProductId: Map<string, PricingTreeItem[]>;
  hasAppliedStructuredFilters: boolean;
  productIdFilter: string[];
  productOrderBySortedPricings: Map<string, number>;
  search: string;
};

export function buildVisibleProducts(args: BuildVisibleProductsArgs): ProductItem[] {
  const {
    products,
    pricingsByProductId,
    hasAppliedStructuredFilters,
    productIdFilter,
    productOrderBySortedPricings,
    search
  } = args;

  const normalizedSearch = search.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    const hasFilteredPricings = (pricingsByProductId.get(product.id)?.length ?? 0) > 0;
    if (hasAppliedStructuredFilters && !hasFilteredPricings) {
      return false;
    }

    if (productIdFilter.length > 0 && !productIdFilter.includes(product.id)) {
      return false;
    }

    if (normalizedSearch === '') {
      return true;
    }

    const matchesProductSearch =
      product.name.toLowerCase().includes(normalizedSearch) ||
      product.code.toLowerCase().includes(normalizedSearch);

    return hasFilteredPricings || matchesProductSearch;
  });

  return filteredProducts
    .map((product, index) => ({ product, index }))
    .sort((left, right) => {
      const leftSortedOrder = productOrderBySortedPricings.get(left.product.id);
      const rightSortedOrder = productOrderBySortedPricings.get(right.product.id);

      if (leftSortedOrder !== undefined && rightSortedOrder !== undefined) {
        if (leftSortedOrder !== rightSortedOrder) {
          return leftSortedOrder - rightSortedOrder;
        }
      } else if (leftSortedOrder !== undefined) {
        return -1;
      } else if (rightSortedOrder !== undefined) {
        return 1;
      }

      const leftPriority = PRODUCT_DISPLAY_PRIORITY[left.product.code] ?? Number.POSITIVE_INFINITY;
      const rightPriority = PRODUCT_DISPLAY_PRIORITY[right.product.code] ?? Number.POSITIVE_INFINITY;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return left.index - right.index;
    })
    .map((item) => item.product);
}
