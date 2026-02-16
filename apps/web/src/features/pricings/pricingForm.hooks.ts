import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useBulkSubscriptionsMutation,
  useCreatePricingMutation,
  usePricingsQuery,
  useProductsQuery,
  useSubscriptionsQuery,
  useUpdatePricingMutation,
  type PricingItem,
  type PricingTreeSubscriptionSummary
} from '../../api';
import {
  buildDefaultPricingName,
  buildInitialState,
  getFormValidationState,
  getTierStartUnits,
  validateTiers,
  type PricingFormState
} from './pricingForm.utils';
import { scrollToFirstPricingValidationError } from './pricingForm.scroll';
import type { PricingFormSubscriptionOption } from './components/PricingFormSections';
import {
  buildSubscriptionOptions,
  getBlockedSubscriptionIds,
  uniqueIds
} from './pricingForm.helpers';
import { createPricingFormActions } from './pricingForm.actions';

type UsePricingFormControllerInput = {
  open: boolean;
  mode: 'create' | 'edit';
  initialPricing: PricingItem | null;
  defaultProductId?: string;
  defaultSubscriptionIds?: string[];
  defaultSubscriptions?: PricingTreeSubscriptionSummary[];
  onSaved?: (pricing: PricingItem) => void;
  onClose: () => void;
};

export function usePricingFormController(input: UsePricingFormControllerInput) {
  const {
    open,
    mode,
    initialPricing,
    defaultProductId,
    defaultSubscriptionIds,
    defaultSubscriptions,
    onSaved,
    onClose
  } = input;

  const [formState, setFormState] = useState<PricingFormState>(() =>
    buildInitialState(null, 'Price 1')
  );
  const [subscriptionIds, setSubscriptionIds] = useState<string[]>([]);
  const [initialSubscriptionIds, setInitialSubscriptionIds] = useState<string[]>([]);
  const [subscriptionsInitialized, setSubscriptionsInitialized] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  const productsQuery = useProductsQuery();
  const pricingsQuery = usePricingsQuery({ page: 1, pageSize: 100 });
  const createMutation = useCreatePricingMutation();
  const updateMutation = useUpdatePricingMutation();
  const subscriptionsQuery = useSubscriptionsQuery({ page: 1, pageSize: 100 });
  const bulkSubscriptionsMutation = useBulkSubscriptionsMutation();

  const isSaving =
    createMutation.isPending || updateMutation.isPending || bulkSubscriptionsMutation.isPending;
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

  const subscriptions = useMemo(
    () => subscriptionsQuery.data?.items ?? [],
    [subscriptionsQuery.data?.items]
  );
  const subscriptionOptions = useMemo<PricingFormSubscriptionOption[]>(() => {
    return buildSubscriptionOptions(subscriptions, defaultSubscriptions);
  }, [defaultSubscriptions, subscriptions]);

  const subscriptionById = useMemo(
    () => new Map(subscriptionOptions.map((subscription) => [subscription.id, subscription])),
    [subscriptionOptions]
  );

  const blockedSubscriptionIds = useMemo(() => {
    return getBlockedSubscriptionIds(formState.productId, initialPricing?.id ?? null, subscriptions);
  }, [formState.productId, initialPricing?.id, subscriptions]);

  const blockedSubscriptionIdSet = useMemo(
    () => new Set(blockedSubscriptionIds),
    [blockedSubscriptionIds]
  );

  const selectedSubscriptionConflictIds = useMemo(
    () => subscriptionIds.filter((id) => blockedSubscriptionIdSet.has(id)),
    [blockedSubscriptionIdSet, subscriptionIds]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const seedSubscriptionIds = uniqueIds(defaultSubscriptionIds ?? []);
    const hasSeedSubscriptionIds = defaultSubscriptionIds !== undefined;

    setFormState(buildInitialState(initialPricing, defaultPricingName, defaultProductId));
    setSubscriptionIds(seedSubscriptionIds);
    setInitialSubscriptionIds(seedSubscriptionIds);
    setSubscriptionsInitialized(!isEdit || hasSeedSubscriptionIds);
    setFormError(null);
    setShowValidation(false);
  }, [
    defaultPricingName,
    defaultProductId,
    defaultSubscriptionIds,
    initialPricing,
    isEdit,
    open
  ]);

  useEffect(() => {
    if (!open || !isEdit || !initialPricing || subscriptionsInitialized) {
      return;
    }

    const items = subscriptionsQuery.data?.items;
    if (!items) {
      return;
    }

    const linkedSubscriptionIds = items
      .filter((subscription) =>
        subscription.pricings.some((pricing) => pricing.id === initialPricing.id)
      )
      .map((subscription) => subscription.id);

    setSubscriptionIds(linkedSubscriptionIds);
    setInitialSubscriptionIds(linkedSubscriptionIds);
    setSubscriptionsInitialized(true);
  }, [
    initialPricing,
    isEdit,
    open,
    subscriptionsInitialized,
    subscriptionsQuery.data?.items
  ]);

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

  const actions = createPricingFormActions({
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
    createPricing: async (payload) => {
      const response = await createMutation.mutateAsync(payload);
      return response.item;
    },
    updatePricing: async (payload) => {
      const response = await updateMutation.mutateAsync(payload);
      return response.item;
    },
    mutateBulkSubscriptions: bulkSubscriptionsMutation.mutateAsync,
    scrollToFirstValidationError: () =>
      scrollToFirstPricingValidationError(formValidation, validationRefs),
    onSaved,
    onClose
  });

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
    pricingId: initialPricing?.id ?? null,
    subscriptionIds,
    blockedSubscriptionIds,
    selectedSubscriptionConflictIds,
    formError,
    showValidation,
    productItems: productsQuery.data?.items ?? [],
    productsLoading: productsQuery.isPending,
    subscriptions: subscriptionOptions,
    subscriptionsLoading: subscriptionsQuery.isPending,
    subscriptionsError: subscriptionsQuery.isError,
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
      onSubmit: actions.handleSubmit,
      setInternalName: actions.setInternalName,
      setProductId: actions.setProductId,
      setPricingType: actions.setPricingType,
      setFixedAmount: actions.setFixedAmount,
      setMinimumPrice: actions.setMinimumPrice,
      setSubscriptionIds: actions.setSubscriptionIds,
      appendSubscriptionId: actions.appendSubscriptionId,
      onAddTier: actions.onAddTier,
      onRemoveTier: actions.onRemoveTier,
      onUpdateTierMaxUnits: actions.onUpdateTierMaxUnits,
      onNormalizeTierMaxUnitsOnBlur: actions.onNormalizeTierMaxUnitsOnBlur,
      onUpdateTierUnitPrice: actions.onUpdateTierUnitPrice,
      onNormalizeTierUnitPriceOnBlur: actions.onNormalizeTierUnitPriceOnBlur,
      onNormalizeFixedAmountOnBlur: actions.onNormalizeFixedAmountOnBlur,
      onNormalizeMinimumPriceOnBlur: actions.onNormalizeMinimumPriceOnBlur
    }
  };
}
