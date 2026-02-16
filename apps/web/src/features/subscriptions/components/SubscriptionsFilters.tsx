import AddIcon from '@mui/icons-material/Add';
import { Autocomplete, Box, Checkbox, MenuItem, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import type { AccountItem, BillingScope, PricingItem, SubscriptionStatus } from '../../../api';
import { PrimaryButton } from '../../../components/buttons';
import { FiltersPopoverPanel, FiltersToolbar, FilterTriggerButton } from '../../../components/layout';
import {
  formatSubscriptionStatusLabel,
  subscriptionStatusOptions
} from '../../../lib/subscriptions/status';
import { prototypeTokens } from '../../../theme/tokens';

const scopeOptions: Array<{ value: 'ALL' | BillingScope; label: string }> = [
  { value: 'ALL', label: 'All scopes' },
  { value: 'ACCOUNT', label: 'Account level' },
  { value: 'PROPERTY', label: 'Property level' }
];
type SubscriptionsFiltersProps = {
  search: string;
  scopeFilter: 'ALL' | BillingScope;
  statusFilter: SubscriptionStatus[];
  accountIdsFilter: string[];
  pricingIdsFilter: string[];
  accounts: AccountItem[];
  pricings: PricingItem[];
  onSearchChange: (value: string) => void;
  onScopeFilterChange: (value: 'ALL' | BillingScope) => void;
  onStatusFilterChange: (value: SubscriptionStatus[]) => void;
  onAccountFilterChange: (value: string[]) => void;
  onPricingFilterChange: (value: string[]) => void;
  onCreateSubscription: () => void;
  canCreateSubscription: boolean;
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
    onCreateSubscription,
    canCreateSubscription
  } = props;
  const [filtersAnchorEl, setFiltersAnchorEl] = useState<HTMLElement | null>(null);
  const selectedStatusOptions = subscriptionStatusOptions.filter((status) =>
    statusFilter.includes(status)
  );
  const selectedAccountOptions = accounts.filter((account) => accountIdsFilter.includes(account.id));
  const selectedPricingOptions = pricings.filter((pricing) => pricingIdsFilter.includes(pricing.id));
  const activeFiltersCount =
    (scopeFilter !== 'ALL' ? 1 : 0) +
    (statusFilter.length > 0 ? 1 : 0) +
    (accountIdsFilter.length > 0 ? 1 : 0) +
    (pricingIdsFilter.length > 0 ? 1 : 0);

  function clearFilters(): void {
    onScopeFilterChange('ALL');
    onStatusFilterChange([]);
    onAccountFilterChange([]);
    onPricingFilterChange([]);
  }

  return (
    <Box
      sx={{
        px: { xs: 1.5, sm: 2 },
        py: 1.5,
        borderBottom: `1px solid ${prototypeTokens.color.border.default}`
      }}
    >
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

            <FilterTriggerButton
              activeFiltersCount={activeFiltersCount}
              onClick={(event) => setFiltersAnchorEl(event.currentTarget)}
            />
          </>
        }
        right={
          canCreateSubscription ? (
            <PrimaryButton startIcon={<AddIcon />} onClick={onCreateSubscription}>
              New subscription
            </PrimaryButton>
          ) : null
        }
      />

      <FiltersPopoverPanel
        open={Boolean(filtersAnchorEl)}
        anchorEl={filtersAnchorEl}
        onClose={() => setFiltersAnchorEl(null)}
        width={360}
        activeFiltersCount={activeFiltersCount}
        onClearFilters={clearFilters}
      >
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

        <Autocomplete
          multiple
          disableCloseOnSelect
          options={subscriptionStatusOptions}
          value={selectedStatusOptions}
          onChange={(_event, nextValue) => onStatusFilterChange(nextValue)}
          getOptionLabel={(option) => formatSubscriptionStatusLabel(option)}
          isOptionEqualToValue={(option, value) => option === value}
          noOptionsText="No statuses"
          fullWidth
          renderOption={(autocompleteProps, option, { selected }) => (
            <li {...autocompleteProps}>
              <Checkbox size="small" checked={selected} sx={{ mr: 1 }} />
              <Typography variant="body2" sx={{ color: prototypeTokens.color.text.primary }}>
                {formatSubscriptionStatusLabel(option)}
              </Typography>
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              label="Status"
              placeholder={selectedStatusOptions.length === 0 ? 'Select statuses' : ''}
            />
          )}
        />

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
              <Box>
                <Typography variant="body2" sx={{ color: prototypeTokens.color.text.primary }}>
                  {option.companyName}
                </Typography>
                <Typography variant="caption" sx={{ color: prototypeTokens.color.text.subtle }}>
                  {option.totalBillableUnits} units
                </Typography>
              </Box>
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
              <Box>
                <Typography variant="body2" sx={{ color: prototypeTokens.color.text.primary }}>
                  {option.internalName}
                </Typography>
                <Typography variant="caption" sx={{ color: prototypeTokens.color.text.subtle }}>
                  {option.product.code}
                </Typography>
              </Box>
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
      </FiltersPopoverPanel>
    </Box>
  );
}
