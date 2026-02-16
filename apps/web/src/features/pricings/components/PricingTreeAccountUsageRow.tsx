import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { Box, Link, Stack, Tooltip } from '@mui/material';
import type { PricingTreeAccountUsage, PricingTreeItem } from '../../../api';
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
        sx={{
          minHeight: 34,
          px: 1.5,
          borderTop: `1px dashed ${prototypeTokens.color.border.default}`
        }}
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
              borderLeft: `1px solid ${prototypeTokens.color.border.default}`,
              display: 'flex',
              alignItems: 'center',
              color: prototypeTokens.color.text.primary,
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
              borderLeft: `1px solid ${prototypeTokens.color.border.default}`,
              display: 'flex',
              alignItems: 'center',
              color: prototypeTokens.color.text.primary,
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
            borderLeft: `1px solid ${prototypeTokens.color.border.default}`
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
