import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Checkbox,
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
import { formatMoneyCents } from '../../../lib/format/money';
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
  accountTotalBillableUnitsById: Record<string, number>;
  isAccountPropertiesCountPending: boolean;
  page: number;
  pageSize: number;
  onToggleVisibleSelection: () => void;
  onSort: (field: SubscriptionsSortField) => void;
  onToggleRowSelection: (subscriptionId: string) => void;
  onEditSubscription: (subscription: SubscriptionItem) => void;
  onEditPricing: (pricing: SubscriptionItem['pricings'][number]) => void;
  onDeleteSubscription: (subscriptionId: string) => void;
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
    accountTotalBillableUnitsById,
    isAccountPropertiesCountPending,
    page,
    pageSize,
    onToggleVisibleSelection,
    onSort,
    onToggleRowSelection,
    onEditSubscription,
    onEditPricing,
    onDeleteSubscription,
    onCreateSubscription,
    onPageChange,
    onPageSizeChange
  } = props;

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <TableContainer sx={{ flex: 1, minHeight: 0 }}>
        <Table
          size="small"
          stickyHeader
          sx={{
            '& .MuiTableHead-root .MuiTableCell-root': {
              borderBottom: '1px solid #E1E7EC',
              backgroundColor: '#FFFFFF',
              zIndex: 2
            },
            '& .MuiTableBody-root .MuiTableCell-root': {
              borderBottom: '1px solid #E1E7EC',
              verticalAlign: 'top'
            }
          }}
        >
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
              <TableCell
                sortDirection={sortField === 'property' ? sortDirection : false}
                sx={{ width: 92, minWidth: 92, maxWidth: 92, whiteSpace: 'nowrap' }}
              >
                <TableSortLabel
                  active={sortField === 'property'}
                  direction={sortField === 'property' ? sortDirection : 'asc'}
                  onClick={() => onSort('property')}
                >
                  Properties
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortField === 'units' ? sortDirection : false}>
                <TableSortLabel
                  active={sortField === 'units'}
                  direction={sortField === 'units' ? sortDirection : 'asc'}
                  onClick={() => onSort('units')}
                >
                  Units
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
              <TableCell align="right" />
            </TableRow>
          </TableHead>

          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={10}>
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
	                    sx={{
	                      cursor: 'pointer',
	                      '& > .MuiTableCell-root': {
	                        verticalAlign: 'top',
	                        py: 0.75
	                      }
	                    }}
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

                  <TableCell sx={{ width: 92, minWidth: 92, maxWidth: 92 }}>
                    {subscription.scope === 'ACCOUNT' ? (
                      <Typography variant="body2" color="text.secondary">
                        {getAccountPropertiesCountLabel(
                          subscription.account.id,
                          accountPropertiesCountById,
                          isAccountPropertiesCountPending
                        )}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {subscriptionProperties.length}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {getSubscriptionUnitsLabel(
                        subscription,
                        accountTotalBillableUnitsById,
                        isAccountPropertiesCountPending
                      )}
                    </Typography>
                  </TableCell>

                  <TableCell>{formatDateLabel(subscription.startDate)}</TableCell>
                  <TableCell>{formatDateLabel(subscription.endDate, { fallback: '—' })}</TableCell>
                  <TableCell>
                    <Typography
                      component="span"
                      sx={{
                        ...getSubscriptionStatusTagSx(subscription.status),
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                    >
                      {formatSubscriptionStatusLabel(subscription.status)}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    {subscription.pricings.length > 0 ? (
                      <Stack spacing={0.5}>
                        {subscription.pricings.map((pricing) => (
                          <Stack
                            key={pricing.id}
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              event.stopPropagation();
                              onEditPricing(pricing);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                event.stopPropagation();
                                onEditPricing(pricing);
                              }
                            }}
                            sx={{
                              px: 1,
                              py: 0.75,
                              border: '1px solid #E1E7EC',
                              backgroundColor: '#F8F9FA',
                              borderRadius: '2px',
                              cursor: 'pointer',
                              transition: 'background-color 120ms ease, border-color 120ms ease',
                              '&:hover': {
                                backgroundColor: '#EEF4FA',
                                borderColor: '#C9D4DF'
                              }
                            }}
                          >
                            <Stack spacing={0.125} sx={{ minWidth: 0, pr: 1 }}>
                              <Typography
                                variant="body2"
                                sx={{ color: '#212934', fontWeight: 500, lineHeight: 1.25 }}
                              >
                                {pricing.internalName}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: '#6F8298', lineHeight: 1.2 }}
                              >
                                {pricing.product.code} - {pricing.type}
                              </Typography>
                            </Stack>
                            <Typography
                              sx={{
                                color: '#212934',
                                fontWeight: 700,
                                fontSize: 14,
                                lineHeight: 1.1,
                                fontVariantNumeric: 'tabular-nums',
                                flexShrink: 0
                              }}
                            >
                              {getSubscriptionPricingAmountLabel(pricing)}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>

	                  <TableCell align="right">
	                    <Stack direction="row" justifyContent="flex-end" alignItems="flex-start" spacing={0.25}>
                      <Tooltip title="Edit subscription">
                        <AppIconButton
                          tone="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEditSubscription(subscription);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </AppIconButton>
                      </Tooltip>
                      <Tooltip title="Delete subscription">
                        <AppIconButton
                          tone="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDeleteSubscription(subscription.id);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </AppIconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={10}>
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
    return isPending ? '...' : '-';
  }

  return String(count);
}

function getSubscriptionUnitsLabel(
  subscription: SubscriptionItem,
  accountTotalBillableUnitsById: Record<string, number>,
  isPending: boolean
): string {
  if (subscription.scope === 'ACCOUNT') {
    const totalUnits = accountTotalBillableUnitsById[subscription.account.id];
    if (typeof totalUnits !== 'number') {
      return isPending ? '...' : '-';
    }

    return String(totalUnits);
  }

  const totalUnits = subscription.properties.reduce((sum, property) => sum + property.billableUnits, 0);
  return String(totalUnits);
}

function getSubscriptionPricingAmountLabel(
  pricing: SubscriptionItem['pricings'][number]
): string {
  if (pricing.type === 'FIXED') {
    return formatMoneyCents(pricing.fixedAmountCents, pricing.currency);
  }

  const amounts = pricing.tiers.map((tier) => tier.unitAmountCents).filter((amount) => amount >= 0);
  if (amounts.length === 0) {
    return formatMoneyCents(pricing.minimumPriceCents, pricing.currency);
  }

  const minAmount = Math.min(...amounts);
  const maxAmount = Math.max(...amounts);
  if (minAmount === maxAmount) {
    return formatMoneyCents(minAmount, pricing.currency);
  }

  return `${formatMoneyCents(minAmount, pricing.currency)} - ${formatMoneyCents(
    maxAmount,
    pricing.currency
  )}`;
}

function getSubscriptionStatusTagSx(
  status: SubscriptionItem['status']
): Record<string, string | number> {
  if (status === 'ACTIVE') {
    return {
      color: '#1F9D55',
      backgroundColor: '#E8F7EF',
      py: '2px',
      px: '4px',
      borderRadius: '2px',
      fontWeight: 600,
      fontSize: 14,
      lineHeight: 1.1
    };
  }

  if (status === 'DRAFT') {
    return {
      color: '#2B6CB0',
      backgroundColor: '#E9F2FC',
      py: '2px',
      px: '4px',
      borderRadius: '2px',
      fontWeight: 600,
      fontSize: 14,
      lineHeight: 1.1
    };
  }

  if (status === 'PAUSED') {
    return {
      color: '#B7791F',
      backgroundColor: '#FFF5E5',
      py: '2px',
      px: '4px',
      borderRadius: '2px',
      fontWeight: 600,
      fontSize: 14,
      lineHeight: 1.1
    };
  }

  return {
    color: '#4B617C',
    backgroundColor: '#EEF2F6',
    py: '2px',
    px: '4px',
    borderRadius: '2px',
    fontWeight: 600,
    fontSize: 14,
    lineHeight: 1.1
  };
}

function formatSubscriptionStatusLabel(status: SubscriptionItem['status']): string {
  if (status === 'ACTIVE') {
    return 'Active';
  }

  if (status === 'DRAFT') {
    return 'Draft';
  }

  if (status === 'PAUSED') {
    return 'Paused';
  }

  return 'Canceled';
}
