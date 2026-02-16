import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import {
  api,
  type SubscriptionBulkPayload,
  type SubscriptionItem,
  type SubscriptionStatus
} from '../../api';
import {
  buildEmptyStatusCounts,
  buildManagePricingChanges,
  getSubscriptionDisplayName,
  uniqueIds
} from './subscriptionsTab.helpers';
import { getBulkActionLabel, getBulkErrorMessage } from './subscriptionsTab.utils';

type SetState<T> = Dispatch<SetStateAction<T>>;

type CreateSubscriptionsTabBulkActionsInput = {
  selectedIds: string[];
  setSelectedIds: SetState<string[]>;
  setBulkError: SetState<string | null>;
  setBulkSuccess: SetState<string | null>;
  setIsDeleteDialogOpen: SetState<boolean>;
  managePreviewRequestIdRef: MutableRefObject<number>;
  setIsManageDialogOpen: SetState<boolean>;
  setIsManagePreviewLoading: SetState<boolean>;
  setManageTargetSubscriptionIds: SetState<string[]>;
  setManageInitialPricingIds: SetState<string[]>;
  setManagePricingIdsState: SetState<string[]>;
  setManageUsageCountByPricingId: SetState<Record<string, number>>;
  setStatusCounts: SetState<Record<SubscriptionStatus, number>>;
  setIsStatusDialogOpen: SetState<boolean>;
  statusDialogSubscriptionIds: string[];
  setStatusDialogSubscriptionIds: SetState<string[]>;
  statusDialogNextStatus: SubscriptionStatus | null;
  setStatusDialogNextStatus: SetState<SubscriptionStatus | null>;
  singleDeleteTarget: { id: string; name: string } | null;
  setSingleDeleteTarget: SetState<{ id: string; name: string } | null>;
  mutateBulkSubscriptions: (payload: SubscriptionBulkPayload) => Promise<unknown>;
  manageTargetSubscriptionIds: string[];
  manageHasChanges: boolean;
  manageInitialPricingIds: string[];
  managePricingIds: string[];
};

export function createSubscriptionsTabBulkActions(input: CreateSubscriptionsTabBulkActionsInput) {
  const {
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
    mutateBulkSubscriptions,
    manageTargetSubscriptionIds,
    manageHasChanges,
    manageInitialPricingIds,
    managePricingIds
  } = input;

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

      const previewPricingIds = response.items.map((item) => item.id);
      const usageCountsById = Object.fromEntries(
        response.items.map((item) => [item.id, item.usageCount])
      );

      setManageInitialPricingIds(previewPricingIds);
      setManagePricingIdsState(previewPricingIds);
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

  async function applySingleDeleteSubscription(): Promise<void> {
    if (!singleDeleteTarget) {
      return;
    }

    setBulkError(null);

    try {
      await mutateBulkSubscriptions({
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
      await mutateBulkSubscriptions({
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

    const { addPricingIds, removePricingIds } = buildManagePricingChanges(
      manageInitialPricingIds,
      managePricingIds
    );

    setBulkError(null);

    try {
      await mutateBulkSubscriptions({
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
      await mutateBulkSubscriptions({
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
    openDeleteDialog,
    closeDeleteDialog,
    closeManagePricingsDialog,
    openManagePricingsDialog,
    setManagePricingIds,
    appendManagePricingId,
    openStatusDialog,
    closeStatusDialog,
    openSingleDeleteDialog,
    closeSingleDeleteDialog,
    clearSelection,
    applySingleDeleteSubscription,
    applyDeleteSubscriptions,
    applyManagePricings,
    applyStatusUpdate
  };
}
