import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
  Box,
  Checkbox,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography
} from '@mui/material';
import type { SubscriptionItem } from '../../../api';
import { AppIconButton } from '../../../components/buttons';
import { EmptyState } from '../../../components/layout';
import { formatDateLabel } from '../../../lib/format/date';
import type {
  SubscriptionsSortDirection,
  SubscriptionsSortField
} from '../subscriptionsTab.utils';
import { getSubscriptionProperties } from '../subscriptionsTab.utils';

type SubscriptionsTableProps = {
  isPending: boolean;
  rows: SubscriptionItem[];
  sortField: SubscriptionsSortField | null;
  sortDirection: SubscriptionsSortDirection;
  selectedIds: string[];
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  total: number;
  accountPropertiesCountById: Record<string, number>;
  isAccountPropertiesCountPending: boolean;
  page: number;
  pageSize: number;
  onToggleVisibleSelection: () => void;
  onSort: (field: SubscriptionsSortField) => void;
  onToggleRowSelection: (subscriptionId: string) => void;
  onEditSubscription: (subscription: SubscriptionItem) => void;
  onCreateSubscription: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export function SubscriptionsTable(props: SubscriptionsTableProps): JSX.Element {
  const {
    isPending,
    rows,
    sortField,
    sortDirection,
    selectedIds,
    allVisibleSelected,
    someVisibleSelected,
    total,
    accountPropertiesCountById,
    isAccountPropertiesCountPending,
    page,
    pageSize,
    onToggleVisibleSelection,
    onSort,
    onToggleRowSelection,
    onEditSubscription,
    onCreateSubscription,
    onPageChange,
    onPageSizeChange
  } = props;

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <TableContainer sx={{ flex: 1, minHeight: 0 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={allVisibleSelected}
                  indeterminate={someVisibleSelected}
                  onChange={onToggleVisibleSelection}
                  inputProps={{ 'aria-label': 'Select all visible subscriptions' }}
                />
              </TableCell>
              <TableCell sortDirection={sortField === 'account' ? sortDirection : false}>
                <TableSortLabel
                  active={sortField === 'account'}
                  direction={sortField === 'account' ? sortDirection : 'asc'}
                  onClick={() => onSort('account')}
                >
                  Account
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortField === 'scope' ? sortDirection : false}>
                <TableSortLabel
                  active={sortField === 'scope'}
                  direction={sortField === 'scope' ? sortDirection : 'asc'}
                  onClick={() => onSort('scope')}
                >
                  Scope
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortField === 'property' ? sortDirection : false}>
                <TableSortLabel
                  active={sortField === 'property'}
                  direction={sortField === 'property' ? sortDirection : 'asc'}
                  onClick={() => onSort('property')}
                >
                  Property
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortField === 'startDate' ? sortDirection : false}>
                <TableSortLabel
                  active={sortField === 'startDate'}
                  direction={sortField === 'startDate' ? sortDirection : 'asc'}
                  onClick={() => onSort('startDate')}
                >
                  Start
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortField === 'endDate' ? sortDirection : false}>
                <TableSortLabel
                  active={sortField === 'endDate'}
                  direction={sortField === 'endDate' ? sortDirection : 'asc'}
                  onClick={() => onSort('endDate')}
                >
                  End
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortField === 'status' ? sortDirection : false}>
                <TableSortLabel
                  active={sortField === 'status'}
                  direction={sortField === 'status' ? sortDirection : 'asc'}
                  onClick={() => onSort('status')}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortField === 'pricings' ? sortDirection : false}>
                <TableSortLabel
                  active={sortField === 'pricings'}
                  direction={sortField === 'pricings' ? sortDirection : 'asc'}
                  onClick={() => onSort('pricings')}
                >
                  Pricings
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <Typography variant="body2" color="text.secondary">
                    Loading subscriptions...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : rows.length ? (
              rows.map((subscription) => {
                const subscriptionProperties = getSubscriptionProperties(subscription);

                return (
                  <TableRow
                    key={subscription.id}
                    hover
                    onClick={() => onEditSubscription(subscription)}
                    sx={{ cursor: 'pointer' }}
                  >
                  <TableCell
                    padding="checkbox"
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <Checkbox
                      checked={selectedIds.includes(subscription.id)}
                      onChange={() => onToggleRowSelection(subscription.id)}
                    />
                  </TableCell>

                  <TableCell>
                    <Stack spacing={0.25}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {subscription.account.companyName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {subscription.account.email}
                      </Typography>
                    </Stack>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {getScopeLabel(subscription.scope)}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    {subscription.scope === 'ACCOUNT' ? (
                      <Typography variant="body2" color="text.secondary">
                        {getAccountPropertiesCountLabel(
                          subscription.account.id,
                          accountPropertiesCountById,
                          isAccountPropertiesCountPending
                        )}
                      </Typography>
                    ) : subscriptionProperties.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No properties
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {formatPropertiesCount(subscriptionProperties.length)}
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell>{formatDateLabel(subscription.startDate)}</TableCell>
                  <TableCell>{formatDateLabel(subscription.endDate)}</TableCell>
                  <TableCell>
                    <Chip size="small" label={subscription.status} />
                  </TableCell>

                  <TableCell>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap">
                      {subscription.pricings.slice(0, 2).map((pricing) => (
                        <Chip
                          key={pricing.id}
                          size="small"
                          variant="outlined"
                          label={pricing.internalName}
                        />
                      ))}
                      {subscription.pricings.length > 2 ? (
                        <Chip size="small" label={`+${subscription.pricings.length - 2} more`} />
                      ) : null}
                    </Stack>
                  </TableCell>

                  <TableCell align="right">
                    <Tooltip title="Edit subscription">
                      <AppIconButton
                        tone="ghost"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEditSubscription(subscription);
                        }}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </AppIconButton>
                    </Tooltip>
                  </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={9}>
                  <EmptyState
                    title="No subscriptions found"
                    description="Adjust filters or create your first subscription."
                    actionLabel="Create Subscription"
                    onActionClick={onCreateSubscription}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_event, newPage) => onPageChange(newPage)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(event) => onPageSizeChange(Number(event.target.value))}
        rowsPerPageOptions={[10, 25, 50]}
      />
    </Box>
  );
}

function getScopeLabel(scope: SubscriptionItem['scope']): string {
  return scope === 'ACCOUNT' ? 'Account level' : 'Property level';
}

function getAccountPropertiesCountLabel(
  accountId: string,
  accountPropertiesCountById: Record<string, number>,
  isPending: boolean
): string {
  const count = accountPropertiesCountById[accountId];
  if (typeof count !== 'number') {
    return isPending ? 'Loading...' : 'Unknown';
  }

  return formatPropertiesCount(count);
}

function formatPropertiesCount(count: number): string {
  return count === 1 ? '1 property' : `${count} properties`;
}
