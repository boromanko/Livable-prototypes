import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { Alert, Button, Dialog, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import type { BillingScope, PricingItem, SubscriptionItem, SubscriptionStatus } from '../../api';
import { AppIconButton, PrimaryButton, SecondaryButton } from '../../components/buttons';
import { PricingFormDrawer as NestedPricingFormDrawer } from '../pricings/PricingFormDrawer';
import {
  SubscriptionFormAccountSection,
  SubscriptionFormCreateStatusSection,
  SubscriptionFormDatesSection,
  SubscriptionFormPaymentMethodSection,
  SubscriptionFormPricingsSection,
  SubscriptionFormPropertySection
} from './components/SubscriptionFormSections';
import { useSubscriptionFormController } from './subscriptionForm.hooks';

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
            <Stack direction="row" alignItems="center" spacing={1}>
              {controller.isEdit ? (
                <Button
                  type="button"
                  onClick={(event) => {
                    setStatusMenuAnchor(event.currentTarget);
                  }}
                  endIcon={<KeyboardArrowDownIcon />}
                  sx={{
                    ...getStatusButtonSx(controller.formState.status),
                    textTransform: 'none',
                    minHeight: 32,
                    px: 1.25,
                    py: 0.5,
                    borderRadius: '2px',
                    fontWeight: 600,
                    fontSize: 14,
                    lineHeight: 1.1,
                    '& .MuiButton-endIcon': {
                      ml: 0.5,
                      mr: -0.25
                    }
                  }}
                >
                  {formatStatusLabel(controller.formState.status)}
                </Button>
              ) : null}
              <AppIconButton tone="plain" onClick={controller.actions.onClose} aria-label="Close dialog">
                <CloseIcon sx={{ color: '#4B617C' }} />
              </AppIconButton>
            </Stack>
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

            <SubscriptionFormDatesSection
              startDate={controller.formState.startDate}
              endDate={controller.formState.endDate}
              startDateError={controller.showValidation && controller.validation.startDateError}
              onStartDateChange={controller.actions.setStartDate}
              onEndDateChange={controller.actions.setEndDate}
            />

            <SubscriptionFormPaymentMethodSection
              accountId={controller.formState.accountId}
              value={controller.formState.paymentMethodId}
              loading={controller.paymentMethodsLoading}
              methods={controller.paymentMethods}
              onChange={controller.actions.setPaymentMethodId}
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
              onCreatePricing={openCreatePricing}
              onEditPricing={openEditPricing}
              onChange={controller.actions.setPricingIds}
            />

            {!controller.isEdit ? (
              <SubscriptionFormCreateStatusSection
                checked={controller.isCreateActive}
                onChange={controller.actions.setCreateActive}
              />
            ) : null}
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
            <PrimaryButton
              onClick={controller.actions.onSubmit}
              disabled={controller.isSaving || controller.availabilityLoading}
            >
              {controller.isEdit ? 'Save changes' : 'Create subscription'}
            </PrimaryButton>
          </Stack>
        </Stack>
      </Dialog>

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

      <Menu
        anchorEl={statusMenuAnchor}
        open={Boolean(statusMenuAnchor)}
        onClose={() => {
          setStatusMenuAnchor(null);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {STATUS_OPTIONS.map((status) => (
          <MenuItem
            key={status}
            selected={controller.formState.status === status}
            onClick={() => {
              controller.actions.setStatus(status);
              setStatusMenuAnchor(null);
            }}
          >
            {formatStatusLabel(status)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

const STATUS_OPTIONS: SubscriptionStatus[] = ['DRAFT', 'ACTIVE', 'PAUSED', 'CANCELED'];

function formatStatusLabel(status: SubscriptionStatus): string {
  if (status === 'ACTIVE') {
    return 'Active';
  }

  if (status === 'DRAFT') {
    return 'Draft';
  }

  if (status === 'PAUSED') {
    return 'Paused';
  }

  return 'Canceled';
}

function getStatusButtonSx(
  status: SubscriptionStatus
): Record<string, unknown> {
  if (status === 'ACTIVE') {
    return {
      color: '#1F9D55',
      backgroundColor: '#E8F7EF',
      '&:hover': {
        backgroundColor: '#D8F0E2'
      }
    };
  }

  if (status === 'DRAFT') {
    return {
      color: '#2B6CB0',
      backgroundColor: '#E9F2FC',
      '&:hover': {
        backgroundColor: '#D9EAFB'
      }
    };
  }

  if (status === 'PAUSED') {
    return {
      color: '#B7791F',
      backgroundColor: '#FFF5E5',
      '&:hover': {
        backgroundColor: '#FDECCF'
      }
    };
  }

  return {
    color: '#4B617C',
    backgroundColor: '#EEF2F6',
    '&:hover': {
      backgroundColor: '#E2E8EF'
    }
  };
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
