import type {
  PricingTier,
  PricingTreeItem,
  PricingTreeResolvedTier,
  PricingType,
  ProductItem
} from '../../api';

export type PricingSortField = 'NAME' | 'PRICE' | 'SUBSCRIPTIONS';
export type SortDirection = 'ASC' | 'DESC';

export const SORT_FIELD_LABELS: Record<PricingSortField, string> = {
  NAME: 'Sort by name',
  PRICE: 'Sort by price',
  SUBSCRIPTIONS: 'Sort by subscription count'
};

export const SORT_MENU_LABELS: Record<PricingSortField, string> = {
  NAME: 'Name',
  PRICE: 'Price',
  SUBSCRIPTIONS: 'Subscription count'
};

export const MAX_TIER_COLUMNS = 7;
export const BASE_TREE_MIN_WIDTH = 980;
export const ACTIONS_COLUMN_WIDTH = 118;
export const PROPERTIES_COLUMN_WIDTH = 176;
export const UNITS_COLUMN_WIDTH = 128;
export const TIER_COLUMN_MIN_WIDTH = 124;
export const LEFT_CONTENT_MIN_WIDTH = 340;
export const ROW_HORIZONTAL_PADDING_PX = 24;
export const TREE_INDENT_STEP = 24;
export const TREE_TOGGLE_SLOT_WIDTH = 24;
export const TREE_LABEL_GAP = 8;
export const PRODUCT_ROW_STICKY_TOP = 0;
export const PRICING_ROW_STICKY_TOP = 40;

export const TABLE_GHOST_BUTTON_SX = {
  width: 'fit-content',
  px: 1.5,
  py: 0.75,
  minHeight: 36
} as const;

export const CLICKABLE_ENTITY_LINK_SX = {
  color: '#009299',
  fontWeight: 700,
  textDecoration: 'none',
  cursor: 'pointer',
  '&:hover': { textDecoration: 'underline' }
} as const;

const PRODUCT_DISPLAY_PRIORITY: Record<string, number> = {
  UNIT_SUBSCRIPTION_PRO: 0,
  UNIT_SUBSCRIPTION_APPFOLIO: 1,
  UNIT_SUBSCRIPTION_CIB: 2
};

export function getTierRangeLabel(tier: PricingTreeResolvedTier): string {
  if (!tier) {
    return 'No tier';
  }

  if (tier.toUnit === null) {
    return `> ${Math.max(0, tier.fromUnit - 1)}`;
  }

  return `${tier.fromUnit}-${tier.toUnit}`;
}

function getPricingColumnCount(pricing: PricingTreeItem): number {
  if (pricing.type === 'FIXED') {
    return 1;
  }

  return Math.max(1, Math.min(MAX_TIER_COLUMNS, pricing.tiers.length));
}

export function getProductTierColumnCount(pricings: PricingTreeItem[]): number {
  return Math.max(
    1,
    pricings.reduce((maxCount, pricing) => Math.max(maxCount, getPricingColumnCount(pricing)), 1)
  );
}

export function getProductMinRowWidth(tierColumnCount: number): number {
  return (
    LEFT_CONTENT_MIN_WIDTH +
    PROPERTIES_COLUMN_WIDTH +
    UNITS_COLUMN_WIDTH +
    tierColumnCount * TIER_COLUMN_MIN_WIDTH +
    ACTIONS_COLUMN_WIDTH +
    ROW_HORIZONTAL_PADDING_PX
  );
}

function getPricingColumnOffset(pricing: PricingTreeItem, productTierColumnCount: number): number {
  return Math.max(0, productTierColumnCount - getPricingColumnCount(pricing));
}

function findTierLocalIndex(
  pricing: PricingTreeItem,
  resolvedTier: PricingTreeResolvedTier
): number | null {
  if (pricing.type === 'FIXED') {
    return 0;
  }

  if (!resolvedTier) {
    return null;
  }

  const tierIndex = pricing.tiers.findIndex(
    (tier) => tier.fromUnit === resolvedTier.fromUnit && tier.toUnit === resolvedTier.toUnit
  );

  if (tierIndex >= 0) {
    return tierIndex;
  }

  return pricing.tiers.findIndex(
    (tier) =>
      tier.fromUnit <= resolvedTier.fromUnit &&
      (tier.toUnit === null || (resolvedTier.toUnit !== null && tier.toUnit >= resolvedTier.toUnit))
  );
}

export function getActiveTierColumnIndex(
  pricing: PricingTreeItem,
  productTierColumnCount: number,
  resolvedTier: PricingTreeResolvedTier
): number | null {
  const localIndex = findTierLocalIndex(pricing, resolvedTier);
  if (localIndex === null || localIndex < 0) {
    return null;
  }

  const cappedLocalIndex = Math.min(localIndex, getPricingColumnCount(pricing) - 1);
  return getPricingColumnOffset(pricing, productTierColumnCount) + cappedLocalIndex;
}

export function getTierForColumn(
  pricing: PricingTreeItem,
  productTierColumnCount: number,
  columnIndex: number
): PricingTier | null {
  if (pricing.type === 'FIXED') {
    return null;
  }

  const offset = getPricingColumnOffset(pricing, productTierColumnCount);
  const localIndex = columnIndex - offset;
  if (localIndex < 0 || localIndex >= pricing.tiers.length || localIndex >= MAX_TIER_COLUMNS) {
    return null;
  }

  return pricing.tiers[localIndex] ?? null;
}

export function matchesPricingFilters(
  pricing: PricingTreeItem,
  search: string,
  typeFilter: 'ALL' | PricingType,
  productIdFilter: string[],
  accountIdFilter: string[]
): boolean {
  if (typeFilter !== 'ALL' && pricing.type !== typeFilter) {
    return false;
  }

  if (productIdFilter.length > 0 && !productIdFilter.includes(pricing.product.id)) {
    return false;
  }

  if (
    accountIdFilter.length > 0 &&
    !pricing.accounts.some((accountUsage) => accountIdFilter.includes(accountUsage.account.id))
  ) {
    return false;
  }

  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) {
    return true;
  }

  const inPricing =
    pricing.internalName.toLowerCase().includes(normalizedSearch) ||
    pricing.product.name.toLowerCase().includes(normalizedSearch) ||
    pricing.product.code.toLowerCase().includes(normalizedSearch);

  if (inPricing) {
    return true;
  }

  return pricing.accounts.some((accountUsage) => {
    if (
      accountUsage.account.companyName.toLowerCase().includes(normalizedSearch) ||
      accountUsage.account.email.toLowerCase().includes(normalizedSearch)
    ) {
      return true;
    }

    return accountUsage.properties.some((propertyUsage) =>
      propertyUsage.property.address.toLowerCase().includes(normalizedSearch)
    );
  });
}

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

export function hasStructuredPricingFilters(
  typeFilter: 'ALL' | PricingType,
  productIdFilter: string[],
  accountIdFilter: string[]
): boolean {
  return typeFilter !== 'ALL' || productIdFilter.length > 0 || accountIdFilter.length > 0;
}

export function countActivePricingFilters(
  typeFilter: 'ALL' | PricingType,
  productIdFilter: string[],
  accountIdFilter: string[]
): number {
  let count = 0;
  if (typeFilter !== 'ALL') {
    count += 1;
  }
  if (productIdFilter.length > 0) {
    count += 1;
  }
  if (accountIdFilter.length > 0) {
    count += 1;
  }
  return count;
}

type GetPricingTreeMinWidthArgs = {
  groupByProduct: boolean;
  flatTierColumnCount: number;
  visibleProducts: ProductItem[];
  pricingsByProductId: Map<string, PricingTreeItem[]>;
};

export function getPricingTreeMinWidth(args: GetPricingTreeMinWidthArgs): number {
  const { groupByProduct, flatTierColumnCount, visibleProducts, pricingsByProductId } = args;
  if (!groupByProduct) {
    return Math.max(BASE_TREE_MIN_WIDTH, getProductMinRowWidth(flatTierColumnCount));
  }

  return visibleProducts.reduce((maxWidth, product) => {
    const productPricings = pricingsByProductId.get(product.id) ?? [];
    const tierColumnCount = getProductTierColumnCount(productPricings);
    return Math.max(maxWidth, getProductMinRowWidth(tierColumnCount));
  }, BASE_TREE_MIN_WIDTH);
}
