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
};

export function PricingTreeUsageTierGrid(props: PricingTreeUsageTierGridProps): JSX.Element {
  const { pricing, productTierColumnCount, entityId, currentTier, rowHeight } = props;
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
            borderLeft: '1px solid #E1E7EC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {columnIndex === activeTierColumnIndex ? <TierMatchIndicator /> : null}
        </Box>
      ))}
    </Box>
  );
}
