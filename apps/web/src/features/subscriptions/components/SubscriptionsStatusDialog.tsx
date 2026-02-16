import { Typography } from '@mui/material';
import type { SubscriptionStatus } from '../../../api';
import { AppConfirmDialog } from '../../../components/layout';
import { formatSubscriptionStatusLabel } from '../../../lib/subscriptions/status';

type SubscriptionsStatusDialogProps = {
  open: boolean;
  selectedCount: number;
  nextStatus: SubscriptionStatus | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function SubscriptionsStatusDialog(props: SubscriptionsStatusDialogProps): JSX.Element {
  const { open, selectedCount, nextStatus, isPending, onClose, onConfirm } = props;
  const statusLabel = nextStatus ? formatSubscriptionStatusLabel(nextStatus) : 'Selected status';
  const subscriptionsLabel =
    selectedCount === 1 ? '1 selected subscription' : `${selectedCount} selected subscriptions`;

  return (
    <AppConfirmDialog
      open={open}
      title={`Change status to ${statusLabel}`}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel="Change status"
      confirmDisabled={isPending || !nextStatus}
    >
      <Typography variant="body2" color="text.secondary">
        {`Are you sure you want to change the status to ${statusLabel} for ${subscriptionsLabel}?`}
      </Typography>
    </AppConfirmDialog>
  );
}
