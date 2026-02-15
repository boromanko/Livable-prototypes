import {
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import type {
  AccountItem,
  BillingScope,
  PaymentMethodItem,
  PricingItem,
  PropertyItem,
  SubscriptionStatus
} from '../../../api';
import { subscriptionScopeOptions, subscriptionStatusOptions } from '../subscriptionForm.utils';

type SubscriptionFormAccountSectionProps = {
  value: string;
  isEdit: boolean;
  loading: boolean;
  accounts: AccountItem[];
  onChange: (accountId: string) => void;
};

export function SubscriptionFormAccountSection(
  props: SubscriptionFormAccountSectionProps
): JSX.Element {
  const { value, isEdit, loading, accounts, onChange } = props;

  return (
    <TextField
      select
      label="Account"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={isEdit || loading}
      helperText={isEdit ? 'Account is fixed for existing subscriptions.' : undefined}
    >
      {accounts.map((account) => (
        <MenuItem key={account.id} value={account.id}>
          {account.companyName} ({account.email}) - {account.totalBillableUnits} units
        </MenuItem>
      ))}
    </TextField>
  );
}

type SubscriptionFormScopeSectionProps = {
  value: BillingScope;
  onChange: (scope: BillingScope) => void;
};

export function SubscriptionFormScopeSection(
  props: SubscriptionFormScopeSectionProps
): JSX.Element {
  const { value, onChange } = props;

  return (
    <TextField
      select
      label="Scope"
      value={value}
      onChange={(event) => onChange(event.target.value as BillingScope)}
    >
      {subscriptionScopeOptions.map((scope) => (
        <MenuItem key={scope} value={scope}>
          {scope}
        </MenuItem>
      ))}
    </TextField>
  );
}

type SubscriptionFormPropertySectionProps = {
  scope: BillingScope;
  accountId: string;
  value: string;
  properties: PropertyItem[];
  selectedProperty: PropertyItem | null;
  loading: boolean;
  onChange: (propertyId: string) => void;
};

export function SubscriptionFormPropertySection(
  props: SubscriptionFormPropertySectionProps
): JSX.Element {
  const { scope, accountId, value, properties, selectedProperty, loading, onChange } = props;

  return (
    <TextField
      select
      label="Property"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={scope !== 'PROPERTY' || !accountId || loading}
      helperText={
        scope === 'PROPERTY'
          ? selectedProperty
            ? `Required for property-level subscriptions. Selected property has ${selectedProperty.billableUnits} units.`
            : 'Required for property-level subscriptions.'
          : 'Not used for account-level subscriptions.'
      }
    >
      {properties.map((property) => (
        <MenuItem key={property.id} value={property.id}>
          {property.address} - {property.billableUnits} units
        </MenuItem>
      ))}
    </TextField>
  );
}

type SubscriptionFormDatesStatusSectionProps = {
  startDate: string;
  status: SubscriptionStatus;
  hasEndDate: boolean;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onStatusChange: (status: SubscriptionStatus) => void;
  onHasEndDateChange: (checked: boolean) => void;
  onEndDateChange: (value: string) => void;
};

export function SubscriptionFormDatesStatusSection(
  props: SubscriptionFormDatesStatusSectionProps
): JSX.Element {
  const {
    startDate,
    status,
    hasEndDate,
    endDate,
    onStartDateChange,
    onStatusChange,
    onHasEndDateChange,
    onEndDateChange
  } = props;

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(event) => onStartDateChange(event.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ flex: 1 }}
        />
        <TextField
          select
          label="Status"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as SubscriptionStatus)}
          sx={{ flex: 1 }}
        >
          {subscriptionStatusOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <FormControlLabel
        control={
          <Checkbox checked={hasEndDate} onChange={(event) => onHasEndDateChange(event.target.checked)} />
        }
        label="Set end date (disable Forever mode)"
      />

      <TextField
        label="End Date"
        type="date"
        value={endDate}
        onChange={(event) => onEndDateChange(event.target.value)}
        disabled={!hasEndDate}
        InputLabelProps={{ shrink: true }}
      />
    </>
  );
}

type SubscriptionFormPaymentMethodSectionProps = {
  accountId: string;
  value: string;
  loading: boolean;
  methods: PaymentMethodItem[];
  onChange: (paymentMethodId: string) => void;
};

export function SubscriptionFormPaymentMethodSection(
  props: SubscriptionFormPaymentMethodSectionProps
): JSX.Element {
  const { accountId, value, loading, methods, onChange } = props;

  return (
    <TextField
      select
      label="Payment Method (Optional)"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={!accountId || loading}
    >
      <MenuItem value="">Use fallback/default behavior</MenuItem>
      {methods.map((method) => (
        <MenuItem key={method.id} value={method.id}>
          {method.label}
          {method.isDefault ? ' (default)' : ''}
        </MenuItem>
      ))}
    </TextField>
  );
}

type SubscriptionFormPricingsSectionProps = {
  value: string[];
  pricings: PricingItem[];
  onChange: (pricingIds: string[]) => void;
};

export function SubscriptionFormPricingsSection(
  props: SubscriptionFormPricingsSectionProps
): JSX.Element {
  const { value, pricings, onChange } = props;

  return (
    <FormControl>
      <InputLabel id="subscription-pricing-multi-label">Pricings</InputLabel>
      <Select
        labelId="subscription-pricing-multi-label"
        multiple
        value={value}
        onChange={(event) => onChange(event.target.value as string[])}
        input={<OutlinedInput label="Pricings" />}
        renderValue={(selected) => {
          const labels = (selected as string[])
            .map((id) => pricings.find((pricing) => pricing.id === id)?.internalName ?? id)
            .filter(Boolean);
          return labels.join(', ');
        }}
      >
        {pricings.map((pricing) => (
          <MenuItem key={pricing.id} value={pricing.id}>
            <Checkbox checked={value.includes(pricing.id)} />
            <Typography variant="body2">
              {pricing.internalName} ({pricing.type})
            </Typography>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
