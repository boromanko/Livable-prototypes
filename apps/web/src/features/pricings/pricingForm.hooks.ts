import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useBulkSubscriptionsMutation,
  useCreatePricingMutation,
  usePricingsQuery,
  useProductsQuery,
  useSubscriptionsQuery,
  useUpdatePricingMutation,
  type PricingItem,
  type PricingTreeSubscriptionSummary,
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
import type { PricingFormSubscriptionOption } from './components/PricingFormSections';

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
  const pricingsQuery = usePricingsQuery({
    page: 1,
    pageSize: 100
  });
  const createMutation = useCreatePricingMutation();
  const updateMutation = useUpdatePricingMutation();
  const subscriptionsQuery = useSubscriptionsQuery({
    page: 1,
    pageSize: 100
  });
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
    const byId = new Map<string, PricingFormSubscriptionOption>();

    for (const subscription of subscriptions) {
      byId.set(subscription.id, {
        id: subscription.id,
        accountName: subscription.account.companyName,
        scope: subscription.scope,
        status: subscription.status,
        propertiesLabel:
          subscription.scope === 'ACCOUNT'
            ? 'All properties'
            : formatPropertiesCount(subscription.properties.length)
      });
    }

    for (const subscription of defaultSubscriptions ?? []) {
      if (byId.has(subscription.id)) {
        continue;
      }

      byId.set(subscription.id, {
        id: subscription.id,
        accountName: subscription.account.companyName,
        scope: subscription.scope,
        status: subscription.status,
        propertiesLabel: subscription.coverageLabel
      });
    }

    return Array.from(byId.values());
  }, [defaultSubscriptions, subscriptions]);
  const subscriptionById = useMemo(
    () => new Map(subscriptionOptions.map((subscription) => [subscription.id, subscription])),
    [subscriptionOptions]
  );
  const blockedSubscriptionIds = useMemo(() => {
    if (formState.productId.trim() === '') {
      return [];
    }

    return subscriptions
      .filter((subscription) =>
        subscription.pricings.some(
          (pricing) =>
            pricing.product.id === formState.productId &&
            pricing.id !== (initialPricing?.id ?? '')
        )
      )
      .map((subscription) => subscription.id);
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
    const nextIds = uniqueIds(nextSubscriptionIds);
    const nextIdSet = new Set(nextIds);
    const previousIds = uniqueIds(initialSubscriptionIds);
    const previousIdSet = new Set(previousIds);
    const subscriptionIdsToAttach = nextIds.filter((subscriptionId) => !previousIdSet.has(subscriptionId));
    const subscriptionIdsToDetach = previousIds.filter((subscriptionId) => !nextIdSet.has(subscriptionId));

    if (subscriptionIdsToAttach.length > 0) {
      await bulkSubscriptionsMutation.mutateAsync({
        action: 'ADD_PRICING',
        subscriptionIds: subscriptionIdsToAttach,
        pricingIds: [pricingId]
      });
    }

    if (subscriptionIdsToDetach.length > 0) {
      await bulkSubscriptionsMutation.mutateAsync({
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
      scrollToFirstPricingValidationError(formValidation, validationRefs);
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
        await syncPricingSubscriptions(savedPricing.id, subscriptionIds);
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
      onSubmit: handleSubmit,
      setInternalName,
      setProductId,
      setPricingType,
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
    }
  };
}

function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter((id) => id.trim() !== '')));
}

function getSubscriptionConflictMessage(
  subscriptionIds: string[],
  subscriptionById: Map<string, { accountName: string }>
): string {
  const labels = subscriptionIds
    .map((id) => subscriptionById.get(id)?.accountName ?? id)
    .slice(0, 3);
  const suffix = subscriptionIds.length > labels.length ? ', ...' : '';

  return `Selected subscriptions already have a pricing for this product: ${labels.join(', ')}${suffix}. Remove conflicting subscriptions before saving.`;
}

function formatPropertiesCount(count: number): string {
  return count === 1 ? '1 property' : `${count} properties`;
}
