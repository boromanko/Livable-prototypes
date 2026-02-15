import {
  Autocomplete,
  Box,
  Checkbox,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type {
  AccountItem,
  PropertyItem,
  SubscriptionStatus
} from '../../../api';
import { subscriptionStatusOptions } from '../subscriptionForm.utils';
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

type SubscriptionFormPropertySectionProps = {
  isApplyAllPropertiesEnabled: boolean;
  accountId: string;
  value: string[];
  properties: PropertyItem[];
  loading: boolean;
  onToggleApplyAllProperties: (checked: boolean) => void;
  onChange: (propertyIds: string[]) => void;
};

export function SubscriptionFormPropertySection(
  props: SubscriptionFormPropertySectionProps
): JSX.Element {
  const {
    isApplyAllPropertiesEnabled,
    accountId,
    value,
    properties,
    loading,
    onToggleApplyAllProperties,
    onChange
  } = props;
  const propertyById = new Map(properties.map((property) => [property.id, property]));
  const selectedProperties = value
    .map((propertyId) => propertyById.get(propertyId))
    .filter((property): property is PropertyItem => Boolean(property));
  const availableProperties = properties.filter((property) => !value.includes(property.id));
  const selectedUnits = selectedProperties.reduce(
    (total, property) => total + property.billableUnits,
    0
  );
  const selectedSummary =
    selectedProperties.length > 0
      ? `${selectedProperties.length} selected (${selectedUnits} units total).`
      : null;
  const helperText = !isApplyAllPropertiesEnabled ? selectedSummary : null;
  const isPickerDisabled = isApplyAllPropertiesEnabled || !accountId || loading;

  return (
    <Stack spacing={2}>
      <FormControlLabel
        control={
          <Checkbox
            checked={isApplyAllPropertiesEnabled}
            onChange={(event) => onToggleApplyAllProperties(event.target.checked)}
            disabled={!accountId}
          />
        }
        label="Apply for all properties (Account level subscription)"
        sx={{ m: 0 }}
      />

      {!isApplyAllPropertiesEnabled && helperText ? (
        <Typography variant="caption" sx={{ color: '#6F8298', lineHeight: 1.4 }}>
          {helperText}
        </Typography>
      ) : null}

      {!isApplyAllPropertiesEnabled ? (
        <Stack spacing={2}>
          {value.length > 0 ? (
            <Stack spacing={1}>
              {value.map((propertyId) => {
                const property = propertyById.get(propertyId);

                return (
                  <Stack
                    key={propertyId}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{
                      px: 1.5,
                      py: 1.25,
                      border: '1px solid #E1E7EC',
                      backgroundColor: '#F8F9FA',
                      borderRadius: '2px'
                    }}
                  >
                    <Stack spacing={0.25}>
                      <Typography variant="body2" sx={{ color: '#212934', fontWeight: 500 }}>
                        {property?.address ?? propertyId}
                      </Typography>
                      {property ? (
                        <Typography variant="caption" sx={{ color: '#6F8298' }}>
                          {property.billableUnits} units
                        </Typography>
                      ) : null}
                    </Stack>

                    <IconButton
                      size="small"
                      onClick={() => onChange(value.filter((id) => id !== propertyId))}
                      aria-label="Remove property"
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                );
              })}
            </Stack>
          ) : null}

          <Autocomplete<PropertyItem, true, true, false>
            multiple
            disableClearable
            options={availableProperties}
            value={selectedProperties}
            disabled={isPickerDisabled}
            onChange={(_event, selected) => onChange(selected.map((property) => property.id))}
            getOptionLabel={(option) => option.address}
            isOptionEqualToValue={(option, selected) => option.id === selected.id}
            noOptionsText={
              loading
                ? 'Loading properties...'
                : availableProperties.length === 0
                  ? 'No more properties to select'
                  : 'No properties found'
            }
            renderTags={() => null}
            renderOption={(optionProps, option) => (
              <li {...optionProps} key={option.id}>
                <Stack spacing={0.25} sx={{ py: 0.25 }}>
                  <Typography variant="body2">{option.address}</Typography>
                  <Typography variant="caption" sx={{ color: '#6F8298' }}>
                    {option.billableUnits} units
                  </Typography>
                </Stack>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Select properies"
                sx={getFormFieldSx()}
              />
            )}
          />

          {!loading && accountId && properties.length === 0 ? (
            <Typography variant="caption" sx={{ color: '#6F8298', lineHeight: 1.4 }}>
              No properties available for selected account.
            </Typography>
          ) : null}

          {helperText ? (
            <Typography variant="caption" sx={{ color: '#6F8298', lineHeight: 1.4 }}>
              {helperText}
            </Typography>
          ) : null}
        </Stack>
      ) : null}
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
