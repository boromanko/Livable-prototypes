import { Stack } from '@mui/material';
import type { PricingTreeItem } from '../../../api';
import type {
  OpenEditPricing,
  PricingActionsMenuTarget
} from './pricingTree.types';
import {
  PricingTreePricingActions,
  PricingTreePricingLeftContent,
  PricingTreePricingValueGrid
} from './PricingTreePricingRowParts';
import {
  PRICING_ROW_STICKY_TOP,
  PRODUCT_ROW_STICKY_TOP,
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
      <PricingTreePricingLeftContent
        pricing={pricing}
        groupByProduct={groupByProduct}
        isPricingExpanded={isPricingExpanded}
        hasAccountRows={hasAccountRows}
        hasSpecificPropertyRows={hasSpecificPropertyRows}
        accountRowsCount={accountRowsCount}
        specificPropertiesCount={specificPropertiesCount}
        togglePricingFromCaret={togglePricingFromCaret}
        togglePricingSectionLink={togglePricingSectionLink}
      />

      <PricingTreePricingValueGrid
        pricing={pricing}
        productTierColumnCount={productTierColumnCount}
      />

      <PricingTreePricingActions
        pricing={pricing}
        openEditPricing={openEditPricing}
        setDeletingPricing={setDeletingPricing}
        setPricingActionsTarget={setPricingActionsTarget}
      />
    </Stack>
  );
}
