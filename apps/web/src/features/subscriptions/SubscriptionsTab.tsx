import { Alert, Snackbar, Stack } from '@mui/material';
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  useAccountsQuery,
  useBulkSubscriptionsMutation,
  usePricingsQuery,
  useSubscriptionsQuery,
  type BillingScope,
  type SubscriptionBulkAction,
  type SubscriptionItem,
  type SubscriptionStatus
} from '../../api';
import { SubscriptionsBulkDialog } from './components/SubscriptionsBulkDialog';
import { SubscriptionsFilters } from './components/SubscriptionsFilters';
import { SubscriptionsSelectionActions } from './components/SubscriptionsSelectionActions';
import { SubscriptionsTable } from './components/SubscriptionsTable';
import {
  compareSubscriptionRows,
  getBulkActionLabel,
  getBulkErrorMessage,
  type SubscriptionsSortDirection,
  type SubscriptionsSortField
} from './subscriptionsTab.utils';

const SubscriptionFormDrawer = lazy(async () => {
  const module = await import('./SubscriptionFormDrawer');
  return { default: module.SubscriptionFormDrawer };
});

type BulkDialogState = {
  open: boolean;
  action: SubscriptionBulkAction | null;
};

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
  const [sortField, setSortField] = useState<SubscriptionsSortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SubscriptionsSortDirection>('asc');
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
      const result = compareSubscriptionRows(left, right, sortField);
      return sortDirection === 'asc' ? result : -result;
    });
    return sorted;
  }, [rows, sortDirection, sortField]);
  const visibleIds = useMemo(() => sortedRows.map((row) => row.id), [sortedRows]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const someVisibleSelected =
    visibleIds.some((id) => selectedIds.includes(id)) && !allVisibleSelected;

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

  function onSort(field: SubscriptionsSortField): void {
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

      setBulkSuccess(`${getBulkActionLabel(bulkDialogState.action)} completed.`);
      setSelectedIds([]);
      closeBulkDialog();
    } catch (error) {
      setBulkError(getBulkErrorMessage(error));
    }
  }

  return (
    <>
      <Stack spacing={0} sx={{ height: '100%', minHeight: 0 }}>
        <SubscriptionsFilters
          search={search}
          scopeFilter={scopeFilter}
          statusFilter={statusFilter}
          accountIdFilter={accountIdFilter}
          accounts={accountsQuery.data?.items ?? []}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(0);
          }}
          onScopeFilterChange={(value) => {
            setScopeFilter(value);
            setPage(0);
          }}
          onStatusFilterChange={(value) => {
            setStatusFilter(value);
            setPage(0);
          }}
          onAccountFilterChange={(value) => {
            setAccountIdFilter(value);
            setPage(0);
          }}
          onCreateSubscription={openCreateDrawer}
        />

        <Stack spacing={2} sx={{ p: { xs: 1.5, sm: 2 }, flex: 1, minHeight: 0 }}>
          <SubscriptionsSelectionActions
            selectedCount={selectedIds.length}
            onOpenBulkDialog={openBulkDialog}
          />

          {subscriptionsQuery.isError ? (
            <Alert severity="error">Failed to load subscriptions.</Alert>
          ) : null}

          <SubscriptionsTable
            isPending={subscriptionsQuery.isPending}
            rows={sortedRows}
            sortField={sortField}
            sortDirection={sortDirection}
            selectedIds={selectedIds}
            allVisibleSelected={allVisibleSelected}
            someVisibleSelected={someVisibleSelected}
            total={subscriptionsQuery.data?.total ?? 0}
            page={page}
            pageSize={pageSize}
            onToggleVisibleSelection={toggleVisibleSelection}
            onSort={onSort}
            onToggleRowSelection={toggleOneSelection}
            onEditSubscription={openEditDrawer}
            onCreateSubscription={openCreateDrawer}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(0);
            }}
          />
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

      <SubscriptionsBulkDialog
        open={bulkDialogState.open}
        action={bulkDialogState.action}
        selectedCount={selectedIds.length}
        requiresPricingSelection={requiresPricingSelection}
        pricingIds={bulkPricingIds}
        pricings={pricingsQuery.data?.items ?? []}
        error={bulkError}
        isPending={bulkMutation.isPending}
        onPricingIdsChange={setBulkPricingIds}
        onClose={closeBulkDialog}
        onConfirm={() => {
          void applyBulkAction();
        }}
      />

      <Snackbar
        open={Boolean(bulkSuccess)}
        autoHideDuration={2500}
        onClose={() => setBulkSuccess(null)}
        message={bulkSuccess}
      />
    </>
  );
}
