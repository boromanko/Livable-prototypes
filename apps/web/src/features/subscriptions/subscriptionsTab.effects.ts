import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { api, type SubscriptionStatus } from '../../api';
import { buildEmptyStatusCounts } from './subscriptionsTab.helpers';
import { getBulkErrorMessage } from './subscriptionsTab.utils';

type SetState<T> = Dispatch<SetStateAction<T>>;

type UseResetOnFiltersChangeInput = {
  filtersKey: string;
  selectAllRequestIdRef: MutableRefObject<number>;
  managePreviewRequestIdRef: MutableRefObject<number>;
  statusPreviewRequestIdRef: MutableRefObject<number>;
  setIsSelectingAll: SetState<boolean>;
  setIsDeleteDialogOpen: SetState<boolean>;
  setIsManageDialogOpen: SetState<boolean>;
  setIsManagePreviewLoading: SetState<boolean>;
  setIsStatusPreviewLoading: SetState<boolean>;
  setIsStatusDialogOpen: SetState<boolean>;
  setStatusDialogSubscriptionIds: SetState<string[]>;
  setStatusDialogNextStatus: SetState<SubscriptionStatus | null>;
  setSingleDeleteTarget: SetState<{ id: string; name: string } | null>;
  setStatusCounts: SetState<Record<SubscriptionStatus, number>>;
  setManageTargetSubscriptionIds: SetState<string[]>;
  setManageInitialPricingIds: SetState<string[]>;
  setManagePricingIdsState: SetState<string[]>;
  setManageUsageCountByPricingId: SetState<Record<string, number>>;
  setSelectedIds: SetState<string[]>;
  setBulkError: SetState<string | null>;
};

export function useSubscriptionsTabResetOnFiltersChange(
  input: UseResetOnFiltersChangeInput
): void {
  const {
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
  } = input;

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
  }, [
    filtersKey,
    managePreviewRequestIdRef,
    selectAllRequestIdRef,
    setBulkError,
    setIsDeleteDialogOpen,
    setIsManageDialogOpen,
    setIsManagePreviewLoading,
    setIsSelectingAll,
    setIsStatusDialogOpen,
    setIsStatusPreviewLoading,
    setManageInitialPricingIds,
    setManagePricingIdsState,
    setManageTargetSubscriptionIds,
    setManageUsageCountByPricingId,
    setSelectedIds,
    setSingleDeleteTarget,
    setStatusCounts,
    setStatusDialogNextStatus,
    setStatusDialogSubscriptionIds,
    statusPreviewRequestIdRef
  ]);
}

type UseStatusPreviewInput = {
  selectedIds: string[];
  statusPreviewRequestIdRef: MutableRefObject<number>;
  setIsStatusPreviewLoading: SetState<boolean>;
  setStatusCounts: SetState<Record<SubscriptionStatus, number>>;
  setIsStatusDialogOpen: SetState<boolean>;
  setStatusDialogSubscriptionIds: SetState<string[]>;
  setStatusDialogNextStatus: SetState<SubscriptionStatus | null>;
  setBulkError: SetState<string | null>;
};

export function useSubscriptionsTabStatusPreview(input: UseStatusPreviewInput): void {
  const {
    selectedIds,
    statusPreviewRequestIdRef,
    setIsStatusPreviewLoading,
    setStatusCounts,
    setIsStatusDialogOpen,
    setStatusDialogSubscriptionIds,
    setStatusDialogNextStatus,
    setBulkError
  } = input;

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
  }, [
    selectedIds,
    setBulkError,
    setIsStatusDialogOpen,
    setIsStatusPreviewLoading,
    setStatusCounts,
    setStatusDialogNextStatus,
    setStatusDialogSubscriptionIds,
    statusPreviewRequestIdRef
  ]);
}
