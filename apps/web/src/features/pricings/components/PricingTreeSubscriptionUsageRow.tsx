import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import type {
  PricingTreeItem,
  PricingTreeResolvedTier,
  PricingTreeSubscriptionSummary
} from '../../../api';
import { AppIconButton } from '../../../components/buttons';
import { PricingTreeUsageTierGrid } from './PricingTreeUsageTierGrid';
import type { DetachConfirmTarget, OpenEditSubscription } from './pricingTree.types';
import {
  ACTIONS_COLUMN_WIDTH,
  LEFT_CONTENT_MIN_WIDTH,
  TREE_INDENT_STEP,
  TREE_LABEL_GAP,
  TREE_SELECTION_SLOT_WIDTH
} from '../pricingsTab.utils';

type PricingTreeSubscriptionUsageRowProps = {
  pricing: PricingTreeItem;
  groupByProduct: boolean;
  productTierColumnCount: number;
  subscription: PricingTreeSubscriptionSummary;
  isLast: boolean;
  onEditSubscription: OpenEditSubscription;
  setDetachConfirmTarget: React.Dispatch<React.SetStateAction<DetachConfirmTarget | null>>;
  canManagePricings: boolean;
};

const SCOPE_COLUMN_WIDTH = 108;
const PROPERTIES_COLUMN_WIDTH_COMPACT = 110;
const UNITS_COLUMN_WIDTH_COMPACT = 100;

export function PricingTreeSubscriptionUsageRow(
  props: PricingTreeSubscriptionUsageRowProps
): JSX.Element {
  const {
    pricing,
    groupByProduct,
    productTierColumnCount,
    subscription,
    isLast,
    onEditSubscription,
    setDetachConfirmTarget,
    canManagePricings
  } = props;

  const scopeLabel = subscription.scope === 'ACCOUNT' ? 'Acct. Level' : 'Prop. Level';
  const propertiesLabel = `${subscription.propertiesCount} Prop.`;
  const unitsLabel = formatUnitsLabel(subscription.unitsCount);
  const currentTier = getSubscriptionCurrentTier(pricing, subscription.unitsCount);

  return (
    <Stack
      direction="row"
      alignItems="stretch"
      spacing={0}
      role="button"
      tabIndex={0}
      onClick={() => onEditSubscription(subscription.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onEditSubscription(subscription.id);
        }
      }}
      sx={{
        minHeight: 44,
        px: 1.5,
        borderBottom: isLast ? '1px solid #E1E7EC' : 'none',
        cursor: 'pointer',
        transition: 'background-color 120ms ease',
        '&:hover': {
          backgroundColor: '#F8FBFD'
        }
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0} sx={{ flex: 1, minWidth: LEFT_CONTENT_MIN_WIDTH }}>
        {canManagePricings ? <Box sx={{ width: TREE_SELECTION_SLOT_WIDTH }} /> : null}
        <Box sx={{ width: TREE_INDENT_STEP * (groupByProduct ? 3 : 2) }} />
        <Box sx={{ width: TREE_LABEL_GAP }} />
        <Stack spacing={0.25} sx={{ py: 0.5 }}>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography sx={{ fontSize: 14, fontWeight: 400, color: '#212934' }}>
              {subscription.account.companyName}
            </Typography>
            <Typography
              component="span"
              sx={{
                ...getSubscriptionStatusTagSx(),
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              {formatSubscriptionStatusLabel(subscription.status)}
            </Typography>
          </Stack>
        </Stack>
      </Stack>

      <Box
        sx={{
          ml: 'auto',
          flexShrink: 0,
          display: 'grid',
          gridTemplateColumns: `${SCOPE_COLUMN_WIDTH}px ${PROPERTIES_COLUMN_WIDTH_COMPACT}px ${UNITS_COLUMN_WIDTH_COMPACT}px`
        }}
      >
        <Box
          sx={{
            minHeight: 44,
            px: 1,
            display: 'flex',
            alignItems: 'center',
            color: '#6F8298',
            fontSize: 13,
            fontWeight: 500,
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {scopeLabel}
        </Box>
        <Box
          sx={{
            minHeight: 44,
            px: 1,
            display: 'flex',
            alignItems: 'center',
            color: '#6F8298',
            fontSize: 13,
            fontWeight: 500
          }}
        >
          {propertiesLabel}
        </Box>
        <Box
          sx={{
            minHeight: 44,
            px: 1,
            display: 'flex',
            alignItems: 'center',
            color: '#6F8298',
            fontSize: 13,
            fontWeight: 500,
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {unitsLabel}
        </Box>
      </Box>

      <PricingTreeUsageTierGrid
        pricing={pricing}
        productTierColumnCount={productTierColumnCount}
        entityId={subscription.id}
        currentTier={currentTier}
        rowHeight={44}
        showColumnDividers={false}
      />

      {canManagePricings ? (
        <Box
          sx={{
            width: ACTIONS_COLUMN_WIDTH,
            pl: 0.75,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            borderLeft: 'none'
          }}
        >
          <Tooltip title="Detach pricing from subscription">
            <AppIconButton
              tone="ghost"
              aria-label={`Detach pricing from ${subscription.account.companyName}`}
              onClick={(event) => {
                event.stopPropagation();
                setDetachConfirmTarget({
                  pricingId: pricing.id,
                  subscriptionId: subscription.id,
                  title: `Detach pricing from ${scopeLabel.toLowerCase()} subscription (${subscription.account.companyName})`
                });
              }}
            >
              <CancelOutlinedIcon fontSize="small" />
            </AppIconButton>
          </Tooltip>
        </Box>
      ) : null}
    </Stack>
  );
}

function getSubscriptionStatusTagSx(): Record<string, string | number> {
  return {
    color: 'rgba(0, 0, 0, 0.3)',
    backgroundColor: 'transparent',
    py: 0,
    px: 0,
    borderRadius: 0,
    fontWeight: 500,
    fontSize: 13
  };
}

function formatSubscriptionStatusLabel(status: PricingTreeSubscriptionSummary['status']): string {
  if (status === 'ACTIVE') {
    return 'Active';
  }

  if (status === 'DRAFT') {
    return 'Draft';
  }

  if (status === 'PAUSED') {
    return 'Paused';
  }

  return 'Canceled';
}

function formatUnitsLabel(unitsCount: number): string {
  return `${unitsCount} unit${unitsCount === 1 ? '' : 's'}`;
}

function getSubscriptionCurrentTier(
  pricing: PricingTreeItem,
  unitsCount: number
): PricingTreeResolvedTier {
  if (pricing.type === 'FIXED') {
    return null;
  }

  if (unitsCount <= 0 || pricing.tiers.length === 0) {
    return null;
  }

  return (
    pricing.tiers.find(
      (tier) => unitsCount >= tier.fromUnit && (tier.toUnit === null || unitsCount <= tier.toUnit)
    ) ?? null
  );
}
