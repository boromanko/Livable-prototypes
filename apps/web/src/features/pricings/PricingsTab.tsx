import { Alert, Box, Snackbar, Stack, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { Suspense, lazy, useMemo } from 'react';
import { api, queryKeys } from '../../api';
import { EmptyState } from '../../components/layout';
import { PricingConfirmationDialogs } from './components/PricingConfirmationDialogs';
import { PricingFiltersPopover } from './components/PricingFiltersPopover';
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
  const state = usePricingsTabState();
  const tree = usePricingTreeInteractions();
  const queryClient = useQueryClient();

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
  const allProductIds = useMemo(
    () => data.visibleProducts.map((product) => product.id),
    [data.visibleProducts]
  );
  const allPricingRowsExpanded =
    allPricingRowKeys.length > 0 &&
    allPricingRowKeys.every((pricingKey) => tree.expandedPricings.has(pricingKey));
  const allProductsExpanded =
    !state.view.groupByProduct ||
    allProductIds.every((productId) => !tree.collapsedProducts.has(productId));
  const allRowsExpanded = allPricingRowsExpanded && allProductsExpanded;
  const expandAllDisabled = allPricingRowKeys.length === 0;

  function toggleExpandAllRows(): void {
    if (allRowsExpanded) {
      tree.setExpandedPricings(new Set());
      if (state.view.groupByProduct) {
        tree.setCollapsedProducts(new Set(allProductIds));
      }
      return;
    }

    if (state.view.groupByProduct) {
      tree.setCollapsedProducts(new Set());
    }
    tree.setExpandedPricings(new Set(allPricingRowKeys));
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

  return (
    <>
      <Stack spacing={0} sx={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
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
            p: { xs: 1.5, sm: 2 },
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
              description="Create your first pricing or adjust filters."
              actionLabel="New pricing"
              onActionClick={() => state.pricingModal.openCreatePricing()}
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
            />
          )}
        </Box>
      </Stack>

      {state.pricingModal.pricingModalOpen ? (
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
        deletingPricing={state.confirmations.deletingPricing}
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

      <Snackbar
        open={Boolean(state.feedback.successMessage)}
        autoHideDuration={2500}
        onClose={() => state.feedback.setSuccessMessage(null)}
        message={state.feedback.successMessage}
      />
    </>
  );
}
