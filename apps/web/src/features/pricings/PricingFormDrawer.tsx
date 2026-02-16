import CloseIcon from '@mui/icons-material/Close';
import { Alert, Dialog, Stack, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { Suspense, lazy, useState } from 'react';
import {
  api,
  queryKeys,
  type PricingItem,
  type PricingTreeSubscriptionSummary,
  type SubscriptionItem
} from '../../api';
import { AppIconButton, PrimaryButton, SecondaryButton } from '../../components/buttons';
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
      <Dialog
        open={props.open}
        onClose={controller.actions.onClose}
        fullWidth
        maxWidth={false}
        PaperProps={{
          sx: {
            width: { xs: 'calc(100vw - 16px)', sm: 760 },
            maxWidth: 760,
            height: 'min(920px, calc(100vh - 16px))',
            m: { xs: 1, sm: 2 },
            overflow: 'hidden',
            borderRadius: '2px',
            boxShadow: '0px 18px 32px rgba(0, 0, 0, 0.15)'
          }
        }}
      >
        <Stack sx={{ height: '100%' }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              px: { xs: 2.5, sm: 5 },
              py: 3.5,
              background: 'linear-gradient(180deg, #F8F9FA 0%, #FFFFFF 100%)',
              borderBottom: '1px solid #E1E7EC',
              flexShrink: 0
            }}
          >
            <Typography sx={{ color: '#212934', fontSize: 20, fontWeight: 600 }}>
              {controller.title}
            </Typography>
            <AppIconButton tone="plain" onClick={controller.actions.onClose} aria-label="Close dialog">
              <CloseIcon sx={{ color: '#4B617C' }} />
            </AppIconButton>
          </Stack>

          <Stack
            spacing={4}
            sx={{
              px: { xs: 2.5, sm: 4 },
              py: 4,
              flex: 1,
              overflowY: 'auto'
            }}
          >
            {controller.formError ? <Alert severity="error">{controller.formError}</Alert> : null}

            <PricingFormNameSection
              fieldRef={controller.refs.internalNameFieldRef}
              value={controller.formState.internalName}
              error={controller.validation.pricingNameError}
              onChange={controller.actions.setInternalName}
            />

            <PricingFormProductSection
              fieldRef={controller.refs.productFieldRef}
              value={controller.formState.productId}
              productItems={controller.productItems}
              productsLoading={controller.productsLoading}
              error={controller.validation.productError}
              onChange={controller.actions.setProductId}
            />

            <PricingFormTypeSection
              value={controller.formState.type}
              onChange={controller.actions.setPricingType}
            />

            {controller.formState.type === 'FIXED' ? (
              <PricingFormFixedPriceSection
                fieldRef={controller.refs.fixedAmountFieldRef}
                value={controller.formState.fixedAmountUsd}
                error={controller.validation.fixedAmountError}
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
          </Stack>

          <Stack
            direction="row"
            justifyContent="space-between"
            sx={{
              px: 3,
              py: 2,
              borderTop: '1px solid #E1E7EC',
              backgroundColor: '#FFFFFF',
              flexShrink: 0
            }}
          >
            <SecondaryButton onClick={controller.actions.onClose} disabled={controller.isSaving}>
              Cancel
            </SecondaryButton>
            <PrimaryButton onClick={controller.actions.onSubmit} disabled={controller.isSaving}>
              Save pricing
            </PrimaryButton>
          </Stack>
        </Stack>
      </Dialog>

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
