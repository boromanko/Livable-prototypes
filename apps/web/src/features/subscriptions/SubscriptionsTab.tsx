import { Alert, Snackbar, Stack } from '@mui/material';
import { Suspense, lazy } from 'react';
import { SubscriptionsBulkDialog } from './components/SubscriptionsBulkDialog';
import { SubscriptionsFilters } from './components/SubscriptionsFilters';
import { SubscriptionsSelectionActions } from './components/SubscriptionsSelectionActions';
import { SubscriptionsTable } from './components/SubscriptionsTable';
import { useSubscriptionsTabController } from './subscriptionsTab.hooks';

const SubscriptionFormDrawer = lazy(async () => {
  const module = await import('./SubscriptionFormDrawer');
  return { default: module.SubscriptionFormDrawer };
});

const PricingFormDrawer = lazy(async () => {
  const module = await import('../pricings/PricingFormDrawer');
  return { default: module.PricingFormDrawer };
});

export function SubscriptionsTab(): JSX.Element {
  const controller = useSubscriptionsTabController();

  return (
    <>
      <Stack spacing={0} sx={{ height: '100%', minHeight: 0 }}>
        <SubscriptionsFilters
          search={controller.filters.search}
          scopeFilter={controller.filters.scopeFilter}
          statusFilter={controller.filters.statusFilter}
          accountIdsFilter={controller.filters.accountIdsFilter}
          pricingIdsFilter={controller.filters.pricingIdsFilter}
          accounts={controller.filters.accounts}
          pricings={controller.filters.pricings}
          onSearchChange={controller.filters.onSearchChange}
          onScopeFilterChange={controller.filters.onScopeFilterChange}
          onStatusFilterChange={controller.filters.onStatusFilterChange}
          onAccountFilterChange={controller.filters.onAccountFilterChange}
          onPricingFilterChange={controller.filters.onPricingFilterChange}
          onCreateSubscription={controller.drawer.openCreateDrawer}
        />

        <Stack
          spacing={2}
          sx={{
            px: { xs: 1.5, sm: 2 },
            pt: { xs: 1.5, sm: 2 },
            pb: controller.bulk.selectedCount > 0 ? { xs: 18, sm: 14 } : 0,
            flex: 1,
            minHeight: 0
          }}
        >
          <SubscriptionsSelectionActions
            selectedCount={controller.bulk.selectedCount}
            onOpenBulkDialog={controller.bulk.openBulkDialog}
            onClearSelection={controller.bulk.clearSelection}
          />

          {controller.table.isError ? (
            <Alert severity="error">Failed to load subscriptions.</Alert>
          ) : null}

          <SubscriptionsTable
            isPending={controller.table.isPending}
            rows={controller.table.rows}
            sortField={controller.table.sortField}
            sortDirection={controller.table.sortDirection}
            selectedIds={controller.table.selectedIds}
            allVisibleSelected={controller.table.allVisibleSelected}
            someVisibleSelected={controller.table.someVisibleSelected}
            total={controller.table.total}
            accountPropertiesCountById={controller.table.accountPropertiesCountById}
            accountTotalBillableUnitsById={controller.table.accountTotalBillableUnitsById}
            isAccountPropertiesCountPending={controller.table.isAccountPropertiesCountPending}
            page={controller.table.page}
            pageSize={controller.table.pageSize}
            onToggleVisibleSelection={controller.table.onToggleVisibleSelection}
            onSort={controller.table.onSort}
            onToggleRowSelection={controller.table.onToggleRowSelection}
            onEditSubscription={controller.drawer.openEditDrawer}
            onEditPricing={controller.pricingDrawer.openEditPricing}
            onDeleteSubscription={controller.table.onDeleteSubscription}
            onCreateSubscription={controller.drawer.openCreateDrawer}
            onPageChange={controller.table.onPageChange}
            onPageSizeChange={controller.table.onPageSizeChange}
          />
        </Stack>
      </Stack>

      {controller.drawer.drawerOpen ? (
        <Suspense fallback={null}>
          <SubscriptionFormDrawer
            open={controller.drawer.drawerOpen}
            mode={controller.drawer.drawerMode}
            initialSubscription={controller.drawer.editingSubscription}
            defaultAccountId={controller.drawer.defaultAccountId}
            onClose={controller.drawer.closeDrawer}
          />
        </Suspense>
      ) : null}

      {controller.pricingDrawer.pricingDrawerOpen && controller.pricingDrawer.editingPricing ? (
        <Suspense fallback={null}>
          <PricingFormDrawer
            open={controller.pricingDrawer.pricingDrawerOpen}
            mode="edit"
            initialPricing={controller.pricingDrawer.editingPricing}
            onClose={controller.pricingDrawer.closePricingDrawer}
          />
        </Suspense>
      ) : null}

      <SubscriptionsBulkDialog
        open={controller.bulk.dialogOpen}
        action={controller.bulk.action}
        selectedCount={controller.bulk.selectedCount}
        requiresPricingSelection={controller.bulk.requiresPricingSelection}
        pricingIds={controller.bulk.pricingIds}
        pricings={controller.bulk.pricings}
        error={controller.bulk.error}
        isPending={controller.bulk.isPending}
        onPricingIdsChange={controller.bulk.setPricingIds}
        onClose={controller.bulk.closeBulkDialog}
        onConfirm={() => {
          void controller.bulk.applyBulkAction();
        }}
      />

      <Snackbar
        open={Boolean(controller.feedback.bulkSuccess)}
        autoHideDuration={2500}
        onClose={controller.feedback.clearBulkSuccess}
        message={controller.feedback.bulkSuccess}
      />
    </>
  );
}
