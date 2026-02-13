import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
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

function summarizeTieredPricing(pricing: PricingTreeItem): string {
  if (pricing.tiers.length === 0) {
    return 'No tiers';
  }

  return pricing.tiers
    .map((tier) => `${tier.fromUnit}-${tier.toUnit ?? '∞'}: ${formatMoneyCents(tier.unitAmountCents, pricing.currency)}`)
    .join('; ');
}

function summarizePricing(pricing: PricingTreeItem): string {
  if (pricing.type === 'FIXED') {
    return formatMoneyCents(pricing.fixedAmountCents, pricing.currency);
  }

  return summarizeTieredPricing(pricing);
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
      propertyUsage.property.name.toLowerCase().includes(normalizedSearch)
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
                Create Pricing
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
              actionLabel="Create Pricing"
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
                  const isProductExpanded = expandedProducts.has(product.id);

                  return (
                    <Box key={product.id}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{
                          minHeight: 40,
                          px: 1.5,
                          py: 0.5,
                          backgroundColor: '#F8F9FA',
                          borderTop: '1px solid #E1E7EC'
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={() => toggleExpanded(setExpandedProducts, product.id)}
                          aria-label={isProductExpanded ? 'Collapse product' : 'Expand product'}
                        >
                          {isProductExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                        </IconButton>

                        <Typography sx={{ fontWeight: 700 }}>{product.name}</Typography>
                        <Chip size="small" label={`${productPricings.length} pricings`} />
                      </Stack>

                      {isProductExpanded ? (
                        <Stack spacing={0}>
                          {productPricings.length === 0 ? (
                            <Typography sx={{ py: 1.25, px: 6, color: '#4B617C', fontSize: 13 }}>
                              No pricings for this product.
                            </Typography>
                          ) : (
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
                                    alignItems="center"
                                    spacing={1}
                                    sx={{ minHeight: 38, px: 1.5, py: 0.25, borderTop: '1px solid #E1E7EC' }}
                                  >
                                    <Box sx={{ width: 28 }} />
                                    <IconButton
                                      size="small"
                                      onClick={() => toggleExpanded(setExpandedPricings, pricingKey)}
                                      aria-label={isPricingExpanded ? 'Collapse pricing' : 'Expand pricing'}
                                    >
                                      {isPricingExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                    </IconButton>

                                    <Typography sx={{ minWidth: 220, fontWeight: 600 }}>
                                      {pricing.internalName}
                                    </Typography>

                                    <Chip size="small" label={pricing.type} />

                                    <Typography
                                      sx={{
                                        flex: 1,
                                        color: '#4B617C',
                                        fontSize: 13,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                      }}
                                      title={summarizePricing(pricing)}
                                    >
                                      {summarizePricing(pricing)}
                                    </Typography>

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

                                    <IconButton size="small" color="error" onClick={() => setDeletingPricing(pricing)}>
                                      <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                  </Stack>

                                  {isPricingExpanded ? (
                                    <Stack spacing={0}>
                                      <Stack
                                        direction="row"
                                        alignItems="center"
                                        spacing={0.75}
                                        sx={{
                                          minHeight: 34,
                                          px: 1.5,
                                          borderTop: '1px dashed #E1E7EC',
                                          backgroundColor: '#FCFDFE'
                                        }}
                                      >
                                        <Box sx={{ width: 56 }} />
                                        <IconButton
                                          size="small"
                                          onClick={() =>
                                            toggleExpanded(setCollapsedUsageSections, accountsSectionKey)
                                          }
                                          aria-label={
                                            isAccountsCollapsed ? 'Expand accounts section' : 'Collapse accounts section'
                                          }
                                        >
                                          {isAccountsCollapsed ? (
                                            <ExpandMoreIcon fontSize="small" />
                                          ) : (
                                            <ExpandLessIcon fontSize="small" />
                                          )}
                                        </IconButton>
                                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#212934' }}>
                                          {accountRows.length} accounts
                                        </Typography>
                                      </Stack>

                                      {!isAccountsCollapsed && accountRows.length > 0 ? (
                                        accountRows.map((accountUsage) => {
                                          const accountTierLabel = (() => {
                                            if (pricing.type === 'FIXED') {
                                              return formatMoneyCents(
                                                pricing.fixedAmountCents,
                                                pricing.currency
                                              );
                                            }

                                            return `${getTierRangeLabel(accountUsage.currentTier)} · ${formatMoneyCents(accountUsage.currentUnitAmountCents, pricing.currency)}`;
                                          })();

                                          return (
                                            <Box key={`${pricing.id}:${accountUsage.account.id}`}>
                                              <Stack
                                                direction="row"
                                                alignItems="center"
                                                spacing={1}
                                                sx={{ minHeight: 34, px: 1.5, borderTop: '1px dashed #E1E7EC' }}
                                              >
                                                <Box sx={{ width: 96 }} />
                                                <Typography sx={{ minWidth: 260, fontSize: 14 }}>
                                                  {accountUsage.account.companyName}
                                                </Typography>

                                                <Typography sx={{ minWidth: 170, color: '#4B617C', fontSize: 13 }}>
                                                  {accountUsage.inheritedPropertiesCount}/
                                                  {accountUsage.totalProperties} properties
                                                </Typography>

                                                <Typography sx={{ minWidth: 130, color: '#4B617C', fontSize: 13 }}>
                                                  {accountUsage.totalBillableUnits} units
                                                </Typography>

                                                <Typography sx={{ flex: 1, color: '#4B617C', fontSize: 13 }}>
                                                  {accountTierLabel}
                                                </Typography>

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
                                                ) : (
                                                  <Box sx={{ width: 30 }} />
                                                )}
                                              </Stack>
                                            </Box>
                                          );
                                        })
                                      ) : !isAccountsCollapsed ? (
                                        <Typography sx={{ py: 1, px: 10, color: '#4B617C', fontSize: 13 }}>
                                          No accounts for this pricing.
                                        </Typography>
                                      ) : null}

                                      {!isAccountsCollapsed ? (
                                        <Stack
                                          direction="row"
                                          alignItems="center"
                                          sx={{ minHeight: 34, px: 1.5, borderTop: '1px dashed #E1E7EC' }}
                                        >
                                          <Box sx={{ width: 96 }} />
                                          <Button
                                            size="small"
                                            startIcon={<AddIcon />}
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
                                        spacing={0.75}
                                        sx={{
                                          minHeight: 34,
                                          px: 1.5,
                                          borderTop: '1px dashed #E1E7EC',
                                          backgroundColor: '#FCFDFE'
                                        }}
                                      >
                                        <Box sx={{ width: 56 }} />
                                        <IconButton
                                          size="small"
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
                                            <ExpandMoreIcon fontSize="small" />
                                          ) : (
                                            <ExpandLessIcon fontSize="small" />
                                          )}
                                        </IconButton>
                                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#212934' }}>
                                          {specificPropertiesCount}{' '}
                                          specific properties
                                        </Typography>
                                      </Stack>

                                      {!isSpecificPropertiesCollapsed
                                        ? specificPropertyRows.map(({ accountUsage, propertyUsage }) => {
                                          const propertyTierLabel = (() => {
                                            if (pricing.type === 'FIXED') {
                                              return formatMoneyCents(
                                                pricing.fixedAmountCents,
                                                pricing.currency
                                              );
                                            }

                                            return `${getTierRangeLabel(propertyUsage.currentTier)} · ${formatMoneyCents(propertyUsage.currentUnitAmountCents, pricing.currency)}`;
                                          })();

                                          return (
                                            <Stack
                                              key={`${pricing.id}:${accountUsage.account.id}:${propertyUsage.property.id}`}
                                              direction="row"
                                              alignItems="center"
                                              spacing={1}
                                              sx={{ minHeight: 32, px: 1.5, borderTop: '1px dotted #E1E7EC' }}
                                            >
                                              <Box sx={{ width: 96 }} />

                                              <Typography sx={{ minWidth: 260, fontSize: 13 }}>
                                                {propertyUsage.property.name}
                                              </Typography>

                                              <Typography sx={{ minWidth: 170, color: '#4B617C', fontSize: 12 }}>
                                                {accountUsage.account.companyName}
                                              </Typography>

                                              <Typography sx={{ minWidth: 130, color: '#4B617C', fontSize: 12 }}>
                                                {propertyUsage.property.billableUnits} units
                                              </Typography>

                                              <Typography sx={{ flex: 1, color: '#4B617C', fontSize: 12 }}>
                                                {propertyTierLabel}
                                              </Typography>

                                              {propertyUsage.resolvedBySubscriptionId ? (
                                                <IconButton
                                                  size="small"
                                                  onClick={(event) =>
                                                    setDetachTarget({
                                                      anchorEl: event.currentTarget,
                                                      pricingId: pricing.id,
                                                      subscriptionId:
                                                        propertyUsage.resolvedBySubscriptionId ?? '',
                                                      title: `Detach override from ${propertyUsage.property.name}`
                                                    })
                                                  }
                                                >
                                                  <MoreHorizIcon fontSize="small" />
                                                </IconButton>
                                              ) : (
                                                <Box sx={{ width: 30 }} />
                                              )}
                                            </Stack>
                                          );
                                        })
                                        : null}

                                      {!isSpecificPropertiesCollapsed && specificPropertiesCount === 0 ? (
                                        <Typography sx={{ py: 1, px: 10, color: '#4B617C', fontSize: 13 }}>
                                          No specific properties for this pricing.
                                        </Typography>
                                      ) : null}

                                      {!isSpecificPropertiesCollapsed ? (
                                        <Stack
                                          direction="row"
                                          alignItems="center"
                                          sx={{ minHeight: 34, px: 1.5, borderTop: '1px dashed #E1E7EC' }}
                                        >
                                          <Box sx={{ width: 96 }} />
                                          <Button
                                            size="small"
                                            startIcon={<AddIcon />}
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
                              minHeight: 34,
                              px: 1.5,
                              borderTop: '1px solid #E1E7EC',
                              backgroundColor: '#FCFDFE'
                            }}
                          >
                            <Box sx={{ width: 56 }} />
                            <Button size="small" startIcon={<AddIcon />} onClick={() => openCreatePricing(product.id)}>
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
