import CloseIcon from '@mui/icons-material/Close';
import { Alert, Box, Divider, Drawer, Stack, Typography } from '@mui/material';
import type { BillingScope, SubscriptionItem } from '../../api';
import { AppIconButton, PrimaryButton, SecondaryButton } from '../../components/buttons';
import {
  SubscriptionFormAccountSection,
  SubscriptionFormDatesStatusSection,
  SubscriptionFormPaymentMethodSection,
  SubscriptionFormPricingsSection,
  SubscriptionFormPropertySection,
  SubscriptionFormScopeSection
} from './components/SubscriptionFormSections';
import { useSubscriptionFormController } from './subscriptionForm.hooks';

type SubscriptionFormDrawerProps = {
  open: boolean;
  mode: 'create' | 'edit';
  initialSubscription: SubscriptionItem | null;
  defaultAccountId?: string;
  defaultPricingIds?: string[];
  defaultScope?: BillingScope;
  onClose: () => void;
};

export function SubscriptionFormDrawer(props: SubscriptionFormDrawerProps): JSX.Element {
  const controller = useSubscriptionFormController(props);

  return (
    <Drawer
      anchor="right"
      open={props.open}
      onClose={controller.actions.onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 540 }
        }
      }}
    >
      <Stack sx={{ height: '100%' }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ p: 2 }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {controller.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure account/property scope, dates, payment method and pricing set.
            </Typography>
          </Box>
          <AppIconButton tone="plain" onClick={controller.actions.onClose} aria-label="Close drawer">
            <CloseIcon />
          </AppIconButton>
        </Stack>

        <Divider />

        <Stack spacing={2} sx={{ p: 2, overflowY: 'auto' }}>
          {controller.formError ? <Alert severity="error">{controller.formError}</Alert> : null}

          <SubscriptionFormAccountSection
            value={controller.formState.accountId}
            isEdit={controller.isEdit}
            loading={controller.accountsLoading}
            accounts={controller.accounts}
            onChange={controller.actions.setAccountId}
          />

          <SubscriptionFormScopeSection
            value={controller.formState.scope}
            onChange={controller.actions.setScope}
          />

          <SubscriptionFormPropertySection
            scope={controller.formState.scope}
            accountId={controller.formState.accountId}
            value={controller.formState.propertyId}
            properties={controller.properties}
            selectedProperty={controller.selectedProperty}
            loading={controller.propertiesLoading}
            onChange={controller.actions.setPropertyId}
          />

          <SubscriptionFormDatesStatusSection
            startDate={controller.formState.startDate}
            status={controller.formState.status}
            hasEndDate={controller.formState.hasEndDate}
            endDate={controller.formState.endDate}
            onStartDateChange={controller.actions.setStartDate}
            onStatusChange={controller.actions.setStatus}
            onHasEndDateChange={controller.actions.setHasEndDate}
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
            onChange={controller.actions.setPricingIds}
          />
        </Stack>

        <Divider />

        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ p: 2 }}>
          <SecondaryButton onClick={controller.actions.onClose} disabled={controller.isSaving}>
            Cancel
          </SecondaryButton>
          <PrimaryButton onClick={controller.actions.onSubmit} disabled={!controller.canSubmit || controller.isSaving}>
            {controller.isEdit ? 'Save changes' : 'Create subscription'}
          </PrimaryButton>
        </Stack>
      </Stack>
    </Drawer>
  );
}
