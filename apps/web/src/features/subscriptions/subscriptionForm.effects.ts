import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type {
  BillingScope,
  SubscriptionAvailabilityPreviewResponse,
  SubscriptionItem,
  SubscriptionTransferEligibilityResponse
} from '../../api';
import {
  pruneInvalidSelections,
  type AutoPruneNotice
} from './subscriptionForm.helpers';
import {
  buildFormStateFromSubscription,
  buildInitialSubscriptionFormState,
  type SubscriptionFormState
} from './subscriptionForm.utils';

type SetState<T> = Dispatch<SetStateAction<T>>;

type UseSubscriptionFormEffectsInput = {
  open: boolean;
  isEdit: boolean;
  initialSubscription: SubscriptionItem | null;
  defaultAccountId?: string;
  defaultPricingIds?: string[];
  defaultScope?: BillingScope;
  selectableAccountIds: string[];
  transferEligibilityItems: SubscriptionTransferEligibilityResponse['items'] | undefined;
  availabilityData: SubscriptionAvailabilityPreviewResponse | undefined;
  availabilityDataUpdatedAt: number;
  setFormState: SetState<SubscriptionFormState>;
  setFormError: SetState<string | null>;
  setShowValidation: SetState<boolean>;
  setAutoPruneNotice: SetState<AutoPruneNotice | null>;
};

export function useSubscriptionFormEffects(input: UseSubscriptionFormEffectsInput): void {
  const {
    open,
    isEdit,
    initialSubscription,
    defaultAccountId,
    defaultPricingIds,
    defaultScope,
    selectableAccountIds,
    transferEligibilityItems,
    availabilityData,
    availabilityDataUpdatedAt,
    setFormState,
    setFormError,
    setShowValidation,
    setAutoPruneNotice
  } = input;

  useEffect(() => {
    if (!open) {
      return;
    }

    if (initialSubscription) {
      setFormState(buildFormStateFromSubscription(initialSubscription));
    } else {
      setFormState(
        buildInitialSubscriptionFormState(defaultAccountId, defaultPricingIds, defaultScope)
      );
    }

    setFormError(null);
    setShowValidation(false);
    setAutoPruneNotice(null);
  }, [
    defaultAccountId,
    defaultPricingIds,
    defaultScope,
    initialSubscription,
    open,
    setAutoPruneNotice,
    setFormError,
    setFormState,
    setShowValidation
  ]);

  useEffect(() => {
    if (!open || !isEdit || !transferEligibilityItems) {
      return;
    }

    setFormState((prev) => {
      if (prev.accountId === '') {
        return prev;
      }

      const isSelectedAccountAvailable = selectableAccountIds.includes(prev.accountId);
      if (isSelectedAccountAvailable) {
        return prev;
      }

      return {
        ...prev,
        accountId: '',
        propertyIds: [],
        paymentMethodId: ''
      };
    });
  }, [isEdit, open, selectableAccountIds, setFormState, transferEligibilityItems]);

  useEffect(() => {
    if (!open || !availabilityData) {
      return;
    }

    const {
      invalidSelectedPricingIds: invalidPricingIds,
      invalidSelectedPropertyIds: invalidPropertyIds
    } = availabilityData;

    if (invalidPricingIds.length === 0 && invalidPropertyIds.length === 0) {
      return;
    }

    let pruneNotice: AutoPruneNotice | null = null;

    setFormState((prev) => {
      const result = pruneInvalidSelections(prev, invalidPricingIds, invalidPropertyIds);
      pruneNotice = result.notice;
      return result.nextState;
    });

    if (pruneNotice) {
      setAutoPruneNotice(pruneNotice);
      setShowValidation(false);
    }
  }, [
    availabilityData,
    availabilityDataUpdatedAt,
    open,
    setAutoPruneNotice,
    setFormState,
    setShowValidation
  ]);
}
