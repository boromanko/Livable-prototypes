import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { Alert, Button, Menu, MenuItem } from '@mui/material';
import { useState } from 'react';
import type { BillingScope, PricingItem, SubscriptionItem } from '../../api';
import { PrimaryButton, SecondaryButton } from '../../components/buttons';
import { AppFormDialog } from '../../components/layout';
import { PricingFormDrawer as NestedPricingFormDrawer } from '../pricings/PricingFormDrawer';
import {
  SubscriptionFormAccountSection,
  SubscriptionFormPricingsSection,
  SubscriptionFormPropertySection
} from './components/SubscriptionFormSections';
import { useSubscriptionFormController } from './subscriptionForm.hooks';
import { canManagePricings, useDemoRole } from '../../demoRole';
import {
  formatSubscriptionStatusLabel,
  getSubscriptionStatusButtonSx,
  subscriptionStatusOptions
} from '../../lib/subscriptions/status';

type SubscriptionFormDrawerProps = {
  open: boolean;
  mode: 'create' | 'edit';
  initialSubscription: SubscriptionItem | null;
  defaultAccountId?: string;
  defaultPricingIds?: string[];
  defaultScope?: BillingScope;
  onSaved?: (subscription: SubscriptionItem) => void;
  onClose: () => void;
};

export function SubscriptionFormDrawer(props: SubscriptionFormDrawerProps): JSX.Element {
  const controller = useSubscriptionFormController(props);
  const { role } = useDemoRole();
  const canEditPricings = canManagePricings(role);
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<HTMLElement | null>(null);
  const [nestedPricingModal, setNestedPricingModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    initialPricing: PricingItem | null;
  }>({
    open: false,
    mode: 'create',
    initialPricing: null
  });

  function openCreatePricing(): void {
    setNestedPricingModal({
      open: true,
      mode: 'create',
      initialPricing: null
    });
  }

  function openEditPricing(pricing: PricingItem): void {
    setNestedPricingModal({
      open: true,
      mode: 'edit',
      initialPricing: pricing
    });
  }

  function closeCreatePricing(): void {
    setNestedPricingModal((prev) => ({ ...prev, open: false }));
  }

  return (
    <>
      <AppFormDialog
        open={props.open}
        onClose={controller.actions.onClose}
        title={controller.title}
        headerActions={
          controller.isEdit ? (
            <Button
              type="button"
              onClick={(event) => {
                setStatusMenuAnchor(event.currentTarget);
              }}
              endIcon={<KeyboardArrowDownIcon />}
              sx={{
                ...getSubscriptionStatusButtonSx(controller.formState.status),
                textTransform: 'none',
                minHeight: 32,
                px: 1.25,
                py: 0.5,
                borderRadius: 0.5,
                fontWeight: 600,
                fontSize: 14,
                lineHeight: 1.1,
                '& .MuiButton-endIcon': {
                  ml: 0.5,
                  mr: -0.25
                }
              }}
            >
              {formatSubscriptionStatusLabel(controller.formState.status)}
            </Button>
          ) : null
        }
        footer={
          <>
            <SecondaryButton onClick={controller.actions.onClose} disabled={controller.isSaving}>
              Cancel
            </SecondaryButton>
            <PrimaryButton
              onClick={controller.actions.onSubmit}
              disabled={controller.isSaving || controller.availabilityLoading}
            >
              {controller.isEdit ? 'Save changes' : 'Create subscription'}
            </PrimaryButton>
          </>
        }
      >
        {controller.formError ? <Alert severity="error">{controller.formError}</Alert> : null}
        {controller.autoPruneNotice ? (
          <Alert
            severity="info"
            onClose={controller.actions.dismissAutoPruneNotice}
            action={
              <Button color="inherit" size="small" onClick={controller.actions.undoAutoPrune}>
                Undo
              </Button>
            }
          >
            {getAutoPruneMessage(
              controller.autoPruneNotice.removedPricingIds.length,
              controller.autoPruneNotice.removedPropertyIds.length
            )}
          </Alert>
        ) : null}
        {!controller.formError &&
        !controller.availabilityLoading &&
        !controller.autoPruneNotice &&
        controller.hasAvailabilityConflicts &&
        controller.availabilityConflictMessage ? (
          <Alert severity="error">{controller.availabilityConflictMessage}</Alert>
        ) : null}

        <SubscriptionFormAccountSection
          value={controller.formState.accountId}
          loading={controller.accountsLoading}
          error={controller.showValidation && controller.validation.accountError}
          accounts={controller.accounts}
          onChange={controller.actions.setAccountId}
        />

        <SubscriptionFormPropertySection
          isApplyAllPropertiesEnabled={controller.formState.scope === 'ACCOUNT'}
          accountId={controller.formState.accountId}
          value={controller.formState.propertyIds}
          properties={controller.properties}
          propertyAvailabilityById={controller.propertyAvailabilityById}
          invalidSelectedPropertyIds={controller.invalidSelectedPropertyIds}
          loading={controller.propertiesLoading}
          availabilityLoading={controller.availabilityLoading}
          error={
            !controller.availabilityLoading &&
            !controller.autoPruneNotice &&
            controller.showValidation &&
            controller.validation.propertyError
          }
          onToggleApplyAllProperties={controller.actions.setApplyAllProperties}
          onChange={controller.actions.setPropertyIds}
        />

        <SubscriptionFormPricingsSection
          value={controller.formState.pricingIds}
          pricings={controller.pricings}
          error={
            !controller.availabilityLoading &&
            !controller.autoPruneNotice &&
            controller.showValidation &&
            controller.validation.pricingsError
          }
          pricingAvailabilityById={controller.pricingAvailabilityById}
          invalidSelectedPricingIds={controller.invalidSelectedPricingIds}
          availabilityLoading={controller.availabilityLoading}
          onCreatePricing={canEditPricings ? openCreatePricing : undefined}
          onEditPricing={canEditPricings ? openEditPricing : undefined}
          onChange={controller.actions.setPricingIds}
        />
      </AppFormDialog>

      {canEditPricings ? (
        <NestedPricingFormDrawer
          open={nestedPricingModal.open}
          mode={nestedPricingModal.mode}
          initialPricing={nestedPricingModal.initialPricing}
          onSaved={(pricing) => {
            if (nestedPricingModal.mode === 'create') {
              controller.actions.appendPricingId(pricing.id);
            }
          }}
          onClose={closeCreatePricing}
        />
      ) : null}

      <Menu
        anchorEl={statusMenuAnchor}
        open={Boolean(statusMenuAnchor)}
        onClose={() => {
          setStatusMenuAnchor(null);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {subscriptionStatusOptions.map((status) => (
          <MenuItem
            key={status}
            selected={controller.formState.status === status}
            onClick={() => {
              controller.actions.setStatus(status);
              setStatusMenuAnchor(null);
            }}
          >
            {formatSubscriptionStatusLabel(status)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

function getAutoPruneMessage(removedPricingCount: number, removedPropertyCount: number): string {
  const parts: string[] = [];

  if (removedPricingCount > 0) {
    parts.push(
      `${removedPricingCount} incompatible pricing${removedPricingCount === 1 ? '' : 's'}`
    );
  }

  if (removedPropertyCount > 0) {
    parts.push(
      `${removedPropertyCount} incompatible propert${removedPropertyCount === 1 ? 'y' : 'ies'}`
    );
  }

  if (parts.length === 0) {
    return 'Selection was adjusted to keep only compatible items.';
  }

  return `Removed ${parts.join(' and ')} from selection to prevent conflicts.`;
}
