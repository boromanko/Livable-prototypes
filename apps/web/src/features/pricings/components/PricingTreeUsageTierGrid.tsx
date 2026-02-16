import { Box } from '@mui/material';
import type { PricingTreeAccountUsage, PricingTreeItem, PricingTreePropertyUsage } from '../../../api';
import { TierMatchIndicator } from './PricingTreeIndicators';
import { TIER_COLUMN_MIN_WIDTH, getActiveTierColumnIndex } from '../pricingsTab.utils';

type PricingTreeUsageTierGridProps = {
  pricing: PricingTreeItem;
  productTierColumnCount: number;
  entityId: string;
  currentTier: PricingTreeAccountUsage['currentTier'] | PricingTreePropertyUsage['currentTier'];
  rowHeight: number;
  showColumnDividers?: boolean;
};

export function PricingTreeUsageTierGrid(props: PricingTreeUsageTierGridProps): JSX.Element {
  const {
    pricing,
    productTierColumnCount,
    entityId,
    currentTier,
    rowHeight,
    showColumnDividers = true
  } = props;
  const activeTierColumnIndex = getActiveTierColumnIndex(pricing, productTierColumnCount, currentTier);

  return (
    <Box
      sx={{
        flexShrink: 0,
        display: 'grid',
        gridTemplateColumns: `repeat(${productTierColumnCount}, minmax(${TIER_COLUMN_MIN_WIDTH}px, 1fr))`
      }}
    >
      {Array.from({ length: productTierColumnCount }).map((_, columnIndex) => (
        <Box
          key={`${pricing.id}:${entityId}:tier-check:${columnIndex}`}
          sx={{
            minHeight: rowHeight,
            px: 1.25,
            borderLeft: showColumnDividers ? '1px solid #E1E7EC' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start'
          }}
        >
          {columnIndex === activeTierColumnIndex ? <TierMatchIndicator /> : null}
        </Box>
      ))}
    </Box>
  );
}
