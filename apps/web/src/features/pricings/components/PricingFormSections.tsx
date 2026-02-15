import CloseIcon from '@mui/icons-material/Close';
import {
  Autocomplete,
  Box,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  type PaperProps,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import type { BillingScope, ProductItem, PricingType, SubscriptionStatus } from '../../../api';
import { PrimaryButton } from '../../../components/buttons';
import { PricingTierEditor } from './PricingTierEditor';
import type { TierDraft, TierDraftErrors } from '../pricingForm.utils';

const errorTint = '#FFF1F1';

function sectionTitle(title: string, subtitle?: string): JSX.Element {
  return (
    <Stack spacing={0.5}>
      <Typography sx={{ fontSize: 16, fontWeight: 600, color: '#212934' }}>
        {title}
      </Typography>
      {subtitle ? (
        <Typography sx={{ fontSize: 14, color: '#4B617C' }}>
          {subtitle}
        </Typography>
      ) : null}
    </Stack>
  );
}

function getFormFieldSx(hasError: boolean): Record<string, unknown> {
  return {
    '& .MuiOutlinedInput-root': {
      height: 48,
      alignItems: 'center',
      ...(hasError ? { backgroundColor: errorTint } : {})
    },
    '& .MuiOutlinedInput-input': {
      py: '12px'
    },
    '& .MuiSelect-select': {
      py: '12px'
    }
  };
}

type PricingFormNameSectionProps = {
  fieldRef: React.RefObject<HTMLDivElement>;
  value: string;
  error: boolean;
  onChange: (value: string) => void;
};

export function PricingFormNameSection(props: PricingFormNameSectionProps): JSX.Element {
  const { fieldRef, value, error, onChange } = props;

  return (
    <Stack spacing={2} ref={fieldRef}>
      {sectionTitle('Pricing name')}
      <TextField
        placeholder="Add pricing name"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        error={error}
        helperText={error ? 'Pricing name is required.' : undefined}
        sx={getFormFieldSx(error)}
      />
    </Stack>
  );
}

type PricingFormProductSectionProps = {
  fieldRef: React.RefObject<HTMLDivElement>;
  value: string;
  productItems: ProductItem[];
  productsLoading: boolean;
  error: boolean;
  onChange: (value: string) => void;
};

export function PricingFormProductSection(props: PricingFormProductSectionProps): JSX.Element {
  const { fieldRef, value, productItems, productsLoading, error, onChange } = props;

  return (
    <Stack spacing={2} ref={fieldRef}>
      {sectionTitle('Product')}
      <TextField
        select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={productsLoading}
        error={error}
        SelectProps={{
          displayEmpty: true,
          renderValue: (selected) => {
            if (typeof selected !== 'string' || selected === '') {
              return (
                <Box component="span" sx={{ color: '#4B617C' }}>
                  Select product
                </Box>
              );
            }

            return productItems.find((product) => product.id === selected)?.name ?? selected;
          }
        }}
        helperText={error ? 'Product is required.' : undefined}
        sx={getFormFieldSx(error)}
      >
        <MenuItem value="" disabled>
          Select product
        </MenuItem>
        {productItems.map((product) => (
          <MenuItem key={product.id} value={product.id}>
            {product.name}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}

type PricingFormSubscriptionsSectionProps = {
  value: string[];
  subscriptions: PricingFormSubscriptionOption[];
  loading: boolean;
  hasLoadingError?: boolean;
  blockedSubscriptionIds: string[];
  selectedSubscriptionConflictIds: string[];
  canCreateSubscription: boolean;
  onCreateSubscription: () => void;
  onChange: (subscriptionIds: string[]) => void;
};

export type PricingFormSubscriptionOption = {
  id: string;
  accountName: string;
  scope: BillingScope;
  status: SubscriptionStatus;
  propertiesLabel: string;
};

export function PricingFormSubscriptionsSection(
  props: PricingFormSubscriptionsSectionProps
): JSX.Element {
  const {
    value,
    subscriptions,
    loading,
    hasLoadingError = false,
    blockedSubscriptionIds,
    selectedSubscriptionConflictIds,
    canCreateSubscription,
    onCreateSubscription,
    onChange
  } = props;
  const subscriptionById = new Map(subscriptions.map((subscription) => [subscription.id, subscription]));
  const selectedSubscriptions = value
    .map((subscriptionId) => subscriptionById.get(subscriptionId))
    .filter(
      (subscription): subscription is PricingFormSubscriptionOption => Boolean(subscription)
    );
  const missingSelectedSubscriptionIds = value.filter(
    (subscriptionId) => !subscriptionById.has(subscriptionId)
  );
  const availableSubscriptions = subscriptions.filter(
    (subscription) => !value.includes(subscription.id)
  );
  const blockedSubscriptionIdSet = new Set(blockedSubscriptionIds);
  const selectedConflictIdSet = new Set(selectedSubscriptionConflictIds);
  const pickerFieldSx = {
    ...getFormFieldSx(false),
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
      {sectionTitle('Subscriptions')}
      {value.length > 0 ? (
        <Stack spacing={1}>
          {value.map((subscriptionId) => {
            const subscription = subscriptionById.get(subscriptionId);

            return (
              <Stack
                key={subscriptionId}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  px: 1.5,
                  py: 1.25,
                  border: selectedConflictIdSet.has(subscriptionId)
                    ? '1px solid #D14343'
                    : '1px solid #E1E7EC',
                  backgroundColor: selectedConflictIdSet.has(subscriptionId)
                    ? '#FFF7F7'
                    : '#F8F9FA',
                  borderRadius: '2px'
                }}
              >
                <Stack spacing={0.25}>
                  <Typography variant="body2" sx={{ color: '#212934', fontWeight: 500 }}>
                    {subscription?.accountName ?? subscriptionId}
                  </Typography>
                  {subscription ? (
                    <Typography variant="caption" sx={{ color: '#6F8298' }}>
                      {getPricingSubscriptionScopeLabel(subscription.scope)} -{' '}
                      {subscription.propertiesLabel} - {subscription.status}
                    </Typography>
                  ) : null}
                  {selectedConflictIdSet.has(subscriptionId) ? (
                    <Typography variant="caption" sx={{ color: '#B42318' }}>
                      Already has pricing for selected product.
                    </Typography>
                  ) : null}
                </Stack>

                <IconButton
                  size="small"
                  onClick={() => onChange(value.filter((id) => id !== subscriptionId))}
                  aria-label="Remove subscription"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            );
          })}
        </Stack>
      ) : null}

      <Autocomplete<PricingFormSubscriptionOption, true, true, false>
        multiple
        disableClearable
        openOnFocus
        options={availableSubscriptions}
        value={selectedSubscriptions}
        loading={loading}
        onChange={(_event, selected) =>
          onChange([
            ...missingSelectedSubscriptionIds,
            ...selected.map((subscription) => subscription.id)
          ])
        }
        getOptionLabel={(option) => option.accountName}
        isOptionEqualToValue={(option, selected) => option.id === selected.id}
        getOptionDisabled={(option) => blockedSubscriptionIdSet.has(option.id)}
        noOptionsText={
          hasLoadingError
            ? 'Failed to load subscriptions'
            : loading
            ? 'Loading subscriptions...'
            : availableSubscriptions.length === 0
              ? 'No more subscriptions to select'
              : 'No subscriptions found'
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
            {canCreateSubscription ? (
              <>
                <Divider />
                <MenuItem
                  sx={{ minHeight: 48, fontWeight: 500 }}
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onClick={onCreateSubscription}
                >
                  + Add new subscription
                </MenuItem>
              </>
            ) : null}
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
              <Typography variant="body2">{option.accountName}</Typography>
              {blockedSubscriptionIdSet.has(option.id) ? (
                <Typography variant="caption" sx={{ color: '#B42318' }}>
                  Already has pricing for selected product.
                </Typography>
              ) : (
                <Typography variant="caption" sx={{ color: '#6F8298' }}>
                  {getPricingSubscriptionScopeLabel(option.scope)} -{' '}
                  {option.propertiesLabel} - {option.status}
                </Typography>
              )}
            </Stack>
          </Box>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Select subscriptions"
            sx={pickerFieldSx}
          />
        )}
      />
    </Stack>
  );
}

type PricingFormTypeSectionProps = {
  value: PricingType;
  onChange: (type: PricingType) => void;
};

export function PricingFormTypeSection(props: PricingFormTypeSectionProps): JSX.Element {
  const { value, onChange } = props;

  return (
    <Stack spacing={2}>
      {sectionTitle('Pricing type')}
      <Stack
        direction="row"
        sx={{
          width: 'fit-content',
          border: '1px solid #009299',
          borderRadius: '2px',
          overflow: 'hidden'
        }}
      >
        <PrimaryButton
          onClick={() => onChange('FIXED')}
          variant={value === 'FIXED' ? 'contained' : 'text'}
          sx={{
            borderRadius: 0,
            ...(value === 'FIXED'
              ? {}
              : {
                  backgroundColor: 'transparent',
                  color: '#009299',
                  '&:hover': { backgroundColor: '#EAF6F6' }
                })
          }}
        >
          Fixed price
        </PrimaryButton>
        <PrimaryButton
          onClick={() => onChange('TIERED')}
          variant={value === 'TIERED' ? 'contained' : 'text'}
          sx={{
            borderRadius: 0,
            ...(value === 'TIERED'
              ? {}
              : {
                  backgroundColor: 'transparent',
                  color: '#009299',
                  '&:hover': { backgroundColor: '#EAF6F6' }
                })
          }}
        >
          Tiered price
        </PrimaryButton>
      </Stack>
    </Stack>
  );
}

type PricingFormFixedPriceSectionProps = {
  fieldRef: React.RefObject<HTMLDivElement>;
  value: string;
  error: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
};

export function PricingFormFixedPriceSection(props: PricingFormFixedPriceSectionProps): JSX.Element {
  const { fieldRef, value, error, onChange, onBlur } = props;

  return (
    <Stack spacing={2} ref={fieldRef}>
      {sectionTitle('Fixed price')}
      <TextField
        placeholder="0.00"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        error={error}
        helperText={error ? 'Fixed amount is required (USD).' : undefined}
        inputProps={{ inputMode: 'decimal' }}
        InputProps={{
          startAdornment: <InputAdornment position="start">$</InputAdornment>
        }}
        sx={{ maxWidth: 220, ...getFormFieldSx(error) }}
      />
    </Stack>
  );
}

type PricingFormTieredSectionProps = {
  fieldRef: React.RefObject<HTMLDivElement>;
  tiers: TierDraft[];
  tierStartUnits: number[];
  tierValidationErrors: TierDraftErrors[];
  showValidation: boolean;
  hasTierErrors: boolean;
  onAddTier: () => void;
  onRemoveTier: (tierId: string) => void;
  onUpdateTierMaxUnits: (tierId: string, value: string) => void;
  onNormalizeTierMaxUnitsOnBlur: (tierId: string) => void;
  onUpdateTierUnitPrice: (tierId: string, value: string) => void;
  onNormalizeTierUnitPriceOnBlur: (tierId: string) => void;
};

export function PricingFormTieredSection(props: PricingFormTieredSectionProps): JSX.Element {
  const {
    fieldRef,
    tiers,
    tierStartUnits,
    tierValidationErrors,
    showValidation,
    hasTierErrors,
    onAddTier,
    onRemoveTier,
    onUpdateTierMaxUnits,
    onNormalizeTierMaxUnitsOnBlur,
    onUpdateTierUnitPrice,
    onNormalizeTierUnitPriceOnBlur
  } = props;

  return (
    <Stack spacing={2} ref={fieldRef}>
      {sectionTitle('Tiered pricing', 'Define quantity tiers and pricing')}
      <PricingTierEditor
        tiers={tiers}
        tierStartUnits={tierStartUnits}
        tierValidationErrors={tierValidationErrors}
        showValidation={showValidation}
        hasTierErrors={hasTierErrors}
        onAddTier={onAddTier}
        onRemoveTier={onRemoveTier}
        onUpdateTierMaxUnits={onUpdateTierMaxUnits}
        onNormalizeTierMaxUnitsOnBlur={onNormalizeTierMaxUnitsOnBlur}
        onUpdateTierUnitPrice={onUpdateTierUnitPrice}
        onNormalizeTierUnitPriceOnBlur={onNormalizeTierUnitPriceOnBlur}
      />
    </Stack>
  );
}

type PricingFormMinimumPriceSectionProps = {
  fieldRef: React.RefObject<HTMLDivElement>;
  value: string;
  error: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
};

export function PricingFormMinimumPriceSection(
  props: PricingFormMinimumPriceSectionProps
): JSX.Element {
  const { fieldRef, value, error, onChange, onBlur } = props;

  return (
    <Stack spacing={2} ref={fieldRef}>
      {sectionTitle(
        'Minimum price',
        'Minimum total charge per billing period for this tiered pricing.'
      )}
      <TextField
        placeholder="0.00"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        error={error}
        helperText={error ? 'Enter a valid USD amount.' : undefined}
        inputProps={{ inputMode: 'decimal' }}
        InputProps={{
          startAdornment: <InputAdornment position="start">$</InputAdornment>
        }}
        sx={{ maxWidth: 220, ...getFormFieldSx(error) }}
      />
    </Stack>
  );
}

function getPricingSubscriptionScopeLabel(scope: BillingScope): string {
  return scope === 'ACCOUNT' ? 'Account level' : 'Property level';
}
