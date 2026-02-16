import { useEffect, useMemo, useState } from 'react';
import {
  useAccountsQuery,
  useBulkSubscriptionsMutation,
  usePricingsQuery,
  useSubscriptionsQuery,
  type BillingScope,
  type PricingItem,
  type SubscriptionBulkAction,
  type SubscriptionItem,
  type SubscriptionPricingItem,
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
  const [accountIdsFilter, setAccountIdsFilter] = useState<string[]>([]);
  const [pricingIdsFilter, setPricingIdsFilter] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<SubscriptionItem | null>(null);
  const [pricingDrawerOpen, setPricingDrawerOpen] = useState(false);
  const [editingPricing, setEditingPricing] = useState<PricingItem | null>(null);
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
        accountIdsFilter,
        pricingIdsFilter
      }),
    [accountIdsFilter, page, pageSize, pricingIdsFilter, scopeFilter, search, statusFilter]
  );

  const subscriptionsQuery = useSubscriptionsQuery(queryParams);
  const accountsQuery = useAccountsQuery({ page: 1, pageSize: 100 });
  const pricingsQuery = usePricingsQuery({ page: 1, pageSize: 100 });
  const bulkMutation = useBulkSubscriptionsMutation();

  const accountTotalBillableUnitsById = useMemo(
    () =>
      Object.fromEntries(
        (accountsQuery.data?.items ?? []).map((account) => [account.id, account.totalBillableUnits])
      ),
    [accountsQuery.data?.items]
  );
  const rows = useMemo(() => subscriptionsQuery.data?.items ?? [], [subscriptionsQuery.data?.items]);
  const sortedRows = useMemo(
    () => sortSubscriptionRows(rows, sortField, sortDirection, accountTotalBillableUnitsById),
    [rows, sortDirection, sortField, accountTotalBillableUnitsById]
  );
  const visibleIds = useMemo(() => sortedRows.map((row) => row.id), [sortedRows]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const someVisibleSelected =
    visibleIds.some((id) => selectedIds.includes(id)) && !allVisibleSelected;
  const shouldSelectPricings = requiresPricingSelection(bulkDialogState.action);
  const accountPropertiesCountById = useMemo(
    () =>
      Object.fromEntries(
        (accountsQuery.data?.items ?? []).map((account) => [account.id, account.propertiesCount])
      ),
    [accountsQuery.data?.items]
  );

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

  function onAccountFilterChange(value: string[]): void {
    setAccountIdsFilter(value);
    setPage(0);
  }

  function onPricingFilterChange(value: string[]): void {
    setPricingIdsFilter(value);
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

  function openEditPricing(pricing: SubscriptionPricingItem): void {
    const fullPricing = pricingsQuery.data?.items.find((item) => item.id === pricing.id);
    setEditingPricing(fullPricing ?? toPricingItem(pricing));
    setPricingDrawerOpen(true);
  }

  function closePricingDrawer(): void {
    setPricingDrawerOpen(false);
    setEditingPricing(null);
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

  function clearSelection(): void {
    setSelectedIds([]);
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

  async function deleteOneSubscription(subscriptionId: string): Promise<void> {
    if (!window.confirm('Delete this subscription?')) {
      return;
    }

    try {
      await bulkMutation.mutateAsync({
        action: 'DELETE_SUBSCRIPTIONS',
        subscriptionIds: [subscriptionId]
      });

      setSelectedIds((previous) => previous.filter((id) => id !== subscriptionId));
      setBulkSuccess('Subscription deleted.');
    } catch (error) {
      setBulkError(getBulkErrorMessage(error));
    }
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
      accountIdsFilter,
      pricingIdsFilter,
      accounts: accountsQuery.data?.items ?? [],
      pricings: pricingsQuery.data?.items ?? [],
      onSearchChange,
      onScopeFilterChange,
      onStatusFilterChange,
      onAccountFilterChange,
      onPricingFilterChange
    },
    drawer: {
      drawerOpen,
      drawerMode,
      editingSubscription,
      defaultAccountId: accountIdsFilter.length === 1 ? accountIdsFilter[0] : undefined,
      openCreateDrawer,
      openEditDrawer,
      closeDrawer
    },
    pricingDrawer: {
      pricingDrawerOpen,
      editingPricing,
      openEditPricing,
      closePricingDrawer
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
      accountPropertiesCountById,
      accountTotalBillableUnitsById,
      isAccountPropertiesCountPending: accountsQuery.isPending,
      page,
      pageSize,
      onToggleVisibleSelection: toggleVisibleSelection,
      onSort,
      onToggleRowSelection: toggleOneSelection,
      onDeleteSubscription: deleteOneSubscription,
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
      clearSelection,
      setPricingIds: setBulkPricingIds,
      applyBulkAction
    },
    feedback: {
      bulkSuccess,
      clearBulkSuccess: () => setBulkSuccess(null)
    }
  };
}

function toPricingItem(pricing: SubscriptionPricingItem): PricingItem {
  return {
    id: pricing.id,
    product: pricing.product,
    internalName: pricing.internalName,
    type: pricing.type,
    fixedAmountCents: pricing.fixedAmountCents,
    minimumPriceCents: pricing.minimumPriceCents,
    currency: pricing.currency,
    billingInterval: pricing.billingInterval,
    isActive: pricing.isActive,
    createdAt: '',
    subscriptionsCount: 0,
    tiers: pricing.tiers
  };
}
