import { useEffect, useMemo, useState } from 'react';
import {
  useAccountsQuery,
  useCreateSubscriptionMutation,
  usePaymentMethodsQuery,
  usePricingsQuery,
  usePropertiesQuery,
  useUpdateSubscriptionMutation,
  type BillingScope,
  type SubscriptionItem,
  type SubscriptionStatus
} from '../../api';
import { getApiErrorMessage } from '../../lib/errors/getApiErrorMessage';
import {
  buildFormStateFromSubscription,
  buildInitialSubscriptionFormState,
  canSubmitSubscriptionForm,
  type SubscriptionFormState
} from './subscriptionForm.utils';

type UseSubscriptionFormControllerInput = {
  open: boolean;
  mode: 'create' | 'edit';
  initialSubscription: SubscriptionItem | null;
  defaultAccountId?: string;
  defaultPricingIds?: string[];
  defaultScope?: BillingScope;
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
    onClose
  } = input;

  const [formState, setFormState] = useState<SubscriptionFormState>(() =>
    buildInitialSubscriptionFormState(defaultAccountId, defaultPricingIds, defaultScope)
  );
  const [formError, setFormError] = useState<string | null>(null);

  const isEdit = mode === 'edit';
  const accountsQuery = useAccountsQuery({ page: 1, pageSize: 100 });
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

  const canSubmit = useMemo(() => canSubmitSubscriptionForm(formState), [formState]);

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
  }, [defaultAccountId, defaultPricingIds, defaultScope, initialSubscription, open]);

  async function handleSubmit(): Promise<void> {
    setFormError(null);

    try {
      const normalizedPropertyIds =
        formState.scope === 'PROPERTY' ? uniqueIds(formState.propertyIds) : [];

      if (isEdit && initialSubscription) {
        await updateMutation.mutateAsync({
          subscriptionId: initialSubscription.id,
          payload: {
            scope: formState.scope,
            propertyIds: normalizedPropertyIds,
            startDate: formState.startDate,
            endDate: formState.hasEndDate ? formState.endDate : null,
            status: formState.status,
            paymentMethodId: formState.paymentMethodId || null,
            pricingIds: formState.pricingIds
          }
        });
      } else {
        await createMutation.mutateAsync({
          accountId: formState.accountId,
          scope: formState.scope,
          propertyIds: normalizedPropertyIds,
          startDate: formState.startDate,
          endDate: formState.hasEndDate ? formState.endDate : null,
          status: formState.status,
          paymentMethodId: formState.paymentMethodId || null,
          pricingIds: formState.pricingIds
        });
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

  function setHasEndDate(hasEndDate: boolean): void {
    setFormState((prev) => ({
      ...prev,
      hasEndDate,
      endDate: hasEndDate ? prev.endDate : ''
    }));
  }

  function setEndDate(endDate: string): void {
    setFormState((prev) => ({
      ...prev,
      endDate
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

  return {
    title: isEdit ? 'Edit Subscription' : 'Create Subscription',
    isEdit,
    isSaving,
    canSubmit,
    formState,
    formError,
    accounts: accountsQuery.data?.items ?? [],
    accountsLoading: accountsQuery.isPending,
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
      setHasEndDate,
      setEndDate,
      setPaymentMethodId,
      setPricingIds
    }
  };
}

function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter((id) => id.trim() !== '')));
}
