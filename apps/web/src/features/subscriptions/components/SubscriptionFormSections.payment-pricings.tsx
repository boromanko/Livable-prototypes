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
      {sectionTitle('Payment method', 'Optional')}
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
  onCreatePricing: () => void;
  onChange: (pricingIds: string[]) => void;
};

export function SubscriptionFormPricingsSection(
  props: SubscriptionFormPricingsSectionProps
): JSX.Element {
  const { value, pricings, onCreatePricing, onChange } = props;
  const pricingById = new Map(pricings.map((pricing) => [pricing.id, pricing]));
  const selectedPricings = value
    .map((pricingId) => pricingById.get(pricingId))
    .filter((pricing): pricing is PricingItem => Boolean(pricing));
  const missingSelectedPricingIds = value.filter((pricingId) => !pricingById.has(pricingId));
  const availablePricings = pricings.filter((pricing) => !value.includes(pricing.id));
  const pickerFieldSx = {
    ...getFormFieldSx(),
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
      {value.length > 0 ? (
        <Stack spacing={1}>
          {value.map((pricingId) => {
            const pricing = pricingById.get(pricingId);

            return (
              <Stack
                key={pricingId}
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
                    {pricing?.internalName ?? pricingId}
                  </Typography>
                  {pricing ? (
                    <Typography variant="caption" sx={{ color: '#6F8298' }}>
                      {pricing.product.code} - {pricing.type}
                    </Typography>
                  ) : null}
                </Stack>

                <IconButton
                  size="small"
                  onClick={() => onChange(value.filter((id) => id !== pricingId))}
                  aria-label="Remove pricing"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            );
          })}
        </Stack>
      ) : null}

      <Autocomplete<PricingItem, true, true, false>
        multiple
        disableClearable
        openOnFocus
        options={availablePricings}
        value={selectedPricings}
        onChange={(_event, selected) =>
          onChange([...missingSelectedPricingIds, ...selected.map((pricing) => pricing.id)])
        }
        getOptionLabel={(option) => option.internalName}
        isOptionEqualToValue={(option, selected) => option.id === selected.id}
        noOptionsText={
          availablePricings.length === 0 ? 'No more pricings to select' : 'No pricings found'
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
            placeholder="Select pricings"
            sx={pickerFieldSx}
          />
        )}
      />
    </Stack>
  );
}
