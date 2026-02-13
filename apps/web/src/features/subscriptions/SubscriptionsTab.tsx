import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  useAccountsQuery,
  useBulkSubscriptionsMutation,
  usePricingsQuery,
  useSubscriptionsQuery,
  type BillingScope,
  type SubscriptionBulkAction,
  type SubscriptionItem,
  type SubscriptionStatus
} from '../../api';
import { EmptyState, FiltersToolbar } from '../../components/layout';

const SubscriptionFormDrawer = lazy(async () => {
  const module = await import('./SubscriptionFormDrawer');
  return { default: module.SubscriptionFormDrawer };
});

const scopeOptions: Array<'ALL' | BillingScope> = ['ALL', 'ACCOUNT', 'PROPERTY'];
const statusOptions: Array<'ALL' | SubscriptionStatus> = [
  'ALL',
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'CANCELED'
];

type BulkDialogState = {
  open: boolean;
  action: SubscriptionBulkAction | null;
};

type SortField = 'account' | 'property' | 'startDate' | 'endDate' | 'status' | 'pricings';
type SortDirection = 'asc' | 'desc';

function formatDate(value: string | null): string {
  if (!value) {
    return 'Forever';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });
}

function getActionLabel(action: SubscriptionBulkAction | null): string {
  switch (action) {
    case 'DELETE_SUBSCRIPTIONS':
      return 'Delete subscriptions';
    case 'ADD_PRICING':
      return 'Add pricing';
    case 'REPLACE_PRICINGS':
      return 'Replace pricings';
    case 'DELETE_PRICING':
      return 'Delete pricing';
    default:
      return 'Apply action';
  }
}

function getBulkErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (
      error.payload &&
      typeof error.payload === 'object' &&
      'message' in error.payload &&
      typeof error.payload.message === 'string'
    ) {
      return error.payload.message;
    }
    return `Bulk action failed with status ${error.status}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Bulk action failed';
}

function compareRows(
  left: SubscriptionItem,
  right: SubscriptionItem,
  field: SortField
): number {
  if (field === 'account') {
    return left.account.companyName.localeCompare(right.account.companyName);
  }

  if (field === 'property') {
    return (left.property?.name ?? '').localeCompare(right.property?.name ?? '');
  }

  if (field === 'startDate') {
    const leftValue = Date.parse(left.startDate);
    const rightValue = Date.parse(right.startDate);
    return leftValue - rightValue;
  }

  if (field === 'endDate') {
    const leftValue = left.endDate ? Date.parse(left.endDate) : Number.POSITIVE_INFINITY;
    const rightValue = right.endDate ? Date.parse(right.endDate) : Number.POSITIVE_INFINITY;
    return leftValue - rightValue;
  }

  if (field === 'status') {
    return left.status.localeCompare(right.status);
  }

  return left.pricings.length - right.pricings.length;
}

export function SubscriptionsTab(): JSX.Element {
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | BillingScope>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SubscriptionStatus>('ALL');
  const [accountIdFilter, setAccountIdFilter] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<SubscriptionItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [bulkDialogState, setBulkDialogState] = useState<BulkDialogState>({
    open: false,
    action: null
  });
  const [bulkPricingIds, setBulkPricingIds] = useState<string[]>([]);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);

  const queryParams = useMemo(
    () => ({
      page: page + 1,
      pageSize,
      search: search || undefined,
      scope: scopeFilter === 'ALL' ? undefined : scopeFilter,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      accountId: accountIdFilter || undefined
    }),
    [accountIdFilter, page, pageSize, scopeFilter, search, statusFilter]
  );

  const subscriptionsQuery = useSubscriptionsQuery(queryParams);
  const accountsQuery = useAccountsQuery({ page: 1, pageSize: 100 });
  const pricingsQuery = usePricingsQuery({ page: 1, pageSize: 100 });
  const bulkMutation = useBulkSubscriptionsMutation();

  const rows = useMemo(() => subscriptionsQuery.data?.items ?? [], [subscriptionsQuery.data?.items]);
  const sortedRows = useMemo(() => {
    if (!sortField) {
      return rows;
    }

    const sorted = [...rows];
    sorted.sort((left, right) => {
      const result = compareRows(left, right, sortField);
      return sortDirection === 'asc' ? result : -result;
    });
    return sorted;
  }, [rows, sortDirection, sortField]);
  const visibleIds = useMemo(() => sortedRows.map((row) => row.id), [sortedRows]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.includes(id)) && !allVisibleSelected;

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedIds([]);
      return;
    }
    const visibleSet = new Set(visibleIds);
    setSelectedIds((prev) => prev.filter((id) => visibleSet.has(id)));
  }, [rows, visibleIds]);

  function openCreateDrawer(): void {
    setDrawerMode('create');
    setEditingSubscription(null);
    setDrawerOpen(true);
  }

  function openEditDrawer(subscription: SubscriptionItem): void {
    setDrawerMode('edit');
    setEditingSubscription(subscription);
    setDrawerOpen(true);
  }

  function closeDrawer(): void {
    setDrawerOpen(false);
  }

  function toggleOneSelection(subscriptionId: string): void {
    setSelectedIds((prev) =>
      prev.includes(subscriptionId)
        ? prev.filter((id) => id !== subscriptionId)
        : [...prev, subscriptionId]
    );
  }

  function toggleVisibleSelection(): void {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        return prev.filter((id) => !visibleIds.includes(id));
      }

      const next = new Set(prev);
      for (const id of visibleIds) {
        next.add(id);
      }
      return Array.from(next);
    });
  }

  function openBulkDialog(action: SubscriptionBulkAction): void {
    setBulkDialogState({ open: true, action });
    setBulkPricingIds([]);
    setBulkError(null);
  }

  function closeBulkDialog(): void {
    setBulkDialogState({ open: false, action: null });
    setBulkPricingIds([]);
    setBulkError(null);
  }

  const requiresPricingSelection =
    bulkDialogState.action === 'ADD_PRICING' ||
    bulkDialogState.action === 'REPLACE_PRICINGS' ||
    bulkDialogState.action === 'DELETE_PRICING';

  function onSort(field: SortField): void {
    if (sortField === field) {
      setSortDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDirection('asc');
  }

  async function applyBulkAction(): Promise<void> {
    if (!bulkDialogState.action) {
      return;
    }

    if (selectedIds.length === 0) {
      setBulkError('No subscriptions selected.');
      return;
    }

    if (requiresPricingSelection && bulkPricingIds.length === 0) {
      setBulkError('Select at least one pricing.');
      return;
    }

    setBulkError(null);

    try {
      await bulkMutation.mutateAsync({
        action: bulkDialogState.action,
        subscriptionIds: selectedIds,
        pricingIds: requiresPricingSelection ? bulkPricingIds : undefined
      });

      setBulkSuccess(`${getActionLabel(bulkDialogState.action)} completed.`);
      setSelectedIds([]);
      closeBulkDialog();
    } catch (error) {
      setBulkError(getBulkErrorMessage(error));
    }
  }

  return (
    <>
      <Stack spacing={0} sx={{ height: '100%', minHeight: 0 }}>
        <Box sx={{ px: { xs: 1.5, sm: 2 }, py: 1.5, borderBottom: '1px solid #e1e7ec' }}>
          <FiltersToolbar
            left={
              <>
                <TextField
                  size="small"
                  label="Search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(0);
                  }}
                  placeholder="Company, email, or property"
                  sx={{ minWidth: { md: 220 } }}
                />

                <TextField
                  size="small"
                  select
                  label="Scope"
                  value={scopeFilter}
                  onChange={(event) => {
                    setScopeFilter(event.target.value as 'ALL' | BillingScope);
                    setPage(0);
                  }}
                  sx={{ minWidth: 120 }}
                >
                  {scopeOptions.map((scope) => (
                    <MenuItem key={scope} value={scope}>
                      {scope}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  size="small"
                  select
                  label="Status"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as 'ALL' | SubscriptionStatus);
                    setPage(0);
                  }}
                  sx={{ minWidth: 120 }}
                >
                  {statusOptions.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  size="small"
                  select
                  label="Account"
                  value={accountIdFilter}
                  onChange={(event) => {
                    setAccountIdFilter(event.target.value);
                    setPage(0);
                  }}
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value="">All accounts</MenuItem>
                  {(accountsQuery.data?.items ?? []).map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.companyName}
                    </MenuItem>
                  ))}
                </TextField>
              </>
            }
            right={
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDrawer}>
                Create Subscription
              </Button>
            }
          />
        </Box>

        <Stack spacing={2} sx={{ p: { xs: 1.5, sm: 2 }, flex: 1, minHeight: 0 }}>
          {selectedIds.length > 0 ? (
            <Alert severity="info">
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1}
                alignItems={{ xs: 'flex-start', md: 'center' }}
              >
                <Typography variant="body2">
                  {selectedIds.length} subscription(s) selected
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button size="small" onClick={() => openBulkDialog('ADD_PRICING')}>
                    Add pricing
                  </Button>
                  <Button size="small" onClick={() => openBulkDialog('REPLACE_PRICINGS')}>
                    Replace pricings
                  </Button>
                  <Button size="small" onClick={() => openBulkDialog('DELETE_PRICING')}>
                    Delete pricing
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => openBulkDialog('DELETE_SUBSCRIPTIONS')}
                  >
                    Delete subscriptions
                  </Button>
                </Stack>
              </Stack>
            </Alert>
          ) : null}

          {subscriptionsQuery.isError ? (
            <Alert severity="error">Failed to load subscriptions.</Alert>
          ) : null}

          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <TableContainer sx={{ flex: 1, minHeight: 0 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={allVisibleSelected}
                        indeterminate={someVisibleSelected}
                        onChange={toggleVisibleSelection}
                        inputProps={{ 'aria-label': 'Select all visible subscriptions' }}
                      />
                    </TableCell>
                    <TableCell sortDirection={sortField === 'account' ? sortDirection : false}>
                      <TableSortLabel
                        active={sortField === 'account'}
                        direction={sortField === 'account' ? sortDirection : 'asc'}
                        onClick={() => onSort('account')}
                      >
                        Account
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sortDirection={sortField === 'property' ? sortDirection : false}>
                      <TableSortLabel
                        active={sortField === 'property'}
                        direction={sortField === 'property' ? sortDirection : 'asc'}
                        onClick={() => onSort('property')}
                      >
                        Property
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sortDirection={sortField === 'startDate' ? sortDirection : false}>
                      <TableSortLabel
                        active={sortField === 'startDate'}
                        direction={sortField === 'startDate' ? sortDirection : 'asc'}
                        onClick={() => onSort('startDate')}
                      >
                        Start
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sortDirection={sortField === 'endDate' ? sortDirection : false}>
                      <TableSortLabel
                        active={sortField === 'endDate'}
                        direction={sortField === 'endDate' ? sortDirection : 'asc'}
                        onClick={() => onSort('endDate')}
                      >
                        End
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sortDirection={sortField === 'status' ? sortDirection : false}>
                      <TableSortLabel
                        active={sortField === 'status'}
                        direction={sortField === 'status' ? sortDirection : 'asc'}
                        onClick={() => onSort('status')}
                      >
                        Status
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sortDirection={sortField === 'pricings' ? sortDirection : false}>
                      <TableSortLabel
                        active={sortField === 'pricings'}
                        direction={sortField === 'pricings' ? sortDirection : 'asc'}
                        onClick={() => onSort('pricings')}
                      >
                        Pricings
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {subscriptionsQuery.isPending ? (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <Typography variant="body2" color="text.secondary">
                          Loading subscriptions...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : sortedRows.length ? (
                    sortedRows.map((subscription) => (
                      <TableRow
                        key={subscription.id}
                        hover
                        onClick={() => openEditDrawer(subscription)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell
                          padding="checkbox"
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <Checkbox
                            checked={selectedIds.includes(subscription.id)}
                            onChange={() => toggleOneSelection(subscription.id)}
                          />
                        </TableCell>

                        <TableCell>
                          <Stack spacing={0.25}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {subscription.account.companyName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {subscription.account.email}
                            </Typography>
                          </Stack>
                        </TableCell>

                        <TableCell>
                          {subscription.property ? (
                            <Stack spacing={0.25}>
                              <Typography variant="body2">{subscription.property.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {subscription.property.address}
                              </Typography>
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Account-level
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell>{formatDate(subscription.startDate)}</TableCell>
                        <TableCell>{formatDate(subscription.endDate)}</TableCell>
                        <TableCell>
                          <Chip size="small" label={subscription.status} />
                        </TableCell>

                        <TableCell>
                          <Stack direction="row" spacing={0.75} flexWrap="wrap">
                            {subscription.pricings.slice(0, 2).map((pricing) => (
                              <Chip
                                key={pricing.id}
                                size="small"
                                variant="outlined"
                                label={pricing.internalName}
                              />
                            ))}
                            {subscription.pricings.length > 2 ? (
                              <Chip size="small" label={`+${subscription.pricings.length - 2} more`} />
                            ) : null}
                          </Stack>
                        </TableCell>

                        <TableCell align="right">
                          <Tooltip title="Edit subscription">
                            <IconButton
                              size="small"
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditDrawer(subscription);
                              }}
                            >
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <EmptyState
                          title="No subscriptions found"
                          description="Adjust filters or create your first subscription."
                          actionLabel="Create Subscription"
                          onActionClick={openCreateDrawer}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={subscriptionsQuery.data?.total ?? 0}
              page={page}
              onPageChange={(_event, newPage) => setPage(newPage)}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50]}
            />
          </Box>
        </Stack>
      </Stack>

      {drawerOpen ? (
        <Suspense fallback={null}>
          <SubscriptionFormDrawer
            open={drawerOpen}
            mode={drawerMode}
            initialSubscription={editingSubscription}
            defaultAccountId={accountIdFilter || undefined}
            onClose={closeDrawer}
          />
        </Suspense>
      ) : null}

      <Dialog open={bulkDialogState.open} onClose={closeBulkDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{getActionLabel(bulkDialogState.action)}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Selected subscriptions: {selectedIds.length}
            </Typography>

            {requiresPricingSelection ? (
              <FormControl>
                <InputLabel id="bulk-pricing-select-label">Pricings</InputLabel>
                <Select
                  labelId="bulk-pricing-select-label"
                  multiple
                  value={bulkPricingIds}
                  onChange={(event) => setBulkPricingIds(event.target.value as string[])}
                  input={<OutlinedInput label="Pricings" />}
                  renderValue={(selected) => {
                    const labels = selected
                      .map(
                        (id) =>
                          pricingsQuery.data?.items.find((pricing) => pricing.id === id)?.internalName ??
                          id
                      )
                      .filter(Boolean);
                    return labels.join(', ');
                  }}
                >
                  {(pricingsQuery.data?.items ?? []).map((pricing) => (
                    <MenuItem key={pricing.id} value={pricing.id}>
                      <Checkbox checked={bulkPricingIds.includes(pricing.id)} />
                      <Typography variant="body2">
                        {pricing.internalName} ({pricing.type})
                      </Typography>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Alert severity="warning">
                This will permanently delete selected subscriptions.
              </Alert>
            )}

            {bulkError ? <Alert severity="error">{bulkError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeBulkDialog}>Cancel</Button>
          <Button
            variant="contained"
            color={bulkDialogState.action === 'DELETE_SUBSCRIPTIONS' ? 'error' : 'primary'}
            onClick={() => {
              void applyBulkAction();
            }}
            disabled={bulkMutation.isPending}
          >
            {getActionLabel(bulkDialogState.action)}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(bulkSuccess)}
        autoHideDuration={2500}
        onClose={() => setBulkSuccess(null)}
        message={bulkSuccess}
      />
    </>
  );
}
