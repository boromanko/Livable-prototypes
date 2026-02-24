import { Alert } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { Suspense, lazy, useState } from 'react';
import {
  api,
  queryKeys,
  type PricingItem,
  type PricingTreeSubscriptionSummary,
  type SubscriptionItem
} from '../../api';
import { PrimaryButton, SecondaryButton } from '../../components/buttons';
import { AppFormDialog } from '../../components/layout';
import { canManagePricings, useDemoRole } from '../../demoRole';
import {
  PricingFormFixedPriceSection,
  PricingFormMinimumPriceSection,
  PricingFormNameSection,
  PricingFormProductSection,
  PricingFormSubscriptionsSection,
  PricingFormTieredSection,
  PricingFormTypeSection
} from './components/PricingFormSections';
import { usePricingFormController } from './pricingForm.hooks';

type PricingFormDrawerProps = {
  open: boolean;
  mode: 'create' | 'edit';
  initialPricing: PricingItem | null;
  defaultProductId?: string;
  defaultSubscriptionIds?: string[];
  defaultSubscriptions?: PricingTreeSubscriptionSummary[];
  onSaved?: (pricing: PricingItem) => void;
  onClose: () => void;
};

const NestedSubscriptionFormDrawer = lazy(async () => {
  const module = await import('../subscriptions/SubscriptionFormDrawer');
  return { default: module.SubscriptionFormDrawer };
});

export function PricingFormDrawer(props: PricingFormDrawerProps): JSX.Element {
  const controller = usePricingFormController(props);
  const { role } = useDemoRole();
  const canEditPricingDetails = canManagePricings(role);
  const isSubscriptionsOnlyEdit = controller.isEdit && !canEditPricingDetails;
  const queryClient = useQueryClient();
  const [nestedSubscriptionModal, setNestedSubscriptionModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    initialSubscription: SubscriptionItem | null;
  }>({
    open: false,
    mode: 'create',
    initialSubscription: null
  });

  function openCreateSubscription(): void {
    if (!controller.isEdit || !controller.pricingId) {
      return;
    }

    setNestedSubscriptionModal({
      open: true,
      mode: 'create',
      initialSubscription: null
    });
  }

  function openEditSubscription(subscriptionId: string): void {
    void queryClient
      .fetchQuery({
        queryKey: queryKeys.admin.subscription(subscriptionId),
        queryFn: () => api.getSubscription(subscriptionId)
      })
      .then((response) => {
        setNestedSubscriptionModal({
          open: true,
          mode: 'edit',
          initialSubscription: response.item
        });
      })
      .catch(() => undefined);
  }

  function closeNestedSubscription(): void {
    setNestedSubscriptionModal((prev) => ({ ...prev, open: false }));
  }

  return (
    <>
      <AppFormDialog
        open={props.open}
        onClose={controller.actions.onClose}
        title={controller.title}
        footer={
          <>
            <SecondaryButton onClick={controller.actions.onClose} disabled={controller.isSaving}>
              Cancel
            </SecondaryButton>
            <PrimaryButton onClick={controller.actions.onSubmit} disabled={controller.isSaving}>
              Save pricing
            </PrimaryButton>
          </>
        }
      >
        {controller.formError ? <Alert severity="error">{controller.formError}</Alert> : null}

        <PricingFormNameSection
          fieldRef={controller.refs.internalNameFieldRef}
          value={controller.formState.internalName}
          error={controller.validation.pricingNameError}
          disabled={isSubscriptionsOnlyEdit}
          onChange={controller.actions.setInternalName}
        />

        <PricingFormProductSection
          fieldRef={controller.refs.productFieldRef}
          value={controller.formState.productId}
          pricingType={controller.formState.type}
          productItems={controller.productItems}
          productsLoading={controller.productsLoading}
          productsCreating={controller.productsCreating}
          error={controller.validation.productError}
          disabled={isSubscriptionsOnlyEdit}
          onCreateProduct={controller.actions.createProduct}
          onChange={controller.actions.setProductId}
        />

        <PricingFormTypeSection
          value={controller.formState.type}
          disabled={isSubscriptionsOnlyEdit}
          onChange={controller.actions.setPricingType}
        />

        {controller.formState.type === 'FIXED' ? (
          <PricingFormFixedPriceSection
            fieldRef={controller.refs.fixedAmountFieldRef}
            value={controller.formState.fixedAmountUsd}
            error={controller.validation.fixedAmountError}
            disabled={isSubscriptionsOnlyEdit}
            onChange={controller.actions.setFixedAmount}
            onBlur={controller.actions.onNormalizeFixedAmountOnBlur}
          />
        ) : (
          <PricingFormTieredSection
            fieldRef={controller.refs.tierSectionRef}
            tiers={controller.formState.tiers}
            tierStartUnits={controller.validation.tierStartUnits}
            tierValidationErrors={controller.validation.tierValidation.errors}
            showValidation={controller.showValidation}
            hasTierErrors={controller.validation.hasTierErrors}
            disabled={isSubscriptionsOnlyEdit}
            onAddTier={controller.actions.onAddTier}
            onRemoveTier={controller.actions.onRemoveTier}
            onUpdateTierMaxUnits={controller.actions.onUpdateTierMaxUnits}
            onNormalizeTierMaxUnitsOnBlur={controller.actions.onNormalizeTierMaxUnitsOnBlur}
            onUpdateTierUnitPrice={controller.actions.onUpdateTierUnitPrice}
            onNormalizeTierUnitPriceOnBlur={controller.actions.onNormalizeTierUnitPriceOnBlur}
          />
        )}

        {controller.formState.type === 'TIERED' ? (
          <PricingFormMinimumPriceSection
            fieldRef={controller.refs.minimumPriceFieldRef}
            value={controller.formState.minimumPriceUsd}
            error={controller.validation.minimumPriceError}
            disabled={isSubscriptionsOnlyEdit}
            onChange={controller.actions.setMinimumPrice}
            onBlur={controller.actions.onNormalizeMinimumPriceOnBlur}
          />
        ) : null}

        <PricingFormSubscriptionsSection
          value={controller.subscriptionIds}
          subscriptions={controller.subscriptions}
          loading={controller.subscriptionsLoading}
          hasLoadingError={controller.subscriptionsError}
          blockedSubscriptionIds={controller.blockedSubscriptionIds}
          selectedSubscriptionConflictIds={controller.selectedSubscriptionConflictIds}
          canCreateSubscription={controller.isEdit && Boolean(controller.pricingId)}
          onCreateSubscription={openCreateSubscription}
          onEditSubscription={openEditSubscription}
          onChange={controller.actions.setSubscriptionIds}
        />
      </AppFormDialog>

      {nestedSubscriptionModal.open ? (
        <Suspense fallback={null}>
          <NestedSubscriptionFormDrawer
            open={nestedSubscriptionModal.open}
            mode={nestedSubscriptionModal.mode}
            initialSubscription={nestedSubscriptionModal.initialSubscription}
            defaultPricingIds={
              nestedSubscriptionModal.mode === 'create' && controller.pricingId
                ? [controller.pricingId]
                : undefined
            }
            onSaved={(subscription) => {
              if (nestedSubscriptionModal.mode === 'create' && controller.pricingId) {
                controller.actions.appendSubscriptionId(subscription.id, {
                  alreadyLinked: subscription.pricings.some(
                    (pricing) => pricing.id === controller.pricingId
                  )
                });
                return;
              }

              if (nestedSubscriptionModal.mode === 'edit' && controller.pricingId) {
                const hasCurrentPricing = subscription.pricings.some(
                  (pricing) => pricing.id === controller.pricingId
                );

                if (hasCurrentPricing) {
                  controller.actions.appendSubscriptionId(subscription.id, {
                    alreadyLinked: true
                  });
                } else {
                  controller.actions.setSubscriptionIds(
                    controller.subscriptionIds.filter((id) => id !== subscription.id)
                  );
                }
              }
            }}
            onClose={closeNestedSubscription}
          />
        </Suspense>
      ) : null}
    </>
  );
}
