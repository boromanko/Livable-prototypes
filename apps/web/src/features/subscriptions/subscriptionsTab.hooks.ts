import { useEffect, useMemo, useRef, useState } from 'react';
import {
  api,
  useAccountsQuery,
  useBulkSubscriptionsMutation,
  usePricingsQuery,
  useSubscriptionsQuery,
  type BillingScope,
  type PricingItem,
  type SubscriptionItem,
  type SubscriptionPricingItem,
  type SubscriptionStatus
} from '../../api';
import {
  buildSubscriptionsQueryParams,
  getBulkActionLabel,
  getBulkErrorMessage,
  sortSubscriptionRows,
  toggleSelectedId,
  type SubscriptionsSortDirection,
  type SubscriptionsSortField
} from './subscriptionsTab.utils';

const subscriptionStatusOptions: SubscriptionStatus[] = ['DRAFT', 'ACTIVE', 'PAUSED', 'CANCELED'];

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
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [manageTargetSubscriptionIds, setManageTargetSubscriptionIds] = useState<string[]>([]);
  const [manageInitialPricingIds, setManageInitialPricingIds] = useState<string[]>([]);
  const [managePricingIds, setManagePricingIdsState] = useState<string[]>([]);
  const [manageUsageCountByPricingId, setManageUsageCountByPricingId] = useState<
    Record<string, number>
  >({});
  const [isManagePreviewLoading, setIsManagePreviewLoading] = useState(false);
  const [isStatusPreviewLoading, setIsStatusPreviewLoading] = useState(false);
  const [statusCounts, setStatusCounts] = useState<Record<SubscriptionStatus, number>>(
    buildEmptyStatusCounts()
  );
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [statusDialogSubscriptionIds, setStatusDialogSubscriptionIds] = useState<string[]>([]);
  const [statusDialogNextStatus, setStatusDialogNextStatus] = useState<SubscriptionStatus | null>(
    null
  );
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isSelectingAll, setIsSelectingAll] = useState(false);
  const selectAllRequestIdRef = useRef(0);
  const managePreviewRequestIdRef = useRef(0);
  const statusPreviewRequestIdRef = useRef(0);

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
  const totalMatchingSubscriptions = subscriptionsQuery.data?.total ?? 0;
  const allMatchingSelected =
    totalMatchingSubscriptions > 0 && selectedIds.length === totalMatchingSubscriptions;
  const someMatchingSelected = selectedIds.length > 0 && !allMatchingSelected;
  const accountPropertiesCountById = useMemo(
    () =>
      Object.fromEntries(
        (accountsQuery.data?.items ?? []).map((account) => [account.id, account.propertiesCount])
      ),
    [accountsQuery.data?.items]
  );

  const filtersKey = useMemo(
    () =>
      JSON.stringify({
        search,
        scopeFilter,
        statusFilter,
        accountIdsFilter: [...accountIdsFilter].sort(),
        pricingIdsFilter: [...pricingIdsFilter].sort()
      }),
    [accountIdsFilter, pricingIdsFilter, scopeFilter, search, statusFilter]
  );

  const manageHasChanges = useMemo(
    () => !haveSameIdSet(manageInitialPricingIds, managePricingIds),
    [manageInitialPricingIds, managePricingIds]
  );
  const singleSelectedStatus = useMemo(() => {
    const nonZeroStatuses = subscriptionStatusOptions.filter((status) => statusCounts[status] > 0);
    return nonZeroStatuses.length === 1 ? nonZeroStatuses[0] : null;
  }, [statusCounts]);

  useEffect(() => {
    selectAllRequestIdRef.current += 1;
    managePreviewRequestIdRef.current += 1;
    statusPreviewRequestIdRef.current += 1;
    setIsSelectingAll(false);
    setIsDeleteDialogOpen(false);
    setIsManageDialogOpen(false);
    setIsManagePreviewLoading(false);
    setIsStatusPreviewLoading(false);
    setIsStatusDialogOpen(false);
    setStatusDialogSubscriptionIds([]);
    setStatusDialogNextStatus(null);
    setSingleDeleteTarget(null);
    setStatusCounts(buildEmptyStatusCounts());
    setManageTargetSubscriptionIds([]);
    setManageInitialPricingIds([]);
    setManagePricingIdsState([]);
    setManageUsageCountByPricingId({});
    setSelectedIds([]);
    setBulkError(null);
  }, [filtersKey]);

  useEffect(() => {
    const requestId = statusPreviewRequestIdRef.current + 1;
    statusPreviewRequestIdRef.current = requestId;

    if (selectedIds.length === 0) {
      setIsStatusPreviewLoading(false);
      setStatusCounts(buildEmptyStatusCounts());
      setIsStatusDialogOpen(false);
      setStatusDialogSubscriptionIds([]);
      setStatusDialogNextStatus(null);
      return;
    }

    setIsStatusPreviewLoading(true);

    void (async () => {
      try {
        const response = await api.getSubscriptionStatusPreview({
          subscriptionIds: selectedIds
        });

        if (statusPreviewRequestIdRef.current !== requestId) {
          return;
        }

        setStatusCounts(response.statusCounts);
      } catch (error) {
        if (statusPreviewRequestIdRef.current !== requestId) {
          return;
        }

        setStatusCounts(buildEmptyStatusCounts());
        setBulkError(getBulkErrorMessage(error));
      } finally {
        if (statusPreviewRequestIdRef.current === requestId) {
          setIsStatusPreviewLoading(false);
        }
      }
    })();
  }, [selectedIds]);

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

  async function loadAllMatchingSubscriptionIds(): Promise<string[]> {
    const expandedPageSize = 100;
    const firstPage = await api.getSubscriptions(
      buildSubscriptionsQueryParams({
        page: 0,
        pageSize: expandedPageSize,
        search,
        scopeFilter,
        statusFilter,
        accountIdsFilter,
        pricingIdsFilter
      })
    );
    const allIds = firstPage.items.map((item) => item.id);
    const totalPages = Math.ceil(firstPage.total / expandedPageSize);

    if (totalPages <= 1) {
      return allIds;
    }

    const otherPages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_value, index) =>
        api.getSubscriptions(
          buildSubscriptionsQueryParams({
            page: index + 1,
            pageSize: expandedPageSize,
            search,
            scopeFilter,
            statusFilter,
            accountIdsFilter,
            pricingIdsFilter
          })
        )
      )
    );

    for (const pageResponse of otherPages) {
      for (const item of pageResponse.items) {
        allIds.push(item.id);
      }
    }

    return Array.from(new Set(allIds));
  }

  async function toggleAllSelection(): Promise<void> {
    if (isSelectingAll) {
      return;
    }

    if (allMatchingSelected) {
      selectAllRequestIdRef.current += 1;
      setIsSelectingAll(false);
      setSelectedIds([]);
      return;
    }

    const requestId = selectAllRequestIdRef.current + 1;
    selectAllRequestIdRef.current = requestId;
    setBulkError(null);
    setIsSelectingAll(true);
    try {
      const allIds = await loadAllMatchingSubscriptionIds();
      if (selectAllRequestIdRef.current !== requestId) {
        return;
      }
      setSelectedIds(allIds);
    } catch (error) {
      if (selectAllRequestIdRef.current !== requestId) {
        return;
      }
      setBulkError(getBulkErrorMessage(error));
    } finally {
      if (selectAllRequestIdRef.current === requestId) {
        setIsSelectingAll(false);
      }
    }
  }

  function openDeleteDialog(): void {
    setBulkError(null);
    setIsDeleteDialogOpen(true);
  }

  function closeDeleteDialog(): void {
    setBulkError(null);
    setIsDeleteDialogOpen(false);
  }

  function closeManagePricingsDialog(): void {
    managePreviewRequestIdRef.current += 1;
    setBulkError(null);
    setIsManageDialogOpen(false);
    setIsManagePreviewLoading(false);
    setManageTargetSubscriptionIds([]);
    setManageInitialPricingIds([]);
    setManagePricingIdsState([]);
    setManageUsageCountByPricingId({});
  }

  async function openManagePricingsDialog(): Promise<void> {
    if (selectedIds.length === 0) {
      setBulkError('No subscriptions selected.');
      return;
    }

    const targetSubscriptionIds = [...selectedIds];
    const requestId = managePreviewRequestIdRef.current + 1;
    managePreviewRequestIdRef.current = requestId;

    setBulkError(null);
    setIsManageDialogOpen(true);
    setIsManagePreviewLoading(true);
    setManageTargetSubscriptionIds(targetSubscriptionIds);
    setManageInitialPricingIds([]);
    setManagePricingIdsState([]);
    setManageUsageCountByPricingId({});

    try {
      const response = await api.getSubscriptionManagePricingsPreview({
        subscriptionIds: targetSubscriptionIds
      });

      if (managePreviewRequestIdRef.current !== requestId) {
        return;
      }

      const pricingIds = response.items.map((item) => item.id);
      const usageCountsById = Object.fromEntries(
        response.items.map((item) => [item.id, item.usageCount])
      );

      setManageInitialPricingIds(pricingIds);
      setManagePricingIdsState(pricingIds);
      setManageUsageCountByPricingId(usageCountsById);
    } catch (error) {
      if (managePreviewRequestIdRef.current !== requestId) {
        return;
      }

      setBulkError(getBulkErrorMessage(error));
    } finally {
      if (managePreviewRequestIdRef.current === requestId) {
        setIsManagePreviewLoading(false);
      }
    }
  }

  function setManagePricingIds(pricingIds: string[]): void {
    setManagePricingIdsState(uniqueIds(pricingIds));
  }

  function appendManagePricingId(pricingId: string): void {
    setManagePricingIdsState((previous) => uniqueIds([...previous, pricingId]));
  }

  function openStatusDialog(status: SubscriptionStatus): void {
    if (selectedIds.length === 0) {
      setBulkError('No subscriptions selected.');
      return;
    }

    setBulkError(null);
    setStatusDialogSubscriptionIds([...selectedIds]);
    setStatusDialogNextStatus(status);
    setIsStatusDialogOpen(true);
  }

  function closeStatusDialog(): void {
    setBulkError(null);
    setIsStatusDialogOpen(false);
    setStatusDialogSubscriptionIds([]);
    setStatusDialogNextStatus(null);
  }

  function openSingleDeleteDialog(subscription: SubscriptionItem): void {
    setBulkError(null);
    setSingleDeleteTarget({
      id: subscription.id,
      name: getSubscriptionDisplayName(subscription)
    });
  }

  function closeSingleDeleteDialog(): void {
    setBulkError(null);
    setSingleDeleteTarget(null);
  }

  function clearSelection(): void {
    setSelectedIds([]);
    setIsDeleteDialogOpen(false);
    closeManagePricingsDialog();
    closeStatusDialog();
    closeSingleDeleteDialog();
    setStatusCounts(buildEmptyStatusCounts());
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

  async function applySingleDeleteSubscription(): Promise<void> {
    if (!singleDeleteTarget) {
      return;
    }

    setBulkError(null);

    try {
      await bulkMutation.mutateAsync({
        action: 'DELETE_SUBSCRIPTIONS',
        subscriptionIds: [singleDeleteTarget.id]
      });

      setSelectedIds((previous) => previous.filter((id) => id !== singleDeleteTarget.id));
      setBulkSuccess('Subscription deleted.');
      closeSingleDeleteDialog();
    } catch (error) {
      setBulkError(getBulkErrorMessage(error));
    }
  }

  async function applyDeleteSubscriptions(): Promise<void> {
    if (selectedIds.length === 0) {
      setBulkError('No subscriptions selected.');
      return;
    }

    setBulkError(null);

    try {
      await bulkMutation.mutateAsync({
        action: 'DELETE_SUBSCRIPTIONS',
        subscriptionIds: selectedIds
      });

      setBulkSuccess(`${getBulkActionLabel('DELETE_SUBSCRIPTIONS')} completed.`);
      setSelectedIds([]);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      setBulkError(getBulkErrorMessage(error));
    }
  }

  async function applyManagePricings(): Promise<void> {
    if (manageTargetSubscriptionIds.length === 0) {
      setBulkError('No subscriptions selected.');
      return;
    }

    if (!manageHasChanges) {
      closeManagePricingsDialog();
      return;
    }

    const currentPricingSet = new Set(managePricingIds);
    const initialPricingSet = new Set(manageInitialPricingIds);
    const addPricingIds = managePricingIds.filter((pricingId) => !initialPricingSet.has(pricingId));
    const removePricingIds = manageInitialPricingIds.filter(
      (pricingId) => !currentPricingSet.has(pricingId)
    );

    setBulkError(null);

    try {
      await bulkMutation.mutateAsync({
        action: 'MANAGE_PRICINGS',
        subscriptionIds: manageTargetSubscriptionIds,
        addPricingIds: addPricingIds.length > 0 ? addPricingIds : undefined,
        removePricingIds: removePricingIds.length > 0 ? removePricingIds : undefined
      });

      setBulkSuccess(`${getBulkActionLabel('MANAGE_PRICINGS')} completed.`);
      setSelectedIds([]);
      closeManagePricingsDialog();
    } catch (error) {
      setBulkError(getBulkErrorMessage(error));
    }
  }

  async function applyStatusUpdate(): Promise<void> {
    if (statusDialogSubscriptionIds.length === 0) {
      setBulkError('No subscriptions selected.');
      return;
    }

    if (!statusDialogNextStatus) {
      setBulkError('Select a status to continue.');
      return;
    }

    setBulkError(null);

    try {
      await bulkMutation.mutateAsync({
        action: 'UPDATE_STATUS',
        subscriptionIds: statusDialogSubscriptionIds,
        status: statusDialogNextStatus
      });

      setBulkSuccess(`${getBulkActionLabel('UPDATE_STATUS')} completed.`);
      setSelectedIds([]);
      closeStatusDialog();
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
      allSelected: allMatchingSelected,
      someSelected: someMatchingSelected,
      total: totalMatchingSubscriptions,
      isSelectingAll,
      accountPropertiesCountById,
      accountTotalBillableUnitsById,
      isAccountPropertiesCountPending: accountsQuery.isPending,
      page,
      pageSize,
      onToggleAllSelection: toggleAllSelection,
      onSort,
      onToggleRowSelection: toggleOneSelection,
      onDeleteSubscription: openSingleDeleteDialog,
      onPageChange: setPage,
      onPageSizeChange: (nextPageSize: number) => {
        setPageSize(nextPageSize);
        setPage(0);
      }
    },
    bulk: {
      selectedCount: selectedIds.length,
      error: bulkError,
      isPending: bulkMutation.isPending,
      clearSelection,
      statusValue: (singleSelectedStatus ?? '') as SubscriptionStatus | '',
      isStatusLoading: isStatusPreviewLoading,
      openStatusDialog,
      openManagePricingsDialog,
      openDeleteDialog,
      deleteDialogOpen: isDeleteDialogOpen,
      closeDeleteDialog,
      applyDeleteSubscriptions,
      manageDialog: {
        open: isManageDialogOpen,
        selectedCount: manageTargetSubscriptionIds.length,
        pricingIds: managePricingIds,
        usageCountByPricingId: manageUsageCountByPricingId,
        pricings: pricingsQuery.data?.items ?? [],
        isLoading: isManagePreviewLoading,
        hasChanges: manageHasChanges,
        setPricingIds: setManagePricingIds,
        appendPricingId: appendManagePricingId,
        close: closeManagePricingsDialog,
        confirm: applyManagePricings
      },
      statusDialog: {
        open: isStatusDialogOpen,
        selectedCount: statusDialogSubscriptionIds.length,
        nextStatus: statusDialogNextStatus,
        close: closeStatusDialog,
        confirm: applyStatusUpdate
      }
    },
    singleDeleteDialog: {
      open: Boolean(singleDeleteTarget),
      subscriptionName: singleDeleteTarget?.name ?? 'subscription',
      close: closeSingleDeleteDialog,
      confirm: applySingleDeleteSubscription
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

function buildEmptyStatusCounts(): Record<SubscriptionStatus, number> {
  return {
    DRAFT: 0,
    ACTIVE: 0,
    PAUSED: 0,
    CANCELED: 0
  };
}

function getSubscriptionDisplayName(subscription: SubscriptionItem): string {
  const companyName = subscription.account.companyName.trim();
  if (companyName !== '') {
    return companyName;
  }

  return subscription.id;
}

function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter((id) => id.trim() !== '')));
}

function haveSameIdSet(left: string[], right: string[]): boolean {
  const leftUnique = uniqueIds(left);
  const rightUnique = uniqueIds(right);

  if (leftUnique.length !== rightUnique.length) {
    return false;
  }

  const rightSet = new Set(rightUnique);
  return leftUnique.every((id) => rightSet.has(id));
}
