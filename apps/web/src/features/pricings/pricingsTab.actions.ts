import { useCallback } from 'react';
import { getApiErrorMessage } from '../../lib/errors/getApiErrorMessage';
import type { DetachConfirmTarget } from './components/pricingTree.types';

type UsePricingsTabActionsInput = {
  deletingPricing: { id: string; internalName: string } | null;
  detachConfirmTarget: DetachConfirmTarget | null;
  isDeletePending: boolean;
  deletePricing: (pricingId: string) => Promise<unknown>;
  detachPricing: (input: { subscriptionId: string; pricingId: string }) => Promise<unknown>;
  setActionError: (value: string | null) => void;
  setSuccessMessage: (value: string | null) => void;
  setDeletingPricing: (value: null) => void;
  setDetachConfirmTarget: (value: null) => void;
};

export function usePricingsTabActions(input: UsePricingsTabActionsInput) {
  const {
    deletingPricing,
    detachConfirmTarget,
    isDeletePending,
    deletePricing,
    detachPricing,
    setActionError,
    setSuccessMessage,
    setDeletingPricing,
    setDetachConfirmTarget
  } = input;

  const confirmDeletePricing = useCallback(async (): Promise<void> => {
    if (!deletingPricing || isDeletePending) {
      return;
    }

    setActionError(null);

    try {
      await deletePricing(deletingPricing.id);
      setSuccessMessage(`Pricing "${deletingPricing.internalName}" deleted.`);
      setDeletingPricing(null);
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  }, [
    deletePricing,
    deletingPricing,
    isDeletePending,
    setActionError,
    setDeletingPricing,
    setSuccessMessage
  ]);

  const confirmDetach = useCallback(async (): Promise<void> => {
    if (!detachConfirmTarget) {
      return;
    }

    setActionError(null);

    try {
      await detachPricing({
        subscriptionId: detachConfirmTarget.subscriptionId,
        pricingId: detachConfirmTarget.pricingId
      });
      setSuccessMessage('Pricing detached successfully.');
      setDetachConfirmTarget(null);
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  }, [detachConfirmTarget, detachPricing, setActionError, setDetachConfirmTarget, setSuccessMessage]);

  return {
    confirmDeletePricing,
    confirmDetach
  };
}
