import {
  Autocomplete,
  Box,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  type PaperProps,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { PaymentMethodItem, PricingItem } from '../../../api';
import { formatMoneyCents } from '../../../lib/format/money';
import { PricingValueCard } from './PricingValueCard';
import { getFormFieldSx, sectionTitle } from './SubscriptionFormSections.shared';

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
    <Stack spacing={2}>
      {sectionTitle('Payment method')}
      <TextField
        select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={!accountId || loading}
        SelectProps={{
          displayEmpty: true,
          renderValue: (selected) => {
            if (typeof selected !== 'string' || selected === '') {
              return (
                <Box component="span" sx={{ color: '#4B617C' }}>
                  Use fallback/default behavior
                </Box>
              );
            }

            const selectedMethod = methods.find((method) => method.id === selected);
            if (!selectedMethod) {
              return selected;
            }

            return `${selectedMethod.label}${selectedMethod.isDefault ? ' (default)' : ''}`;
          }
        }}
        sx={getFormFieldSx()}
      >
        <MenuItem value="">Use fallback/default behavior</MenuItem>
        {methods.map((method) => (
          <MenuItem key={method.id} value={method.id}>
            {method.label}
            {method.isDefault ? ' (default)' : ''}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}

type SubscriptionFormPricingsSectionProps = {
  value: string[];
  pricings: PricingItem[];
  error: boolean;
  pricingAvailabilityById?: Record<
    string,
    {
      available: boolean;
      reason: string | null;
    }
  >;
  invalidSelectedPricingIds?: string[];
  availabilityLoading?: boolean;
  usageCountByPricingId?: Record<string, number>;
  showPricingUsage?: boolean;
  onCreatePricing: () => void;
  onEditPricing?: (pricing: PricingItem) => void;
  onChange: (pricingIds: string[]) => void;
};

export function SubscriptionFormPricingsSection(
  props: SubscriptionFormPricingsSectionProps
): JSX.Element {
  const {
    value,
    pricings,
    error,
    pricingAvailabilityById,
    invalidSelectedPricingIds = [],
    availabilityLoading = false,
    usageCountByPricingId,
    showPricingUsage = false,
    onCreatePricing,
    onEditPricing,
    onChange
  } = props;
  const invalidSelectedPricingIdSet = new Set(invalidSelectedPricingIds);
  const pricingById = new Map(pricings.map((pricing) => [pricing.id, pricing]));
  const selectedPricings = value
    .map((pricingId) => pricingById.get(pricingId))
    .filter((pricing): pricing is PricingItem => Boolean(pricing));
  const missingSelectedPricingIds = value.filter((pricingId) => !pricingById.has(pricingId));
  const availablePricings = pricings.filter((pricing) => {
    if (value.includes(pricing.id)) {
      return false;
    }

    const availability = pricingAvailabilityById?.[pricing.id];
    if (!availability) {
      return true;
    }

    return availability.available;
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
      {sectionTitle('Pricings')}
      <Autocomplete<PricingItem, true, true, false>
        multiple
        disableClearable
        openOnFocus
        options={availablePricings}
        value={selectedPricings}
        disabled={availabilityLoading}
        onChange={(_event, selected) =>
          onChange([...missingSelectedPricingIds, ...selected.map((pricing) => pricing.id)])
        }
        getOptionLabel={(option) => option.internalName}
        isOptionEqualToValue={(option, selected) => option.id === selected.id}
        noOptionsText={
          availablePricings.length === 0
            ? 'No compatible pricings for current selection'
            : 'No pricings found'
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
          >
            {paperProps.children}
            <Divider />
            <MenuItem
              sx={{ minHeight: 48, fontWeight: 500 }}
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onClick={onCreatePricing}
            >
              + Add new pricing
            </MenuItem>
          </Paper>
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
              <Typography variant="body2">{option.internalName}</Typography>
              <Typography variant="caption" sx={{ color: '#6F8298' }}>
                {option.product.code} - {option.type}
              </Typography>
            </Stack>
          </Box>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Add pricings"
            error={error}
            sx={pickerFieldSx}
          />
        )}
      />
      {error ? (
        <Typography variant="caption" sx={{ color: '#D32F2F', lineHeight: 1.4 }}>
          Add at least one pricing.
        </Typography>
      ) : null}
      {availabilityLoading ? (
        <Typography variant="caption" sx={{ color: '#6F8298', lineHeight: 1.4 }}>
          Checking pricing compatibility...
        </Typography>
      ) : null}

      {value.length > 0 ? (
        <Stack spacing={1}>
          {value.map((pricingId) => {
            const pricing = pricingById.get(pricingId);
            const isEditable = Boolean(pricing && onEditPricing);

            return (
              <PricingValueCard
                key={pricingId}
                title={pricing?.internalName ?? pricingId}
                subtitle={pricing ? `${pricing.product.code} - ${pricing.type}` : undefined}
                usageLabel={
                  showPricingUsage
                    ? `Used in ${usageCountByPricingId?.[pricingId] ?? 0} subscription${
                        (usageCountByPricingId?.[pricingId] ?? 0) === 1 ? '' : 's'
                      }`
                    : undefined
                }
                errorLabel={
                  invalidSelectedPricingIdSet.has(pricingId)
                    ? (pricingAvailabilityById?.[pricingId]?.reason ?? 'Pricing is not available')
                    : undefined
                }
                amountLabel={pricing ? getPricingAmountLabel(pricing) : '—'}
                variant="form"
                onTitleClick={
                  isEditable && pricing
                    ? () => {
                        onEditPricing?.(pricing);
                      }
                    : undefined
                }
                action={
                  <IconButton
                    size="small"
                    onClick={(event) => {
                      event.stopPropagation();
                      onChange(value.filter((id) => id !== pricingId));
                    }}
                    aria-label="Remove pricing"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                }
              />
            );
          })}
        </Stack>
      ) : null}
    </Stack>
  );
}

function getPricingAmountLabel(pricing: PricingItem): string {
  if (pricing.type === 'FIXED') {
    return formatMoneyCents(pricing.fixedAmountCents, pricing.currency);
  }

  const amounts = pricing.tiers.map((tier) => tier.unitAmountCents).filter((amount) => amount >= 0);
  if (amounts.length === 0) {
    return formatMoneyCents(pricing.minimumPriceCents, pricing.currency);
  }

  const minAmount = Math.min(...amounts);
  const maxAmount = Math.max(...amounts);
  if (minAmount === maxAmount) {
    return formatMoneyCents(minAmount, pricing.currency);
  }

  return `${formatMoneyCents(minAmount, pricing.currency)} - ${formatMoneyCents(
    maxAmount,
    pricing.currency
  )}`;
}
