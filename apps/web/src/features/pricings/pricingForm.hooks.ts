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
  defaultTier,
  formatUsdInputOnBlur,
  getFormValidationState,
  getMinAllowedMaxUnits,
  getTierStartUnits,
  parsePositiveInteger,
  parseUsdToCents,
  sanitizeIntegerInput,
  sanitizeMoneyInput,
  validateTiers,
  type PricingFormState
} from './pricingForm.utils';

type UsePricingFormControllerInput = {
  open: boolean;
  mode: 'create' | 'edit';
  initialPricing: PricingItem | null;
  defaultProductId?: string;
  onClose: () => void;
};

export function usePricingFormController(input: UsePricingFormControllerInput) {
  const { open, mode, initialPricing, defaultProductId, onClose } = input;

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
    setFormState((prev) => ({
      ...prev,
      tiers: [...prev.tiers, defaultTier(crypto.randomUUID())]
    }));
  }

  function removeTier(tierId: string): void {
    setFormState((prev) => ({
      ...prev,
      tiers: (() => {
        const nextTiers = prev.tiers.filter((tier) => tier.id !== tierId);
        if (nextTiers.length === 0) {
          return [defaultTier(crypto.randomUUID())];
        }

        const lastTier = nextTiers[nextTiers.length - 1];
        if (parsePositiveInteger(lastTier.maxUnits) !== null) {
          return [...nextTiers, defaultTier(crypto.randomUUID())];
        }

        return nextTiers;
      })()
    }));
  }

  function updateTierMaxUnits(tierId: string, value: string): void {
    const sanitizedValue = sanitizeIntegerInput(value);

    setFormState((prev) => {
      const tierIndex = prev.tiers.findIndex((tier) => tier.id === tierId);
      if (tierIndex === -1) {
        return prev;
      }

      const isEditingLastTier = tierIndex === prev.tiers.length - 1;
      const nextTiers = prev.tiers.map((tier) =>
        tier.id === tierId ? { ...tier, maxUnits: sanitizedValue } : tier
      );

      if (isEditingLastTier && parsePositiveInteger(sanitizedValue) !== null) {
        nextTiers.push(defaultTier(crypto.randomUUID()));
      }

      return {
        ...prev,
        tiers: nextTiers
      };
    });
  }

  function updateTierUnitPrice(tierId: string, value: string): void {
    setFormState((prev) => ({
      ...prev,
      tiers: prev.tiers.map((tier) =>
        tier.id === tierId ? { ...tier, unitAmountUsd: sanitizeMoneyInput(value) } : tier
      )
    }));
  }

  function normalizeTierUnitPriceOnBlur(tierId: string): void {
    setFormState((prev) => ({
      ...prev,
      tiers: prev.tiers.map((tier) =>
        tier.id === tierId
          ? { ...tier, unitAmountUsd: formatUsdInputOnBlur(tier.unitAmountUsd) }
          : tier
      )
    }));
  }

  function normalizeTierMaxUnitsOnBlur(tierId: string): void {
    setFormState((prev) => {
      const tierIndex = prev.tiers.findIndex((tier) => tier.id === tierId);
      if (tierIndex === -1) {
        return prev;
      }

      const currentValue = prev.tiers[tierIndex]?.maxUnits ?? '';
      const parsedCurrent = parsePositiveInteger(currentValue);
      if (parsedCurrent === null) {
        return prev;
      }

      const minAllowed = getMinAllowedMaxUnits(prev.tiers, tierIndex);
      if (parsedCurrent >= minAllowed) {
        return prev;
      }

      const nextTiers = prev.tiers.map((tier, index) =>
        index === tierIndex ? { ...tier, maxUnits: String(minAllowed) } : tier
      );

      return {
        ...prev,
        tiers: nextTiers
      };
    });
  }

  function normalizeFixedAmountOnBlur(): void {
    setFormState((prev) => ({
      ...prev,
      fixedAmountUsd: formatUsdInputOnBlur(prev.fixedAmountUsd)
    }));
  }

  function normalizeMinimumPriceOnBlur(): void {
    setFormState((prev) => ({
      ...prev,
      minimumPriceUsd: formatUsdInputOnBlur(prev.minimumPriceUsd)
    }));
  }

  function scrollToFirstValidationError(): void {
    const scrollOptions: ScrollIntoViewOptions = { behavior: 'smooth', block: 'center' };

    if (formValidation.internalNameError) {
      internalNameFieldRef.current?.scrollIntoView(scrollOptions);
      return;
    }

    if (formValidation.productError) {
      productFieldRef.current?.scrollIntoView(scrollOptions);
      return;
    }

    if (formValidation.fixedAmountError) {
      fixedAmountFieldRef.current?.scrollIntoView(scrollOptions);
      return;
    }

    if (formValidation.tiersError) {
      tierSectionRef.current?.scrollIntoView(scrollOptions);
      return;
    }

    if (formValidation.minimumPriceError) {
      minimumPriceFieldRef.current?.scrollIntoView(scrollOptions);
    }
  }

  async function handleSubmit(): Promise<void> {
    setShowValidation(true);
    setFormError(null);

    if (formValidation.hasErrors) {
      setFormError('Fix highlighted fields before saving.');
      scrollToFirstValidationError();
      return;
    }

    const minimumPriceCents =
      formState.type === 'TIERED' ? parseUsdToCents(formState.minimumPriceUsd) : null;
    const fixedAmountCents = parseUsdToCents(formState.fixedAmountUsd);

    try {
      if (isEdit && initialPricing) {
        await updateMutation.mutateAsync({
          pricingId: initialPricing.id,
          payload: {
            internalName: formState.internalName.trim(),
            type: formState.type,
            fixedAmountCents:
              formState.type === 'FIXED' ? (fixedAmountCents ?? undefined) : null,
            minimumPriceCents:
              formState.type === 'TIERED' && formState.minimumPriceUsd.trim() !== ''
                ? minimumPriceCents
                : null,
            tiers: formState.type === 'TIERED' ? tierValidation.payload : []
          }
        });
      } else {
        await createMutation.mutateAsync({
          productId: formState.productId,
          internalName: formState.internalName.trim(),
          type: formState.type,
          fixedAmountCents:
            formState.type === 'FIXED' ? (fixedAmountCents ?? undefined) : null,
          minimumPriceCents:
            formState.type === 'TIERED' && formState.minimumPriceUsd.trim() !== ''
              ? minimumPriceCents
              : null,
          tiers: formState.type === 'TIERED' ? tierValidation.payload : []
        });
      }

      onClose();
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    }
  }

  function setPricingType(type: PricingType): void {
    setFormState((prev) => ({ ...prev, type }));
  }

  function setInternalName(value: string): void {
    setFormState((prev) => ({
      ...prev,
      internalName: value
    }));
  }

  function setProductId(value: string): void {
    setFormState((prev) => ({
      ...prev,
      productId: value
    }));
  }

  function setFixedAmount(value: string): void {
    setFormState((prev) => ({
      ...prev,
      fixedAmountUsd: sanitizeMoneyInput(value)
    }));
  }

  function setMinimumPrice(value: string): void {
    setFormState((prev) => ({
      ...prev,
      minimumPriceUsd: sanitizeMoneyInput(value)
    }));
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
    refs: {
      internalNameFieldRef,
      productFieldRef,
      fixedAmountFieldRef,
      tierSectionRef,
      minimumPriceFieldRef
    },
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
