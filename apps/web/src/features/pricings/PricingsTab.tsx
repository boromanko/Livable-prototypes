import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HomeIcon from '@mui/icons-material/Home';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PersonIcon from '@mui/icons-material/Person';
import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Menu,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import {
  ApiError,
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
import { GhostButton, PrimaryButton, SecondaryButton } from '../../components/buttons';
import { EmptyState, FiltersToolbar } from '../../components/layout';

const PricingFormDrawer = lazy(async () => {
  const module = await import('./PricingFormDrawer');
  return { default: module.PricingFormDrawer };
});

const SubscriptionFormDrawer = lazy(async () => {
  const module = await import('../subscriptions/SubscriptionFormDrawer');
  return { default: module.SubscriptionFormDrawer };
});

type RowMenuTarget = {
  anchorEl: HTMLElement;
  pricingId: string;
  subscriptionId: string;
  title: string;
};

type PricingActionsMenuTarget = {
  anchorEl: HTMLElement;
  pricingId: string;
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
  productIdFilter: string
): boolean {
  if (typeFilter !== 'ALL' && pricing.type !== typeFilter) {
    return false;
  }

  if (productIdFilter && pricing.product.id !== productIdFilter) {
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

export function PricingsTab(): JSX.Element {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | PricingType>('ALL');
  const [productIdFilter, setProductIdFilter] = useState('');

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
  const [detachTarget, setDetachTarget] = useState<RowMenuTarget | null>(null);
  const [pricingActionsTarget, setPricingActionsTarget] =
    useState<PricingActionsMenuTarget | null>(null);
  const [detachConfirmTarget, setDetachConfirmTarget] = useState<{
    pricingId: string;
    subscriptionId: string;
    title: string;
  } | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const productsQuery = useProductsQuery();
  const pricingsTreeQuery = usePricingsTreeQuery();
  const deleteMutation = useDeletePricingMutation();
  const bulkMutation = useBulkSubscriptionsMutation();

  const filteredPricings = useMemo(
    () =>
      (pricingsTreeQuery.data?.items ?? []).filter((pricing) =>
        matchesPricingFilters(pricing, search, typeFilter, productIdFilter)
      ),
    [pricingsTreeQuery.data?.items, search, typeFilter, productIdFilter]
  );

  const pricingsByProductId = useMemo(() => {
    const grouped = new Map<string, PricingTreeItem[]>();

    for (const pricing of filteredPricings) {
      const current = grouped.get(pricing.product.id) ?? [];
      current.push(pricing);
      grouped.set(pricing.product.id, current);
    }

    return grouped;
  }, [filteredPricings]);

  const visibleProducts = useMemo(() => {
    const allProducts = productsQuery.data?.items ?? [];

    return allProducts.filter((product) => {
      if (productIdFilter && product.id !== productIdFilter) {
        return false;
      }

      if (search.trim() === '') {
        return true;
      }

      const hasFilteredPricings = (pricingsByProductId.get(product.id)?.length ?? 0) > 0;
      const matchesProductSearch =
        product.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        product.code.toLowerCase().includes(search.trim().toLowerCase());

      return hasFilteredPricings || matchesProductSearch;
    });
  }, [productIdFilter, productsQuery.data?.items, pricingsByProductId, search]);

  const minTreeWidthPx = useMemo(() => {
    return visibleProducts.reduce((maxWidth, product) => {
      const productPricings = pricingsByProductId.get(product.id) ?? [];
      const tierColumnCount = getProductTierColumnCount(productPricings);
      return Math.max(maxWidth, getProductMinRowWidth(tierColumnCount));
    }, BASE_TREE_MIN_WIDTH);
  }, [pricingsByProductId, visibleProducts]);

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

  async function confirmDeletePricing(): Promise<void> {
    if (!deletingPricing) {
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

                <TextField
                  size="small"
                  select
                  label="Type"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as 'ALL' | PricingType)}
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="ALL">ALL</MenuItem>
                  <MenuItem value="FIXED">FIXED</MenuItem>
                  <MenuItem value="TIERED">TIERED</MenuItem>
                </TextField>

                <TextField
                  size="small"
                  select
                  label="Product"
                  value={productIdFilter}
                  onChange={(event) => setProductIdFilter(event.target.value)}
                  sx={{ minWidth: 220 }}
                >
                  <MenuItem value="">All products</MenuItem>
                  {(productsQuery.data?.items ?? []).map((product) => (
                    <MenuItem key={product.id} value={product.id}>
                      {product.name}
                    </MenuItem>
                  ))}
                </TextField>
              </>
            }
            right={
              <PrimaryButton startIcon={<AddIcon />} onClick={() => openCreatePricing()}>
                Add pricing
              </PrimaryButton>
            }
          />
        </Box>

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
          ) : visibleProducts.length === 0 ? (
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
                {visibleProducts.map((product, productIndex) => {
                  const productPricings = pricingsByProductId.get(product.id) ?? [];
                  const productTierColumnCount = getProductTierColumnCount(productPricings);
                  const isProductExpanded = !collapsedProducts.has(product.id);

                  return (
                    <Box key={product.id}>
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
                          backgroundColor: '#F8F9FA',
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
                            ({productPricings.length})
                          </Typography>
                        </Stack>
                      </Stack>

                      {isProductExpanded ? (
                        <Stack spacing={0}>
                          {productPricings.length === 0 ? null : (
                            productPricings.map((pricing) => {
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
                                      borderTop: '1px solid #E1E7EC',
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
                                      top: PRICING_ROW_STICKY_TOP,
                                      zIndex: 24
                                    }}
                                  >
                                    <Stack
                                      direction="row"
                                      alignItems="center"
                                      spacing={0}
                                      sx={{ flex: 1, minWidth: LEFT_CONTENT_MIN_WIDTH }}
                                    >
                                      <Box sx={{ width: TREE_INDENT_STEP }} />
                                      <Box sx={{ width: TREE_TOGGLE_SLOT_WIDTH, display: 'flex', justifyContent: 'center' }}>
                                        <IconButton
                                          size="small"
                                          sx={{ width: TREE_TOGGLE_SLOT_WIDTH, height: TREE_TOGGLE_SLOT_WIDTH, p: 0 }}
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            toggleExpanded(setExpandedPricings, pricingKey);
                                          }}
                                          aria-label={isPricingExpanded ? 'Collapse pricing' : 'Expand pricing'}
                                        >
                                          {isPricingExpanded ? (
                                            <ExpandMoreIcon fontSize="small" />
                                          ) : (
                                            <ChevronRightIcon fontSize="small" />
                                          )}
                                        </IconButton>
                                      </Box>
                                      <Box sx={{ width: TREE_LABEL_GAP }} />
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
                                            fontSize: 15,
                                            color: pricing.type === 'TIERED' ? '#1F9D55' : '#2B6CB0'
                                          }}
                                        >
                                          {pricing.type === 'TIERED' ? 'Tiered' : 'Fixed'}
                                        </Typography>
                                        <Typography sx={{ fontWeight: 600, fontSize: 16, lineHeight: 1, color: '#B8C4CE' }}>
                                          |
                                        </Typography>
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
                                        <Typography sx={{ fontWeight: 600, fontSize: 16, lineHeight: 1, color: '#B8C4CE' }}>
                                          |
                                        </Typography>
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
                                      <IconButton
                                        size="small"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          openEditPricing(pricing);
                                        }}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>

                                      <IconButton
                                        size="small"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setDeletingPricing(pricing);
                                        }}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>

                                      <IconButton
                                        size="small"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setPricingActionsTarget({
                                            anchorEl: event.currentTarget,
                                            pricingId: pricing.id
                                          });
                                        }}
                                      >
                                        <MoreHorizIcon fontSize="small" />
                                      </IconButton>
                                    </Stack>
                                  </Stack>

                                  {isPricingExpanded ? (
                                    <Stack spacing={0}>
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
                                              isAccountsCollapsed ? 'Expand accounts section' : 'Collapse accounts section'
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

                                      {!isAccountsCollapsed && accountRows.length > 0 ? (
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
                                                <Box sx={{ width: TREE_INDENT_STEP * 3 }} />
                                                <Box sx={{ width: TREE_TOGGLE_SLOT_WIDTH }} />
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
                                                    <IconButton
                                                      size="small"
                                                      onClick={(event) =>
                                                        setDetachTarget({
                                                          anchorEl: event.currentTarget,
                                                          pricingId: pricing.id,
                                                          subscriptionId: accountUsage.accountSubscriptionId ?? '',
                                                          title: `Detach pricing from ${accountUsage.account.companyName}`
                                                        })
                                                      }
                                                    >
                                                      <MoreHorizIcon fontSize="small" />
                                                    </IconButton>
                                                  ) : null}
                                                </Box>
                                              </Stack>
                                            </Box>
                                          );
                                        })
                                      ) : null}

                                      {!isAccountsCollapsed ? (
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
                                          <Box sx={{ width: TREE_INDENT_STEP * 3 }} />
                                          <Box sx={{ width: TREE_TOGGLE_SLOT_WIDTH }} />
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

                                      {!isSpecificPropertiesCollapsed
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
                                                <Box sx={{ width: TREE_INDENT_STEP * 3 }} />
                                                <Box sx={{ width: TREE_TOGGLE_SLOT_WIDTH }} />
                                                <Box sx={{ width: TREE_LABEL_GAP }} />
                                                <Box sx={{ mr: 1 }}>
                                                  <EntityTypeIndicator type="PROPERTY" />
                                                </Box>

                                                <Stack spacing={0} sx={{ minWidth: 360, py: 0.5 }}>
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
                                                  <IconButton
                                                    size="small"
                                                    onClick={(event) =>
                                                      setDetachTarget({
                                                        anchorEl: event.currentTarget,
                                                        pricingId: pricing.id,
                                                        subscriptionId:
                                                          propertyUsage.resolvedBySubscriptionId ?? '',
                                                        title: `Detach override from ${propertyUsage.property.address}`
                                                      })
                                                    }
                                                  >
                                                    <MoreHorizIcon fontSize="small" />
                                                  </IconButton>
                                                ) : null}
                                              </Box>
                                            </Stack>
                                          );
                                        })
                                        : null}

                                      {!isSpecificPropertiesCollapsed ? (
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
                                          <Box sx={{ width: TREE_INDENT_STEP * 3 }} />
                                          <Box sx={{ width: TREE_TOGGLE_SLOT_WIDTH }} />
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

      <Menu
        open={Boolean(detachTarget)}
        anchorEl={detachTarget?.anchorEl ?? null}
        onClose={() => setDetachTarget(null)}
      >
        <MenuItem
          onClick={() => {
            if (!detachTarget) {
              return;
            }

            setDetachConfirmTarget({
              pricingId: detachTarget.pricingId,
              subscriptionId: detachTarget.subscriptionId,
              title: detachTarget.title
            });
            setDetachTarget(null);
          }}
        >
          Detach pricing
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
              Deletion is blocked if this pricing is already attached to subscriptions.
            </Typography>
            {actionError ? <Alert severity="error">{actionError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <SecondaryButton onClick={() => setDeletingPricing(null)}>Cancel</SecondaryButton>
          <PrimaryButton
            sx={{ backgroundColor: '#B3261E', '&:hover': { backgroundColor: '#8C1D18' } }}
            onClick={() => void confirmDeletePricing()}
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
