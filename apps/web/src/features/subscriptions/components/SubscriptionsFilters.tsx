import AddIcon from '@mui/icons-material/Add';
import { Box, MenuItem, TextField } from '@mui/material';
import type { AccountItem, BillingScope, SubscriptionStatus } from '../../../api';
import { PrimaryButton } from '../../../components/buttons';
import { FiltersToolbar } from '../../../components/layout';

const scopeOptions: Array<'ALL' | BillingScope> = ['ALL', 'ACCOUNT', 'PROPERTY'];
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
  accountIdFilter: string;
  accounts: AccountItem[];
  onSearchChange: (value: string) => void;
  onScopeFilterChange: (value: 'ALL' | BillingScope) => void;
  onStatusFilterChange: (value: 'ALL' | SubscriptionStatus) => void;
  onAccountFilterChange: (value: string) => void;
  onCreateSubscription: () => void;
};

export function SubscriptionsFilters(props: SubscriptionsFiltersProps): JSX.Element {
  const {
    search,
    scopeFilter,
    statusFilter,
    accountIdFilter,
    accounts,
    onSearchChange,
    onScopeFilterChange,
    onStatusFilterChange,
    onAccountFilterChange,
    onCreateSubscription
  } = props;

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

            <TextField
              size="small"
              select
              label="Scope"
              value={scopeFilter}
              onChange={(event) => onScopeFilterChange(event.target.value as 'ALL' | BillingScope)}
              sx={{ minWidth: 120 }}
            >
              {scopeOptions.map((scope) => (
                <MenuItem key={scope} value={scope}>
                  {scope}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              size="small"
              select
              label="Status"
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value as 'ALL' | SubscriptionStatus)}
              sx={{ minWidth: 120 }}
            >
              {statusOptions.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              size="small"
              select
              label="Account"
              value={accountIdFilter}
              onChange={(event) => onAccountFilterChange(event.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">All accounts</MenuItem>
              {accounts.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  {account.companyName} ({account.totalBillableUnits} units)
                </MenuItem>
              ))}
            </TextField>
          </>
        }
        right={
          <PrimaryButton startIcon={<AddIcon />} onClick={onCreateSubscription}>
            Create Subscription
          </PrimaryButton>
        }
      />
    </Box>
  );
}
