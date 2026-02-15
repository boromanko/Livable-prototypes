import { Box, InputAdornment, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { ProductItem, PricingType } from '../../../api';
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
