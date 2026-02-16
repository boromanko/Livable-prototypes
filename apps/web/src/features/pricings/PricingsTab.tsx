import { Alert, Box, Snackbar, Stack, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { api, queryKeys } from '../../api';
import { EmptyState } from '../../components/layout';
import { canManagePricings as canManagePricingsByRole, canViewPricings, useDemoRole } from '../../demoRole';
import { getApiErrorMessage } from '../../lib/errors/getApiErrorMessage';
import { PricingConfirmationDialogs } from './components/PricingConfirmationDialogs';
import { PricingFiltersPopover } from './components/PricingFiltersPopover';
import { PricingsBulkDeleteDialog } from './components/PricingsBulkDeleteDialog';
import { PricingsSelectionActions } from './components/PricingsSelectionActions';
import { PricingSortMenu } from './components/PricingSortMenu';
import { PricingTreeView } from './components/PricingTreeView';
import { PricingsToolbar } from './components/PricingsToolbar';
import { usePricingsTabActions } from './pricingsTab.actions';
import { usePricingsTabData } from './pricingsTab.data';
import { usePricingsTabState, usePricingTreeInteractions } from './pricingsTab.hooks';

const PricingFormDrawer = lazy(async () => {
  const module = await import('./PricingFormDrawer');
  return { default: module.PricingFormDrawer };
});

const SubscriptionFormDrawer = lazy(async () => {
  const module = await import('../subscriptions/SubscriptionFormDrawer');
  return { default: module.SubscriptionFormDrawer };
});

export function PricingsTab(): JSX.Element {
  const { role } = useDemoRole();
  const canManagePricings = canManagePricingsByRole(role);
  const canReadPricings = canViewPricings(role);
  const state = usePricingsTabState();
  const tree = usePricingTreeInteractions();
  const queryClient = useQueryClient();
  const [selectedPricingIds, setSelectedPricingIds] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);

  const data = usePricingsTabData({
    search: state.filters.search,
    typeFilter: state.filters.typeFilter,
    productIdFilter: state.filters.productIdFilter,
    accountIdFilter: state.filters.accountIdFilter,
    sortBy: state.sort.sortBy,
    sortDirection: state.sort.sortDirection,
    groupByProduct: state.view.groupByProduct
  });

  const { confirmDeletePricing, confirmDetach } = usePricingsTabActions({
    deletingPricing: state.confirmations.deletingPricing,
    detachConfirmTarget: state.confirmations.detachConfirmTarget,
    isDeletePending: data.isDeletePending,
    deletePricing: data.deletePricing,
    detachPricing: data.detachPricing,
    setActionError: state.feedback.setActionError,
    setSuccessMessage: state.feedback.setSuccessMessage,
    setDeletingPricing: state.confirmations.setDeletingPricing,
    setDetachConfirmTarget: state.confirmations.setDetachConfirmTarget
  });

  const allPricingRowKeys = useMemo(
    () => data.flatPricings.map((pricing) => `pricing:${pricing.id}`),
    [data.flatPricings]
  );
  const allPricingRowsExpanded =
    allPricingRowKeys.length > 0 &&
    allPricingRowKeys.every((pricingKey) => tree.expandedPricings.has(pricingKey));
  const allRowsExpanded = allPricingRowsExpanded;
  const expandAllDisabled = allPricingRowKeys.length === 0;
  const visiblePricingIds = useMemo(
    () => data.flatPricings.map((pricing) => pricing.id),
    [data.flatPricings]
  );
  const selectedPricingIdSet = useMemo(() => new Set(selectedPricingIds), [selectedPricingIds]);
  const allVisibleSelected =
    visiblePricingIds.length > 0 &&
    visiblePricingIds.every((pricingId) => selectedPricingIdSet.has(pricingId));
  const someVisibleSelected =
    visiblePricingIds.some((pricingId) => selectedPricingIdSet.has(pricingId)) && !allVisibleSelected;

  useEffect(() => {
    const visibleSet = new Set(visiblePricingIds);

    setSelectedPricingIds((previous) => {
      const next = previous.filter((pricingId) => visibleSet.has(pricingId));
      return next.length === previous.length ? previous : next;
    });
  }, [visiblePricingIds]);

  useEffect(() => {
    if (selectedPricingIds.length === 0) {
      setIsBulkDeleteDialogOpen(false);
      setBulkDeleteError(null);
    }
  }, [selectedPricingIds.length]);

  useEffect(() => {
    if (canManagePricings) {
      return;
    }

    setSelectedPricingIds([]);
    setBulkDeleteError(null);
    setIsBulkDeleteDialogOpen(false);
    state.pricingModal.closePricingModal();
    state.confirmations.setDeletingPricing(null);
  }, [canManagePricings]);

  function toggleExpandAllRows(): void {
    if (allRowsExpanded) {
      tree.setExpandedPricings(new Set());
      return;
    }

    tree.setExpandedPricings(new Set(allPricingRowKeys));
  }

  function togglePricingSelection(pricingId: string): void {
    setSelectedPricingIds((previous) => {
      if (previous.includes(pricingId)) {
        return previous.filter((id) => id !== pricingId);
      }

      return [...previous, pricingId];
    });
  }

  function toggleAllVisibleSelection(): void {
    if (allVisibleSelected) {
      setSelectedPricingIds([]);
      return;
    }

    setSelectedPricingIds(visiblePricingIds);
  }

  async function confirmBulkDeletePricings(): Promise<void> {
    if (selectedPricingIds.length === 0 || data.isDeletePending) {
      return;
    }

    setBulkDeleteError(null);
    const targetPricingIds = [...selectedPricingIds];
    let deletedCount = 0;

    for (const pricingId of targetPricingIds) {
      try {
        await data.deletePricing(pricingId);
        deletedCount += 1;
        setSelectedPricingIds((previous) => previous.filter((id) => id !== pricingId));
      } catch (error) {
        setBulkDeleteError(getApiErrorMessage(error));
        return;
      }
    }

    setIsBulkDeleteDialogOpen(false);
    setSelectedPricingIds([]);
    state.feedback.setSuccessMessage(
      deletedCount === 1 ? '1 pricing deleted.' : `${deletedCount} pricings deleted.`
    );
  }

  function openEditSubscription(subscriptionId: string): void {
    void queryClient
      .fetchQuery({
        queryKey: queryKeys.admin.subscription(subscriptionId),
        queryFn: () => api.getSubscription(subscriptionId)
      })
      .then((response) => {
        state.subscriptionModal.openEditSubscription(response.item);
      })
      .catch(() => {
        state.feedback.setSuccessMessage('Failed to load subscription.');
      });
  }

  if (!canReadPricings) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">Pricings are not available for Account role in this demo.</Alert>
      </Box>
    );
  }

  const selectedCount = canManagePricings ? selectedPricingIds.length : 0;

  return (
    <>
      <Stack
        spacing={0}
        sx={{
          height: '100%',
          minHeight: 0,
          overflow: 'hidden',
          pb: selectedCount > 0 ? '64px' : 0
        }}
      >
        <PricingsToolbar
          search={state.filters.search}
          onSearchChange={state.filters.setSearch}
          activeFiltersCount={data.activeFiltersCount}
          onOpenFilters={state.filters.openFiltersPopover}
          sortBy={state.sort.sortBy}
          sortDirection={state.sort.sortDirection}
          onOpenSortMenu={state.sort.openSortMenu}
          onToggleSortDirection={state.sort.toggleSortDirection}
          allRowsExpanded={allRowsExpanded}
          onToggleExpandAll={toggleExpandAllRows}
          expandAllDisabled={expandAllDisabled}
          groupByProduct={state.view.groupByProduct}
          onGroupByProductChange={state.view.setGroupByProduct}
          onAddPricing={() => state.pricingModal.openCreatePricing()}
          canManagePricings={canManagePricings}
        />

        <PricingFiltersPopover
          open={state.filters.isFiltersPopoverOpen}
          anchorEl={state.filters.filtersAnchorEl}
          onClose={state.filters.closeFiltersPopover}
          typeFilter={state.filters.typeFilter}
          onTypeFilterChange={state.filters.setTypeFilter}
          productOptions={data.productOptions}
          selectedProductIds={state.filters.productIdFilter}
          onProductIdsChange={state.filters.setProductIdFilter}
          productsLoading={data.productsLoading}
          accountOptions={data.accountOptions}
          selectedAccountIds={state.filters.accountIdFilter}
          onAccountIdsChange={state.filters.setAccountIdFilter}
          accountsLoading={data.accountsLoading}
          activeFiltersCount={data.activeFiltersCount}
          onClearFilters={state.filters.clearFilters}
        />

        <PricingSortMenu
          open={state.sort.isSortMenuOpen}
          anchorEl={state.sort.sortMenuAnchorEl}
          sortBy={state.sort.sortBy}
          onClose={state.sort.closeSortMenu}
          onSelectSortBy={state.sort.selectSortBy}
        />

        <Box
          sx={{
            p: 0,
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {data.hasTreeError ? (
            <Alert severity="error">Failed to load pricing tree.</Alert>
          ) : null}

          {data.isTreeLoading ? (
            <Typography variant="body2" color="text.secondary">
              Loading pricing tree...
            </Typography>
          ) : data.isTreeEmpty ? (
            <EmptyState
              title="No pricings found"
              description={
                canManagePricings
                  ? 'Create your first pricing or adjust filters.'
                  : 'No pricings match the current filters.'
              }
              actionLabel={canManagePricings ? 'New pricing' : undefined}
              onActionClick={canManagePricings ? () => state.pricingModal.openCreatePricing() : undefined}
            />
          ) : (
            <PricingTreeView
              cascadeScrollRef={tree.cascadeScrollRef}
              minTreeWidthPx={data.minTreeWidthPx}
              groupByProduct={state.view.groupByProduct}
              visibleProducts={data.visibleProducts}
              pricingsByProductId={data.pricingsByProductId}
              flatPricings={data.flatPricings}
              flatTierColumnCount={data.flatTierColumnCount}
              collapsedProducts={tree.collapsedProducts}
              expandedPricings={tree.expandedPricings}
              toggleExpanded={tree.toggleExpanded}
              setCollapsedProducts={tree.setCollapsedProducts}
              togglePricingFromCaret={tree.togglePricingFromCaret}
              togglePricingSectionLink={tree.togglePricingSectionLink}
              openEditPricing={state.pricingModal.openEditPricing}
              openEditSubscription={openEditSubscription}
              setDeletingPricing={state.confirmations.setDeletingPricing}
              setDetachConfirmTarget={state.confirmations.setDetachConfirmTarget}
              openCreatePricing={state.pricingModal.openCreatePricing}
              allSelected={canManagePricings ? allVisibleSelected : false}
              someSelected={canManagePricings ? someVisibleSelected : false}
              onToggleAllSelection={canManagePricings ? toggleAllVisibleSelection : () => undefined}
              selectedPricingIds={canManagePricings ? selectedPricingIds : []}
              onTogglePricingSelection={canManagePricings ? togglePricingSelection : () => undefined}
              canManagePricings={canManagePricings}
            />
          )}
        </Box>
      </Stack>

      {canManagePricings ? (
        <PricingsSelectionActions
          selectedCount={selectedCount}
          isPending={data.isDeletePending}
          onOpenDeletePricings={() => {
            setBulkDeleteError(null);
            setIsBulkDeleteDialogOpen(true);
          }}
          onClearSelection={() => {
            setSelectedPricingIds([]);
            setBulkDeleteError(null);
            setIsBulkDeleteDialogOpen(false);
          }}
        />
      ) : null}

      {canManagePricings && state.pricingModal.pricingModalOpen ? (
        <Suspense fallback={null}>
          <PricingFormDrawer
            open={state.pricingModal.pricingModalOpen}
            mode={state.pricingModal.pricingModalMode}
            initialPricing={state.pricingModal.editingPricing}
            defaultProductId={state.pricingModal.defaultProductId}
            defaultSubscriptionIds={
              state.pricingModal.pricingModalMode === 'edit'
                ? (state.pricingModal.editingPricing?.subscriptions ?? []).map(
                    (subscription) => subscription.id
                  )
                : undefined
            }
            defaultSubscriptions={
              state.pricingModal.pricingModalMode === 'edit'
                ? state.pricingModal.editingPricing?.subscriptions ?? []
                : undefined
            }
            onClose={state.pricingModal.closePricingModal}
          />
        </Suspense>
      ) : null}

      {state.subscriptionModal.subscriptionModalOpen ? (
        <Suspense fallback={null}>
          <SubscriptionFormDrawer
            open={state.subscriptionModal.subscriptionModalOpen}
            mode={state.subscriptionModal.subscriptionModalMode}
            initialSubscription={state.subscriptionModal.editingSubscription}
            defaultAccountId={
              state.subscriptionModal.subscriptionModalMode === 'create'
                ? state.subscriptionModal.defaultSubscriptionAccountId
                : undefined
            }
            defaultPricingIds={
              state.subscriptionModal.subscriptionModalMode === 'create'
                ? state.subscriptionModal.defaultSubscriptionPricingIds
                : undefined
            }
            defaultScope={
              state.subscriptionModal.subscriptionModalMode === 'create'
                ? state.subscriptionModal.defaultSubscriptionScope
                : undefined
            }
            onClose={state.subscriptionModal.closeSubscriptionModal}
          />
        </Suspense>
      ) : null}

      <PricingConfirmationDialogs
        deletingPricing={canManagePricings ? state.confirmations.deletingPricing : null}
        detachConfirmTarget={state.confirmations.detachConfirmTarget}
        actionError={state.feedback.actionError}
        isDeletePending={data.isDeletePending}
        onCloseDelete={() => state.confirmations.setDeletingPricing(null)}
        onConfirmDelete={() => {
          void confirmDeletePricing();
        }}
        onCloseDetach={() => state.confirmations.setDetachConfirmTarget(null)}
        onConfirmDetach={() => {
          void confirmDetach();
        }}
      />

      {canManagePricings ? (
        <PricingsBulkDeleteDialog
          open={isBulkDeleteDialogOpen}
          selectedCount={selectedCount}
          error={bulkDeleteError}
          isPending={data.isDeletePending}
          onClose={() => {
            setBulkDeleteError(null);
            setIsBulkDeleteDialogOpen(false);
          }}
          onConfirm={() => {
            void confirmBulkDeletePricings();
          }}
        />
      ) : null}

      <Snackbar
        open={Boolean(state.feedback.successMessage)}
        autoHideDuration={2500}
        onClose={() => state.feedback.setSuccessMessage(null)}
        message={state.feedback.successMessage}
      />
    </>
  );
}
