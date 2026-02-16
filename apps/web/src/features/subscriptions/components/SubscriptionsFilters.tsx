import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import { Autocomplete, Box, Checkbox, MenuItem, Popover, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import type { AccountItem, BillingScope, PricingItem, SubscriptionStatus } from '../../../api';
import { BorderedButton, GhostButton, PrimaryButton } from '../../../components/buttons';
import { FiltersToolbar } from '../../../components/layout';

const scopeOptions: Array<{ value: 'ALL' | BillingScope; label: string }> = [
  { value: 'ALL', label: 'All scopes' },
  { value: 'ACCOUNT', label: 'Account level' },
  { value: 'PROPERTY', label: 'Property level' }
];
const statusOptions: Array<'ALL' | SubscriptionStatus> = [
  'ALL',
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'CANCELED'
];

type SubscriptionsFiltersProps = {
  search: string;
  scopeFilter: 'ALL' | BillingScope;
  statusFilter: 'ALL' | SubscriptionStatus;
  accountIdsFilter: string[];
  pricingIdsFilter: string[];
  accounts: AccountItem[];
  pricings: PricingItem[];
  onSearchChange: (value: string) => void;
  onScopeFilterChange: (value: 'ALL' | BillingScope) => void;
  onStatusFilterChange: (value: 'ALL' | SubscriptionStatus) => void;
  onAccountFilterChange: (value: string[]) => void;
  onPricingFilterChange: (value: string[]) => void;
  onCreateSubscription: () => void;
};

export function SubscriptionsFilters(props: SubscriptionsFiltersProps): JSX.Element {
  const {
    search,
    scopeFilter,
    statusFilter,
    accountIdsFilter,
    pricingIdsFilter,
    accounts,
    pricings,
    onSearchChange,
    onScopeFilterChange,
    onStatusFilterChange,
    onAccountFilterChange,
    onPricingFilterChange,
    onCreateSubscription
  } = props;
  const [filtersAnchorEl, setFiltersAnchorEl] = useState<HTMLElement | null>(null);
  const selectedAccountOptions = accounts.filter((account) => accountIdsFilter.includes(account.id));
  const selectedPricingOptions = pricings.filter((pricing) => pricingIdsFilter.includes(pricing.id));
  const activeFiltersCount =
    (scopeFilter !== 'ALL' ? 1 : 0) +
    (statusFilter !== 'ALL' ? 1 : 0) +
    (accountIdsFilter.length > 0 ? 1 : 0) +
    (pricingIdsFilter.length > 0 ? 1 : 0);

  function clearFilters(): void {
    onScopeFilterChange('ALL');
    onStatusFilterChange('ALL');
    onAccountFilterChange([]);
    onPricingFilterChange([]);
  }

  return (
    <Box sx={{ px: { xs: 1.5, sm: 2 }, py: 1.5, borderBottom: '1px solid #e1e7ec' }}>
      <FiltersToolbar
        left={
          <>
            <TextField
              size="small"
              label="Search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Company, email, or property"
              sx={{ minWidth: { md: 220 } }}
            />

            <BorderedButton
              onClick={(event) => setFiltersAnchorEl(event.currentTarget)}
              startIcon={<FilterListIcon fontSize="small" />}
              sx={{ px: 1.5 }}
            >
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <Box component="span">Filters</Box>
                {activeFiltersCount > 0 ? (
                  <Box
                    component="span"
                    sx={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      backgroundColor: '#009299',
                      color: '#FFFFFF',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      lineHeight: 1
                    }}
                  >
                    {activeFiltersCount}
                  </Box>
                ) : null}
              </Stack>
            </BorderedButton>
          </>
        }
        right={
          <PrimaryButton startIcon={<AddIcon />} onClick={onCreateSubscription}>
            New subscription
          </PrimaryButton>
        }
      />

      <Popover
        open={Boolean(filtersAnchorEl)}
        anchorEl={filtersAnchorEl}
        onClose={() => setFiltersAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.75,
              width: 360,
              p: 1.5,
              border: '1px solid #E1E7EC'
            }
          }
        }}
      >
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#212934' }}>
            Filters
          </Typography>

          <TextField
            size="small"
            select
            label="Scope"
            value={scopeFilter}
            onChange={(event) => onScopeFilterChange(event.target.value as 'ALL' | BillingScope)}
            fullWidth
          >
            {scopeOptions.map((scope) => (
              <MenuItem key={scope.value} value={scope.value}>
                {scope.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            size="small"
            select
            label="Status"
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value as 'ALL' | SubscriptionStatus)}
            fullWidth
          >
            {statusOptions.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </TextField>

          <Autocomplete
            multiple
            disableCloseOnSelect
            options={accounts}
            value={selectedAccountOptions}
            onChange={(_event, nextValue) => onAccountFilterChange(nextValue.map((item) => item.id))}
            getOptionLabel={(option) => option.companyName}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            noOptionsText="No accounts"
            fullWidth
            renderOption={(autocompleteProps, option, { selected }) => (
              <li {...autocompleteProps}>
                <Checkbox size="small" checked={selected} sx={{ mr: 1 }} />
                <Stack spacing={0}>
                  <Typography variant="body2" sx={{ color: '#212934' }}>
                    {option.companyName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6B7F99' }}>
                    {option.totalBillableUnits} units
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

          <Autocomplete
            multiple
            disableCloseOnSelect
            options={pricings}
            value={selectedPricingOptions}
            onChange={(_event, nextValue) => onPricingFilterChange(nextValue.map((item) => item.id))}
            getOptionLabel={(option) => option.internalName}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            noOptionsText="No pricings"
            fullWidth
            renderOption={(autocompleteProps, option, { selected }) => (
              <li {...autocompleteProps}>
                <Checkbox size="small" checked={selected} sx={{ mr: 1 }} />
                <Stack spacing={0}>
                  <Typography variant="body2" sx={{ color: '#212934' }}>
                    {option.internalName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6B7F99' }}>
                    {option.product.code}
                  </Typography>
                </Stack>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label="Pricing"
                placeholder={selectedPricingOptions.length === 0 ? 'Search pricing' : ''}
              />
            )}
          />

          <Stack direction="row" justifyContent="flex-end">
            <GhostButton
              onClick={clearFilters}
              disabled={activeFiltersCount === 0}
              sx={{ minHeight: 34, px: 1.25 }}
            >
              Clear all
            </GhostButton>
          </Stack>
        </Stack>
      </Popover>
    </Box>
  );
}
