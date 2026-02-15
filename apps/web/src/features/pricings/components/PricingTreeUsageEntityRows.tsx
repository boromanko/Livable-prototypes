import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { Box, Link, Stack, Tooltip } from '@mui/material';
import type { PricingTreeAccountUsage, PricingTreeItem, PricingTreePropertyUsage } from '../../../api';
import { AppIconButton } from '../../../components/buttons';
import { EntityTypeIndicator, TierMatchIndicator } from './PricingTreeIndicators';
import type { DetachConfirmTarget } from './pricingTree.types';
import {
  ACTIONS_COLUMN_WIDTH,
  CLICKABLE_ENTITY_LINK_SX,
  LEFT_CONTENT_MIN_WIDTH,
  PROPERTIES_COLUMN_WIDTH,
  TIER_COLUMN_MIN_WIDTH,
  TREE_INDENT_STEP,
  TREE_LABEL_GAP,
  TREE_TOGGLE_SLOT_WIDTH,
  UNITS_COLUMN_WIDTH,
  getActiveTierColumnIndex
} from '../pricingsTab.utils';

type PricingTreeUsageTierGridProps = {
  pricing: PricingTreeItem;
  productTierColumnCount: number;
  entityId: string;
  currentTier: PricingTreeAccountUsage['currentTier'] | PricingTreePropertyUsage['currentTier'];
  rowHeight: number;
};

function PricingTreeUsageTierGrid(props: PricingTreeUsageTierGridProps): JSX.Element {
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

type PricingTreeAccountUsageRowProps = {
  pricing: PricingTreeItem;
  productTierColumnCount: number;
  accountUsage: PricingTreeAccountUsage;
  showAccountsSectionHeader: boolean;
  setDetachConfirmTarget: React.Dispatch<React.SetStateAction<DetachConfirmTarget | null>>;
};

export function PricingTreeAccountUsageRow(props: PricingTreeAccountUsageRowProps): JSX.Element {
  const { pricing, productTierColumnCount, accountUsage, showAccountsSectionHeader, setDetachConfirmTarget } =
    props;

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="stretch"
        spacing={0}
        sx={{ minHeight: 34, px: 1.5, borderTop: '1px dashed #E1E7EC' }}
      >
        <Stack direction="row" alignItems="center" spacing={0} sx={{ flex: 1, minWidth: LEFT_CONTENT_MIN_WIDTH }}>
          <Box sx={{ width: TREE_INDENT_STEP * (showAccountsSectionHeader ? 3 : 2) }} />
          <Box sx={{ width: showAccountsSectionHeader ? TREE_TOGGLE_SLOT_WIDTH : 0 }} />
          <Box sx={{ width: TREE_LABEL_GAP }} />
          <Box sx={{ mr: 1 }}>
            <EntityTypeIndicator type="ACCOUNT" />
          </Box>
          <Link
            href="#"
            onClick={(event) => event.preventDefault()}
            sx={{ ...CLICKABLE_ENTITY_LINK_SX, minWidth: 260, fontSize: 14 }}
          >
            {accountUsage.account.companyName}
          </Link>
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
              minHeight: 34,
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
            {accountUsage.inheritedPropertiesCount}/{accountUsage.totalProperties} properties
          </Box>
          <Box
            sx={{
              minHeight: 34,
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
            {accountUsage.totalBillableUnits} units
          </Box>
        </Box>

        <PricingTreeUsageTierGrid
          pricing={pricing}
          productTierColumnCount={productTierColumnCount}
          entityId={accountUsage.account.id}
          currentTier={accountUsage.currentTier}
          rowHeight={34}
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
          {accountUsage.accountSubscriptionId ? (
            <Tooltip title="Detach pricing from account">
              <AppIconButton
                tone="ghost"
                aria-label={`Detach pricing from ${accountUsage.account.companyName}`}
                onClick={() =>
                  setDetachConfirmTarget({
                    pricingId: pricing.id,
                    subscriptionId: accountUsage.accountSubscriptionId ?? '',
                    title: `Detach pricing from ${accountUsage.account.companyName}`
                  })
                }
              >
                <CancelOutlinedIcon fontSize="small" />
              </AppIconButton>
            </Tooltip>
          ) : null}
        </Box>
      </Stack>
    </Box>
  );
}

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
    <Stack direction="row" alignItems="stretch" spacing={0} sx={{ minHeight: 44, px: 1.5, borderTop: '1px dotted #E1E7EC' }}>
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
              color: '#7A8EA8'
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
            borderLeft: '1px solid #E1E7EC'
          }}
        />
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
          borderLeft: '1px solid #E1E7EC'
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
