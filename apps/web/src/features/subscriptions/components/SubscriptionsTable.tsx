import {
  Box,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Typography
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { SubscriptionItem } from '../../../api';
import { EmptyState } from '../../../components/layout';
import { prototypeTokens } from '../../../theme/tokens';
import type {
  SubscriptionsSortDirection,
  SubscriptionsSortField
} from '../subscriptionsTab.utils';
import { SubscriptionsTableRowItem } from './SubscriptionsTableRow';

type SubscriptionsTableProps = {
  isPending: boolean;
  rows: SubscriptionItem[];
  sortField: SubscriptionsSortField | null;
  sortDirection: SubscriptionsSortDirection;
  selectedIds: string[];
  allSelected: boolean;
  someSelected: boolean;
  total: number;
  isSelectingAll: boolean;
  accountPropertiesCountById: Record<string, number>;
  accountTotalBillableUnitsById: Record<string, number>;
  isAccountPropertiesCountPending: boolean;
  page: number;
  pageSize: number;
  onToggleAllSelection: () => void;
  onSort: (field: SubscriptionsSortField) => void;
  onToggleRowSelection: (subscriptionId: string) => void;
  onEditSubscription: (subscription: SubscriptionItem) => void;
  onEditPricing?: (pricing: SubscriptionItem['pricings'][number]) => void;
  onDeleteSubscription: (subscription: SubscriptionItem) => void;
  onCreateSubscription: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  canManageSubscriptions: boolean;
  canOpenPricingEditor: boolean;
};

type SortHeaderCell = {
  field: SubscriptionsSortField;
  label: string;
  sx?: SxProps<Theme>;
};

const sortHeaderCells: SortHeaderCell[] = [
  { field: 'account', label: 'Account' },
  { field: 'scope', label: 'Scope' },
  {
    field: 'property',
    label: 'Properties',
    sx: { width: 92, minWidth: 92, maxWidth: 92, whiteSpace: 'nowrap' }
  },
  { field: 'units', label: 'Units' },
  { field: 'startDate', label: 'Start' },
  { field: 'endDate', label: 'End' },
  { field: 'status', label: 'Status' },
  { field: 'pricings', label: 'Pricings' }
];

const tableSx = {
  '& .MuiTableHead-root .MuiTableCell-root': {
    borderBottom: `1px solid ${prototypeTokens.color.border.default}`,
    backgroundColor: prototypeTokens.color.bg.surface,
    zIndex: 2
  },
  '& .MuiTableBody-root .MuiTableCell-root': {
    borderBottom: `1px solid ${prototypeTokens.color.border.default}`,
    verticalAlign: 'top',
    pt: 1
  }
} as const;

export function SubscriptionsTable(props: SubscriptionsTableProps): JSX.Element {
  const {
    isPending,
    rows,
    sortField,
    sortDirection,
    selectedIds,
    allSelected,
    someSelected,
    total,
    isSelectingAll,
    accountPropertiesCountById,
    accountTotalBillableUnitsById,
    isAccountPropertiesCountPending,
    page,
    pageSize,
    onToggleAllSelection,
    onSort,
    onToggleRowSelection,
    onEditSubscription,
    onEditPricing,
    onDeleteSubscription,
    onCreateSubscription,
    onPageChange,
    onPageSizeChange,
    canManageSubscriptions,
    canOpenPricingEditor
  } = props;

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <TableContainer sx={{ flex: 1, minHeight: 0 }}>
        <Table size="small" stickyHeader sx={tableSx}>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  disabled={isPending || isSelectingAll || total === 0 || !canManageSubscriptions}
                  onChange={onToggleAllSelection}
                  size="small"
                  sx={{ p: 0.5 }}
                  inputProps={{ 'aria-label': 'Select all subscriptions' }}
                />
              </TableCell>

              {sortHeaderCells.map((cell) => (
                <TableCell
                  key={cell.field}
                  sortDirection={sortField === cell.field ? sortDirection : false}
                  sx={cell.sx}
                >
                  <TableSortLabel
                    active={sortField === cell.field}
                    direction={sortField === cell.field ? sortDirection : 'asc'}
                    onClick={() => onSort(cell.field)}
                  >
                    {cell.label}
                  </TableSortLabel>
                </TableCell>
              ))}

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
              rows.map((subscription) => (
                <SubscriptionsTableRowItem
                  key={subscription.id}
                  subscription={subscription}
                  isSelected={selectedIds.includes(subscription.id)}
                  accountPropertiesCountById={accountPropertiesCountById}
                  accountTotalBillableUnitsById={accountTotalBillableUnitsById}
                  isAccountPropertiesCountPending={isAccountPropertiesCountPending}
                  canManageSubscriptions={canManageSubscriptions}
                  canOpenPricingEditor={canOpenPricingEditor}
                  onToggleRowSelection={onToggleRowSelection}
                  onEditSubscription={onEditSubscription}
                  onEditPricing={onEditPricing}
                  onDeleteSubscription={onDeleteSubscription}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={10}>
                  <EmptyState
                    title="No subscriptions found"
                    description="Adjust filters or create your first subscription."
                    actionLabel={canManageSubscriptions ? 'New subscription' : undefined}
                    onActionClick={canManageSubscriptions ? onCreateSubscription : undefined}
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
