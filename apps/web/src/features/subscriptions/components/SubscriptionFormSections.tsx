import {
  Autocomplete,
  Box,
  Checkbox,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  type PaperProps,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { createFilterOptions } from '@mui/material/Autocomplete';
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
  loading: boolean;
  error: boolean;
  accounts: AccountItem[];
  onChange: (accountId: string) => void;
};

export function SubscriptionFormAccountSection(
  props: SubscriptionFormAccountSectionProps
): JSX.Element {
  const { value, loading, error, accounts, onChange } = props;
  const selectedAccount = accounts.find((account) => account.id === value) ?? null;
  const accountFilterOptions = createFilterOptions<AccountItem>({
    stringify: (option) => `${option.companyName} ${option.email}`
  });
  const pickerFieldSx = {
    ...getFormFieldSx(error),
    '& .MuiAutocomplete-inputRoot': {
      p: '0 40px 0 14px !important'
    },
    '& .MuiOutlinedInput-root': {
      height: 48,
      minHeight: 48,
      alignItems: 'center',
      pr: 5
    },
    '& .MuiAutocomplete-input': {
      p: '0 !important'
    },
    '& .MuiInputBase-input::placeholder': {
      color: '#4B617C',
      opacity: 1
    },
    '& .MuiAutocomplete-popupIndicator': {
      color: '#4B617C'
    }
  };

  return (
    <Stack spacing={2}>
      {sectionTitle('Account')}
      <Autocomplete<AccountItem, false, false, false>
        disablePortal
        openOnFocus
        options={accounts}
        value={selectedAccount}
        loading={loading}
        onChange={(_event, selected) => {
          onChange(selected?.id ?? '');
        }}
        getOptionLabel={(option) => option.companyName}
        isOptionEqualToValue={(option, selected) => option.id === selected.id}
        filterOptions={accountFilterOptions}
        noOptionsText={loading ? 'Loading accounts...' : 'No accounts found'}
        PaperComponent={(paperProps: PaperProps) => (
          <Paper
            {...paperProps}
            sx={{
              mt: 0.5,
              border: '1px solid #E1E7EC',
              borderRadius: '2px',
              boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.12)'
            }}
          />
        )}
        slotProps={{
          listbox: {
            sx: {
              py: 0,
              '& .MuiAutocomplete-option': {
                minHeight: 52,
                alignItems: 'center'
              }
            }
          }
        }}
        renderOption={(optionProps, option) => (
          <Box
            component="li"
            {...optionProps}
            key={option.id}
            sx={{
              minHeight: 52,
              px: 1.5,
              py: 0.75,
              alignItems: 'center'
            }}
          >
            <Stack spacing={0.25} sx={{ py: 0.25 }}>
              <Typography variant="body2" sx={{ color: '#212934', fontWeight: 600 }}>
                {option.companyName}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6F8298' }}>
                {option.email} - {option.totalBillableUnits} units
              </Typography>
            </Stack>
          </Box>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Select account"
            error={error}
            helperText={error ? 'Account is required.' : undefined}
            sx={pickerFieldSx}
          />
        )}
      />
    </Stack>
  );
}

type SubscriptionFormPropertySectionProps = {
  isApplyAllPropertiesEnabled: boolean;
  accountId: string;
  value: string[];
  properties: PropertyItem[];
  loading: boolean;
  error: boolean;
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
    error,
    onToggleApplyAllProperties,
    onChange
  } = props;
  const propertyById = new Map(properties.map((property) => [property.id, property]));
  const selectedProperties = value
    .map((propertyId) => propertyById.get(propertyId))
    .filter((property): property is PropertyItem => Boolean(property));
  const availableProperties = properties.filter((property) => !value.includes(property.id));
  const isPickerDisabled = isApplyAllPropertiesEnabled || !accountId || loading;
  const propertyRequiredError = !isApplyAllPropertiesEnabled && error;
  const pickerFieldSx = {
    ...getFormFieldSx(propertyRequiredError),
    '& .MuiAutocomplete-inputRoot': {
      p: '0 40px 0 14px !important'
    },
    '& .MuiOutlinedInput-root': {
      height: 48,
      minHeight: 48,
      alignItems: 'center',
      pr: 5
    },
    '& .MuiAutocomplete-input': {
      p: '0 !important'
    },
    '& .MuiInputBase-input::placeholder': {
      color: '#4B617C',
      opacity: 1
    },
    '& .MuiAutocomplete-popupIndicator': {
      color: '#4B617C'
    }
  };

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

      {!isApplyAllPropertiesEnabled ? (
        <Stack spacing={2}>
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
                  ? 'No more properties to add'
                  : 'No properties found'
            }
            PaperComponent={(paperProps: PaperProps) => (
              <Paper
                {...paperProps}
                sx={{
                  mt: 0.5,
                  border: '1px solid #E1E7EC',
                  borderRadius: '2px',
                  boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.12)',
                  transformOrigin: 'top center',
                  animation: 'subscriptionAutocompleteOpen 150ms ease-out',
                  '@keyframes subscriptionAutocompleteOpen': {
                    from: {
                      opacity: 0,
                      transform: 'translateY(-4px) scale(0.99)'
                    },
                    to: {
                      opacity: 1,
                      transform: 'translateY(0) scale(1)'
                    }
                  }
                }}
              />
            )}
            slotProps={{
              listbox: {
                sx: {
                  py: 0,
                  '& .MuiAutocomplete-option': {
                    minHeight: 52,
                    alignItems: 'center'
                  }
                }
              }
            }}
            renderTags={() => null}
            renderOption={(optionProps, option) => (
              <Box
                component="li"
                {...optionProps}
                key={option.id}
                sx={{
                  minHeight: 48,
                  px: 1.5,
                  py: 0.75,
                  alignItems: 'center'
                }}
              >
                <Stack spacing={0.25} sx={{ py: 0.25 }}>
                  <Typography variant="body2">{option.address}</Typography>
                  <Typography variant="caption" sx={{ color: '#6F8298' }}>
                    {option.billableUnits} units
                  </Typography>
                </Stack>
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Add properties"
                error={propertyRequiredError}
                sx={pickerFieldSx}
              />
            )}
          />

          {propertyRequiredError ? (
            <Typography variant="caption" sx={{ color: '#D32F2F', lineHeight: 1.4 }}>
              Add at least one property for PROPERTY scope.
            </Typography>
          ) : null}

          {!loading && accountId && properties.length === 0 ? (
            <Typography variant="caption" sx={{ color: '#6F8298', lineHeight: 1.4 }}>
              No properties available for selected account.
            </Typography>
          ) : null}

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

        </Stack>
      ) : null}
    </Stack>
  );
}

type SubscriptionFormDatesSectionProps = {
  startDate: string;
  endDate: string;
  startDateError: boolean;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
};

export function SubscriptionFormDatesSection(
  props: SubscriptionFormDatesSectionProps
): JSX.Element {
  const {
    startDate,
    endDate,
    startDateError,
    onStartDateChange,
    onEndDateChange
  } = props;

  return (
    <Stack spacing={2}>
      {sectionTitle('Dates')}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1.5, sm: 2 }}
        alignItems={{ xs: 'stretch', sm: 'flex-end' }}
      >
        <Stack spacing={0.75} sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{ color: '#4B617C', fontWeight: 600 }}>
            Start date
          </Typography>
          <TextField
            type="date"
            value={startDate}
            onChange={(event) => onStartDateChange(event.target.value)}
            InputLabelProps={{ shrink: true }}
            error={startDateError}
            helperText={startDateError ? 'Start date is required.' : undefined}
            sx={{ ...getFormFieldSx(startDateError) }}
          />
        </Stack>

        <Typography
          sx={{
            display: { xs: 'none', sm: 'block' },
            color: '#6F8298',
            fontSize: 20,
            lineHeight: 1,
            pb: 1.5
          }}
        >
          -
        </Typography>

        <Stack spacing={0.75} sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{ color: '#4B617C', fontWeight: 600 }}>
            End date
          </Typography>
          <TextField
            type="date"
            value={endDate}
            onChange={(event) => onEndDateChange(event.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ ...getFormFieldSx() }}
          />
        </Stack>
      </Stack>
    </Stack>
  );
}

type SubscriptionFormStatusSectionProps = {
  status: SubscriptionStatus;
  onStatusChange: (status: SubscriptionStatus) => void;
};

export function SubscriptionFormStatusSection(
  props: SubscriptionFormStatusSectionProps
): JSX.Element {
  const { status, onStatusChange } = props;

  return (
    <Stack spacing={2}>
      {sectionTitle('Status')}
      <TextField
        select
        value={status}
        onChange={(event) => onStatusChange(event.target.value as SubscriptionStatus)}
        sx={getFormFieldSx()}
      >
        {subscriptionStatusOptions.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}

type SubscriptionFormCreateStatusSectionProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function SubscriptionFormCreateStatusSection(
  props: SubscriptionFormCreateStatusSectionProps
): JSX.Element {
  const { checked, onChange } = props;

  return (
    <Stack spacing={2}>
      {sectionTitle('Status')}
      <FormControlLabel
        control={
          <Checkbox checked={checked} onChange={(event) => onChange(event.target.checked)} />
        }
        label="Activate subscription immediately"
        sx={{ m: 0 }}
      />
    </Stack>
  );
}

export {
  SubscriptionFormPaymentMethodSection,
  SubscriptionFormPricingsSection
} from './SubscriptionFormSections.payment-pricings';
