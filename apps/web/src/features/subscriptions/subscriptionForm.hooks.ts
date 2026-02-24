import { useMemo, useState } from 'react';
import {
  useAccountsQuery,
  useCreateSubscriptionMutation,
  usePricingsQuery,
  usePropertiesQuery,
  useSubscriptionAvailabilityPreviewQuery,
  useSubscriptionTransferEligibilityQuery,
  useUpdateSubscriptionMutation,
  type BillingScope,
  type SubscriptionItem
} from '../../api';
import {
  buildAvailabilityPayload,
  buildTransferEligibilityPayload,
  getAvailabilityConflictMessage,
  mapItemsById,
  type AutoPruneNotice
} from './subscriptionForm.helpers';
import { createSubscriptionFormActions } from './subscriptionForm.actions';
import { useSubscriptionFormEffects } from './subscriptionForm.effects';
import {
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
  const pricingsQuery = usePricingsQuery({ page: 1, pageSize: 100 });

  const properties = useMemo(() => propertiesQuery.data?.items ?? [], [propertiesQuery.data?.items]);
  const pricings = useMemo(() => pricingsQuery.data?.items ?? [], [pricingsQuery.data?.items]);

  const createMutation = useCreateSubscriptionMutation();
  const updateMutation = useUpdateSubscriptionMutation();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const transferEligibilityPayload = useMemo(
    () =>
      buildTransferEligibilityPayload({
        accountIds: accounts.map((account) => account.id),
        formState
      }),
    [accounts, formState]
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
    () =>
      buildAvailabilityPayload({
        formState,
        propertyOptionIds: properties.map((property) => property.id),
        pricingOptionIds: pricings.map((pricing) => pricing.id),
        isEdit,
        initialSubscriptionId: initialSubscription?.id
      }),
    [formState, properties, pricings, isEdit, initialSubscription]
  );

  const availabilityQuery = useSubscriptionAvailabilityPreviewQuery(availabilityPayload, {
    enabled: open && formState.accountId !== '' && formState.startDate !== ''
  });

  const validation = useMemo(() => getSubscriptionFormValidationState(formState), [formState]);
  const pricingAvailabilityById = useMemo(
    () => mapItemsById(availabilityQuery.data?.pricingAvailability),
    [availabilityQuery.data]
  );
  const propertyAvailabilityById = useMemo(
    () => mapItemsById(availabilityQuery.data?.propertyAvailability),
    [availabilityQuery.data]
  );

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
    if (availabilityQuery.isFetching || !availabilityQuery.data) {
      return null;
    }

    return getAvailabilityConflictMessage(availabilityQuery.data);
  }, [availabilityQuery.data, availabilityQuery.isFetching]);

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

  useSubscriptionFormEffects({
    open,
    isEdit,
    initialSubscription,
    defaultAccountId,
    defaultPricingIds,
    defaultScope,
    selectableAccountIds: selectableAccounts.map((account) => account.id),
    transferEligibilityItems: transferEligibilityQuery.data?.items,
    availabilityData: availabilityQuery.data,
    availabilityDataUpdatedAt: availabilityQuery.dataUpdatedAt,
    setFormState,
    setFormError,
    setShowValidation,
    setAutoPruneNotice
  });

  const actions = createSubscriptionFormActions({
    validation,
    formState,
    isEdit,
    initialSubscription,
    autoPruneNotice,
    setShowValidation,
    setFormError,
    setFormState,
    setAutoPruneNotice,
    refetchAvailability: async () => {
      const result = await availabilityQuery.refetch();
      return {
        data: result.data,
        error: result.error
      };
    },
    createSubscription: async (payload) => {
      const response = await createMutation.mutateAsync(payload);
      return response.item;
    },
    updateSubscription: async ({ subscriptionId, payload }) => {
      const response = await updateMutation.mutateAsync({ subscriptionId, payload });
      return response.item;
    },
    onSaved,
    onClose
  });

  return {
    title: isEdit ? 'Edit Subscription' : 'Create Subscription',
    isEdit,
    isSaving,
    showValidation,
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
    pricings,
    pricingAvailabilityById,
    propertyAvailabilityById,
    invalidSelectedPricingIds: uiInvalidSelectedPricingIds,
    invalidSelectedPropertyIds: uiInvalidSelectedPropertyIds,
    actions: {
      onClose,
      onSubmit: actions.handleSubmit,
      setAccountId: actions.setAccountId,
      setApplyAllProperties: actions.setApplyAllProperties,
      setPropertyIds: actions.setPropertyIds,
      setStatus: actions.setStatus,
      setPricingIds: actions.setPricingIds,
      appendPricingId: actions.appendPricingId,
      dismissAutoPruneNotice: actions.dismissAutoPruneNotice,
      undoAutoPrune: actions.undoAutoPrune
    }
  };
}
