import { Alert, Stack, Typography } from '@mui/material';
import type { SubscriptionBulkAction } from '../../../api';
import { GhostButton } from '../../../components/buttons';

type SubscriptionsSelectionActionsProps = {
  selectedCount: number;
  onOpenBulkDialog: (action: SubscriptionBulkAction) => void;
};

export function SubscriptionsSelectionActions(
  props: SubscriptionsSelectionActionsProps
): JSX.Element | null {
  const { selectedCount, onOpenBulkDialog } = props;

  if (selectedCount === 0) {
    return null;
  }

  return (
    <Alert severity="info">
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1}
        alignItems={{ xs: 'flex-start', md: 'center' }}
      >
        <Typography variant="body2">{selectedCount} subscription(s) selected</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <GhostButton size="small" onClick={() => onOpenBulkDialog('ADD_PRICING')}>
            New pricing
          </GhostButton>
          <GhostButton size="small" onClick={() => onOpenBulkDialog('REPLACE_PRICINGS')}>
            Replace pricings
          </GhostButton>
          <GhostButton size="small" onClick={() => onOpenBulkDialog('DELETE_PRICING')}>
            Delete pricing
          </GhostButton>
          <GhostButton
            size="small"
            sx={{ color: '#B3261E', '&:hover': { backgroundColor: '#FDECEC' } }}
            onClick={() => onOpenBulkDialog('DELETE_SUBSCRIPTIONS')}
          >
            Delete subscriptions
          </GhostButton>
        </Stack>
      </Stack>
    </Alert>
  );
}
