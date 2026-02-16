import { useEffect, useMemo, useState } from 'react';
import {
  useAccountsQuery,
  useCreateSubscriptionMutation,
  usePaymentMethodsQuery,
  usePricingsQuery,
  usePropertiesQuery,
  useSubscriptionAvailabilityPreviewQuery,
  useSubscriptionTransferEligibilityQuery,
  useUpdateSubscriptionMutation,
  type BillingScope,
  type SubscriptionItem,
  type SubscriptionStatus
} from '../../api';
import { getApiErrorMessage } from '../../lib/errors/getApiErrorMessage';
import {
  buildFormStateFromSubscription,
  buildInitialSubscriptionFormState,
  getSubscriptionFormValidationState,
  type SubscriptionFormState
} from './subscriptionForm.utils';

type UseSubscriptionFormControllerInput = {
  open: boolean;
  mode: 'create' | 'edit';
  initialSubscription: SubscriptionItem | null;
  defaultAccountId?: string;
  defaultPricingIds?: string[];
  defaultScope?: BillingScope;
  onSaved?: (subscription: SubscriptionItem) => void;
  onClose: () => void;
};

type AutoPruneNotice = {
  removedPricingIds: string[];
  removedPropertyIds: string[];
};

export function useSubscriptionFormController(input: UseSubscriptionFormControllerInput) {
  const {
    open,
    mode,
    initialSubscription,
    defaultAccountId,
    defaultPricingIds,
    defaultScope,
    onSaved,
    onClose
  } = input;

  const [formState, setFormState] = useState<SubscriptionFormState>(() =>
    buildInitialSubscriptionFormState(defaultAccountId, defaultPricingIds, defaultScope)
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [autoPruneNotice, setAutoPruneNotice] = useState<AutoPruneNotice | null>(null);

  const isEdit = mode === 'edit';
  const accountsQuery = useAccountsQuery({ page: 1, pageSize: 100 });
  const accounts = useMemo(() => accountsQuery.data?.items ?? [], [accountsQuery.data?.items]);
  const propertiesQuery = usePropertiesQuery(
    { accountId: formState.accountId, page: 1, pageSize: 200 },
    { enabled: Boolean(formState.accountId) }
  );
  const paymentMethodsQuery = usePaymentMethodsQuery(
    { accountId: formState.accountId },
    { enabled: Boolean(formState.accountId) }
  );
  const pricingsQuery = usePricingsQuery({ page: 1, pageSize: 100 });
  const properties = useMemo(() => propertiesQuery.data?.items ?? [], [propertiesQuery.data?.items]);
  const pricings = useMemo(() => pricingsQuery.data?.items ?? [], [pricingsQuery.data?.items]);
  const createMutation = useCreateSubscriptionMutation();
  const updateMutation = useUpdateSubscriptionMutation();
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const transferEligibilityPayload = useMemo(
    () => ({
      accountIds: accounts.map((account) => account.id),
      scope: formState.scope,
      // Property selection is reset after transfer, so eligibility is evaluated on account-level constraints.
      propertyIds: formState.scope === 'PROPERTY' ? [] : undefined,
      startDate: formState.startDate,
      endDate: formState.endDate !== '' ? formState.endDate : null,
      status: formState.status,
      pricingIds: formState.pricingIds
    }),
    [
      accounts,
      formState.scope,
      formState.startDate,
      formState.endDate,
      formState.status,
      formState.pricingIds
    ]
  );
  const transferEligibilityQuery = useSubscriptionTransferEligibilityQuery(
    initialSubscription?.id ?? '',
    transferEligibilityPayload,
    {
      enabled:
        open &&
        isEdit &&
        Boolean(initialSubscription) &&
        accounts.length > 0 &&
        formState.startDate !== '' &&
        formState.pricingIds.length > 0
    }
  );
  const availabilityPayload = useMemo(
    () => ({
      accountId: formState.accountId,
      scope: formState.scope,
      propertyIds: formState.scope === 'PROPERTY' ? formState.propertyIds : undefined,
      pricingIds: formState.pricingIds,
      propertyOptionIds: properties.map((property) => property.id),
      pricingOptionIds: pricings.map((pricing) => pricing.id),
      startDate: formState.startDate,
      endDate: formState.endDate !== '' ? formState.endDate : null,
      status: formState.status,
      excludeSubscriptionId: isEdit && initialSubscription ? initialSubscription.id : undefined
    }),
    [
      formState.accountId,
      formState.scope,
      formState.propertyIds,
      formState.pricingIds,
      formState.startDate,
      formState.endDate,
      formState.status,
      properties,
      pricings,
      isEdit,
      initialSubscription
    ]
  );
  const availabilityQuery = useSubscriptionAvailabilityPreviewQuery(availabilityPayload, {
    enabled: open && formState.accountId !== '' && formState.startDate !== ''
  });

  const validation = useMemo(() => getSubscriptionFormValidationState(formState), [formState]);
  const pricingAvailabilityById = useMemo(() => {
    if (!availabilityQuery.data) {
      return {};
    }

    return Object.fromEntries(
      availabilityQuery.data.pricingAvailability.map((item) => [item.id, item])
    );
  }, [availabilityQuery.data]);
  const propertyAvailabilityById = useMemo(() => {
    if (!availabilityQuery.data) {
      return {};
    }

    return Object.fromEntries(
      availabilityQuery.data.propertyAvailability.map((item) => [item.id, item])
    );
  }, [availabilityQuery.data]);
  const invalidSelectedPricingIds = useMemo(
    () => availabilityQuery.data?.invalidSelectedPricingIds ?? [],
    [availabilityQuery.data?.invalidSelectedPricingIds]
  );
  const invalidSelectedPropertyIds = useMemo(
    () => availabilityQuery.data?.invalidSelectedPropertyIds ?? [],
    [availabilityQuery.data?.invalidSelectedPropertyIds]
  );
  const uiInvalidSelectedPricingIds = availabilityQuery.isFetching ? [] : invalidSelectedPricingIds;
  const uiInvalidSelectedPropertyIds = availabilityQuery.isFetching ? [] : invalidSelectedPropertyIds;
  const hasAvailabilityConflicts =
    uiInvalidSelectedPricingIds.length > 0 || uiInvalidSelectedPropertyIds.length > 0;
  const availabilityConflictMessage = useMemo(() => {
    if (availabilityQuery.isFetching) {
      return null;
    }

    if (invalidSelectedPricingIds.length > 0) {
      const firstPricingId = invalidSelectedPricingIds[0];
      const reason = pricingAvailabilityById[firstPricingId]?.reason;
      if (reason) {
        return reason;
      }
    }

    if (invalidSelectedPropertyIds.length > 0) {
      const firstPropertyId = invalidSelectedPropertyIds[0];
      const reason = propertyAvailabilityById[firstPropertyId]?.reason;
      if (reason) {
        return reason;
      }
    }

    return null;
  }, [
    availabilityQuery.isFetching,
    invalidSelectedPricingIds,
    invalidSelectedPropertyIds,
    pricingAvailabilityById,
    propertyAvailabilityById
  ]);
  const selectableAccounts = useMemo(() => {
    if (!isEdit) {
      return accounts;
    }

    const items = transferEligibilityQuery.data?.items;
    if (!items) {
      return accounts;
    }

    const eligibleAccountIds = new Set(
      items.filter((item) => item.eligible).map((item) => item.accountId)
    );
    return accounts.filter((account) => eligibleAccountIds.has(account.id));
  }, [accounts, isEdit, transferEligibilityQuery.data?.items]);

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
  }, [defaultAccountId, defaultPricingIds, defaultScope, initialSubscription, open]);

  useEffect(() => {
    if (!open || !isEdit || !transferEligibilityQuery.data) {
      return;
    }

    setFormState((prev) => {
      if (prev.accountId === '') {
        return prev;
      }

      const isSelectedAccountAvailable = selectableAccounts.some(
        (account) => account.id === prev.accountId
      );
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
  }, [isEdit, open, selectableAccounts, transferEligibilityQuery.data]);

  useEffect(() => {
    if (!open || !availabilityQuery.data) {
      return;
    }

    const { invalidSelectedPricingIds: invalidPricingIds, invalidSelectedPropertyIds: invalidPropertyIds } =
      availabilityQuery.data;

    if (invalidPricingIds.length === 0 && invalidPropertyIds.length === 0) {
      return;
    }

    const invalidPricingIdSet = new Set(invalidPricingIds);
    const invalidPropertyIdSet = new Set(invalidPropertyIds);
    let pruneNotice: AutoPruneNotice | null = null;

    setFormState((prev) => {
      const removedPricingIds = prev.pricingIds.filter((pricingId) => invalidPricingIdSet.has(pricingId));
      const removedPropertyIds = prev.propertyIds.filter((propertyId) => invalidPropertyIdSet.has(propertyId));

      if (removedPricingIds.length === 0 && removedPropertyIds.length === 0) {
        return prev;
      }

      pruneNotice = {
        removedPricingIds,
        removedPropertyIds
      };

      return {
        ...prev,
        pricingIds: prev.pricingIds.filter((pricingId) => !invalidPricingIdSet.has(pricingId)),
        propertyIds: prev.propertyIds.filter((propertyId) => !invalidPropertyIdSet.has(propertyId))
      };
    });

    if (pruneNotice) {
      setAutoPruneNotice(pruneNotice);
      setShowValidation(false);
    }
  }, [
    open,
    availabilityQuery.data,
    availabilityQuery.dataUpdatedAt
  ]);

  async function handleSubmit(): Promise<void> {
    setShowValidation(true);
    setFormError(null);

    if (validation.hasErrors) {
      setFormError('Fix highlighted fields before saving.');
      return;
    }

    const availabilityResult = await availabilityQuery.refetch();
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
      let savedSubscription: SubscriptionItem | null = null;

      if (isEdit && initialSubscription) {
        const response = await updateMutation.mutateAsync({
          subscriptionId: initialSubscription.id,
          payload: {
            accountId: formState.accountId,
            scope: formState.scope,
            propertyIds: normalizedPropertyIds,
            startDate: formState.startDate,
            endDate: formState.endDate !== '' ? formState.endDate : null,
            status: formState.status,
            paymentMethodId: formState.paymentMethodId || null,
            pricingIds: formState.pricingIds
          }
        });
        savedSubscription = response.item;
      } else {
        const response = await createMutation.mutateAsync({
          accountId: formState.accountId,
          scope: formState.scope,
          propertyIds: normalizedPropertyIds,
          startDate: formState.startDate,
          endDate: formState.endDate !== '' ? formState.endDate : null,
          status: formState.status,
          paymentMethodId: formState.paymentMethodId || null,
          pricingIds: formState.pricingIds
        });
        savedSubscription = response.item;
      }

      if (savedSubscription) {
        onSaved?.(savedSubscription);
      }
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
    title: isEdit ? 'Edit Subscription' : 'Create Subscription',
    isEdit,
    isSaving,
    showValidation,
    isCreateActive: formState.status === 'ACTIVE',
    validation,
    formState,
    formError,
    availabilityConflictMessage,
    availabilityLoading: availabilityQuery.isFetching,
    hasAvailabilityConflicts,
    autoPruneNotice,
    accounts: selectableAccounts,
    accountsLoading: accountsQuery.isPending || transferEligibilityQuery.isPending,
    properties,
    propertiesLoading: propertiesQuery.isPending,
    paymentMethods: paymentMethodsQuery.data?.items ?? [],
    paymentMethodsLoading: paymentMethodsQuery.isPending,
    pricings,
    pricingAvailabilityById,
    propertyAvailabilityById,
    invalidSelectedPricingIds: uiInvalidSelectedPricingIds,
    invalidSelectedPropertyIds: uiInvalidSelectedPropertyIds,
    actions: {
      onClose,
      onSubmit: handleSubmit,
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
    }
  };
}

function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter((id) => id.trim() !== '')));
}

function getAvailabilityConflictMessage(data: {
  invalidSelectedPricingIds: string[];
  invalidSelectedPropertyIds: string[];
  pricingAvailability: Array<{ id: string; reason: string | null }>;
  propertyAvailability: Array<{ id: string; reason: string | null }>;
}): string | null {
  const pricingReasonById = Object.fromEntries(
    data.pricingAvailability.map((item) => [item.id, item.reason])
  );
  const propertyReasonById = Object.fromEntries(
    data.propertyAvailability.map((item) => [item.id, item.reason])
  );

  if (data.invalidSelectedPricingIds.length > 0) {
    const reason = pricingReasonById[data.invalidSelectedPricingIds[0]];
    if (reason) {
      return reason;
    }
  }

  if (data.invalidSelectedPropertyIds.length > 0) {
    const reason = propertyReasonById[data.invalidSelectedPropertyIds[0]];
    if (reason) {
      return reason;
    }
  }

  return null;
}
