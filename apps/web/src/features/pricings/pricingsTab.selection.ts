import { useEffect, useMemo, useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import type { PricingItem, SubscriptionItem } from '../../api';
import { api, queryKeys } from '../../api';
import { getApiErrorMessage } from '../../lib/errors/getApiErrorMessage';

type UsePricingsTabSelectionInput = {
  flatPricings: PricingItem[];
  expandedPricings: Set<string>;
  setExpandedPricings: (next: Set<string>) => void;
  isDeletePending: boolean;
  deletePricing: (pricingId: string) => Promise<unknown>;
  queryClient: QueryClient;
  openEditSubscriptionModal: (subscription: SubscriptionItem) => void;
  setSuccessMessage: (message: string | null) => void;
};

export function usePricingsTabSelection(input: UsePricingsTabSelectionInput) {
  const {
    flatPricings,
    expandedPricings,
    setExpandedPricings,
    isDeletePending,
    deletePricing,
    queryClient,
    openEditSubscriptionModal,
    setSuccessMessage
  } = input;

  const [selectedPricingIds, setSelectedPricingIds] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);
  const [subscriptionLoadError, setSubscriptionLoadError] = useState<string | null>(null);

  const allPricingRowKeys = useMemo(
    () => flatPricings.map((pricing) => `pricing:${pricing.id}`),
    [flatPricings]
  );
  const allPricingRowsExpanded =
    allPricingRowKeys.length > 0 &&
    allPricingRowKeys.every((pricingKey) => expandedPricings.has(pricingKey));
  const allRowsExpanded = allPricingRowsExpanded;
  const expandAllDisabled = allPricingRowKeys.length === 0;

  const visiblePricingIds = useMemo(
    () => flatPricings.map((pricing) => pricing.id),
    [flatPricings]
  );
  const selectedPricingIdSet = useMemo(() => new Set(selectedPricingIds), [selectedPricingIds]);

  const allVisibleSelected =
    visiblePricingIds.length > 0 &&
    visiblePricingIds.every((pricingId) => selectedPricingIdSet.has(pricingId));
  const someVisibleSelected =
    visiblePricingIds.some((pricingId) => selectedPricingIdSet.has(pricingId)) &&
    !allVisibleSelected;

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

  function toggleExpandAllRows(): void {
    if (allRowsExpanded) {
      setExpandedPricings(new Set());
      return;
    }

    setExpandedPricings(new Set(allPricingRowKeys));
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

  function openBulkDeleteDialog(): void {
    setBulkDeleteError(null);
    setIsBulkDeleteDialogOpen(true);
  }

  function closeBulkDeleteDialog(): void {
    setBulkDeleteError(null);
    setIsBulkDeleteDialogOpen(false);
  }

  function clearSelection(): void {
    setSelectedPricingIds([]);
    closeBulkDeleteDialog();
  }

  async function confirmBulkDeletePricings(): Promise<void> {
    if (selectedPricingIds.length === 0 || isDeletePending) {
      return;
    }

    setBulkDeleteError(null);
    const targetPricingIds = [...selectedPricingIds];
    let deletedCount = 0;

    for (const pricingId of targetPricingIds) {
      try {
        await deletePricing(pricingId);
        deletedCount += 1;
        setSelectedPricingIds((previous) => previous.filter((id) => id !== pricingId));
      } catch (error) {
        setBulkDeleteError(getApiErrorMessage(error));
        return;
      }
    }

    setIsBulkDeleteDialogOpen(false);
    setSelectedPricingIds([]);
    setSuccessMessage(
      deletedCount === 1 ? '1 pricing deleted.' : `${deletedCount} pricings deleted.`
    );
  }

  function openEditSubscription(subscriptionId: string): void {
    setSubscriptionLoadError(null);

    void queryClient
      .fetchQuery({
        queryKey: queryKeys.admin.subscription(subscriptionId),
        queryFn: () => api.getSubscription(subscriptionId)
      })
      .then((response) => {
        openEditSubscriptionModal(response.item);
      })
      .catch(() => {
        setSubscriptionLoadError('Failed to load subscription.');
      });
  }

  return {
    selectedPricingIds,
    setSelectedPricingIds,
    isBulkDeleteDialogOpen,
    bulkDeleteError,
    allRowsExpanded,
    expandAllDisabled,
    allVisibleSelected,
    someVisibleSelected,
    subscriptionLoadError,
    toggleExpandAllRows,
    togglePricingSelection,
    toggleAllVisibleSelection,
    openBulkDeleteDialog,
    closeBulkDeleteDialog,
    clearSelection,
    confirmBulkDeletePricings,
    openEditSubscription,
    clearSubscriptionLoadError: () => setSubscriptionLoadError(null)
  };
}
