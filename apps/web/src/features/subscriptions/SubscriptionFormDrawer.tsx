import CloseIcon from '@mui/icons-material/Close';
import { Alert, Dialog, Stack, Typography } from '@mui/material';
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
            value={controller.formState.propertyIds}
            properties={controller.properties}
            selectedProperties={controller.selectedProperties}
            loading={controller.propertiesLoading}
            onChange={controller.actions.setPropertyIds}
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
            disabled={!controller.canSubmit || controller.isSaving}
          >
            {controller.isEdit ? 'Save changes' : 'Create subscription'}
          </PrimaryButton>
        </Stack>
      </Stack>
    </Dialog>
  );
}
