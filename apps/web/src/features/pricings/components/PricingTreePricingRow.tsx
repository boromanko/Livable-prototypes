import { Stack } from '@mui/material';
import type { PricingTreeItem } from '../../../api';
import type { OpenEditPricing } from './pricingTree.types';
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
  groupByProduct: boolean;
  productTierColumnCount: number;
  isPricingExpanded: boolean;
  hasSubscriptions: boolean;
  subscriptionsCount: number;
  togglePricingFromCaret: (pricingId: string) => void;
  togglePricingSectionLink: (pricingId: string, section: 'subscriptions') => void;
  openEditPricing: OpenEditPricing;
  setDeletingPricing: React.Dispatch<React.SetStateAction<PricingTreeItem | null>>;
  selected: boolean;
  onToggleSelection: () => void;
  canManagePricings: boolean;
};

export function PricingTreePricingRow(props: PricingTreePricingRowProps): JSX.Element {
  const {
    pricing,
    groupByProduct,
    productTierColumnCount,
    isPricingExpanded,
    hasSubscriptions,
    subscriptionsCount,
    togglePricingFromCaret,
    togglePricingSectionLink,
    openEditPricing,
    setDeletingPricing,
    selected,
    onToggleSelection,
    canManagePricings
  } = props;

  return (
    <Stack
      direction="row"
      alignItems="stretch"
      spacing={0}
      onClick={() => {
        if (canManagePricings) {
          openEditPricing(pricing);
        }
      }}
      sx={{
        minHeight: 44,
        px: 1.5,
        py: 0.25,
        borderTop: 'none',
        borderBottom: '1px solid #E1E7EC',
        backgroundColor: '#FFFFFF',
        transition: 'background-color 120ms ease',
        cursor: canManagePricings ? 'pointer' : 'default',
        ...(canManagePricings
          ? {
              '&:hover': {
                backgroundColor: '#F8FBFD'
              }
            }
          : {}),
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
        hasSubscriptions={hasSubscriptions}
        subscriptionsCount={subscriptionsCount}
        togglePricingFromCaret={togglePricingFromCaret}
        togglePricingSectionLink={togglePricingSectionLink}
        selected={selected}
        onToggleSelection={onToggleSelection}
        canManagePricings={canManagePricings}
      />

      <PricingTreePricingValueGrid
        pricing={pricing}
        productTierColumnCount={productTierColumnCount}
      />

      <PricingTreePricingActions
        pricing={pricing}
        openEditPricing={openEditPricing}
        setDeletingPricing={setDeletingPricing}
        canManagePricings={canManagePricings}
      />
    </Stack>
  );
}
