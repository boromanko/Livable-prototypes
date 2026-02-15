import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useCreatePricingMutation,
  usePricingsQuery,
  useProductsQuery,
  useUpdatePricingMutation,
  type PricingItem,
  type PricingType
} from '../../api';
import { getApiErrorMessage } from '../../lib/errors/getApiErrorMessage';
import {
  buildDefaultPricingName,
  buildInitialState,
  getFormValidationState,
  getTierStartUnits,
  validateTiers,
  type PricingFormState
} from './pricingForm.utils';
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
import { scrollToFirstPricingValidationError } from './pricingForm.scroll';

type UsePricingFormControllerInput = {
  open: boolean;
  mode: 'create' | 'edit';
  initialPricing: PricingItem | null;
  defaultProductId?: string;
  onSaved?: (pricing: PricingItem) => void;
  onClose: () => void;
};

export function usePricingFormController(input: UsePricingFormControllerInput) {
  const { open, mode, initialPricing, defaultProductId, onSaved, onClose } = input;

  const [formState, setFormState] = useState<PricingFormState>(() =>
    buildInitialState(null, 'Price 1')
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  const productsQuery = useProductsQuery();
  const pricingsQuery = usePricingsQuery({
    page: 1,
    pageSize: 100
  });
  const createMutation = useCreatePricingMutation();
  const updateMutation = useUpdatePricingMutation();
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isEdit = mode === 'edit';

  const internalNameFieldRef = useRef<HTMLDivElement>(null);
  const productFieldRef = useRef<HTMLDivElement>(null);
  const fixedAmountFieldRef = useRef<HTMLDivElement>(null);
  const tierSectionRef = useRef<HTMLDivElement>(null);
  const minimumPriceFieldRef = useRef<HTMLDivElement>(null);
  const validationRefs = {
    internalNameFieldRef,
    productFieldRef,
    fixedAmountFieldRef,
    tierSectionRef,
    minimumPriceFieldRef
  };

  const tierValidation = useMemo(() => validateTiers(formState.tiers), [formState.tiers]);
  const tierStartUnits = useMemo(() => getTierStartUnits(formState.tiers), [formState.tiers]);
  const defaultPricingName = useMemo(
    () => buildDefaultPricingName(pricingsQuery.data?.items),
    [pricingsQuery.data?.items]
  );
  const formValidation = useMemo(
    () => getFormValidationState(formState, tierValidation),
    [formState, tierValidation]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormState(buildInitialState(initialPricing, defaultPricingName, defaultProductId));
    setFormError(null);
    setShowValidation(false);
  }, [defaultPricingName, defaultProductId, initialPricing, open]);

  useEffect(() => {
    if (!open || isEdit) {
      return;
    }

    setFormState((prev) => {
      const currentName = prev.internalName.trim();
      const isAutoName = /^Price\s+\d+$/i.test(currentName);

      if (currentName !== '' && !isAutoName) {
        return prev;
      }

      return {
        ...prev,
        internalName: defaultPricingName
      };
    });
  }, [defaultPricingName, isEdit, open]);

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

  async function handleSubmit(): Promise<void> {
    setShowValidation(true);
    setFormError(null);

    if (formValidation.hasErrors) {
      setFormError('Fix highlighted fields before saving.');
      scrollToFirstPricingValidationError(formValidation, validationRefs);
      return;
    }

    const payload = buildPricingMutationPayload(formState, tierValidation);

    try {
      let savedPricing: PricingItem | null = null;
      if (isEdit && initialPricing) {
        const response = await updateMutation.mutateAsync({
          pricingId: initialPricing.id,
          payload
        });
        savedPricing = response.item;
      } else {
        const response = await createMutation.mutateAsync({
          productId: formState.productId,
          ...payload
        });
        savedPricing = response.item;
      }

      if (savedPricing) {
        onSaved?.(savedPricing);
      }
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

  const hasTierErrors = formValidation.tiersError;
  const pricingNameError = showValidation && formValidation.internalNameError;
  const productError = showValidation && formValidation.productError;
  const fixedAmountError = showValidation && formValidation.fixedAmountError;
  const minimumPriceError = showValidation && formValidation.minimumPriceError;

  return {
    title: isEdit ? 'Edit pricing' : 'Add pricing',
    isEdit,
    isSaving,
    formState,
    formError,
    showValidation,
    productItems: productsQuery.data?.items ?? [],
    productsLoading: productsQuery.isPending,
    refs: validationRefs,
    validation: {
      pricingNameError,
      productError,
      fixedAmountError,
      minimumPriceError,
      hasTierErrors,
      tierValidation,
      tierStartUnits
    },
    actions: {
      onClose,
      onSubmit: handleSubmit,
      setInternalName,
      setProductId,
      setPricingType,
      setFixedAmount,
      setMinimumPrice,
      onAddTier: addTier,
      onRemoveTier: removeTier,
      onUpdateTierMaxUnits: updateTierMaxUnits,
      onNormalizeTierMaxUnitsOnBlur: normalizeTierMaxUnitsOnBlur,
      onUpdateTierUnitPrice: updateTierUnitPrice,
      onNormalizeTierUnitPriceOnBlur: normalizeTierUnitPriceOnBlur,
      onNormalizeFixedAmountOnBlur: normalizeFixedAmountOnBlur,
      onNormalizeMinimumPriceOnBlur: normalizeMinimumPriceOnBlur
    }
  };
}
