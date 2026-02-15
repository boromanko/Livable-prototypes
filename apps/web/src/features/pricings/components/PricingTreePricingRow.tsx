import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { Box, Link, Stack, Typography } from '@mui/material';
import type { PricingTreeItem } from '../../../api';
import { AppIconButton } from '../../../components/buttons';
import { formatMoneyCents } from '../../../lib/format/money';
import type {
  OpenEditPricing,
  PricingActionsMenuTarget
} from './pricingTree.types';
import {
  ACTIONS_COLUMN_WIDTH,
  LEFT_CONTENT_MIN_WIDTH,
  PRICING_ROW_STICKY_TOP,
  PRODUCT_ROW_STICKY_TOP,
  TIER_COLUMN_MIN_WIDTH,
  TREE_INDENT_STEP,
  TREE_LABEL_GAP,
  TREE_TOGGLE_SLOT_WIDTH,
  getTierForColumn,
  getTierRangeLabel
} from '../pricingsTab.utils';

type PricingTreePricingRowProps = {
  pricing: PricingTreeItem;
  pricingIndex: number;
  groupByProduct: boolean;
  productTierColumnCount: number;
  isPricingExpanded: boolean;
  hasAccountRows: boolean;
  hasSpecificPropertyRows: boolean;
  accountRowsCount: number;
  specificPropertiesCount: number;
  togglePricingFromCaret: (pricingId: string) => void;
  togglePricingSectionLink: (pricingId: string, section: 'accounts' | 'specific-properties') => void;
  openEditPricing: OpenEditPricing;
  setDeletingPricing: React.Dispatch<React.SetStateAction<PricingTreeItem | null>>;
  setPricingActionsTarget: React.Dispatch<React.SetStateAction<PricingActionsMenuTarget | null>>;
};

export function PricingTreePricingRow(props: PricingTreePricingRowProps): JSX.Element {
  const {
    pricing,
    pricingIndex,
    groupByProduct,
    productTierColumnCount,
    isPricingExpanded,
    hasAccountRows,
    hasSpecificPropertyRows,
    accountRowsCount,
    specificPropertiesCount,
    togglePricingFromCaret,
    togglePricingSectionLink,
    openEditPricing,
    setDeletingPricing,
    setPricingActionsTarget
  } = props;

  return (
    <Stack
      direction="row"
      alignItems="stretch"
      spacing={0}
      onClick={() => openEditPricing(pricing)}
      sx={{
        minHeight: 44,
        px: 1.5,
        py: 0.25,
        borderTop:
          groupByProduct || pricingIndex > 0
            ? '1px solid #E1E7EC'
            : 'none',
        backgroundColor: '#FFFFFF',
        transition: 'background-color 120ms ease',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: '#F8FBFD'
        },
        '& .pricing-row-cell': {
          backgroundColor: 'inherit',
          transition: 'background-color 120ms ease'
        },
        position: 'sticky',
        top: groupByProduct ? PRICING_ROW_STICKY_TOP : PRODUCT_ROW_STICKY_TOP,
        zIndex: 24
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={0}
        sx={{ flex: 1, minWidth: LEFT_CONTENT_MIN_WIDTH }}
      >
        <Box sx={{ width: groupByProduct ? TREE_INDENT_STEP : 0 }} />
        <Box sx={{ width: TREE_TOGGLE_SLOT_WIDTH, display: 'flex', justifyContent: 'center' }}>
          <AppIconButton
            tone="plain"
            sx={{ width: TREE_TOGGLE_SLOT_WIDTH, height: TREE_TOGGLE_SLOT_WIDTH, p: 0 }}
            onClick={(event) => {
              event.stopPropagation();
              togglePricingFromCaret(pricing.id);
            }}
            aria-label={isPricingExpanded ? 'Collapse pricing' : 'Expand pricing'}
          >
            {isPricingExpanded ? (
              <ExpandMoreIcon fontSize="small" />
            ) : (
              <ChevronRightIcon fontSize="small" />
            )}
          </AppIconButton>
        </Box>
        <Box sx={{ width: TREE_LABEL_GAP }} />
        <Stack spacing={0.25}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Typography sx={{ fontWeight: 600, fontSize: 15, color: '#212934' }}>
              {pricing.internalName}
            </Typography>
            <Typography sx={{ fontWeight: 600, fontSize: 16, lineHeight: 1, color: '#B8C4CE' }}>
              |
            </Typography>
            <Typography
              sx={{
                fontWeight: 600,
                fontSize: 14,
                lineHeight: 1.1,
                color: pricing.type === 'TIERED' ? '#1F9D55' : '#2B6CB0',
                backgroundColor: pricing.type === 'TIERED' ? '#E8F7EF' : '#E9F2FC',
                py: '2px',
                px: '4px',
                borderRadius: '2px'
              }}
            >
              {pricing.type === 'TIERED' ? 'Tiered' : 'Fixed'}
            </Typography>
            {hasAccountRows || hasSpecificPropertyRows ? (
              <Typography sx={{ fontWeight: 600, fontSize: 16, lineHeight: 1, color: '#B8C4CE' }}>
                |
              </Typography>
            ) : null}
            {hasAccountRows ? (
              <Link
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  togglePricingSectionLink(pricing.id, 'accounts');
                }}
                sx={{
                  fontWeight: 600,
                  fontSize: 15,
                  color: '#98A4B3',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                {accountRowsCount} Accounts
              </Link>
            ) : null}
            {hasAccountRows && hasSpecificPropertyRows ? (
              <Typography sx={{ fontWeight: 600, fontSize: 16, lineHeight: 1, color: '#B8C4CE' }}>
                |
              </Typography>
            ) : null}
            {hasSpecificPropertyRows ? (
              <Link
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  togglePricingSectionLink(pricing.id, 'specific-properties');
                }}
                sx={{
                  fontWeight: 600,
                  fontSize: 15,
                  color: '#98A4B3',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                {specificPropertiesCount} Properties
              </Link>
            ) : null}
          </Stack>
          {!groupByProduct ? (
            <Typography
              sx={{
                fontSize: 11,
                lineHeight: 1.1,
                color: '#7A8EA8',
                fontWeight: 600
              }}
            >
              {pricing.product.name}
            </Typography>
          ) : null}
        </Stack>
      </Stack>

      <Box
        sx={{
          ml: 'auto',
          flexShrink: 0,
          display: 'grid',
          gridTemplateColumns: `repeat(${productTierColumnCount}, minmax(${TIER_COLUMN_MIN_WIDTH}px, 1fr))`
        }}
      >
        {Array.from({ length: productTierColumnCount }).map((_, columnIndex) => {
          const tier = getTierForColumn(pricing, productTierColumnCount, columnIndex);
          const isFixedCell =
            pricing.type === 'FIXED' && columnIndex === productTierColumnCount - 1;

          return (
            <Box
              className="pricing-row-cell"
              key={`${pricing.id}:pricing-cell:${columnIndex}`}
              sx={{
                minHeight: 44,
                px: 1.25,
                py: 0.5,
                borderLeft: '1px solid #E1E7EC',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 0.125
              }}
            >
              {isFixedCell ? (
                <>
                  <Typography sx={{ fontSize: 11, color: '#6F8298', fontWeight: 600 }}>
                    FIXED
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#212934',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {formatMoneyCents(pricing.fixedAmountCents, pricing.currency)}
                  </Typography>
                </>
              ) : tier ? (
                <>
                  <Typography
                    sx={{
                      fontSize: 11,
                      color: '#6F8298',
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}
                  >
                    {getTierRangeLabel(tier)} Units
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#212934',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {formatMoneyCents(tier.unitAmountCents, pricing.currency)}
                  </Typography>
                </>
              ) : null}
            </Box>
          );
        })}
      </Box>

      <Stack
        className="pricing-row-cell"
        direction="row"
        alignItems="center"
        spacing={0.25}
        sx={{
          width: ACTIONS_COLUMN_WIDTH,
          pl: 0.75,
          flexShrink: 0,
          justifyContent: 'flex-end',
          alignSelf: 'stretch',
          borderLeft: '1px solid #E1E7EC'
        }}
      >
        <AppIconButton
          tone="ghost"
          onClick={(event) => {
            event.stopPropagation();
            openEditPricing(pricing);
          }}
        >
          <EditIcon fontSize="small" />
        </AppIconButton>

        <AppIconButton
          tone="ghost"
          onClick={(event) => {
            event.stopPropagation();
            setDeletingPricing(pricing);
          }}
        >
          <DeleteIcon fontSize="small" />
        </AppIconButton>

        <AppIconButton
          tone="ghost"
          onClick={(event) => {
            event.stopPropagation();
            setPricingActionsTarget({
              anchorEl: event.currentTarget,
              pricingId: pricing.id
            });
          }}
        >
          <MoreHorizIcon fontSize="small" />
        </AppIconButton>
      </Stack>
    </Stack>
  );
}
