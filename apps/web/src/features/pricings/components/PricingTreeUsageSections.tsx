import AddIcon from '@mui/icons-material/Add';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box, Stack, Typography } from '@mui/material';
import { GhostButton } from '../../../components/buttons';
import { prototypeTokens } from '../../../theme/tokens';
import type { OpenCreateSubscription } from './pricingTree.types';
import {
  TABLE_GHOST_BUTTON_SX,
  TREE_INDENT_STEP,
  TREE_LABEL_GAP,
  TREE_TOGGLE_SLOT_WIDTH
} from '../pricingsTab.utils';

type PricingTreeUsageSectionHeaderProps = {
  title: string;
  collapsed: boolean;
  expandLabel: string;
  collapseLabel: string;
  onToggle: () => void;
};

export function PricingTreeUsageSectionHeader(
  props: PricingTreeUsageSectionHeaderProps
): JSX.Element {
  const { title, collapsed, expandLabel, collapseLabel, onToggle } = props;

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0}
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onToggle();
        }
      }}
      sx={{
        minHeight: 34,
        px: 1.5,
        borderTop: `1px dashed ${prototypeTokens.color.border.default}`,
        backgroundColor: prototypeTokens.color.bg.surfaceMuted,
        cursor: 'pointer'
      }}
    >
      <Box sx={{ width: TREE_INDENT_STEP * 2 }} />
      <Box sx={{ width: TREE_TOGGLE_SLOT_WIDTH, display: 'flex', justifyContent: 'center' }}>
        <Box
          sx={{
            width: TREE_TOGGLE_SLOT_WIDTH,
            height: TREE_TOGGLE_SLOT_WIDTH,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '2px',
            transition: 'background-color 120ms ease',
            '&:hover': { backgroundColor: prototypeTokens.color.bg.hover }
          }}
          aria-label={collapsed ? expandLabel : collapseLabel}
        >
          {collapsed ? <ChevronRightIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </Box>
      </Box>
      <Box sx={{ width: TREE_LABEL_GAP }} />
      <Typography sx={{ fontWeight: 500, fontSize: 14, color: prototypeTokens.color.text.primary }}>
        {title}
      </Typography>
    </Stack>
  );
}

type PricingTreeUsageAssignRowProps = {
  showSectionHeader: boolean;
  label: string;
  onClick: () => void;
};

export function PricingTreeUsageAssignRow(props: PricingTreeUsageAssignRowProps): JSX.Element {
  const { showSectionHeader, label, onClick } = props;

  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        minHeight: 48,
        pl: 0,
        pr: 1.5,
        py: 0.75,
        borderTop: `1px dashed ${prototypeTokens.color.border.default}`,
        backgroundColor: prototypeTokens.color.bg.surface
      }}
    >
      <Box sx={{ width: TREE_INDENT_STEP * (showSectionHeader ? 3 : 2) }} />
      <Box sx={{ width: showSectionHeader ? TREE_TOGGLE_SLOT_WIDTH : 0 }} />
      <Box sx={{ width: TREE_LABEL_GAP }} />
      <GhostButton
        size="small"
        startIcon={<AddIcon />}
        sx={{
          ...TABLE_GHOST_BUTTON_SX,
          '& .MuiButton-startIcon': {
            marginLeft: 0,
            marginRight: `${TREE_LABEL_GAP}px`,
            width: TREE_TOGGLE_SLOT_WIDTH,
            display: 'flex',
            justifyContent: 'center'
          }
        }}
        onClick={onClick}
      >
        {label}
      </GhostButton>
    </Stack>
  );
}

type PricingTreeUsageAssignSubscriptionRowProps = {
  pricingId: string;
  showSectionHeader: boolean;
  openCreateSubscription: OpenCreateSubscription;
};

export function PricingTreeUsageAssignSubscriptionRow(
  props: PricingTreeUsageAssignSubscriptionRowProps
): JSX.Element {
  const { pricingId, showSectionHeader, openCreateSubscription } = props;

  return (
    <PricingTreeUsageAssignRow
      showSectionHeader={showSectionHeader}
      label="Assign subscription"
      onClick={() => openCreateSubscription(pricingId)}
    />
  );
}
