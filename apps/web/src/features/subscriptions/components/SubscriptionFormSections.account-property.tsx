import {
  Autocomplete,
  Box,
  Checkbox,
  FormControlLabel,
  Paper,
  type PaperProps,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { createFilterOptions } from '@mui/material/Autocomplete';
import type {
  AccountItem,
  PropertyItem
} from '../../../api';
import { SelectionListItemCard } from '../../../components/layout';
import { prototypeTokens } from '../../../theme/tokens';
import {
  AUTOCOMPLETE_LISTBOX_SX,
  AUTOCOMPLETE_PAPER_ANIMATED_SX,
  AUTOCOMPLETE_PAPER_SX,
  getAutocompleteFieldSx,
  sectionTitle
} from './SubscriptionFormSections.shared';

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
            sx={AUTOCOMPLETE_PAPER_SX}
          />
        )}
        slotProps={{
          listbox: {
            sx: AUTOCOMPLETE_LISTBOX_SX
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
              <Typography
                variant="body2"
                sx={{ color: prototypeTokens.color.text.primary, fontWeight: 600 }}
              >
                {option.companyName}
              </Typography>
              <Typography variant="caption" sx={{ color: prototypeTokens.color.text.muted }}>
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
            sx={getAutocompleteFieldSx(error)}
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
  propertyAvailabilityById?: Record<
    string,
    {
      available: boolean;
      reason: string | null;
    }
  >;
  invalidSelectedPropertyIds?: string[];
  loading: boolean;
  availabilityLoading?: boolean;
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
    propertyAvailabilityById,
    invalidSelectedPropertyIds = [],
    loading,
    availabilityLoading = false,
    error,
    onToggleApplyAllProperties,
    onChange
  } = props;
  const invalidSelectedPropertyIdSet = new Set(invalidSelectedPropertyIds);
  const propertyById = new Map(properties.map((property) => [property.id, property]));
  const selectedProperties = value
    .map((propertyId) => propertyById.get(propertyId))
    .filter((property): property is PropertyItem => Boolean(property));
  const availableProperties = properties.filter((property) => {
    if (value.includes(property.id)) {
      return false;
    }

    const availability = propertyAvailabilityById?.[property.id];
    if (!availability) {
      return true;
    }

    return availability.available;
  });
  const isPickerDisabled =
    isApplyAllPropertiesEnabled || !accountId || loading || availabilityLoading;
  const propertyRequiredError = !isApplyAllPropertiesEnabled && error;

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
                  ? 'No compatible properties for current selection'
                  : 'No properties found'
            }
            PaperComponent={(paperProps: PaperProps) => (
              <Paper
                {...paperProps}
                sx={AUTOCOMPLETE_PAPER_ANIMATED_SX}
              />
            )}
            slotProps={{
              listbox: {
                sx: AUTOCOMPLETE_LISTBOX_SX
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
                  <Typography variant="caption" sx={{ color: prototypeTokens.color.text.muted }}>
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
                sx={getAutocompleteFieldSx(propertyRequiredError)}
              />
            )}
          />

          {propertyRequiredError ? (
            <Typography
              variant="caption"
              sx={{ color: prototypeTokens.color.status.dangerStrong, lineHeight: 1.4 }}
            >
              Add at least one property for PROPERTY scope.
            </Typography>
          ) : null}

          {!loading && accountId && properties.length === 0 ? (
            <Typography variant="caption" sx={{ color: prototypeTokens.color.text.muted, lineHeight: 1.4 }}>
              No properties available for selected account.
            </Typography>
          ) : null}
          {availabilityLoading && !loading ? (
            <Typography variant="caption" sx={{ color: prototypeTokens.color.text.muted, lineHeight: 1.4 }}>
              Checking property compatibility...
            </Typography>
          ) : null}

          {value.length > 0 ? (
            <Stack spacing={1}>
              {value.map((propertyId) => {
                const property = propertyById.get(propertyId);

                return (
                  <SelectionListItemCard
                    key={propertyId}
                    hasError={invalidSelectedPropertyIdSet.has(propertyId)}
                    onRemove={() => onChange(value.filter((id) => id !== propertyId))}
                    removeAriaLabel="Remove property"
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: prototypeTokens.color.text.primary, fontWeight: 500 }}
                    >
                      {property?.address ?? propertyId}
                    </Typography>
                    {property ? (
                      <Typography variant="caption" sx={{ color: prototypeTokens.color.text.muted }}>
                        {property.billableUnits} units
                      </Typography>
                    ) : null}
                    {invalidSelectedPropertyIdSet.has(propertyId) ? (
                      <Typography variant="caption" sx={{ color: prototypeTokens.color.status.danger }}>
                        {propertyAvailabilityById?.[propertyId]?.reason ?? 'Property is not available'}
                      </Typography>
                    ) : null}
                  </SelectionListItemCard>
                );
              })}
            </Stack>
          ) : null}

        </Stack>
      ) : null}
    </Stack>
  );
}
