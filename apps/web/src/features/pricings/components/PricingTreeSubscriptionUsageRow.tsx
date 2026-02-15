import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { Box, Chip, Link, Stack, Tooltip, Typography } from '@mui/material';
import type { PricingTreeItem, PricingTreeSubscriptionSummary } from '../../../api';
import { AppIconButton } from '../../../components/buttons';
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

type PricingTreeSubscriptionUsageRowProps = {
  pricing: PricingTreeItem;
  productTierColumnCount: number;
  subscription: PricingTreeSubscriptionSummary;
  showSubscriptionsSectionHeader: boolean;
  setDetachConfirmTarget: React.Dispatch<React.SetStateAction<DetachConfirmTarget | null>>;
};

const statusColorBySubscription: Record<
  PricingTreeSubscriptionSummary['status'],
  'default' | 'success' | 'warning' | 'error'
> = {
  DRAFT: 'default',
  ACTIVE: 'success',
  PAUSED: 'warning',
  CANCELED: 'error'
};

export function PricingTreeSubscriptionUsageRow(
  props: PricingTreeSubscriptionUsageRowProps
): JSX.Element {
  const {
    pricing,
    productTierColumnCount,
    subscription,
    showSubscriptionsSectionHeader,
    setDetachConfirmTarget
  } = props;

  const scopeLabel = subscription.scope === 'ACCOUNT' ? 'Account-level' : 'Property-level';
  const propertiesLabel = subscription.coverageLabel;

  return (
    <Stack direction="row" alignItems="stretch" spacing={0} sx={{ minHeight: 44, px: 1.5, borderTop: '1px dotted #E1E7EC' }}>
      <Stack direction="row" alignItems="center" spacing={0} sx={{ flex: 1, minWidth: LEFT_CONTENT_MIN_WIDTH }}>
        <Box sx={{ width: TREE_INDENT_STEP * (showSubscriptionsSectionHeader ? 3 : 2) }} />
        <Box sx={{ width: showSubscriptionsSectionHeader ? TREE_TOGGLE_SLOT_WIDTH : 0 }} />
        <Box sx={{ width: TREE_LABEL_GAP }} />
        <Box sx={{ mr: 1 }}>
          <EntityTypeIndicator type={subscription.scope === 'ACCOUNT' ? 'ACCOUNT' : 'PROPERTY'} />
        </Box>

        <Stack spacing={0.25} sx={{ py: 0.5 }}>
          <Link
            href="#"
            onClick={(event) => event.preventDefault()}
            sx={{ ...CLICKABLE_ENTITY_LINK_SX, minWidth: 260, fontSize: 14 }}
          >
            {subscription.account.companyName}
          </Link>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography sx={{ fontSize: 11, lineHeight: 1.1, color: '#7A8EA8', fontWeight: 600 }}>
              {scopeLabel}
            </Typography>
            <Chip
              size="small"
              label={subscription.status}
              color={statusColorBySubscription[subscription.status]}
              sx={{ height: 20, fontSize: 10, fontWeight: 700 }}
            />
          </Stack>
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
            borderLeft: '1px solid #E1E7EC',
            display: 'flex',
            alignItems: 'center',
            color: '#212934',
            fontSize: 13,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {propertiesLabel}
        </Box>
        <Box
          sx={{
            minHeight: 44,
            px: 1.25,
            borderLeft: '1px solid #E1E7EC',
            display: 'flex',
            alignItems: 'center',
            color: '#98A4B3',
            fontSize: 12,
            fontWeight: 600
          }}
        >
          Subscription
        </Box>
      </Box>

      <PricingTreeUsageTierGrid
        pricing={pricing}
        productTierColumnCount={productTierColumnCount}
        entityId={subscription.id}
        currentTier={null}
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
          borderLeft: '1px solid #E1E7EC'
        }}
      >
        <Tooltip title="Detach pricing from subscription">
          <AppIconButton
            tone="ghost"
            aria-label={`Detach pricing from ${subscription.account.companyName}`}
            onClick={() =>
              setDetachConfirmTarget({
                pricingId: pricing.id,
                subscriptionId: subscription.id,
                title: `Detach pricing from ${scopeLabel.toLowerCase()} subscription (${subscription.account.companyName})`
              })
            }
          >
            <CancelOutlinedIcon fontSize="small" />
          </AppIconButton>
        </Tooltip>
      </Box>
    </Stack>
  );
}
