import { Alert, Snackbar, Stack } from '@mui/material';
import { Suspense, lazy, useEffect, useRef } from 'react';
import { canManagePricings, canManageSubscriptions, useDemoRole } from '../../demoRole';
import { ManagePricingsDialog } from './components/ManagePricingsDialog';
import { SubscriptionDeleteDialog } from './components/SubscriptionDeleteDialog';
import { SubscriptionsBulkDialog } from './components/SubscriptionsBulkDialog';
import { SubscriptionsFilters } from './components/SubscriptionsFilters';
import { SubscriptionsSelectionActions } from './components/SubscriptionsSelectionActions';
import { SubscriptionsStatusDialog } from './components/SubscriptionsStatusDialog';
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
  const { role } = useDemoRole();
  const canEditSubscriptions = canManageSubscriptions(role);
  const canEditPricings = canManagePricings(role);

  const resetReadOnlyStateRef = useRef<() => void>(() => undefined);
  resetReadOnlyStateRef.current = () => {
    controller.bulk.clearSelection();
    controller.bulk.closeDeleteDialog();
    controller.bulk.manageDialog.close();
    controller.bulk.statusDialog.close();
    controller.singleDeleteDialog.close();
    controller.drawer.closeDrawer();
    controller.pricingDrawer.closePricingDrawer();
  };

  useEffect(() => {
    if (canEditSubscriptions) {
      return;
    }

    resetReadOnlyStateRef.current();
  }, [canEditSubscriptions]);

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
          canCreateSubscription={canEditSubscriptions}
        />

        <Stack
          spacing={0}
          sx={{
            px: 0,
            pt: 0,
            pb: canEditSubscriptions && controller.bulk.selectedCount > 0 ? '64px' : 0,
            flex: 1,
            minHeight: 0
          }}
        >
          <SubscriptionsSelectionActions
            selectedCount={canEditSubscriptions ? controller.bulk.selectedCount : 0}
            canManageSubscriptions={canEditSubscriptions}
            statusValue={controller.bulk.statusValue}
            isStatusLoading={controller.bulk.isStatusLoading}
            isPending={controller.bulk.isPending}
            onSelectStatus={controller.bulk.openStatusDialog}
            onOpenManagePricings={() => {
              void controller.bulk.openManagePricingsDialog();
            }}
            onOpenDeleteSubscriptions={controller.bulk.openDeleteDialog}
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
            selectedIds={canEditSubscriptions ? controller.table.selectedIds : []}
            allSelected={canEditSubscriptions ? controller.table.allSelected : false}
            someSelected={canEditSubscriptions ? controller.table.someSelected : false}
            total={controller.table.total}
            isSelectingAll={controller.table.isSelectingAll}
            accountPropertiesCountById={controller.table.accountPropertiesCountById}
            accountTotalBillableUnitsById={controller.table.accountTotalBillableUnitsById}
            isAccountPropertiesCountPending={controller.table.isAccountPropertiesCountPending}
            page={controller.table.page}
            pageSize={controller.table.pageSize}
            onToggleAllSelection={() => {
              if (canEditSubscriptions) {
                void controller.table.onToggleAllSelection();
              }
            }}
            onSort={controller.table.onSort}
            onToggleRowSelection={(subscriptionId) => {
              if (canEditSubscriptions) {
                controller.table.onToggleRowSelection(subscriptionId);
              }
            }}
            onEditSubscription={controller.drawer.openEditDrawer}
            onEditPricing={canEditSubscriptions ? controller.pricingDrawer.openEditPricing : undefined}
            onDeleteSubscription={controller.table.onDeleteSubscription}
            onCreateSubscription={controller.drawer.openCreateDrawer}
            onPageChange={controller.table.onPageChange}
            onPageSizeChange={controller.table.onPageSizeChange}
            canManageSubscriptions={canEditSubscriptions}
            canOpenPricingEditor={canEditSubscriptions}
          />
        </Stack>
      </Stack>

      {canEditSubscriptions && controller.drawer.drawerOpen ? (
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

      {canEditSubscriptions && controller.pricingDrawer.pricingDrawerOpen && controller.pricingDrawer.editingPricing ? (
        <Suspense fallback={null}>
          <PricingFormDrawer
            open={controller.pricingDrawer.pricingDrawerOpen}
            mode="edit"
            initialPricing={controller.pricingDrawer.editingPricing}
            onClose={controller.pricingDrawer.closePricingDrawer}
          />
        </Suspense>
      ) : null}

      {canEditSubscriptions ? (
        <>
          <SubscriptionsBulkDialog
            open={controller.bulk.deleteDialogOpen}
            selectedCount={controller.bulk.selectedCount}
            error={controller.bulk.error}
            isPending={controller.bulk.isPending}
            onClose={controller.bulk.closeDeleteDialog}
            onConfirm={() => {
              void controller.bulk.applyDeleteSubscriptions();
            }}
          />

          <SubscriptionDeleteDialog
            open={controller.singleDeleteDialog.open}
            subscriptionName={controller.singleDeleteDialog.subscriptionName}
            isPending={controller.bulk.isPending}
            onClose={controller.singleDeleteDialog.close}
            onConfirm={() => {
              void controller.singleDeleteDialog.confirm();
            }}
          />

          <ManagePricingsDialog
            open={controller.bulk.manageDialog.open}
            selectedCount={controller.bulk.manageDialog.selectedCount}
            pricingIds={controller.bulk.manageDialog.pricingIds}
            usageCountByPricingId={controller.bulk.manageDialog.usageCountByPricingId}
            pricings={controller.bulk.manageDialog.pricings}
            isLoading={controller.bulk.manageDialog.isLoading}
            isPending={controller.bulk.isPending}
            hasChanges={controller.bulk.manageDialog.hasChanges}
            error={controller.bulk.error}
            canCreatePricing={canEditPricings}
            onPricingIdsChange={controller.bulk.manageDialog.setPricingIds}
            onAppendPricingId={controller.bulk.manageDialog.appendPricingId}
            onClose={controller.bulk.manageDialog.close}
            onConfirm={() => {
              void controller.bulk.manageDialog.confirm();
            }}
          />

          <SubscriptionsStatusDialog
            open={controller.bulk.statusDialog.open}
            selectedCount={controller.bulk.statusDialog.selectedCount}
            nextStatus={controller.bulk.statusDialog.nextStatus}
            isPending={controller.bulk.isPending}
            onClose={controller.bulk.statusDialog.close}
            onConfirm={() => {
              void controller.bulk.statusDialog.confirm();
            }}
          />
        </>
      ) : null}

      <Snackbar
        open={Boolean(controller.feedback.bulkSuccess)}
        autoHideDuration={2500}
        onClose={controller.feedback.clearBulkSuccess}
        message={controller.feedback.bulkSuccess}
      />
    </>
  );
}
