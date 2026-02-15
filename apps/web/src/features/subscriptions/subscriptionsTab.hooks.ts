import { useEffect, useMemo, useState } from 'react';
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
import {
  buildSubscriptionsQueryParams,
  filterSelectedIdsToVisible,
  getBulkActionLabel,
  getBulkErrorMessage,
  requiresPricingSelection,
  sortSubscriptionRows,
  toggleSelectedId,
  toggleVisibleSelectedIds,
  type SubscriptionsSortDirection,
  type SubscriptionsSortField
} from './subscriptionsTab.utils';

type BulkDialogState = {
  open: boolean;
  action: SubscriptionBulkAction | null;
};

export function useSubscriptionsTabController() {
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
    () =>
      buildSubscriptionsQueryParams({
        page,
        pageSize,
        search,
        scopeFilter,
        statusFilter,
        accountIdFilter
      }),
    [accountIdFilter, page, pageSize, scopeFilter, search, statusFilter]
  );

  const subscriptionsQuery = useSubscriptionsQuery(queryParams);
  const accountsQuery = useAccountsQuery({ page: 1, pageSize: 100 });
  const pricingsQuery = usePricingsQuery({ page: 1, pageSize: 100 });
  const bulkMutation = useBulkSubscriptionsMutation();

  const rows = useMemo(() => subscriptionsQuery.data?.items ?? [], [subscriptionsQuery.data?.items]);
  const sortedRows = useMemo(
    () => sortSubscriptionRows(rows, sortField, sortDirection),
    [rows, sortDirection, sortField]
  );
  const visibleIds = useMemo(() => sortedRows.map((row) => row.id), [sortedRows]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const someVisibleSelected =
    visibleIds.some((id) => selectedIds.includes(id)) && !allVisibleSelected;
  const shouldSelectPricings = requiresPricingSelection(bulkDialogState.action);

  useEffect(() => {
    setSelectedIds((previous) => filterSelectedIdsToVisible(previous, visibleIds));
  }, [visibleIds]);

  function onSearchChange(value: string): void {
    setSearch(value);
    setPage(0);
  }

  function onScopeFilterChange(value: 'ALL' | BillingScope): void {
    setScopeFilter(value);
    setPage(0);
  }

  function onStatusFilterChange(value: 'ALL' | SubscriptionStatus): void {
    setStatusFilter(value);
    setPage(0);
  }

  function onAccountFilterChange(value: string): void {
    setAccountIdFilter(value);
    setPage(0);
  }

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
    setSelectedIds((previous) => toggleSelectedId(previous, subscriptionId));
  }

  function toggleVisibleSelection(): void {
    setSelectedIds((previous) =>
      toggleVisibleSelectedIds(previous, visibleIds, allVisibleSelected)
    );
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

    if (shouldSelectPricings && bulkPricingIds.length === 0) {
      setBulkError('Select at least one pricing.');
      return;
    }

    setBulkError(null);

    try {
      await bulkMutation.mutateAsync({
        action: bulkDialogState.action,
        subscriptionIds: selectedIds,
        pricingIds: shouldSelectPricings ? bulkPricingIds : undefined
      });

      setBulkSuccess(`${getBulkActionLabel(bulkDialogState.action)} completed.`);
      setSelectedIds([]);
      closeBulkDialog();
    } catch (error) {
      setBulkError(getBulkErrorMessage(error));
    }
  }

  return {
    filters: {
      search,
      scopeFilter,
      statusFilter,
      accountIdFilter,
      accounts: accountsQuery.data?.items ?? [],
      onSearchChange,
      onScopeFilterChange,
      onStatusFilterChange,
      onAccountFilterChange
    },
    drawer: {
      drawerOpen,
      drawerMode,
      editingSubscription,
      defaultAccountId: accountIdFilter || undefined,
      openCreateDrawer,
      openEditDrawer,
      closeDrawer
    },
    table: {
      isPending: subscriptionsQuery.isPending,
      isError: subscriptionsQuery.isError,
      rows: sortedRows,
      sortField,
      sortDirection,
      selectedIds,
      allVisibleSelected,
      someVisibleSelected,
      total: subscriptionsQuery.data?.total ?? 0,
      page,
      pageSize,
      onToggleVisibleSelection: toggleVisibleSelection,
      onSort,
      onToggleRowSelection: toggleOneSelection,
      onPageChange: setPage,
      onPageSizeChange: (nextPageSize: number) => {
        setPageSize(nextPageSize);
        setPage(0);
      }
    },
    bulk: {
      dialogOpen: bulkDialogState.open,
      action: bulkDialogState.action,
      selectedCount: selectedIds.length,
      requiresPricingSelection: shouldSelectPricings,
      pricingIds: bulkPricingIds,
      pricings: pricingsQuery.data?.items ?? [],
      error: bulkError,
      isPending: bulkMutation.isPending,
      openBulkDialog,
      closeBulkDialog,
      setPricingIds: setBulkPricingIds,
      applyBulkAction
    },
    feedback: {
      bulkSuccess,
      clearBulkSuccess: () => setBulkSuccess(null)
    }
  };
}
