import type { Dispatch, SetStateAction } from 'react';
import type {
  CreateSubscriptionPayload,
  SubscriptionAvailabilityPreviewResponse,
  SubscriptionItem,
  SubscriptionStatus,
  UpdateSubscriptionPayload
} from '../../api';
import { getApiErrorMessage } from '../../lib/errors/getApiErrorMessage';
import { getAvailabilityConflictMessage, uniqueIds, type AutoPruneNotice } from './subscriptionForm.helpers';
import type {
  SubscriptionFormState,
  SubscriptionFormValidationState
} from './subscriptionForm.utils';

type SetState<T> = Dispatch<SetStateAction<T>>;

type AvailabilityRefetchResult = {
  data: SubscriptionAvailabilityPreviewResponse | undefined;
  error: unknown | null;
};

type CreateSubscriptionFormActionsInput = {
  validation: SubscriptionFormValidationState;
  formState: SubscriptionFormState;
  isEdit: boolean;
  initialSubscription: SubscriptionItem | null;
  autoPruneNotice: AutoPruneNotice | null;
  setShowValidation: SetState<boolean>;
  setFormError: SetState<string | null>;
  setFormState: SetState<SubscriptionFormState>;
  setAutoPruneNotice: SetState<AutoPruneNotice | null>;
  refetchAvailability: () => Promise<AvailabilityRefetchResult>;
  createSubscription: (payload: CreateSubscriptionPayload) => Promise<SubscriptionItem>;
  updateSubscription: (input: {
    subscriptionId: string;
    payload: UpdateSubscriptionPayload;
  }) => Promise<SubscriptionItem>;
  onSaved?: (subscription: SubscriptionItem) => void;
  onClose: () => void;
};

export function createSubscriptionFormActions(input: CreateSubscriptionFormActionsInput) {
  const {
    validation,
    formState,
    isEdit,
    initialSubscription,
    autoPruneNotice,
    setShowValidation,
    setFormError,
    setFormState,
    setAutoPruneNotice,
    refetchAvailability,
    createSubscription,
    updateSubscription,
    onSaved,
    onClose
  } = input;

  async function handleSubmit(): Promise<void> {
    setShowValidation(true);
    setFormError(null);

    if (validation.hasErrors) {
      setFormError('Fix highlighted fields before saving.');
      return;
    }

    const availabilityResult = await refetchAvailability();
    if (availabilityResult.error) {
      setFormError(getApiErrorMessage(availabilityResult.error));
      return;
    }

    const availabilityData = availabilityResult.data;
    if (!availabilityData) {
      setFormError('Unable to verify availability. Please try again.');
      return;
    }

    if (!availabilityData.canSave) {
      setFormError(
        getAvailabilityConflictMessage(availabilityData) ??
          'Resolve availability conflicts before saving.'
      );
      return;
    }

    try {
      const normalizedPropertyIds =
        formState.scope === 'PROPERTY' ? uniqueIds(formState.propertyIds) : [];

      const payload = {
        accountId: formState.accountId,
        scope: formState.scope,
        propertyIds: normalizedPropertyIds,
        startDate: formState.startDate,
        endDate: formState.endDate !== '' ? formState.endDate : null,
        status: formState.status,
        paymentMethodId: formState.paymentMethodId || null,
        pricingIds: formState.pricingIds
      };

      const savedSubscription =
        isEdit && initialSubscription
          ? await updateSubscription({
              subscriptionId: initialSubscription.id,
              payload
            })
          : await createSubscription(payload);

      onSaved?.(savedSubscription);
      onClose();
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    }
  }

  function setAccountId(accountId: string): void {
    setAutoPruneNotice(null);
    setFormState((prev) => ({
      ...prev,
      accountId,
      propertyIds: [],
      paymentMethodId: ''
    }));
  }

  function setApplyAllProperties(enabled: boolean): void {
    setAutoPruneNotice(null);
    setFormState((prev) => ({
      ...prev,
      scope: enabled ? 'ACCOUNT' : 'PROPERTY'
    }));
  }

  function setPropertyIds(propertyIds: string[]): void {
    setAutoPruneNotice(null);
    setFormState((prev) => ({
      ...prev,
      propertyIds
    }));
  }

  function setStartDate(startDate: string): void {
    setFormState((prev) => ({
      ...prev,
      startDate
    }));
  }

  function setStatus(status: SubscriptionStatus): void {
    setFormState((prev) => ({
      ...prev,
      status
    }));
  }

  function setEndDate(endDate: string): void {
    setFormState((prev) => ({
      ...prev,
      endDate
    }));
  }

  function setCreateActive(enabled: boolean): void {
    setFormState((prev) => ({
      ...prev,
      status: enabled ? 'ACTIVE' : 'DRAFT'
    }));
  }

  function setPaymentMethodId(paymentMethodId: string): void {
    setFormState((prev) => ({
      ...prev,
      paymentMethodId
    }));
  }

  function setPricingIds(pricingIds: string[]): void {
    setAutoPruneNotice(null);
    setFormState((prev) => ({
      ...prev,
      pricingIds
    }));
  }

  function appendPricingId(pricingId: string): void {
    setAutoPruneNotice(null);
    setFormState((prev) => ({
      ...prev,
      pricingIds: uniqueIds([...prev.pricingIds, pricingId])
    }));
  }

  function dismissAutoPruneNotice(): void {
    setAutoPruneNotice(null);
  }

  function undoAutoPrune(): void {
    if (!autoPruneNotice) {
      return;
    }

    setFormState((prev) => ({
      ...prev,
      pricingIds: uniqueIds([...prev.pricingIds, ...autoPruneNotice.removedPricingIds]),
      propertyIds:
        prev.scope === 'PROPERTY'
          ? uniqueIds([...prev.propertyIds, ...autoPruneNotice.removedPropertyIds])
          : prev.propertyIds
    }));
    setAutoPruneNotice(null);
  }

  return {
    handleSubmit,
    setAccountId,
    setApplyAllProperties,
    setPropertyIds,
    setStartDate,
    setStatus,
    setEndDate,
    setCreateActive,
    setPaymentMethodId,
    setPricingIds,
    appendPricingId,
    dismissAutoPruneNotice,
    undoAutoPrune
  };
}
