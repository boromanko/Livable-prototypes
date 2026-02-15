import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import FilterListIcon from '@mui/icons-material/FilterList';
import { Box, Checkbox, FormControlLabel, Stack, TextField, Tooltip } from '@mui/material';
import { PrimaryButton, SecondaryButton } from '../../../components/buttons';
import { FiltersToolbar } from '../../../components/layout';
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
  groupByProduct: boolean;
  onGroupByProductChange: (checked: boolean) => void;
  onAddPricing: () => void;
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
    groupByProduct,
    onGroupByProductChange,
    onAddPricing
  } = props;

  return (
    <Box sx={{ px: { xs: 1.5, sm: 2 }, py: 1.5, borderBottom: '1px solid #E1E7EC' }}>
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

            <Box
              sx={{
                display: 'flex',
                alignItems: 'stretch',
                p: '1px',
                backgroundColor: '#D7DEE6',
                borderRadius: 1,
                overflow: 'hidden'
              }}
            >
              <SecondaryButton
                onClick={onOpenFilters}
                startIcon={<FilterListIcon fontSize="small" />}
                sx={{
                  border: 'none',
                  borderRadius: 0,
                  px: 1.5
                }}
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
              </SecondaryButton>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'stretch',
                gap: '1px',
                p: '1px',
                backgroundColor: '#D7DEE6',
                borderRadius: 1,
                overflow: 'hidden'
              }}
            >
              <SecondaryButton
                onClick={onOpenSortMenu}
                sx={{
                  width: 'auto',
                  minWidth: 'unset',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  border: 'none',
                  borderRadius: 0,
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0,
                  px: 1.5
                }}
              >
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Box component="span">{SORT_FIELD_LABELS[sortBy]}</Box>
                  <ArrowDropDownIcon sx={{ fontSize: 18 }} />
                </Stack>
              </SecondaryButton>
              <Tooltip title={sortDirection === 'ASC' ? 'Ascending' : 'Descending'}>
                <SecondaryButton
                  onClick={onToggleSortDirection}
                  sx={{
                    width: 40,
                    minWidth: 40,
                    height: '100%',
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    border: 'none',
                    borderRadius: 0,
                    px: 0
                  }}
                >
                  {sortDirection === 'ASC' ? (
                    <ArrowUpwardIcon fontSize="small" />
                  ) : (
                    <ArrowDownwardIcon fontSize="small" />
                  )}
                </SecondaryButton>
              </Tooltip>
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={groupByProduct}
                  onChange={(event) => onGroupByProductChange(event.target.checked)}
                />
              }
              label="Group by product"
              sx={{ ml: 0.5, mr: 0, '& .MuiFormControlLabel-label': { fontSize: 13, color: '#4B617C' } }}
            />
          </>
        }
        right={
          <PrimaryButton startIcon={<AddIcon />} onClick={onAddPricing}>
            Add pricing
          </PrimaryButton>
        }
      />
    </Box>
  );
}
