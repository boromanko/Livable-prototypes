import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import { Box, Checkbox, FormControlLabel, Stack, TextField, Tooltip } from '@mui/material';
import { AppSplitButton, BorderedButton, PrimaryButton } from '../../../components/buttons';
import { FiltersToolbar, FilterTriggerButton } from '../../../components/layout';
import { prototypeTokens } from '../../../theme/tokens';
import { SORT_FIELD_LABELS, type PricingSortField, type SortDirection } from '../pricingsTab.utils';

type PricingsToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  activeFiltersCount: number;
  onOpenFilters: (event: React.MouseEvent<HTMLElement>) => void;
  sortBy: PricingSortField;
  sortDirection: SortDirection;
  onOpenSortMenu: (event: React.MouseEvent<HTMLElement>) => void;
  onToggleSortDirection: () => void;
  allRowsExpanded: boolean;
  onToggleExpandAll: () => void;
  expandAllDisabled?: boolean;
  groupByProduct: boolean;
  onGroupByProductChange: (checked: boolean) => void;
  onAddPricing: () => void;
  canManagePricings: boolean;
};

export function PricingsToolbar(props: PricingsToolbarProps): JSX.Element {
  const {
    search,
    onSearchChange,
    activeFiltersCount,
    onOpenFilters,
    sortBy,
    sortDirection,
    onOpenSortMenu,
    onToggleSortDirection,
    allRowsExpanded,
    onToggleExpandAll,
    expandAllDisabled = false,
    groupByProduct,
    onGroupByProductChange,
    onAddPricing,
    canManagePricings
  } = props;

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
              placeholder="Product, pricing, account, property"
              sx={{ minWidth: { md: 220 } }}
            />

            <FilterTriggerButton
              activeFiltersCount={activeFiltersCount}
              onClick={onOpenFilters}
            />

            <Tooltip title={sortDirection === 'ASC' ? 'Ascending' : 'Descending'}>
              <AppSplitButton
                mainLabel={
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Box component="span">{SORT_FIELD_LABELS[sortBy]}</Box>
                    <ArrowDropDownIcon sx={{ fontSize: 18 }} />
                  </Stack>
                }
                onMainClick={onOpenSortMenu}
                mainButtonProps={{
                  'aria-haspopup': 'menu',
                  sx: {
                    width: 'auto',
                    minWidth: 'unset',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    px: 1.5
                  }
                }}
                auxIcon={sortDirection === 'ASC' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
                onAuxClick={onToggleSortDirection}
                auxButtonProps={{
                  'aria-label': sortDirection === 'ASC' ? 'Switch to descending sort' : 'Switch to ascending sort'
                }}
              />
            </Tooltip>

            <BorderedButton
              onClick={onToggleExpandAll}
              disabled={expandAllDisabled}
              sx={{ px: 1.5 }}
            >
              {allRowsExpanded ? 'Collapse all' : 'Expand all'}
            </BorderedButton>

            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={groupByProduct}
                  onChange={(event) => onGroupByProductChange(event.target.checked)}
                />
              }
              label="Group by product"
              sx={{
                ml: 0.5,
                mr: 0,
                '& .MuiFormControlLabel-label': {
                  fontSize: 13,
                  color: prototypeTokens.color.text.secondary
                }
              }}
            />
          </>
        }
        right={
          canManagePricings ? (
            <PrimaryButton startIcon={<AddIcon />} onClick={onAddPricing}>
              New pricing
            </PrimaryButton>
          ) : null
        }
      />
    </Box>
  );
}
