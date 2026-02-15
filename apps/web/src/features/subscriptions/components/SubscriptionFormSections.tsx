import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
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
  PropertyItem,
  SubscriptionStatus
} from '../../../api';
import { subscriptionScopeOptions, subscriptionStatusOptions } from '../subscriptionForm.utils';
import { getFormFieldSx, sectionTitle } from './SubscriptionFormSections.shared';

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
    <Stack spacing={2}>
      {sectionTitle('Account')}
      <TextField
        select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={isEdit || loading}
        helperText={isEdit ? 'Account is fixed for existing subscriptions.' : undefined}
        SelectProps={{
          displayEmpty: true,
          renderValue: (selected) => {
            if (typeof selected !== 'string' || selected === '') {
              return (
                <Box component="span" sx={{ color: '#4B617C' }}>
                  Select account
                </Box>
              );
            }

            const selectedAccount = accounts.find((account) => account.id === selected);
            if (!selectedAccount) {
              return selected;
            }

            return `${selectedAccount.companyName} (${selectedAccount.email}) - ${selectedAccount.totalBillableUnits} units`;
          }
        }}
        sx={getFormFieldSx()}
      >
        <MenuItem value="" disabled>
          Select account
        </MenuItem>
        {accounts.map((account) => (
          <MenuItem key={account.id} value={account.id}>
            {account.companyName} ({account.email}) - {account.totalBillableUnits} units
          </MenuItem>
        ))}
      </TextField>
    </Stack>
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
    <Stack spacing={2}>
      {sectionTitle('Scope')}
      <TextField
        select
        value={value}
        onChange={(event) => onChange(event.target.value as BillingScope)}
        sx={getFormFieldSx()}
      >
        {subscriptionScopeOptions.map((scope) => (
          <MenuItem key={scope} value={scope}>
            {scope}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}

type SubscriptionFormPropertySectionProps = {
  scope: BillingScope;
  accountId: string;
  value: string[];
  properties: PropertyItem[];
  selectedProperties: PropertyItem[];
  loading: boolean;
  onChange: (propertyIds: string[]) => void;
};

export function SubscriptionFormPropertySection(
  props: SubscriptionFormPropertySectionProps
): JSX.Element {
  const { scope, accountId, value, properties, selectedProperties, loading, onChange } = props;
  const selectedUnits = selectedProperties.reduce(
    (total, property) => total + property.billableUnits,
    0
  );
  const selectedSummary =
    selectedProperties.length > 0
      ? `${selectedProperties.length} selected (${selectedUnits} units total).`
      : null;
  const helperText =
    scope === 'PROPERTY'
      ? selectedSummary
        ? `Required for property-level subscriptions. ${selectedSummary}`
        : 'Required for property-level subscriptions. Select one or more properties.'
      : 'Not used for account-level subscriptions.';

  return (
    <Stack spacing={2}>
      {sectionTitle('Properties')}
      <FormControl sx={getFormFieldSx()}>
        <Select
          multiple
          displayEmpty
          value={value}
          onChange={(event) => onChange(event.target.value as string[])}
          input={<OutlinedInput />}
          disabled={scope !== 'PROPERTY' || !accountId || loading}
          renderValue={(selected) => {
            const ids = selected as string[];
            if (ids.length === 0) {
              return (
                <Box component="span" sx={{ color: '#4B617C' }}>
                  Select one or more properties
                </Box>
              );
            }

            return ids
              .map((id) => properties.find((property) => property.id === id)?.address ?? id)
              .join(', ');
          }}
        >
          {properties.map((property) => (
            <MenuItem key={property.id} value={property.id}>
              <Checkbox checked={value.includes(property.id)} />
              {property.address} - {property.billableUnits} units
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography variant="caption" sx={{ color: '#6F8298', lineHeight: 1.4 }}>
        {helperText}
      </Typography>
    </Stack>
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
    <Stack spacing={2}>
      {sectionTitle('Dates & status')}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          type="date"
          value={startDate}
          onChange={(event) => onStartDateChange(event.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ flex: 1, ...getFormFieldSx() }}
        />
        <TextField
          select
          value={status}
          onChange={(event) => onStatusChange(event.target.value as SubscriptionStatus)}
          sx={{ flex: 1, ...getFormFieldSx() }}
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
        sx={{ m: 0 }}
      />

      <TextField
        type="date"
        value={endDate}
        onChange={(event) => onEndDateChange(event.target.value)}
        disabled={!hasEndDate}
        InputLabelProps={{ shrink: true }}
        sx={getFormFieldSx()}
      />
    </Stack>
  );
}

export {
  SubscriptionFormPaymentMethodSection,
  SubscriptionFormPricingsSection
} from './SubscriptionFormSections.payment-pricings';
