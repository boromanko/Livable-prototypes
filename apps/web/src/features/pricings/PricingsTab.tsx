import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CheckIcon from '@mui/icons-material/Check';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';
import HomeIcon from '@mui/icons-material/Home';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PersonIcon from '@mui/icons-material/Person';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import {
  Alert,
  Autocomplete,
  Box,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Link,
  Menu,
  MenuItem,
  Popover,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import {
  ApiError,
  useAccountsQuery,
  useBulkSubscriptionsMutation,
  useDeletePricingMutation,
  usePricingsTreeQuery,
  useProductsQuery,
  type BillingScope,
  type PricingItem,
  type PricingTier,
  type PricingTreeItem,
  type PricingTreeResolvedTier,
  type PricingType
} from '../../api';
import { AppIconButton, GhostButton, PrimaryButton, SecondaryButton } from '../../components/buttons';
import { EmptyState, FiltersToolbar } from '../../components/layout';

const PricingFormDrawer = lazy(async () => {
  const module = await import('./PricingFormDrawer');
  return { default: module.PricingFormDrawer };
});

const SubscriptionFormDrawer = lazy(async () => {
  const module = await import('../subscriptions/SubscriptionFormDrawer');
  return { default: module.SubscriptionFormDrawer };
});

type PricingActionsMenuTarget = {
  anchorEl: HTMLElement;
  pricingId: string;
};

type PricingSortField = 'NAME' | 'PRICE' | 'SUBSCRIPTIONS';
type SortDirection = 'ASC' | 'DESC';
const SORT_FIELD_LABELS: Record<PricingSortField, string> = {
  NAME: 'Sort by name',
  PRICE: 'Sort by price',
  SUBSCRIPTIONS: 'Sort by subscription count'
};
const SORT_MENU_LABELS: Record<PricingSortField, string> = {
  NAME: 'Name',
  PRICE: 'Price',
  SUBSCRIPTIONS: 'Subscription count'
};

function formatMoneyCents(amountCents: number | null, currency: string): string {
  if (amountCents === null) {
    return 'N/A';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2
  }).format(amountCents / 100);
}

function getTierRangeLabel(tier: PricingTreeResolvedTier): string {
  if (!tier) {
    return 'No tier';
  }

  if (tier.toUnit === null) {
    return `> ${Math.max(0, tier.fromUnit - 1)}`;
  }

  return `${tier.fromUnit}-${tier.toUnit}`;
}

const MAX_TIER_COLUMNS = 7;
const BASE_TREE_MIN_WIDTH = 980;
const ACTIONS_COLUMN_WIDTH = 118;
const PROPERTIES_COLUMN_WIDTH = 176;
const UNITS_COLUMN_WIDTH = 128;
const TIER_COLUMN_MIN_WIDTH = 124;
const LEFT_CONTENT_MIN_WIDTH = 340;
const ROW_HORIZONTAL_PADDING_PX = 24;
const TREE_INDENT_STEP = 24;
const TREE_TOGGLE_SLOT_WIDTH = 24;
const TREE_LABEL_GAP = 8;
const PRODUCT_ROW_STICKY_TOP = 0;
const PRICING_ROW_STICKY_TOP = 40;
const PRODUCT_DISPLAY_PRIORITY: Record<string, number> = {
  UNIT_SUBSCRIPTION_PRO: 0,
  UNIT_SUBSCRIPTION_APPFOLIO: 1,
  UNIT_SUBSCRIPTION_CIB: 2
};
const TABLE_GHOST_BUTTON_SX = {
  width: 'fit-content',
  px: 1.5,
  py: 0.75,
  minHeight: 36
} as const;

const CLICKABLE_ENTITY_LINK_SX = {
  color: '#009299',
  fontWeight: 700,
  textDecoration: 'none',
  cursor: 'pointer',
  '&:hover': { textDecoration: 'underline' }
} as const;

function TierMatchIndicator(): JSX.Element {
  return (
    <Box
      sx={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        backgroundColor: '#009299',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 0 1px rgba(0, 146, 153, 0.18)'
      }}
    >
      <CheckIcon sx={{ fontSize: 13, color: '#FFFFFF' }} />
    </Box>
  );
}

function EntityTypeIndicator(props: { type: 'ACCOUNT' | 'PROPERTY' }): JSX.Element {
  const Icon = props.type === 'ACCOUNT' ? PersonIcon : HomeIcon;

  return (
    <Box
      sx={{
        width: 20,
        height: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}
    >
      <Icon sx={{ fontSize: 17, color: '#4B617C' }} />
    </Box>
  );
}

function getPricingColumnCount(pricing: PricingTreeItem): number {
  if (pricing.type === 'FIXED') {
    return 1;
  }

  return Math.max(1, Math.min(MAX_TIER_COLUMNS, pricing.tiers.length));
}

function getProductTierColumnCount(pricings: PricingTreeItem[]): number {
  return Math.max(1, pricings.reduce((maxCount, pricing) => Math.max(maxCount, getPricingColumnCount(pricing)), 1));
}

function getProductMinRowWidth(tierColumnCount: number): number {
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

function findTierLocalIndex(pricing: PricingTreeItem, resolvedTier: PricingTreeResolvedTier): number | null {
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

function getActiveTierColumnIndex(
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

function getTierForColumn(
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

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (
      error.payload &&
      typeof error.payload === 'object' &&
      'message' in error.payload &&
      typeof error.payload.message === 'string'
    ) {
      return error.payload.message;
    }
    return `Request failed with status ${error.status}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected error';
}

function matchesPricingFilters(
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

function compareNullableNumbers(
  left: number | null,
  right: number | null,
  direction: SortDirection
): number {
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

function comparePricings(
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

export function PricingsTab(): JSX.Element {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | PricingType>('ALL');
  const [productIdFilter, setProductIdFilter] = useState<string[]>([]);
  const [accountIdFilter, setAccountIdFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<PricingSortField>('NAME');
  const [sortDirection, setSortDirection] = useState<SortDirection>('ASC');
  const [groupByProduct, setGroupByProduct] = useState(true);
  const [filtersAnchorEl, setFiltersAnchorEl] = useState<HTMLElement | null>(null);
  const [sortMenuAnchorEl, setSortMenuAnchorEl] = useState<HTMLElement | null>(null);

  const [collapsedProducts, setCollapsedProducts] = useState<Set<string>>(new Set());
  const [expandedPricings, setExpandedPricings] = useState<Set<string>>(new Set());
  const [collapsedUsageSections, setCollapsedUsageSections] = useState<Set<string>>(new Set());
  const cascadeScrollRef = useRef<HTMLDivElement | null>(null);

  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [pricingModalMode, setPricingModalMode] = useState<'create' | 'edit'>('create');
  const [editingPricing, setEditingPricing] = useState<PricingItem | null>(null);
  const [defaultProductId, setDefaultProductId] = useState<string | undefined>(undefined);

  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [defaultSubscriptionAccountId, setDefaultSubscriptionAccountId] = useState<string | undefined>(undefined);
  const [defaultSubscriptionPricingIds, setDefaultSubscriptionPricingIds] = useState<string[]>([]);
  const [defaultSubscriptionScope, setDefaultSubscriptionScope] = useState<BillingScope>('ACCOUNT');

  const [deletingPricing, setDeletingPricing] = useState<PricingTreeItem | null>(null);
  const [pricingActionsTarget, setPricingActionsTarget] =
    useState<PricingActionsMenuTarget | null>(null);
  const [detachConfirmTarget, setDetachConfirmTarget] = useState<{
    pricingId: string;
    subscriptionId: string;
    title: string;
  } | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const accountsQuery = useAccountsQuery({ page: 1, pageSize: 100 });
  const productsQuery = useProductsQuery();
  const pricingsTreeQuery = usePricingsTreeQuery();
  const deleteMutation = useDeletePricingMutation();
  const bulkMutation = useBulkSubscriptionsMutation();

  const filteredPricings = useMemo(
    () =>
      (pricingsTreeQuery.data?.items ?? []).filter((pricing) =>
        matchesPricingFilters(pricing, search, typeFilter, productIdFilter, accountIdFilter)
      ),
    [pricingsTreeQuery.data?.items, search, typeFilter, productIdFilter, accountIdFilter]
  );

  const sortedPricings = useMemo(
    () => [...filteredPricings].sort((left, right) => comparePricings(left, right, sortBy, sortDirection)),
    [filteredPricings, sortBy, sortDirection]
  );

  const flatPricings = useMemo(() => sortedPricings, [sortedPricings]);

  const flatTierColumnCount = useMemo(
    () => getProductTierColumnCount(flatPricings),
    [flatPricings]
  );

  const pricingsByProductId = useMemo(() => {
    const grouped = new Map<string, PricingTreeItem[]>();

    for (const pricing of sortedPricings) {
      const current = grouped.get(pricing.product.id) ?? [];
      current.push(pricing);
      grouped.set(pricing.product.id, current);
    }

    return grouped;
  }, [sortedPricings]);

  const productOrderBySortedPricings = useMemo(() => {
    const order = new Map<string, number>();

    for (let index = 0; index < sortedPricings.length; index += 1) {
      const productId = sortedPricings[index]?.product.id;
      if (productId && !order.has(productId)) {
        order.set(productId, index);
      }
    }

    return order;
  }, [sortedPricings]);

  const hasAppliedStructuredFilters =
    typeFilter !== 'ALL' || productIdFilter.length > 0 || accountIdFilter.length > 0;

  const visibleProducts = useMemo(() => {
    const allProducts = productsQuery.data?.items ?? [];

    const filteredProducts = allProducts.filter((product) => {
      const hasFilteredPricings = (pricingsByProductId.get(product.id)?.length ?? 0) > 0;
      if (hasAppliedStructuredFilters && !hasFilteredPricings) {
        return false;
      }

      if (productIdFilter.length > 0 && !productIdFilter.includes(product.id)) {
        return false;
      }

      if (search.trim() === '') {
        return true;
      }

      const matchesProductSearch =
        product.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        product.code.toLowerCase().includes(search.trim().toLowerCase());

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
  }, [
    hasAppliedStructuredFilters,
    productIdFilter,
    productOrderBySortedPricings,
    productsQuery.data?.items,
    pricingsByProductId,
    search
  ]);

  const minTreeWidthPx = useMemo(() => {
    if (!groupByProduct) {
      return Math.max(BASE_TREE_MIN_WIDTH, getProductMinRowWidth(flatTierColumnCount));
    }

    return visibleProducts.reduce((maxWidth, product) => {
      const productPricings = pricingsByProductId.get(product.id) ?? [];
      const tierColumnCount = getProductTierColumnCount(productPricings);
      return Math.max(maxWidth, getProductMinRowWidth(tierColumnCount));
    }, BASE_TREE_MIN_WIDTH);
  }, [flatTierColumnCount, groupByProduct, pricingsByProductId, visibleProducts]);

  const activeFiltersCount = useMemo(() => {
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
  }, [accountIdFilter.length, productIdFilter.length, typeFilter]);

  const productOptions = productsQuery.data?.items ?? [];
  const selectedProductOptions = productOptions.filter((product) => productIdFilter.includes(product.id));
  const accountOptions = accountsQuery.data?.items ?? [];
  const selectedAccountOptions = accountOptions.filter((account) => accountIdFilter.includes(account.id));

  const isFiltersPopoverOpen = Boolean(filtersAnchorEl);
  const isSortMenuOpen = Boolean(sortMenuAnchorEl);

  function toggleExpanded(setter: React.Dispatch<React.SetStateAction<Set<string>>>, key: string): void {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function openCreatePricing(productId?: string): void {
    setPricingModalMode('create');
    setEditingPricing(null);
    setDefaultProductId(productId);
    setPricingModalOpen(true);
  }

  function openEditPricing(pricing: PricingTreeItem): void {
    setPricingModalMode('edit');
    setEditingPricing(pricing);
    setDefaultProductId(undefined);
    setPricingModalOpen(true);
  }

  function closePricingModal(): void {
    setPricingModalOpen(false);
    setDefaultProductId(undefined);
  }

  function openCreateSubscription(
    pricingId: string,
    options?: { accountId?: string; scope?: BillingScope }
  ): void {
    setDefaultSubscriptionPricingIds([pricingId]);
    setDefaultSubscriptionAccountId(options?.accountId);
    setDefaultSubscriptionScope(options?.scope ?? 'ACCOUNT');
    setSubscriptionModalOpen(true);
  }

  function closeSubscriptionModal(): void {
    setSubscriptionModalOpen(false);
    setDefaultSubscriptionAccountId(undefined);
    setDefaultSubscriptionPricingIds([]);
    setDefaultSubscriptionScope('ACCOUNT');
  }

  function openFiltersPopover(event: React.MouseEvent<HTMLElement>): void {
    setFiltersAnchorEl(event.currentTarget);
  }

  function closeFiltersPopover(): void {
    setFiltersAnchorEl(null);
  }

  function clearFilters(): void {
    setTypeFilter('ALL');
    setProductIdFilter([]);
    setAccountIdFilter([]);
  }

  function openSortMenu(event: React.MouseEvent<HTMLElement>): void {
    setSortMenuAnchorEl(event.currentTarget);
  }

  function closeSortMenu(): void {
    setSortMenuAnchorEl(null);
  }

  function selectSortBy(nextSortBy: PricingSortField): void {
    setSortBy(nextSortBy);
    closeSortMenu();
  }

  function togglePricingSectionLink(pricingId: string, section: 'accounts' | 'specific-properties'): void {
    const pricingKey = `pricing:${pricingId}`;
    const sectionKey = `${section}:${pricingId}`;
    const isPricingExpanded = expandedPricings.has(pricingKey);
    const isSectionCollapsed = collapsedUsageSections.has(sectionKey);
    const isSectionOpen = isPricingExpanded && !isSectionCollapsed;

    if (isSectionOpen) {
      setCollapsedUsageSections((prev) => {
        const next = new Set(prev);
        next.add(sectionKey);
        return next;
      });

      setExpandedPricings((prev) => {
        const next = new Set(prev);
        next.delete(pricingKey);
        return next;
      });
      return;
    }

    setExpandedPricings((prev) => {
      const next = new Set(prev);
      next.add(pricingKey);
      return next;
    });

    setCollapsedUsageSections((prev) => {
      const next = new Set(prev);
      next.delete(sectionKey);
      return next;
    });
  }

  function togglePricingFromCaret(pricingId: string): void {
    const pricingKey = `pricing:${pricingId}`;
    const accountsSectionKey = `accounts:${pricingId}`;
    const specificPropertiesSectionKey = `specific-properties:${pricingId}`;

    const isExpanded = expandedPricings.has(pricingKey);

    setExpandedPricings((prev) => {
      const next = new Set(prev);
      if (isExpanded) {
        next.delete(pricingKey);
      } else {
        next.add(pricingKey);
      }
      return next;
    });

    if (!isExpanded) {
      // Opening a pricing from its caret should keep child sections collapsed.
      setCollapsedUsageSections((prev) => {
        const next = new Set(prev);
        next.add(accountsSectionKey);
        next.add(specificPropertiesSectionKey);
        return next;
      });
    }
  }

  async function confirmDeletePricing(): Promise<void> {
    if (!deletingPricing || deleteMutation.isPending) {
      return;
    }

    setActionError(null);

    try {
      await deleteMutation.mutateAsync(deletingPricing.id);
      setSuccessMessage(`Pricing "${deletingPricing.internalName}" deleted.`);
      setDeletingPricing(null);
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  }

  async function confirmDetach(): Promise<void> {
    if (!detachConfirmTarget) {
      return;
    }

    setActionError(null);

    try {
      await bulkMutation.mutateAsync({
        action: 'DELETE_PRICING',
        subscriptionIds: [detachConfirmTarget.subscriptionId],
        pricingIds: [detachConfirmTarget.pricingId]
      });

      setSuccessMessage('Pricing detached successfully.');
      setDetachConfirmTarget(null);
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  }

  useEffect(() => {
    function handleGlobalWheel(event: WheelEvent): void {
      const container = cascadeScrollRef.current;
      if (!container) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target?.closest('[role="dialog"]') ||
        target?.closest('[role="menu"]') ||
        target?.closest('.MuiPopover-root')
      ) {
        return;
      }

      if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) {
        return;
      }

      if (container.scrollHeight <= container.clientHeight) {
        return;
      }

      event.preventDefault();
      const maxScrollTop = container.scrollHeight - container.clientHeight;
      const nextScrollTop = Math.min(
        maxScrollTop,
        Math.max(0, container.scrollTop + event.deltaY)
      );
      container.scrollTop = nextScrollTop;
    }

    window.addEventListener('wheel', handleGlobalWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleGlobalWheel);
    };
  }, []);

  return (
    <>
      <Stack spacing={0} sx={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
        <Box sx={{ px: { xs: 1.5, sm: 2 }, py: 1.5, borderBottom: '1px solid #E1E7EC' }}>
          <FiltersToolbar
            left={
              <>
                <TextField
                  size="small"
                  label="Search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Product, pricing, account, property"
                  sx={{ minWidth: { md: 220 } }}
                />

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'stretch',
                    p: '1px',
                    backgroundColor: '#D7DEE6',
                    borderRadius: 1,
                    overflow: 'hidden'
                  }}
                >
                  <SecondaryButton
                    onClick={openFiltersPopover}
                    startIcon={<FilterListIcon fontSize="small" />}
                    sx={{
                      border: 'none',
                      borderRadius: 0,
                      px: 1.5
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <Box component="span">Filters</Box>
                      {activeFiltersCount > 0 ? (
                        <Box
                          component="span"
                          sx={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            backgroundColor: '#009299',
                            color: '#FFFFFF',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 700,
                            lineHeight: 1
                          }}
                        >
                          {activeFiltersCount}
                        </Box>
                      ) : null}
                    </Stack>
                  </SecondaryButton>
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'stretch',
                    gap: '1px',
                    p: '1px',
                    backgroundColor: '#D7DEE6',
                    borderRadius: 1,
                    overflow: 'hidden'
                  }}
                >
                  <SecondaryButton
                    onClick={openSortMenu}
                    sx={{
                      width: 'auto',
                      minWidth: 'unset',
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                      border: 'none',
                      borderRadius: 0,
                      borderTopRightRadius: 0,
                      borderBottomRightRadius: 0,
                      px: 1.5
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Box component="span">{SORT_FIELD_LABELS[sortBy]}</Box>
                      <ArrowDropDownIcon sx={{ fontSize: 18 }} />
                    </Stack>
                  </SecondaryButton>
                  <Tooltip title={sortDirection === 'ASC' ? 'Ascending' : 'Descending'}>
                    <SecondaryButton
                      onClick={() =>
                        setSortDirection((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'))
                      }
                      sx={{
                        width: 40,
                        minWidth: 40,
                        height: '100%',
                        borderTopLeftRadius: 0,
                        borderBottomLeftRadius: 0,
                        border: 'none',
                        borderRadius: 0,
                        px: 0
                      }}
                    >
                      {sortDirection === 'ASC' ? (
                        <ArrowUpwardIcon fontSize="small" />
                      ) : (
                        <ArrowDownwardIcon fontSize="small" />
                      )}
                    </SecondaryButton>
                  </Tooltip>
                </Box>

                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={groupByProduct}
                      onChange={(event) => setGroupByProduct(event.target.checked)}
                    />
                  }
                  label="Group by product"
                  sx={{ ml: 0.5, mr: 0, '& .MuiFormControlLabel-label': { fontSize: 13, color: '#4B617C' } }}
                />
              </>
            }
            right={
              <PrimaryButton startIcon={<AddIcon />} onClick={() => openCreatePricing()}>
                Add pricing
              </PrimaryButton>
            }
          />
        </Box>

        <Popover
          open={isFiltersPopoverOpen}
          anchorEl={filtersAnchorEl}
          onClose={closeFiltersPopover}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            paper: {
              sx: {
                mt: 0.75,
                width: 420,
                p: 1.5,
                border: '1px solid #E1E7EC'
              }
            }
          }}
        >
          <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#212934' }}>
              Filters
            </Typography>

            <TextField
              size="small"
              select
              label="Type"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as 'ALL' | PricingType)}
              fullWidth
            >
              <MenuItem value="ALL">ALL</MenuItem>
              <MenuItem value="FIXED">FIXED</MenuItem>
              <MenuItem value="TIERED">TIERED</MenuItem>
            </TextField>

            <Autocomplete
              multiple
              disableCloseOnSelect
              options={productOptions}
              value={selectedProductOptions}
              onChange={(_event, nextValue) => setProductIdFilter(nextValue.map((item) => item.id))}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              loading={productsQuery.isPending}
              noOptionsText="No products"
              fullWidth
              renderOption={(props, option, { selected }) => (
                <li {...props}>
                  <Checkbox size="small" checked={selected} sx={{ mr: 1 }} />
                  {option.name}
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Product"
                  placeholder={selectedProductOptions.length === 0 ? 'Search products' : ''}
                />
              )}
            />

            <Autocomplete
              multiple
              disableCloseOnSelect
              options={accountOptions}
              value={selectedAccountOptions}
              onChange={(_event, nextValue) => setAccountIdFilter(nextValue.map((item) => item.id))}
              getOptionLabel={(option) => option.companyName}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              loading={accountsQuery.isPending}
              noOptionsText="No accounts"
              fullWidth
              renderOption={(props, option, { selected }) => (
                <li {...props}>
                  <Checkbox size="small" checked={selected} sx={{ mr: 1 }} />
                  <Stack spacing={0}>
                    <Typography variant="body2" sx={{ color: '#212934' }}>
                      {option.companyName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6B7F99' }}>
                      {option.email}
                    </Typography>
                  </Stack>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Account"
                  placeholder={selectedAccountOptions.length === 0 ? 'Search accounts' : ''}
                />
              )}
            />

            <Stack direction="row" justifyContent="flex-end">
              <GhostButton
                onClick={clearFilters}
                disabled={activeFiltersCount === 0}
                sx={{ minHeight: 34, px: 1.25 }}
              >
                Clear all
              </GhostButton>
            </Stack>
          </Stack>
        </Popover>

        <Menu
          open={isSortMenuOpen}
          anchorEl={sortMenuAnchorEl}
          onClose={closeSortMenu}
        >
          <MenuItem selected={sortBy === 'NAME'} onClick={() => selectSortBy('NAME')}>
            {SORT_MENU_LABELS.NAME}
          </MenuItem>
          <MenuItem selected={sortBy === 'PRICE'} onClick={() => selectSortBy('PRICE')}>
            {SORT_MENU_LABELS.PRICE}
          </MenuItem>
          <MenuItem selected={sortBy === 'SUBSCRIPTIONS'} onClick={() => selectSortBy('SUBSCRIPTIONS')}>
            {SORT_MENU_LABELS.SUBSCRIPTIONS}
          </MenuItem>
        </Menu>

        <Box
          sx={{
            p: { xs: 1.5, sm: 2 },
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {productsQuery.isError || pricingsTreeQuery.isError ? (
            <Alert severity="error">Failed to load pricing tree.</Alert>
          ) : null}

          {productsQuery.isPending || pricingsTreeQuery.isPending ? (
            <Typography variant="body2" color="text.secondary">
              Loading pricing tree...
            </Typography>
          ) : (groupByProduct ? visibleProducts.length === 0 : flatPricings.length === 0) ? (
            <EmptyState
              title="No pricings found"
              description="Create your first pricing or adjust filters."
              actionLabel="Add pricing"
              onActionClick={() => openCreatePricing()}
            />
          ) : (
            <Box
              ref={cascadeScrollRef}
              sx={{ overflow: 'auto', minHeight: 0, flex: 1, overscrollBehavior: 'contain' }}
            >
              <Stack
                spacing={0}
                sx={{
                  minWidth: minTreeWidthPx,
                  border: '1px solid #E1E7EC',
                  borderRadius: 1
                }}
              >
                {(groupByProduct
                  ? visibleProducts
                  : [{ id: '__flat__', name: '', code: '__flat__' }]
                ).map((product, productIndex) => {
                  const productPricings = groupByProduct
                    ? (pricingsByProductId.get(product.id) ?? [])
                    : flatPricings;
                  const productTierColumnCount = groupByProduct
                    ? getProductTierColumnCount(productPricings)
                    : flatTierColumnCount;
                  const isProductExpanded = groupByProduct ? !collapsedProducts.has(product.id) : true;

                  return (
                    <Box key={product.id}>
                      {groupByProduct ? (
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={0}
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleExpanded(setCollapsedProducts, product.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              toggleExpanded(setCollapsedProducts, product.id);
                            }
                          }}
                          sx={{
                            minHeight: 40,
                            px: 1.5,
                            py: 0.5,
                            backgroundColor: '#EEF2F6',
                            borderTop: productIndex === 0 ? 'none' : '1px solid #E1E7EC',
                            cursor: 'pointer',
                            position: 'sticky',
                            top: PRODUCT_ROW_STICKY_TOP,
                            zIndex: 30
                          }}
                        >
                          <Box sx={{ width: TREE_TOGGLE_SLOT_WIDTH, display: 'flex', justifyContent: 'center' }}>
                            <Box
                              sx={{
                                width: TREE_TOGGLE_SLOT_WIDTH,
                                height: TREE_TOGGLE_SLOT_WIDTH,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '2px',
                                transition: 'background-color 120ms ease',
                                '&:hover': { backgroundColor: '#EAF0F5' }
                              }}
                              aria-label={isProductExpanded ? 'Collapse product' : 'Expand product'}
                            >
                              {isProductExpanded ? (
                                <ExpandMoreIcon fontSize="small" />
                              ) : (
                                <ChevronRightIcon fontSize="small" />
                              )}
                            </Box>
                          </Box>
                          <Box sx={{ width: TREE_LABEL_GAP }} />
                          <Stack direction="row" alignItems="center" spacing={1.25}>
                            <Typography sx={{ fontWeight: 500, fontSize: 14, color: '#212934' }}>
                              {product.name}
                            </Typography>
                            <Typography sx={{ fontWeight: 600, fontSize: 16, lineHeight: 1, color: '#B8C4CE' }}>
                              |
                            </Typography>
                            <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#98A4B3' }}>
                              {productPricings.length} pricings
                            </Typography>
                          </Stack>
                        </Stack>
                      ) : null}

                      {isProductExpanded ? (
                        <Stack spacing={0}>
                          {productPricings.length === 0 ? null : (
                            productPricings.map((pricing, pricingIndex) => {
                              const pricingKey = `pricing:${pricing.id}`;
                              const isPricingExpanded = expandedPricings.has(pricingKey);
                              const accountsSectionKey = `accounts:${pricing.id}`;
                              const specificPropertiesSectionKey = `specific-properties:${pricing.id}`;
                              const isAccountsCollapsed = collapsedUsageSections.has(accountsSectionKey);
                              const isSpecificPropertiesCollapsed = collapsedUsageSections.has(
                                specificPropertiesSectionKey
                              );
                              const accountRows = pricing.accounts.filter(
                                (accountUsage) => accountUsage.source === 'ACCOUNT'
                              );
                              const specificPropertyRows = pricing.accounts.flatMap((accountUsage) =>
                                accountUsage.properties
                                  .filter((propertyUsage) => propertyUsage.source === 'OVERRIDE')
                                  .map((propertyUsage) => ({
                                    accountUsage,
                                    propertyUsage
                                  }))
                              );
                              const specificPropertiesCount = specificPropertyRows.length;
                              const hasAccountRows = accountRows.length > 0;
                              const hasSpecificPropertyRows = specificPropertiesCount > 0;
                              const hasMixedUsageSections = hasAccountRows && hasSpecificPropertyRows;
                              const showAccountsSectionHeader = hasMixedUsageSections;
                              const showPropertiesSectionHeader = hasMixedUsageSections;
                              const isAccountsVisible =
                                hasAccountRows && (!showAccountsSectionHeader || !isAccountsCollapsed);
                              const isSpecificPropertiesVisible =
                                hasSpecificPropertyRows &&
                                (!showPropertiesSectionHeader || !isSpecificPropertiesCollapsed);

                              return (
                                <Box key={pricing.id}>
                                  <Stack
                                    direction="row"
                                    alignItems="stretch"
                                    spacing={0}
                                    onClick={() => openEditPricing(pricing)}
                                    sx={{
                                      minHeight: 44,
                                      px: 1.5,
                                      py: 0.25,
                                      borderTop:
                                        groupByProduct || pricingIndex > 0
                                          ? '1px solid #E1E7EC'
                                          : 'none',
                                      backgroundColor: '#FFFFFF',
                                      transition: 'background-color 120ms ease',
                                      cursor: 'pointer',
                                      '&:hover': {
                                        backgroundColor: '#F8FBFD'
                                      },
                                      '& .pricing-row-cell': {
                                        backgroundColor: 'inherit',
                                        transition: 'background-color 120ms ease'
                                      },
                                      position: 'sticky',
                                      top: groupByProduct ? PRICING_ROW_STICKY_TOP : PRODUCT_ROW_STICKY_TOP,
                                      zIndex: 24
                                    }}
                                  >
                                    <Stack
                                      direction="row"
                                      alignItems="center"
                                      spacing={0}
                                      sx={{ flex: 1, minWidth: LEFT_CONTENT_MIN_WIDTH }}
                                    >
                                      <Box sx={{ width: groupByProduct ? TREE_INDENT_STEP : 0 }} />
                                      <Box sx={{ width: TREE_TOGGLE_SLOT_WIDTH, display: 'flex', justifyContent: 'center' }}>
                                        <AppIconButton
                                          tone="plain"
                                          sx={{ width: TREE_TOGGLE_SLOT_WIDTH, height: TREE_TOGGLE_SLOT_WIDTH, p: 0 }}
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            togglePricingFromCaret(pricing.id);
                                          }}
                                          aria-label={isPricingExpanded ? 'Collapse pricing' : 'Expand pricing'}
                                        >
                                          {isPricingExpanded ? (
                                            <ExpandMoreIcon fontSize="small" />
                                          ) : (
                                            <ChevronRightIcon fontSize="small" />
                                          )}
                                        </AppIconButton>
                                      </Box>
                                      <Box sx={{ width: TREE_LABEL_GAP }} />
                                      <Stack spacing={0.25}>
                                        <Stack direction="row" alignItems="center" spacing={1.25}>
                                          <Typography sx={{ fontWeight: 600, fontSize: 15, color: '#212934' }}>
                                            {pricing.internalName}
                                          </Typography>
                                          <Typography sx={{ fontWeight: 600, fontSize: 16, lineHeight: 1, color: '#B8C4CE' }}>
                                            |
                                          </Typography>
                                          <Typography
                                            sx={{
                                              fontWeight: 600,
                                              fontSize: 14,
                                              lineHeight: 1.1,
                                              color: pricing.type === 'TIERED' ? '#1F9D55' : '#2B6CB0',
                                              backgroundColor:
                                                pricing.type === 'TIERED' ? '#E8F7EF' : '#E9F2FC',
                                              py: '2px',
                                              px: '4px',
                                              borderRadius: '2px'
                                            }}
                                          >
                                            {pricing.type === 'TIERED' ? 'Tiered' : 'Fixed'}
                                          </Typography>
                                          {hasAccountRows || hasSpecificPropertyRows ? (
                                            <Typography sx={{ fontWeight: 600, fontSize: 16, lineHeight: 1, color: '#B8C4CE' }}>
                                              |
                                            </Typography>
                                          ) : null}
                                          {hasAccountRows ? (
                                            <Link
                                              href="#"
                                              onClick={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                togglePricingSectionLink(pricing.id, 'accounts');
                                              }}
                                              sx={{
                                                fontWeight: 600,
                                                fontSize: 15,
                                                color: '#98A4B3',
                                                textDecoration: 'none',
                                                cursor: 'pointer',
                                                '&:hover': { textDecoration: 'underline' }
                                              }}
                                            >
                                              {accountRows.length} Accounts
                                            </Link>
                                          ) : null}
                                          {hasAccountRows && hasSpecificPropertyRows ? (
                                            <Typography sx={{ fontWeight: 600, fontSize: 16, lineHeight: 1, color: '#B8C4CE' }}>
                                              |
                                            </Typography>
                                          ) : null}
                                          {hasSpecificPropertyRows ? (
                                            <Link
                                              href="#"
                                              onClick={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                togglePricingSectionLink(pricing.id, 'specific-properties');
                                              }}
                                              sx={{
                                                fontWeight: 600,
                                                fontSize: 15,
                                                color: '#98A4B3',
                                                textDecoration: 'none',
                                                cursor: 'pointer',
                                                '&:hover': { textDecoration: 'underline' }
                                              }}
                                            >
                                              {specificPropertiesCount} Properties
                                            </Link>
                                          ) : null}
                                        </Stack>
                                        {!groupByProduct ? (
                                          <Typography
                                            sx={{
                                              fontSize: 11,
                                              lineHeight: 1.1,
                                              color: '#7A8EA8',
                                              fontWeight: 600
                                            }}
                                          >
                                            {pricing.product.name}
                                          </Typography>
                                        ) : null}
                                      </Stack>
                                    </Stack>

                                    <Box
                                      sx={{
                                        ml: 'auto',
                                        flexShrink: 0,
                                        display: 'grid',
                                        gridTemplateColumns: `repeat(${productTierColumnCount}, minmax(${TIER_COLUMN_MIN_WIDTH}px, 1fr))`
                                      }}
                                    >
                                      {Array.from({ length: productTierColumnCount }).map((_, columnIndex) => {
                                        const tier = getTierForColumn(pricing, productTierColumnCount, columnIndex);
                                        const isFixedCell =
                                          pricing.type === 'FIXED' && columnIndex === productTierColumnCount - 1;

                                        return (
                                          <Box
                                            className="pricing-row-cell"
                                            key={`${pricing.id}:pricing-cell:${columnIndex}`}
                                            sx={{
                                              minHeight: 44,
                                              px: 1.25,
                                              py: 0.5,
                                              borderLeft: '1px solid #E1E7EC',
                                              display: 'flex',
                                              flexDirection: 'column',
                                              justifyContent: 'center',
                                              gap: 0.125
                                            }}
                                          >
                                            {isFixedCell ? (
                                              <>
                                                <Typography sx={{ fontSize: 11, color: '#6F8298', fontWeight: 600 }}>
                                                  FIXED
                                                </Typography>
                                                <Typography
                                                  sx={{
                                                    fontSize: 14,
                                                    fontWeight: 700,
                                                    color: '#212934',
                                                    fontVariantNumeric: 'tabular-nums'
                                                  }}
                                                >
                                                  {formatMoneyCents(pricing.fixedAmountCents, pricing.currency)}
                                                </Typography>
                                              </>
                                            ) : tier ? (
                                              <>
                                                <Typography
                                                  sx={{
                                                    fontSize: 11,
                                                    color: '#6F8298',
                                                    fontWeight: 600,
                                                    textTransform: 'uppercase'
                                                  }}
                                                >
                                                  {getTierRangeLabel(tier)} Units
                                                </Typography>
                                                <Typography
                                                  sx={{
                                                    fontSize: 14,
                                                    fontWeight: 700,
                                                    color: '#212934',
                                                    fontVariantNumeric: 'tabular-nums'
                                                  }}
                                                >
                                                  {formatMoneyCents(tier.unitAmountCents, pricing.currency)}
                                                </Typography>
                                              </>
                                            ) : null}
                                          </Box>
                                        );
                                      })}
                                    </Box>

                                    <Stack
                                      className="pricing-row-cell"
                                      direction="row"
                                      alignItems="center"
                                      spacing={0.25}
                                      sx={{
                                        width: ACTIONS_COLUMN_WIDTH,
                                        pl: 0.75,
                                        flexShrink: 0,
                                        justifyContent: 'flex-end',
                                        alignSelf: 'stretch',
                                        borderLeft: '1px solid #E1E7EC'
                                      }}
                                    >
                                      <AppIconButton
                                        tone="ghost"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          openEditPricing(pricing);
                                        }}
                                      >
                                        <EditIcon fontSize="small" />
                                      </AppIconButton>

                                      <AppIconButton
                                        tone="ghost"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setDeletingPricing(pricing);
                                        }}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </AppIconButton>

                                      <AppIconButton
                                        tone="ghost"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setPricingActionsTarget({
                                            anchorEl: event.currentTarget,
                                            pricingId: pricing.id
                                          });
                                        }}
                                      >
                                        <MoreHorizIcon fontSize="small" />
                                      </AppIconButton>
                                    </Stack>
                                  </Stack>

                                  {isPricingExpanded ? (
                                    <Stack spacing={0}>
                                      {showAccountsSectionHeader ? (
                                        <Stack
                                          direction="row"
                                          alignItems="center"
                                          spacing={0}
                                          role="button"
                                          tabIndex={0}
                                          onClick={() =>
                                            toggleExpanded(setCollapsedUsageSections, accountsSectionKey)
                                          }
                                          onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                              event.preventDefault();
                                              toggleExpanded(setCollapsedUsageSections, accountsSectionKey);
                                            }
                                          }}
                                          sx={{
                                            minHeight: 34,
                                            px: 1.5,
                                            borderTop: '1px dashed #E1E7EC',
                                            backgroundColor: '#F8F9FA',
                                            cursor: 'pointer'
                                          }}
                                        >
                                          <Box sx={{ width: TREE_INDENT_STEP * 2 }} />
                                          <Box sx={{ width: TREE_TOGGLE_SLOT_WIDTH, display: 'flex', justifyContent: 'center' }}>
                                            <Box
                                              sx={{
                                                width: TREE_TOGGLE_SLOT_WIDTH,
                                                height: TREE_TOGGLE_SLOT_WIDTH,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '2px',
                                                transition: 'background-color 120ms ease',
                                                '&:hover': { backgroundColor: '#EAF0F5' }
                                              }}
                                              aria-label={
                                                isAccountsCollapsed
                                                  ? 'Expand accounts section'
                                                  : 'Collapse accounts section'
                                              }
                                            >
                                              {isAccountsCollapsed ? (
                                                <ChevronRightIcon fontSize="small" />
                                              ) : (
                                                <ExpandMoreIcon fontSize="small" />
                                              )}
                                            </Box>
                                          </Box>
                                          <Box sx={{ width: TREE_LABEL_GAP }} />
                                          <Typography sx={{ fontWeight: 500, fontSize: 14, color: '#212934' }}>
                                            {accountRows.length} accounts
                                          </Typography>
                                        </Stack>
                                      ) : null}

                                      {isAccountsVisible ? (
                                        accountRows.map((accountUsage) => {
                                          const activeTierColumnIndex = getActiveTierColumnIndex(
                                            pricing,
                                            productTierColumnCount,
                                            accountUsage.currentTier
                                          );

                                          return (
                                            <Box key={`${pricing.id}:${accountUsage.account.id}`}>
                                              <Stack
                                                direction="row"
                                                alignItems="stretch"
                                                spacing={0}
                                                sx={{ minHeight: 34, px: 1.5, borderTop: '1px dashed #E1E7EC' }}
                                              >
                                              <Stack
                                                direction="row"
                                                alignItems="center"
                                                spacing={0}
                                                sx={{ flex: 1, minWidth: LEFT_CONTENT_MIN_WIDTH }}
                                              >
                                                <Box sx={{ width: TREE_INDENT_STEP * (showAccountsSectionHeader ? 3 : 2) }} />
                                                <Box sx={{ width: showAccountsSectionHeader ? TREE_TOGGLE_SLOT_WIDTH : 0 }} />
                                                <Box sx={{ width: TREE_LABEL_GAP }} />
                                                <Box sx={{ mr: 1 }}>
                                                  <EntityTypeIndicator type="ACCOUNT" />
                                                </Box>
                                                <Link
                                                  href="#"
                                                  onClick={(event) => event.preventDefault()}
                                                  sx={{ ...CLICKABLE_ENTITY_LINK_SX, minWidth: 260, fontSize: 14 }}
                                                >
                                                  {accountUsage.account.companyName}
                                                </Link>
                                              </Stack>

                                                <Box
                                                  sx={{
                                                    ml: 'auto',
                                                    flexShrink: 0,
                                                    display: 'grid',
                                                    gridTemplateColumns: `${PROPERTIES_COLUMN_WIDTH}px ${UNITS_COLUMN_WIDTH}px`
                                                  }}
                                                >
                                                  <Box
                                                    sx={{
                                                      minHeight: 34,
                                                      px: 1.25,
                                                      borderLeft: '1px solid #E1E7EC',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      color: '#212934',
                                                      fontSize: 13,
                                                      fontWeight: 600,
                                                      fontVariantNumeric: 'tabular-nums'
                                                    }}
                                                  >
                                                    {accountUsage.inheritedPropertiesCount}/{accountUsage.totalProperties}{' '}
                                                    properties
                                                  </Box>
                                                  <Box
                                                    sx={{
                                                      minHeight: 34,
                                                      px: 1.25,
                                                      borderLeft: '1px solid #E1E7EC',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      color: '#212934',
                                                      fontSize: 13,
                                                      fontWeight: 600,
                                                      fontVariantNumeric: 'tabular-nums'
                                                    }}
                                                  >
                                                    {accountUsage.totalBillableUnits} units
                                                  </Box>
                                                </Box>

                                                <Box
                                                  sx={{
                                                    flexShrink: 0,
                                                    display: 'grid',
                                                    gridTemplateColumns: `repeat(${productTierColumnCount}, minmax(${TIER_COLUMN_MIN_WIDTH}px, 1fr))`
                                                  }}
                                                >
                                                  {Array.from({ length: productTierColumnCount }).map(
                                                    (_, columnIndex) => (
                                                      <Box
                                                        key={`${pricing.id}:${accountUsage.account.id}:tier-check:${columnIndex}`}
                                                        sx={{
                                                          minHeight: 34,
                                                          borderLeft: '1px solid #E1E7EC',
                                                          display: 'flex',
                                                          alignItems: 'center',
                                                          justifyContent: 'center'
                                                        }}
                                                      >
                                                        {columnIndex === activeTierColumnIndex ? (
                                                          <TierMatchIndicator />
                                                        ) : null}
                                                      </Box>
                                                    )
                                                  )}
                                                </Box>

                                                <Box
                                                  sx={{
                                                    width: ACTIONS_COLUMN_WIDTH,
                                                    pl: 0.75,
                                                    flexShrink: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'flex-end',
                                                    borderLeft: '1px solid #E1E7EC'
                                                  }}
                                                >
                                                  {accountUsage.accountSubscriptionId ? (
                                                    <Tooltip title="Detach pricing from account">
                                                      <AppIconButton
                                                        tone="ghost"
                                                        aria-label={`Detach pricing from ${accountUsage.account.companyName}`}
                                                        onClick={() =>
                                                          setDetachConfirmTarget({
                                                            pricingId: pricing.id,
                                                            subscriptionId:
                                                              accountUsage.accountSubscriptionId ?? '',
                                                            title: `Detach pricing from ${accountUsage.account.companyName}`
                                                          })
                                                        }
                                                      >
                                                        <CancelOutlinedIcon fontSize="small" />
                                                      </AppIconButton>
                                                    </Tooltip>
                                                  ) : null}
                                                </Box>
                                              </Stack>
                                            </Box>
                                          );
                                        })
                                      ) : null}

                                      {isAccountsVisible ? (
                                        <Stack
                                          direction="row"
                                          alignItems="center"
                                          sx={{
                                            minHeight: 48,
                                            pl: 0,
                                            pr: 1.5,
                                            py: 0.75,
                                            borderTop: '1px dashed #E1E7EC',
                                            backgroundColor: '#FFFFFF'
                                          }}
                                        >
                                          <Box sx={{ width: TREE_INDENT_STEP * (showAccountsSectionHeader ? 3 : 2) }} />
                                          <Box sx={{ width: showAccountsSectionHeader ? TREE_TOGGLE_SLOT_WIDTH : 0 }} />
                                          <Box sx={{ width: TREE_LABEL_GAP }} />
                                          <GhostButton
                                            size="small"
                                            startIcon={<AddIcon />}
                                            sx={{
                                              ...TABLE_GHOST_BUTTON_SX,
                                              '& .MuiButton-startIcon': {
                                                marginLeft: 0,
                                                marginRight: `${TREE_LABEL_GAP}px`,
                                                width: TREE_TOGGLE_SLOT_WIDTH,
                                                display: 'flex',
                                                justifyContent: 'center'
                                              }
                                            }}
                                            onClick={() =>
                                              openCreateSubscription(pricing.id, {
                                                scope: 'ACCOUNT'
                                              })
                                            }
                                          >
                                            Assign account
                                          </GhostButton>
                                        </Stack>
                                      ) : null}

                                      {showPropertiesSectionHeader ? (
                                        <Stack
                                          direction="row"
                                          alignItems="center"
                                          spacing={0}
                                          role="button"
                                          tabIndex={0}
                                          onClick={() =>
                                            toggleExpanded(
                                              setCollapsedUsageSections,
                                              specificPropertiesSectionKey
                                            )
                                          }
                                          onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                              event.preventDefault();
                                              toggleExpanded(
                                                setCollapsedUsageSections,
                                                specificPropertiesSectionKey
                                              );
                                            }
                                          }}
                                          sx={{
                                            minHeight: 34,
                                            px: 1.5,
                                            borderTop: '1px dashed #E1E7EC',
                                            backgroundColor: '#F8F9FA',
                                            cursor: 'pointer'
                                          }}
                                        >
                                          <Box sx={{ width: TREE_INDENT_STEP * 2 }} />
                                          <Box sx={{ width: TREE_TOGGLE_SLOT_WIDTH, display: 'flex', justifyContent: 'center' }}>
                                            <Box
                                              sx={{
                                                width: TREE_TOGGLE_SLOT_WIDTH,
                                                height: TREE_TOGGLE_SLOT_WIDTH,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '2px',
                                                transition: 'background-color 120ms ease',
                                                '&:hover': { backgroundColor: '#EAF0F5' }
                                              }}
                                              aria-label={
                                                isSpecificPropertiesCollapsed
                                                  ? 'Expand specific properties section'
                                                  : 'Collapse specific properties section'
                                              }
                                            >
                                              {isSpecificPropertiesCollapsed ? (
                                                <ChevronRightIcon fontSize="small" />
                                              ) : (
                                                <ExpandMoreIcon fontSize="small" />
                                              )}
                                            </Box>
                                          </Box>
                                          <Box sx={{ width: TREE_LABEL_GAP }} />
                                          <Typography sx={{ fontWeight: 500, fontSize: 14, color: '#212934' }}>
                                            {specificPropertiesCount}{' '}
                                            specific properties
                                          </Typography>
                                        </Stack>
                                      ) : null}

                                      {isSpecificPropertiesVisible
                                        ? specificPropertyRows.map(({ accountUsage, propertyUsage }) => {
                                          const activeTierColumnIndex = getActiveTierColumnIndex(
                                            pricing,
                                            productTierColumnCount,
                                            propertyUsage.currentTier
                                          );

                                          return (
                                            <Stack
                                              key={`${pricing.id}:${accountUsage.account.id}:${propertyUsage.property.id}`}
                                              direction="row"
                                              alignItems="stretch"
                                              spacing={0}
                                              sx={{ minHeight: 44, px: 1.5, borderTop: '1px dotted #E1E7EC' }}
                                            >
                                              <Stack
                                                direction="row"
                                                alignItems="center"
                                                spacing={0}
                                                sx={{ flex: 1, minWidth: LEFT_CONTENT_MIN_WIDTH }}
                                              >
                                                <Box
                                                  sx={{
                                                    width: TREE_INDENT_STEP * (showPropertiesSectionHeader ? 3 : 2)
                                                  }}
                                                />
                                                <Box
                                                  sx={{ width: showPropertiesSectionHeader ? TREE_TOGGLE_SLOT_WIDTH : 0 }}
                                                />
                                                <Box sx={{ width: TREE_LABEL_GAP }} />
                                                <Box sx={{ mr: 1 }}>
                                                  <EntityTypeIndicator type="PROPERTY" />
                                                </Box>

                                                <Stack spacing={0} sx={{ py: 0.5 }}>
                                                  <Link
                                                    href="#"
                                                    onClick={(event) => event.preventDefault()}
                                                    sx={{ ...CLICKABLE_ENTITY_LINK_SX, fontSize: 13, lineHeight: 1.1 }}
                                                  >
                                                    {propertyUsage.property.address}
                                                  </Link>
                                                  <Link
                                                    href="#"
                                                    onClick={(event) => event.preventDefault()}
                                                    sx={{
                                                      ...CLICKABLE_ENTITY_LINK_SX,
                                                      fontSize: 11,
                                                      lineHeight: 1.1,
                                                      color: '#7A8EA8'
                                                    }}
                                                  >
                                                    {accountUsage.account.companyName}
                                                  </Link>
                                                </Stack>
                                              </Stack>

                                              <Box
                                                sx={{
                                                  ml: 'auto',
                                                  flexShrink: 0,
                                                  display: 'grid',
                                                  gridTemplateColumns: `${PROPERTIES_COLUMN_WIDTH}px ${UNITS_COLUMN_WIDTH}px`
                                                }}
                                              >
                                                <Box
                                                  sx={{
                                                    minHeight: 44,
                                                    px: 1.25,
                                                    borderLeft: '1px solid #E1E7EC'
                                                  }}
                                                />
                                                <Box
                                                  sx={{
                                                    minHeight: 44,
                                                    px: 1.25,
                                                    borderLeft: '1px solid #E1E7EC',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    color: '#212934',
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    fontVariantNumeric: 'tabular-nums'
                                                  }}
                                                >
                                                  {propertyUsage.property.billableUnits} units
                                                </Box>
                                              </Box>

                                              <Box
                                                sx={{
                                                  flexShrink: 0,
                                                  display: 'grid',
                                                  gridTemplateColumns: `repeat(${productTierColumnCount}, minmax(${TIER_COLUMN_MIN_WIDTH}px, 1fr))`
                                                }}
                                              >
                                                {Array.from({ length: productTierColumnCount }).map((_, columnIndex) => (
                                                  <Box
                                                    key={`${pricing.id}:${propertyUsage.property.id}:tier-check:${columnIndex}`}
                                                    sx={{
                                                      minHeight: 44,
                                                      borderLeft: '1px solid #E1E7EC',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'center'
                                                    }}
                                                  >
                                                    {columnIndex === activeTierColumnIndex ? (
                                                      <TierMatchIndicator />
                                                    ) : null}
                                                  </Box>
                                                ))}
                                              </Box>

                                              <Box
                                                sx={{
                                                  width: ACTIONS_COLUMN_WIDTH,
                                                  pl: 0.75,
                                                  flexShrink: 0,
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'flex-end',
                                                  borderLeft: '1px solid #E1E7EC'
                                                }}
                                              >
                                                {propertyUsage.resolvedBySubscriptionId ? (
                                                  <Tooltip title="Detach pricing from property">
                                                    <AppIconButton
                                                      tone="ghost"
                                                      aria-label={`Detach pricing from ${propertyUsage.property.address}`}
                                                      onClick={() =>
                                                        setDetachConfirmTarget({
                                                          pricingId: pricing.id,
                                                          subscriptionId:
                                                            propertyUsage.resolvedBySubscriptionId ?? '',
                                                          title: `Detach override from ${propertyUsage.property.address}`
                                                        })
                                                      }
                                                    >
                                                      <CancelOutlinedIcon fontSize="small" />
                                                    </AppIconButton>
                                                  </Tooltip>
                                                ) : null}
                                              </Box>
                                            </Stack>
                                          );
                                        })
                                        : null}

                                      {isSpecificPropertiesVisible ? (
                                        <Stack
                                          direction="row"
                                          alignItems="center"
                                          sx={{
                                            minHeight: 48,
                                            pl: 0,
                                            pr: 1.5,
                                            py: 0.75,
                                            borderTop: '1px dashed #E1E7EC',
                                            backgroundColor: '#FFFFFF'
                                          }}
                                        >
                                          <Box
                                            sx={{
                                              width: TREE_INDENT_STEP * (showPropertiesSectionHeader ? 3 : 2)
                                            }}
                                          />
                                          <Box sx={{ width: showPropertiesSectionHeader ? TREE_TOGGLE_SLOT_WIDTH : 0 }} />
                                          <Box sx={{ width: TREE_LABEL_GAP }} />
                                          <GhostButton
                                            size="small"
                                            startIcon={<AddIcon />}
                                            sx={{
                                              ...TABLE_GHOST_BUTTON_SX,
                                              '& .MuiButton-startIcon': {
                                                marginLeft: 0,
                                                marginRight: `${TREE_LABEL_GAP}px`,
                                                width: TREE_TOGGLE_SLOT_WIDTH,
                                                display: 'flex',
                                                justifyContent: 'center'
                                              }
                                            }}
                                            onClick={() =>
                                              openCreateSubscription(pricing.id, {
                                                scope: 'PROPERTY'
                                              })
                                            }
                                          >
                                            Assign property
                                          </GhostButton>
                                        </Stack>
                                      ) : null}

                                    </Stack>
                                  ) : null}
                                </Box>
                              );
                            })
                          )}

                          {groupByProduct ? (
                            <Stack
                              direction="row"
                              alignItems="center"
                              sx={{
                                minHeight: 48,
                                pl: 0,
                                pr: 1.5,
                                py: 0.75,
                                borderTop: '1px solid #E1E7EC',
                                backgroundColor: '#FFFFFF'
                              }}
                            >
                              <Box sx={{ width: TREE_INDENT_STEP }} />
                              <GhostButton
                                size="small"
                                startIcon={<AddIcon />}
                                sx={{
                                  ...TABLE_GHOST_BUTTON_SX,
                                  '& .MuiButton-startIcon': {
                                    marginLeft: 0,
                                    marginRight: `${TREE_LABEL_GAP}px`,
                                    width: TREE_TOGGLE_SLOT_WIDTH,
                                    display: 'flex',
                                    justifyContent: 'center'
                                  }
                                }}
                                onClick={() => openCreatePricing(product.id)}
                              >
                                Add pricing
                              </GhostButton>
                            </Stack>
                          ) : null}

                        </Stack>
                      ) : null}
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          )}
        </Box>
      </Stack>

      {pricingModalOpen ? (
        <Suspense fallback={null}>
          <PricingFormDrawer
            open={pricingModalOpen}
            mode={pricingModalMode}
            initialPricing={editingPricing}
            defaultProductId={defaultProductId}
            onClose={closePricingModal}
          />
        </Suspense>
      ) : null}

      {subscriptionModalOpen ? (
        <Suspense fallback={null}>
          <SubscriptionFormDrawer
            open={subscriptionModalOpen}
            mode="create"
            initialSubscription={null}
            defaultAccountId={defaultSubscriptionAccountId}
            defaultPricingIds={defaultSubscriptionPricingIds}
            defaultScope={defaultSubscriptionScope}
            onClose={closeSubscriptionModal}
          />
        </Suspense>
      ) : null}

      <Menu
        open={Boolean(pricingActionsTarget)}
        anchorEl={pricingActionsTarget?.anchorEl ?? null}
        onClose={() => setPricingActionsTarget(null)}
      >
        <MenuItem
          onClick={() => {
            if (!pricingActionsTarget) {
              return;
            }

            openCreateSubscription(pricingActionsTarget.pricingId, { scope: 'ACCOUNT' });
            setPricingActionsTarget(null);
          }}
        >
          Assign account
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (!pricingActionsTarget) {
              return;
            }

            openCreateSubscription(pricingActionsTarget.pricingId, { scope: 'PROPERTY' });
            setPricingActionsTarget(null);
          }}
        >
          Assign property
        </MenuItem>
      </Menu>

      <Dialog open={Boolean(deletingPricing)} onClose={() => setDeletingPricing(null)}>
        <DialogTitle>Delete Pricing</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ minWidth: 320, pt: 1 }}>
            <Typography variant="body2">
              This action will remove pricing <strong>{deletingPricing?.internalName ?? ''}</strong>.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              If this pricing is attached to subscriptions, links will be removed automatically.
            </Typography>
            {actionError ? <Alert severity="error">{actionError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <SecondaryButton onClick={() => setDeletingPricing(null)}>Cancel</SecondaryButton>
          <PrimaryButton
            sx={{ backgroundColor: '#B3261E', '&:hover': { backgroundColor: '#8C1D18' } }}
            onClick={() => void confirmDeletePricing()}
            disabled={deleteMutation.isPending}
          >
            Delete
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(detachConfirmTarget)} onClose={() => setDetachConfirmTarget(null)}>
        <DialogTitle>Detach Pricing</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ minWidth: 320, pt: 1 }}>
            <Typography variant="body2">{detachConfirmTarget?.title ?? 'Detach this pricing usage?'}</Typography>
            <Typography variant="body2" color="text.secondary">
              This action removes selected pricing link from the subscription.
            </Typography>
            {actionError ? <Alert severity="error">{actionError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <SecondaryButton onClick={() => setDetachConfirmTarget(null)}>Cancel</SecondaryButton>
          <PrimaryButton
            sx={{ backgroundColor: '#B3261E', '&:hover': { backgroundColor: '#8C1D18' } }}
            onClick={() => void confirmDetach()}
          >
            Detach
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={2500}
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
      />
    </>
  );
}
