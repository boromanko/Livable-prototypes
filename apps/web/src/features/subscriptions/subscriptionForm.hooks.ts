import { useEffect, useMemo, useState } from 'react';
import {
  useAccountsQuery,
  useCreateSubscriptionMutation,
  usePaymentMethodsQuery,
  usePricingsQuery,
  usePropertiesQuery,
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

  const validation = useMemo(() => getSubscriptionFormValidationState(formState), [formState]);
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

  async function handleSubmit(): Promise<void> {
    setShowValidation(true);
    setFormError(null);

    if (validation.hasErrors) {
      setFormError('Fix highlighted fields before saving.');
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
    setFormState((prev) => ({
      ...prev,
      accountId,
      propertyIds: [],
      paymentMethodId: ''
    }));
  }

  function setApplyAllProperties(enabled: boolean): void {
    setFormState((prev) => ({
      ...prev,
      scope: enabled ? 'ACCOUNT' : 'PROPERTY'
    }));
  }

  function setPropertyIds(propertyIds: string[]): void {
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
    setFormState((prev) => ({
      ...prev,
      pricingIds
    }));
  }

  function appendPricingId(pricingId: string): void {
    setFormState((prev) => ({
      ...prev,
      pricingIds: uniqueIds([...prev.pricingIds, pricingId])
    }));
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
    accounts: selectableAccounts,
    accountsLoading: accountsQuery.isPending || transferEligibilityQuery.isPending,
    properties: propertiesQuery.data?.items ?? [],
    propertiesLoading: propertiesQuery.isPending,
    paymentMethods: paymentMethodsQuery.data?.items ?? [],
    paymentMethodsLoading: paymentMethodsQuery.isPending,
    pricings: pricingsQuery.data?.items ?? [],
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
      appendPricingId
    }
  };
}

function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter((id) => id.trim() !== '')));
}
