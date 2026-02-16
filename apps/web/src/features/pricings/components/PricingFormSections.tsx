import {
  Box,
  InputAdornment,
  MenuItem,
  Stack,
  TextField
} from '@mui/material';
import type { ProductItem, PricingType } from '../../../api';
import { PrimaryButton } from '../../../components/buttons';
import { prototypeTokens } from '../../../theme/tokens';
import { PricingTierEditor } from './PricingTierEditor';
import type { TierDraft, TierDraftErrors } from '../pricingForm.utils';
import { getFormFieldSx, sectionTitle } from './PricingFormSections.shared';

export {
  PricingFormSubscriptionsSection,
  type PricingFormSubscriptionOption
} from './PricingFormSections.subscriptions';

type PricingFormNameSectionProps = {
  fieldRef: React.RefObject<HTMLDivElement>;
  value: string;
  error: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function PricingFormNameSection(props: PricingFormNameSectionProps): JSX.Element {
  const { fieldRef, value, error, disabled = false, onChange } = props;

  return (
    <Stack spacing={2} ref={fieldRef}>
      {sectionTitle('Pricing name')}
      <TextField
        placeholder="Add pricing name"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
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
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function PricingFormProductSection(props: PricingFormProductSectionProps): JSX.Element {
  const { fieldRef, value, productItems, productsLoading, error, disabled = false, onChange } = props;

  return (
    <Stack spacing={2} ref={fieldRef}>
      {sectionTitle('Product')}
      <TextField
        select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={productsLoading || disabled}
        error={error}
        SelectProps={{
          displayEmpty: true,
          renderValue: (selected) => {
            if (typeof selected !== 'string' || selected === '') {
              return (
                <Box component="span" sx={{ color: prototypeTokens.color.text.secondary }}>
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

type PricingFormTypeSectionProps = {
  value: PricingType;
  disabled?: boolean;
  onChange: (type: PricingType) => void;
};

export function PricingFormTypeSection(props: PricingFormTypeSectionProps): JSX.Element {
  const { value, disabled = false, onChange } = props;

  return (
    <Stack spacing={2}>
      {sectionTitle('Pricing type')}
      <Stack
        direction="row"
        sx={{
          width: 'fit-content',
          border: `1px solid ${prototypeTokens.color.brand.teal500}`,
          borderRadius: '2px',
          overflow: 'hidden'
        }}
      >
        <PrimaryButton
          onClick={() => onChange('FIXED')}
          disabled={disabled}
          variant={value === 'FIXED' ? 'contained' : 'text'}
          sx={{
            borderRadius: 0,
            ...(value === 'FIXED'
              ? {}
              : {
                  backgroundColor: 'transparent',
                  color: prototypeTokens.color.brand.teal500,
                  '&:hover': { backgroundColor: prototypeTokens.color.bg.brandSoft }
                })
          }}
        >
          Fixed price
        </PrimaryButton>
        <PrimaryButton
          onClick={() => onChange('TIERED')}
          disabled={disabled}
          variant={value === 'TIERED' ? 'contained' : 'text'}
          sx={{
            borderRadius: 0,
            ...(value === 'TIERED'
              ? {}
              : {
                  backgroundColor: 'transparent',
                  color: prototypeTokens.color.brand.teal500,
                  '&:hover': { backgroundColor: prototypeTokens.color.bg.brandSoft }
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
  disabled?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
};

export function PricingFormFixedPriceSection(props: PricingFormFixedPriceSectionProps): JSX.Element {
  const { fieldRef, value, error, disabled = false, onChange, onBlur } = props;

  return (
    <Stack spacing={2} ref={fieldRef}>
      {sectionTitle('Fixed price')}
      <TextField
        placeholder="0.00"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        disabled={disabled}
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
  disabled?: boolean;
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
    disabled = false,
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
        disabled={disabled}
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
  disabled?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
};

export function PricingFormMinimumPriceSection(
  props: PricingFormMinimumPriceSectionProps
): JSX.Element {
  const { fieldRef, value, error, disabled = false, onChange, onBlur } = props;

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
        disabled={disabled}
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
