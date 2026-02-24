import { Autocomplete, Checkbox, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { AccountItem, PricingType, ProductItem } from '../../../api';
import { FiltersPopoverPanel } from '../../../components/layout';
import { prototypeTokens } from '../../../theme/tokens';

type PricingFiltersPopoverProps = {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  typeFilter: 'ALL' | PricingType;
  onTypeFilterChange: (value: 'ALL' | PricingType) => void;
  productOptions: ProductItem[];
  selectedProductIds: string[];
  onProductIdsChange: (value: string[]) => void;
  productsLoading: boolean;
  accountOptions: AccountItem[];
  selectedAccountIds: string[];
  onAccountIdsChange: (value: string[]) => void;
  accountsLoading: boolean;
  activeFiltersCount: number;
  onClearFilters: () => void;
};

export function PricingFiltersPopover(props: PricingFiltersPopoverProps): JSX.Element {
  const {
    open,
    anchorEl,
    onClose,
    typeFilter,
    onTypeFilterChange,
    productOptions,
    selectedProductIds,
    onProductIdsChange,
    productsLoading,
    accountOptions,
    selectedAccountIds,
    onAccountIdsChange,
    accountsLoading,
    activeFiltersCount,
    onClearFilters
  } = props;

  const selectedProductOptions = productOptions.filter((product) =>
    selectedProductIds.includes(product.id)
  );
  const selectedAccountOptions = accountOptions.filter((account) =>
    selectedAccountIds.includes(account.id)
  );

  return (
    <FiltersPopoverPanel
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      width={420}
      activeFiltersCount={activeFiltersCount}
      onClearFilters={onClearFilters}
    >
      <TextField
        size="small"
        select
        label="Type"
        value={typeFilter}
        onChange={(event) => onTypeFilterChange(event.target.value as 'ALL' | PricingType)}
        fullWidth
      >
        <MenuItem value="ALL">ALL</MenuItem>
        <MenuItem value="FIXED">FIXED</MenuItem>
        <MenuItem value="METERED">METERED</MenuItem>
      </TextField>

      <Autocomplete
        multiple
        disableCloseOnSelect
        options={productOptions}
        value={selectedProductOptions}
        onChange={(_event, nextValue) => onProductIdsChange(nextValue.map((item) => item.id))}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        loading={productsLoading}
        noOptionsText="No products"
        fullWidth
        renderOption={(autocompleteProps, option, { selected }) => (
          <li {...autocompleteProps}>
            <Checkbox size="small" checked={selected} sx={{ mr: 1 }} />
            {option.name}
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            label="Product"
            placeholder={selectedProductOptions.length === 0 ? 'Search products' : ''}
          />
        )}
      />

      <Autocomplete
        multiple
        disableCloseOnSelect
        options={accountOptions}
        value={selectedAccountOptions}
        onChange={(_event, nextValue) => onAccountIdsChange(nextValue.map((item) => item.id))}
        getOptionLabel={(option) => option.companyName}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        loading={accountsLoading}
        noOptionsText="No accounts"
        fullWidth
        renderOption={(autocompleteProps, option, { selected }) => (
          <li {...autocompleteProps}>
            <Checkbox size="small" checked={selected} sx={{ mr: 1 }} />
            <Stack spacing={0}>
              <Typography variant="body2" sx={{ color: prototypeTokens.color.text.primary }}>
                {option.companyName}
              </Typography>
              <Typography variant="caption" sx={{ color: prototypeTokens.color.text.subtle }}>
                {option.email}
              </Typography>
            </Stack>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            label="Account"
            placeholder={selectedAccountOptions.length === 0 ? 'Search accounts' : ''}
          />
        )}
      />
    </FiltersPopoverPanel>
  );
}
