import { useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  InputAdornment,
  MenuItem,
  Stack,
  TextField
} from '@mui/material';
import { createFilterOptions } from '@mui/material/Autocomplete';
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
      {sectionTitle('Pricing Name (internal use)')}
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
  pricingType: PricingType;
  productItems: ProductItem[];
  productsLoading: boolean;
  productsCreating?: boolean;
  error: boolean;
  disabled?: boolean;
  onCreateProduct?: (name: string) => Promise<void>;
  onChange: (value: string) => void;
};

export function PricingFormProductSection(props: PricingFormProductSectionProps): JSX.Element {
  const {
    fieldRef,
    value,
    pricingType,
    productItems,
    productsLoading,
    productsCreating = false,
    error,
    disabled = false,
    onCreateProduct,
    onChange
  } = props;
  const [createError, setCreateError] = useState<string | null>(null);
  const isEditableProductPicker = pricingType === 'FIXED';
  const selectedProduct = useMemo(
    () => productItems.find((product) => product.id === value) ?? null,
    [productItems, value]
  );

  async function handleProductSelection(
    selectedOption: ProductItem | CreateProductOption | null
  ): Promise<void> {
    setCreateError(null);

    if (!selectedOption) {
      onChange('');
      return;
    }

    if (isCreateProductOption(selectedOption)) {
      if (!onCreateProduct) {
        return;
      }

      try {
        await onCreateProduct(selectedOption.inputValue);
      } catch (errorObject) {
        setCreateError(
          errorObject instanceof Error
            ? errorObject.message
            : 'Failed to create product. Please try again.'
        );
      }
      return;
    }

    onChange(selectedOption.id);
  }

  return (
    <Stack spacing={2} ref={fieldRef}>
      {sectionTitle('Product (invoice line item name)')}
      {isEditableProductPicker ? (
        <Autocomplete<ProductItem | CreateProductOption, false, false, false>
          disablePortal
          openOnFocus
          options={productItems}
          value={selectedProduct}
          disabled={productsLoading || productsCreating || disabled}
          onChange={(_event, selectedOption) => {
            void handleProductSelection(selectedOption);
          }}
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(option, selected) =>
            !isCreateProductOption(option) &&
            !isCreateProductOption(selected) &&
            option.id === selected.id
          }
          filterOptions={(options, params) => {
            const filtered = productAutocompleteFilterOptions(options, params);
            const normalizedInput = params.inputValue.trim();
            if (!normalizedInput) {
              return filtered;
            }

            const hasExactMatch = options.some(
              (option) => option.name.trim().toLowerCase() === normalizedInput.toLowerCase()
            );
            if (!hasExactMatch) {
              filtered.push({
                id: '__create__',
                name: `+ Add "${normalizedInput}"`,
                inputValue: normalizedInput
              });
            }

            return filtered;
          }}
          noOptionsText={productsLoading ? 'Loading products...' : 'No products found'}
          renderOption={(optionProps, option) => (
            <Box
              component="li"
              {...optionProps}
              key={isCreateProductOption(option) ? `create-${option.inputValue}` : option.id}
              sx={{
                minHeight: 46,
                px: 1.5,
                py: 0.75,
                alignItems: 'center'
              }}
            >
              <Box
                component="span"
                sx={{
                  color: isCreateProductOption(option)
                    ? prototypeTokens.color.brand.teal500
                    : prototypeTokens.color.text.primary,
                  fontWeight: isCreateProductOption(option) ? 600 : 500
                }}
              >
                {option.name}
              </Box>
            </Box>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Select or add product"
              error={error || Boolean(createError)}
              helperText={error ? 'Product is required.' : createError ?? undefined}
              sx={getFormFieldSx(error || Boolean(createError))}
            />
          )}
        />
      ) : (
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
      )}
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
          Fixed Price
        </PrimaryButton>
        <PrimaryButton
          onClick={() => onChange('METERED')}
          disabled={disabled}
          variant={value === 'METERED' ? 'contained' : 'text'}
          sx={{
            borderRadius: 0,
            ...(value === 'METERED'
              ? {}
              : {
                  backgroundColor: 'transparent',
                  color: prototypeTokens.color.brand.teal500,
                  '&:hover': { backgroundColor: prototypeTokens.color.bg.brandSoft }
                })
          }}
        >
          Metered Price
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

type PricingFormMeteredSectionProps = {
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

export function PricingFormMeteredSection(props: PricingFormMeteredSectionProps): JSX.Element {
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
      {sectionTitle('Metered pricing', 'Define quantity tiers and pricing')}
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
        'Minimum total charge per billing period for this metered pricing.'
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

type CreateProductOption = {
  id: '__create__';
  name: string;
  inputValue: string;
};

function isCreateProductOption(
  option: ProductItem | CreateProductOption
): option is CreateProductOption {
  return option.id === '__create__';
}

const productAutocompleteFilterOptions = createFilterOptions<ProductItem | CreateProductOption>({
  stringify: (option) =>
    isCreateProductOption(option)
      ? option.inputValue
      : `${option.name} ${option.code} ${option.description ?? ''}`
});
