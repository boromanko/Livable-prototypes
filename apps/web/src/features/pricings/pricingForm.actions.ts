import type { Dispatch, SetStateAction } from 'react';
import type {
  CreatePricingPayload,
  PricingItem,
  PricingType,
  SubscriptionBulkPayload,
  UpdatePricingPayload
} from '../../api';
import { getApiErrorMessage } from '../../lib/errors/getApiErrorMessage';
import {
  addTierDraft,
  normalizeFixedAmountDraft,
  normalizeMinimumPriceDraft,
  normalizeTierMaxUnitsDraft,
  normalizeTierUnitPriceDraft,
  removeTierDraft,
  setFixedAmountDraft,
  setInternalNameDraft,
  setMinimumPriceDraft,
  setPricingTypeDraft,
  setProductIdDraft,
  updateTierMaxUnitsDraft,
  updateTierUnitPriceDraft
} from './pricingForm.state-actions';
import { buildPricingMutationPayload } from './pricingForm.submit';
import type {
  PricingFormState,
  FormValidationState,
  TierValidation
} from './pricingForm.utils';
import {
  buildSubscriptionSyncPlan,
  getSubscriptionConflictMessage,
  uniqueIds
} from './pricingForm.helpers';

type SetState<T> = Dispatch<SetStateAction<T>>;

type CreatePricingFormActionsInput = {
  formValidation: FormValidationState;
  tierValidation: TierValidation;
  selectedSubscriptionConflictIds: string[];
  subscriptionById: Map<string, { accountName: string }>;
  formState: PricingFormState;
  isEdit: boolean;
  initialPricing: PricingItem | null;
  subscriptionIds: string[];
  initialSubscriptionIds: string[];
  setFormState: SetState<PricingFormState>;
  setSubscriptionIds: SetState<string[]>;
  setInitialSubscriptionIds: SetState<string[]>;
  setShowValidation: SetState<boolean>;
  setFormError: SetState<string | null>;
  createPricing: (payload: CreatePricingPayload) => Promise<PricingItem>;
  updatePricing: (input: { pricingId: string; payload: UpdatePricingPayload }) => Promise<PricingItem>;
  mutateBulkSubscriptions: (payload: {
    action: Extract<SubscriptionBulkPayload['action'], 'ADD_PRICING' | 'DELETE_PRICING'>;
    subscriptionIds: string[];
    pricingIds: string[];
  }) => Promise<unknown>;
  scrollToFirstValidationError: () => void;
  onSaved?: (pricing: PricingItem) => void;
  onClose: () => void;
};

export function createPricingFormActions(input: CreatePricingFormActionsInput) {
  const {
    formValidation,
    tierValidation,
    selectedSubscriptionConflictIds,
    subscriptionById,
    formState,
    isEdit,
    initialPricing,
    subscriptionIds,
    initialSubscriptionIds,
    setFormState,
    setSubscriptionIds,
    setInitialSubscriptionIds,
    setShowValidation,
    setFormError,
    createPricing,
    updatePricing,
    mutateBulkSubscriptions,
    scrollToFirstValidationError,
    onSaved,
    onClose
  } = input;

  function addTier(): void {
    setFormState((prev) => addTierDraft(prev));
  }

  function removeTier(tierId: string): void {
    setFormState((prev) => removeTierDraft(prev, tierId));
  }

  function updateTierMaxUnits(tierId: string, value: string): void {
    setFormState((prev) => updateTierMaxUnitsDraft(prev, tierId, value));
  }

  function updateTierUnitPrice(tierId: string, value: string): void {
    setFormState((prev) => updateTierUnitPriceDraft(prev, tierId, value));
  }

  function normalizeTierUnitPriceOnBlur(tierId: string): void {
    setFormState((prev) => normalizeTierUnitPriceDraft(prev, tierId));
  }

  function normalizeTierMaxUnitsOnBlur(tierId: string): void {
    setFormState((prev) => normalizeTierMaxUnitsDraft(prev, tierId));
  }

  function normalizeFixedAmountOnBlur(): void {
    setFormState((prev) => normalizeFixedAmountDraft(prev));
  }

  function normalizeMinimumPriceOnBlur(): void {
    setFormState((prev) => normalizeMinimumPriceDraft(prev));
  }

  async function syncPricingSubscriptions(
    pricingId: string,
    nextSubscriptionIds: string[]
  ): Promise<void> {
    const { nextIds, subscriptionIdsToAttach, subscriptionIdsToDetach } = buildSubscriptionSyncPlan(
      initialSubscriptionIds,
      nextSubscriptionIds
    );

    if (subscriptionIdsToAttach.length > 0) {
      await mutateBulkSubscriptions({
        action: 'ADD_PRICING',
        subscriptionIds: subscriptionIdsToAttach,
        pricingIds: [pricingId]
      });
    }

    if (subscriptionIdsToDetach.length > 0) {
      await mutateBulkSubscriptions({
        action: 'DELETE_PRICING',
        subscriptionIds: subscriptionIdsToDetach,
        pricingIds: [pricingId]
      });
    }

    setInitialSubscriptionIds(nextIds);
  }

  async function handleSubmit(): Promise<void> {
    setShowValidation(true);
    setFormError(null);

    if (formValidation.hasErrors) {
      setFormError('Fix highlighted fields before saving.');
      scrollToFirstValidationError();
      return;
    }

    if (selectedSubscriptionConflictIds.length > 0) {
      setFormError(
        getSubscriptionConflictMessage(selectedSubscriptionConflictIds, subscriptionById)
      );
      return;
    }

    const payload = buildPricingMutationPayload(formState, tierValidation);

    try {
      const savedPricing =
        isEdit && initialPricing
          ? await updatePricing({
              pricingId: initialPricing.id,
              payload
            })
          : await createPricing({
              productId: formState.productId,
              ...payload
            });

      await syncPricingSubscriptions(savedPricing.id, subscriptionIds);
      onSaved?.(savedPricing);
      onClose();
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    }
  }

  function setPricingType(type: PricingType): void {
    setFormState((prev) => setPricingTypeDraft(prev, type));
  }

  function setInternalName(value: string): void {
    setFormState((prev) => setInternalNameDraft(prev, value));
  }

  function setProductId(value: string): void {
    setFormState((prev) => setProductIdDraft(prev, value));
  }

  function setFixedAmount(value: string): void {
    setFormState((prev) => setFixedAmountDraft(prev, value));
  }

  function setMinimumPrice(value: string): void {
    setFormState((prev) => setMinimumPriceDraft(prev, value));
  }

  function updateSubscriptionIds(nextSubscriptionIds: string[]): void {
    setSubscriptionIds(uniqueIds(nextSubscriptionIds));
  }

  function appendSubscriptionId(
    subscriptionId: string,
    options?: { alreadyLinked?: boolean }
  ): void {
    setSubscriptionIds((prev) => uniqueIds([...prev, subscriptionId]));

    if (options?.alreadyLinked) {
      setInitialSubscriptionIds((prev) => uniqueIds([...prev, subscriptionId]));
    }
  }

  return {
    handleSubmit,
    setPricingType,
    setInternalName,
    setProductId,
    setFixedAmount,
    setMinimumPrice,
    setSubscriptionIds: updateSubscriptionIds,
    appendSubscriptionId,
    onAddTier: addTier,
    onRemoveTier: removeTier,
    onUpdateTierMaxUnits: updateTierMaxUnits,
    onNormalizeTierMaxUnitsOnBlur: normalizeTierMaxUnitsOnBlur,
    onUpdateTierUnitPrice: updateTierUnitPrice,
    onNormalizeTierUnitPriceOnBlur: normalizeTierUnitPriceOnBlur,
    onNormalizeFixedAmountOnBlur: normalizeFixedAmountOnBlur,
    onNormalizeMinimumPriceOnBlur: normalizeMinimumPriceOnBlur
  };
}
