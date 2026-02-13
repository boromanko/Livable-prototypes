import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { Suspense, lazy, useMemo, useState } from 'react';
import {
  ApiError,
  useDeletePricingMutation,
  usePricingsQuery,
  useProductsQuery,
  type PricingItem,
  type PricingType
} from '../../api';
import { EmptyState, FiltersToolbar } from '../../components/layout';

const PricingFormDrawer = lazy(async () => {
  const module = await import('./PricingFormDrawer');
  return { default: module.PricingFormDrawer };
});

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

function summarizeTiers(pricing: PricingItem): string {
  if (pricing.tiers.length === 0) {
    return 'No tiers';
  }
  const first = pricing.tiers[0];
  const last = pricing.tiers[pricing.tiers.length - 1];
  return `${pricing.tiers.length} tiers (${first.fromUnit}-${last.toUnit ?? '∞'})`;
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

export function PricingsTab(): JSX.Element {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | PricingType>('ALL');
  const [productIdFilter, setProductIdFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [editingPricing, setEditingPricing] = useState<PricingItem | null>(null);
  const [deletingPricing, setDeletingPricing] = useState<PricingItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const productsQuery = useProductsQuery();
  const pricingsQuery = usePricingsQuery({
    page: 1,
    pageSize: 100,
    search: search || undefined,
    type: typeFilter === 'ALL' ? undefined : typeFilter,
    productId: productIdFilter || undefined
  });
  const deleteMutation = useDeletePricingMutation();

  const groupedPricings = useMemo(() => {
    const grouped = new Map<string, PricingItem[]>();
    for (const pricing of pricingsQuery.data?.items ?? []) {
      const current = grouped.get(pricing.product.id) ?? [];
      current.push(pricing);
      grouped.set(pricing.product.id, current);
    }
    return grouped;
  }, [pricingsQuery.data?.items]);

  function openCreateDrawer(): void {
    setDrawerMode('create');
    setEditingPricing(null);
    setDrawerOpen(true);
  }

  function openEditDrawer(pricing: PricingItem): void {
    setDrawerMode('edit');
    setEditingPricing(pricing);
    setDrawerOpen(true);
  }

  function closeDrawer(): void {
    setDrawerOpen(false);
  }

  async function confirmDelete(): Promise<void> {
    if (!deletingPricing) {
      return;
    }
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(deletingPricing.id);
      setSuccessMessage(`Pricing "${deletingPricing.internalName}" deleted.`);
      setDeletingPricing(null);
    } catch (error) {
      setDeleteError(getErrorMessage(error));
    }
  }

  return (
    <>
      <Stack spacing={0}>
        <Box sx={{ px: { xs: 1.5, sm: 2 }, py: 1.5, borderBottom: '1px solid #e1e7ec' }}>
          <FiltersToolbar
            left={
              <>
                <TextField
                  size="small"
                  label="Search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pricing name or product"
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
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDrawer}>
                Create Pricing
              </Button>
            }
          />
        </Box>

        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
          {pricingsQuery.isError ? <Alert severity="error">Failed to load pricings.</Alert> : null}

          {pricingsQuery.isPending ? (
            <Typography variant="body2" color="text.secondary">
              Loading pricings...
            </Typography>
          ) : (pricingsQuery.data?.items.length ?? 0) === 0 ? (
            <EmptyState
              title="No pricings found"
              description="Create your first fixed or tiered pricing."
              actionLabel="Create Pricing"
              onActionClick={openCreateDrawer}
            />
          ) : (
            <Stack spacing={1.5}>
            {(productsQuery.data?.items ?? []).map((product) => {
              const pricings = groupedPricings.get(product.id) ?? [];
              if (pricings.length === 0) {
                return null;
              }

              return (
                <Accordion key={product.id} defaultExpanded elevation={0}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {product.name}
                      </Typography>
                      <Chip size="small" label={`${pricings.length} pricing(s)`} />
                    </Stack>
                  </AccordionSummary>

                  <AccordionDetails>
                    <Stack spacing={1}>
                      {pricings.map((pricing) => (
                        <Stack
                          key={pricing.id}
                          direction={{ xs: 'column', md: 'row' }}
                          spacing={1}
                          sx={{
                            border: '1px solid #d9e0ea',
                            borderRadius: 2,
                            p: 1.5
                          }}
                        >
                          <Stack spacing={0.6} sx={{ flex: 1 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {pricing.internalName}
                              </Typography>
                              <Chip size="small" label={pricing.type} />
                              {!pricing.isActive ? (
                                <Chip size="small" color="default" label="Inactive" />
                              ) : null}
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                              {pricing.type === 'FIXED'
                                ? `${formatMoneyCents(pricing.fixedAmountCents, pricing.currency)} / ${pricing.billingInterval}`
                                : `${summarizeTiers(pricing)} • Min ${formatMoneyCents(
                                    pricing.minimumPriceCents,
                                    pricing.currency
                                  )}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Used by {pricing.subscriptionsCount} subscription(s)
                            </Typography>
                          </Stack>

                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Tooltip title="Edit pricing">
                              <IconButton size="small" onClick={() => openEditDrawer(pricing)}>
                                <EditOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete pricing">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setDeletingPricing(pricing)}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Stack>
                      ))}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              );
            })}
            </Stack>
          )}
        </Box>
      </Stack>

      {drawerOpen ? (
        <Suspense fallback={null}>
          <PricingFormDrawer
            open={drawerOpen}
            mode={drawerMode}
            initialPricing={editingPricing}
            onClose={closeDrawer}
          />
        </Suspense>
      ) : null}

      <Dialog open={Boolean(deletingPricing)} onClose={() => setDeletingPricing(null)}>
        <DialogTitle>Delete Pricing</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ minWidth: 320, pt: 1 }}>
            <Typography variant="body2">
              This action will remove pricing{' '}
              <strong>{deletingPricing?.internalName ?? ''}</strong>.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Deletion is blocked if this pricing is already attached to subscriptions.
            </Typography>
            {deleteError ? <Alert severity="error">{deleteError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingPricing(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void confirmDelete()}>
            Delete
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
