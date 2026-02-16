import { useMemo, useRef, useState } from 'react';
import {
  useAccountsQuery,
  useBulkSubscriptionsMutation,
  usePricingsQuery,
  useSubscriptionsQuery,
  type BillingScope,
  type PricingItem,
  type SubscriptionItem,
  type SubscriptionStatus
} from '../../api';
import {
  buildEmptyStatusCounts,
  buildSubscriptionsFiltersKey,
  getSingleSelectedStatus,
  haveSameIdSet
} from './subscriptionsTab.helpers';
import { createSubscriptionsTabBulkActions } from './subscriptionsTab.bulk.actions';
import { createSubscriptionsTabFilterTableActions } from './subscriptionsTab.filter-table.actions';
import {
  useSubscriptionsTabResetOnFiltersChange,
  useSubscriptionsTabStatusPreview
} from './subscriptionsTab.effects';
import {
  buildSubscriptionsQueryParams,
  sortSubscriptionRows,
  type SubscriptionsSortDirection,
  type SubscriptionsSortField
} from './subscriptionsTab.utils';

export function useSubscriptionsTabController() {
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | BillingScope>('ALL');
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus[]>([]);
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
    [accountTotalBillableUnitsById, rows, sortDirection, sortField]
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
      buildSubscriptionsFiltersKey({
        search,
        scopeFilter,
        statusFilter,
        accountIdsFilter,
        pricingIdsFilter
      }),
    [accountIdsFilter, pricingIdsFilter, scopeFilter, search, statusFilter]
  );

  const manageHasChanges = useMemo(
    () => !haveSameIdSet(manageInitialPricingIds, managePricingIds),
    [manageInitialPricingIds, managePricingIds]
  );
  const singleSelectedStatus = useMemo(() => getSingleSelectedStatus(statusCounts), [statusCounts]);

  useSubscriptionsTabResetOnFiltersChange({
    filtersKey,
    selectAllRequestIdRef,
    managePreviewRequestIdRef,
    statusPreviewRequestIdRef,
    setIsSelectingAll,
    setIsDeleteDialogOpen,
    setIsManageDialogOpen,
    setIsManagePreviewLoading,
    setIsStatusPreviewLoading,
    setIsStatusDialogOpen,
    setStatusDialogSubscriptionIds,
    setStatusDialogNextStatus,
    setSingleDeleteTarget,
    setStatusCounts,
    setManageTargetSubscriptionIds,
    setManageInitialPricingIds,
    setManagePricingIdsState,
    setManageUsageCountByPricingId,
    setSelectedIds,
    setBulkError
  });

  useSubscriptionsTabStatusPreview({
    selectedIds,
    statusPreviewRequestIdRef,
    setIsStatusPreviewLoading,
    setStatusCounts,
    setIsStatusDialogOpen,
    setStatusDialogSubscriptionIds,
    setStatusDialogNextStatus,
    setBulkError
  });

  const filterTableActions = createSubscriptionsTabFilterTableActions({
    search,
    scopeFilter,
    statusFilter,
    accountIdsFilter,
    pricingIdsFilter,
    setSearch,
    setScopeFilter,
    setStatusFilter,
    setAccountIdsFilter,
    setPricingIdsFilter,
    setPage,
    setDrawerMode,
    setDrawerOpen,
    setEditingSubscription,
    setPricingDrawerOpen,
    setEditingPricing,
    pricings: pricingsQuery.data?.items ?? [],
    setSelectedIds,
    allMatchingSelected,
    isSelectingAll,
    setIsSelectingAll,
    selectAllRequestIdRef,
    sortField,
    setSortField,
    setSortDirection,
    setBulkError
  });

  const bulkActions = createSubscriptionsTabBulkActions({
    selectedIds,
    setSelectedIds,
    setBulkError,
    setBulkSuccess,
    setIsDeleteDialogOpen,
    managePreviewRequestIdRef,
    setIsManageDialogOpen,
    setIsManagePreviewLoading,
    setManageTargetSubscriptionIds,
    setManageInitialPricingIds,
    setManagePricingIdsState,
    setManageUsageCountByPricingId,
    setStatusCounts,
    setIsStatusDialogOpen,
    statusDialogSubscriptionIds,
    setStatusDialogSubscriptionIds,
    statusDialogNextStatus,
    setStatusDialogNextStatus,
    singleDeleteTarget,
    setSingleDeleteTarget,
    mutateBulkSubscriptions: bulkMutation.mutateAsync,
    manageTargetSubscriptionIds,
    manageHasChanges,
    manageInitialPricingIds,
    managePricingIds
  });

  return {
    filters: {
      search,
      scopeFilter,
      statusFilter,
      accountIdsFilter,
      pricingIdsFilter,
      accounts: accountsQuery.data?.items ?? [],
      pricings: pricingsQuery.data?.items ?? [],
      onSearchChange: filterTableActions.onSearchChange,
      onScopeFilterChange: filterTableActions.onScopeFilterChange,
      onStatusFilterChange: filterTableActions.onStatusFilterChange,
      onAccountFilterChange: filterTableActions.onAccountFilterChange,
      onPricingFilterChange: filterTableActions.onPricingFilterChange
    },
    drawer: {
      drawerOpen,
      drawerMode,
      editingSubscription,
      defaultAccountId: accountIdsFilter.length === 1 ? accountIdsFilter[0] : undefined,
      openCreateDrawer: filterTableActions.openCreateDrawer,
      openEditDrawer: filterTableActions.openEditDrawer,
      closeDrawer: filterTableActions.closeDrawer
    },
    pricingDrawer: {
      pricingDrawerOpen,
      editingPricing,
      openEditPricing: filterTableActions.openEditPricing,
      closePricingDrawer: filterTableActions.closePricingDrawer
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
      onToggleAllSelection: filterTableActions.toggleAllSelection,
      onSort: filterTableActions.onSort,
      onToggleRowSelection: filterTableActions.toggleOneSelection,
      onDeleteSubscription: bulkActions.openSingleDeleteDialog,
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
      clearSelection: bulkActions.clearSelection,
      statusValue: (singleSelectedStatus ?? '') as SubscriptionStatus | '',
      isStatusLoading: isStatusPreviewLoading,
      openStatusDialog: bulkActions.openStatusDialog,
      openManagePricingsDialog: bulkActions.openManagePricingsDialog,
      openDeleteDialog: bulkActions.openDeleteDialog,
      deleteDialogOpen: isDeleteDialogOpen,
      closeDeleteDialog: bulkActions.closeDeleteDialog,
      applyDeleteSubscriptions: bulkActions.applyDeleteSubscriptions,
      manageDialog: {
        open: isManageDialogOpen,
        selectedCount: manageTargetSubscriptionIds.length,
        pricingIds: managePricingIds,
        usageCountByPricingId: manageUsageCountByPricingId,
        pricings: pricingsQuery.data?.items ?? [],
        isLoading: isManagePreviewLoading,
        hasChanges: manageHasChanges,
        setPricingIds: bulkActions.setManagePricingIds,
        appendPricingId: bulkActions.appendManagePricingId,
        close: bulkActions.closeManagePricingsDialog,
        confirm: bulkActions.applyManagePricings
      },
      statusDialog: {
        open: isStatusDialogOpen,
        selectedCount: statusDialogSubscriptionIds.length,
        nextStatus: statusDialogNextStatus,
        close: bulkActions.closeStatusDialog,
        confirm: bulkActions.applyStatusUpdate
      }
    },
    singleDeleteDialog: {
      open: Boolean(singleDeleteTarget),
      subscriptionName: singleDeleteTarget?.name ?? 'subscription',
      close: bulkActions.closeSingleDeleteDialog,
      confirm: bulkActions.applySingleDeleteSubscription
    },
    feedback: {
      bulkSuccess,
      clearBulkSuccess: () => setBulkSuccess(null)
    }
  };
}
