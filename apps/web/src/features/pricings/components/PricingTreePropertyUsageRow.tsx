import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { Box, Link, Stack, Tooltip } from '@mui/material';
import type { PricingTreeAccountUsage, PricingTreeItem, PricingTreePropertyUsage } from '../../../api';
import { AppIconButton } from '../../../components/buttons';
import { prototypeTokens } from '../../../theme/tokens';
import { EntityTypeIndicator } from './PricingTreeIndicators';
import { PricingTreeUsageTierGrid } from './PricingTreeUsageTierGrid';
import type { DetachConfirmTarget } from './pricingTree.types';
import {
  ACTIONS_COLUMN_WIDTH,
  CLICKABLE_ENTITY_LINK_SX,
  LEFT_CONTENT_MIN_WIDTH,
  PROPERTIES_COLUMN_WIDTH,
  TREE_INDENT_STEP,
  TREE_LABEL_GAP,
  TREE_TOGGLE_SLOT_WIDTH,
  UNITS_COLUMN_WIDTH
} from '../pricingsTab.utils';

type PricingTreePropertyUsageRowProps = {
  pricing: PricingTreeItem;
  productTierColumnCount: number;
  accountUsage: PricingTreeAccountUsage;
  propertyUsage: PricingTreePropertyUsage;
  showPropertiesSectionHeader: boolean;
  setDetachConfirmTarget: React.Dispatch<React.SetStateAction<DetachConfirmTarget | null>>;
};

export function PricingTreePropertyUsageRow(props: PricingTreePropertyUsageRowProps): JSX.Element {
  const {
    pricing,
    productTierColumnCount,
    accountUsage,
    propertyUsage,
    showPropertiesSectionHeader,
    setDetachConfirmTarget
  } = props;

  return (
    <Stack
      direction="row"
      alignItems="stretch"
      spacing={0}
      sx={{ minHeight: 44, px: 1.5, borderTop: `1px dotted ${prototypeTokens.color.border.default}` }}
    >
      <Stack direction="row" alignItems="center" spacing={0} sx={{ flex: 1, minWidth: LEFT_CONTENT_MIN_WIDTH }}>
        <Box sx={{ width: TREE_INDENT_STEP * (showPropertiesSectionHeader ? 3 : 2) }} />
        <Box sx={{ width: showPropertiesSectionHeader ? TREE_TOGGLE_SLOT_WIDTH : 0 }} />
        <Box sx={{ width: TREE_LABEL_GAP }} />
        <Box sx={{ mr: 1 }}>
          <EntityTypeIndicator type="PROPERTY" />
        </Box>

        <Stack spacing={0} sx={{ py: 0.5 }}>
          <Link
            href="#"
            onClick={(event) => event.preventDefault()}
            sx={{ ...CLICKABLE_ENTITY_LINK_SX, fontSize: 13, lineHeight: 1.1 }}
          >
            {propertyUsage.property.address}
          </Link>
          <Link
            href="#"
            onClick={(event) => event.preventDefault()}
            sx={{
              ...CLICKABLE_ENTITY_LINK_SX,
              fontSize: 11,
              lineHeight: 1.1,
              color: prototypeTokens.color.text.tertiary
            }}
          >
            {accountUsage.account.companyName}
          </Link>
        </Stack>
      </Stack>

      <Box
        sx={{
          ml: 'auto',
          flexShrink: 0,
          display: 'grid',
          gridTemplateColumns: `${PROPERTIES_COLUMN_WIDTH}px ${UNITS_COLUMN_WIDTH}px`
        }}
      >
        <Box
          sx={{
            minHeight: 44,
            px: 1.25,
            borderLeft: `1px solid ${prototypeTokens.color.border.default}`
          }}
        />
        <Box
          sx={{
            minHeight: 44,
            px: 1.25,
            borderLeft: `1px solid ${prototypeTokens.color.border.default}`,
            display: 'flex',
            alignItems: 'center',
            color: prototypeTokens.color.text.primary,
            fontSize: 13,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {propertyUsage.property.billableUnits} units
        </Box>
      </Box>

      <PricingTreeUsageTierGrid
        pricing={pricing}
        productTierColumnCount={productTierColumnCount}
        entityId={propertyUsage.property.id}
        currentTier={propertyUsage.currentTier}
        rowHeight={44}
      />

      <Box
        sx={{
          width: ACTIONS_COLUMN_WIDTH,
          pl: 0.75,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          borderLeft: `1px solid ${prototypeTokens.color.border.default}`
        }}
      >
        {propertyUsage.resolvedBySubscriptionId ? (
          <Tooltip title="Detach pricing from property">
            <AppIconButton
              tone="ghost"
              aria-label={`Detach pricing from ${propertyUsage.property.address}`}
              onClick={() =>
                setDetachConfirmTarget({
                  pricingId: pricing.id,
                  subscriptionId: propertyUsage.resolvedBySubscriptionId ?? '',
                  title: `Detach override from ${propertyUsage.property.address}`
                })
              }
            >
              <CancelOutlinedIcon fontSize="small" />
            </AppIconButton>
          </Tooltip>
        ) : null}
      </Box>
    </Stack>
  );
}
