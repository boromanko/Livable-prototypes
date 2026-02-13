import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HomeIcon from '@mui/icons-material/Home';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PersonIcon from '@mui/icons-material/Person';
import {
  Alert,
  Box,
  Button,
  Chip,
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
import { Suspense, lazy, useMemo, useState } from 'react';
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

  return `${tier.fromUnit}-${tier.toUnit ?? '∞'}`;
}

const MAX_TIER_COLUMNS = 7;
const ACTIONS_COLUMN_WIDTH = 118;
const PROPERTIES_COLUMN_WIDTH = 176;
const UNITS_COLUMN_WIDTH = 128;
const TREE_INDENT_STEP = 32;
const TREE_TOGGLE_SLOT_WIDTH = 24;
const TREE_LABEL_GAP = 8;
const INLINE_ACTION_BUTTON_SX = {
  width: 'fit-content',
  px: 1.5,
  py: 0.75,
  minHeight: 36,
  backgroundColor: '#F8F9FA',
  color: '#212934',
  '&:hover': { backgroundColor: '#EBF0F5' }
} as const;

const INLINE_TURQUOISE_ACTION_BUTTON_SX = {
  ...INLINE_ACTION_BUTTON_SX,
  color: '#009299'
} as const;
const CLICKABLE_ENTITY_LINK_SX = {
  color: '#009299',
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

  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [expandedPricings, setExpandedPricings] = useState<Set<string>>(new Set());
  const [collapsedUsageSections, setCollapsedUsageSections] = useState<Set<string>>(new Set());

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

  return (
    <>
      <Stack spacing={0}>
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
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => openCreatePricing()}>
                Add pricing
              </Button>
            }
          />
        </Box>

        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
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
            <Box sx={{ overflowX: 'auto' }}>
              <Stack
                spacing={0}
                sx={{
                  minWidth: 980,
                  border: '1px solid #E1E7EC',
                  borderRadius: 1,
                  overflow: 'hidden'
                }}
              >
                {visibleProducts.map((product) => {
                  const productPricings = pricingsByProductId.get(product.id) ?? [];
                  const productTierColumnCount = getProductTierColumnCount(productPricings);
                  const isProductExpanded = expandedProducts.has(product.id);

                  return (
                    <Box key={product.id}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0}
                        sx={{
                          minHeight: 40,
                          px: 1.5,
                          py: 0.5,
                          backgroundColor: '#F8F9FA',
                          borderTop: '1px solid #E1E7EC'
                        }}
                      >
                        <Box sx={{ width: TREE_TOGGLE_SLOT_WIDTH, display: 'flex', justifyContent: 'center' }}>
                          <IconButton
                            size="small"
                            sx={{ width: TREE_TOGGLE_SLOT_WIDTH, height: TREE_TOGGLE_SLOT_WIDTH, p: 0 }}
                            onClick={() => toggleExpanded(setExpandedProducts, product.id)}
                            aria-label={isProductExpanded ? 'Collapse product' : 'Expand product'}
                          >
                            {isProductExpanded ? (
                              <ExpandMoreIcon fontSize="small" />
                            ) : (
                              <ChevronRightIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Box>
                        <Box sx={{ width: TREE_LABEL_GAP }} />
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                          <Typography sx={{ fontWeight: 700 }}>{product.name}</Typography>
                          <Chip size="small" label={`${productPricings.length} pricings`} />
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
                                    sx={{ minHeight: 44, px: 1.5, py: 0.25, borderTop: '1px solid #E1E7EC' }}
                                  >
                                    <Stack direction="row" alignItems="center" spacing={0} sx={{ flex: 1, minWidth: 340 }}>
                                      <Box sx={{ width: TREE_INDENT_STEP }} />
                                      <Box sx={{ width: TREE_TOGGLE_SLOT_WIDTH, display: 'flex', justifyContent: 'center' }}>
                                        <IconButton
                                          size="small"
                                          sx={{ width: TREE_TOGGLE_SLOT_WIDTH, height: TREE_TOGGLE_SLOT_WIDTH, p: 0 }}
                                          onClick={() => toggleExpanded(setExpandedPricings, pricingKey)}
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
                                      <Stack direction="row" alignItems="center" spacing={0.75}>
                                        <Typography sx={{ fontWeight: 600 }}>{pricing.internalName}</Typography>
                                        <Chip size="small" label={pricing.type} />
                                      </Stack>
                                    </Stack>

                                    <Box
                                      sx={{
                                        ml: 'auto',
                                        flexShrink: 0,
                                        display: 'grid',
                                        gridTemplateColumns: `repeat(${productTierColumnCount}, minmax(124px, 1fr))`
                                      }}
                                    >
                                      {Array.from({ length: productTierColumnCount }).map((_, columnIndex) => {
                                        const columnOffset = getPricingColumnOffset(pricing, productTierColumnCount);
                                        const localTierIndex = columnIndex - columnOffset;
                                        const tier = getTierForColumn(pricing, productTierColumnCount, columnIndex);
                                        const isFixedCell =
                                          pricing.type === 'FIXED' && columnIndex === productTierColumnCount - 1;
                                        const isFilled = isFixedCell || Boolean(tier);

                                        return (
                                          <Box
                                            key={`${pricing.id}:pricing-cell:${columnIndex}`}
                                            sx={{
                                              minHeight: 44,
                                              px: 1.25,
                                              py: 0.5,
                                              borderLeft: '1px solid #E1E7EC',
                                              display: 'flex',
                                              flexDirection: 'column',
                                              justifyContent: 'center',
                                              gap: 0.125,
                                              backgroundColor: isFilled ? '#FCFDFE' : '#FFFFFF'
                                            }}
                                          >
                                            {isFixedCell ? (
                                              <>
                                                <Typography sx={{ fontSize: 11, color: '#4B617C', fontWeight: 600 }}>
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
                                                <Typography sx={{ fontSize: 11, color: '#4B617C' }}>
                                                  T{localTierIndex + 1} {getTierRangeLabel(tier)}
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
                                        onClick={(event) =>
                                          setPricingActionsTarget({
                                            anchorEl: event.currentTarget,
                                            pricingId: pricing.id
                                          })
                                        }
                                      >
                                        <MoreHorizIcon fontSize="small" />
                                      </IconButton>

                                      <IconButton size="small" onClick={() => openEditPricing(pricing)}>
                                        <EditOutlinedIcon fontSize="small" />
                                      </IconButton>

                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => setDeletingPricing(pricing)}
                                      >
                                        <DeleteOutlineIcon fontSize="small" />
                                      </IconButton>
                                    </Stack>
                                  </Stack>

                                  {isPricingExpanded ? (
                                    <Stack spacing={0}>
                                      <Stack
                                        direction="row"
                                        alignItems="center"
                                        spacing={0}
                                        sx={{
                                          minHeight: 34,
                                          px: 1.5,
                                          borderTop: '1px dashed #E1E7EC',
                                          backgroundColor: '#FCFDFE'
                                        }}
                                      >
                                        <Box sx={{ width: TREE_INDENT_STEP * 2 }} />
                                        <Box sx={{ width: TREE_TOGGLE_SLOT_WIDTH, display: 'flex', justifyContent: 'center' }}>
                                          <IconButton
                                            size="small"
                                            sx={{ width: TREE_TOGGLE_SLOT_WIDTH, height: TREE_TOGGLE_SLOT_WIDTH, p: 0 }}
                                            onClick={() =>
                                              toggleExpanded(setCollapsedUsageSections, accountsSectionKey)
                                            }
                                            aria-label={
                                              isAccountsCollapsed ? 'Expand accounts section' : 'Collapse accounts section'
                                            }
                                          >
                                            {isAccountsCollapsed ? (
                                              <ChevronRightIcon fontSize="small" />
                                            ) : (
                                              <ExpandMoreIcon fontSize="small" />
                                            )}
                                          </IconButton>
                                        </Box>
                                        <Box sx={{ width: TREE_LABEL_GAP }} />
                                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#212934' }}>
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
                                                sx={{ flex: 1, minWidth: 340 }}
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
                                                    gridTemplateColumns: `repeat(${productTierColumnCount}, minmax(124px, 1fr))`
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
                                            px: 1.5,
                                            py: 0.75,
                                            borderTop: '1px dashed #E1E7EC',
                                            backgroundColor: '#FCFDFE'
                                          }}
                                        >
                                          <Box sx={{ width: TREE_INDENT_STEP * 3 }} />
                                          <Box sx={{ width: TREE_TOGGLE_SLOT_WIDTH }} />
                                          <Box sx={{ width: TREE_LABEL_GAP }} />
                                          <Button
                                            size="small"
                                            startIcon={<AddIcon />}
                                            sx={INLINE_ACTION_BUTTON_SX}
                                            onClick={() =>
                                              openCreateSubscription(pricing.id, {
                                                scope: 'ACCOUNT'
                                              })
                                            }
                                          >
                                            Assign account
                                          </Button>
                                        </Stack>
                                      ) : null}

                                      <Stack
                                        direction="row"
                                        alignItems="center"
                                        spacing={0}
                                        sx={{
                                          minHeight: 34,
                                          px: 1.5,
                                          borderTop: '1px dashed #E1E7EC',
                                          backgroundColor: '#FCFDFE'
                                        }}
                                      >
                                        <Box sx={{ width: TREE_INDENT_STEP * 2 }} />
                                        <Box sx={{ width: TREE_TOGGLE_SLOT_WIDTH, display: 'flex', justifyContent: 'center' }}>
                                          <IconButton
                                            size="small"
                                            sx={{ width: TREE_TOGGLE_SLOT_WIDTH, height: TREE_TOGGLE_SLOT_WIDTH, p: 0 }}
                                            onClick={() =>
                                              toggleExpanded(
                                                setCollapsedUsageSections,
                                                specificPropertiesSectionKey
                                              )
                                            }
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
                                          </IconButton>
                                        </Box>
                                        <Box sx={{ width: TREE_LABEL_GAP }} />
                                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#212934' }}>
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
                                                sx={{ flex: 1, minWidth: 340 }}
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
                                                  gridTemplateColumns: `repeat(${productTierColumnCount}, minmax(124px, 1fr))`
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
                                            px: 1.5,
                                            py: 0.75,
                                            borderTop: '1px dashed #E1E7EC',
                                            backgroundColor: '#FCFDFE'
                                          }}
                                        >
                                          <Box sx={{ width: TREE_INDENT_STEP * 3 }} />
                                          <Box sx={{ width: TREE_TOGGLE_SLOT_WIDTH }} />
                                          <Box sx={{ width: TREE_LABEL_GAP }} />
                                          <Button
                                            size="small"
                                            startIcon={<AddIcon />}
                                            sx={INLINE_ACTION_BUTTON_SX}
                                            onClick={() =>
                                              openCreateSubscription(pricing.id, {
                                                scope: 'PROPERTY'
                                              })
                                            }
                                          >
                                            Assign property
                                          </Button>
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
                              px: 1.5,
                              py: 0.75,
                              borderTop: '1px solid #E1E7EC',
                              backgroundColor: '#F8F9FA'
                            }}
                          >
                            <Box sx={{ width: TREE_INDENT_STEP }} />
                            <Box sx={{ width: TREE_TOGGLE_SLOT_WIDTH }} />
                            <Box sx={{ width: TREE_LABEL_GAP }} />
                            <Button
                              size="small"
                              startIcon={<AddIcon />}
                              sx={INLINE_TURQUOISE_ACTION_BUTTON_SX}
                              onClick={() => openCreatePricing(product.id)}
                            >
                              Add pricing
                            </Button>
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
          <Button onClick={() => setDeletingPricing(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void confirmDeletePricing()}>
            Delete
          </Button>
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
          <Button onClick={() => setDetachConfirmTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void confirmDetach()}>
            Detach
          </Button>
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
