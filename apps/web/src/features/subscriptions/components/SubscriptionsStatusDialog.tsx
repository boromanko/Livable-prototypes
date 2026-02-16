import { Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import type { SubscriptionStatus } from '../../../api';
import { PrimaryButton, SecondaryButton } from '../../../components/buttons';

type SubscriptionsStatusDialogProps = {
  open: boolean;
  selectedCount: number;
  nextStatus: SubscriptionStatus | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function SubscriptionsStatusDialog(props: SubscriptionsStatusDialogProps): JSX.Element {
  const {
    open,
    selectedCount,
    nextStatus,
    isPending,
    onClose,
    onConfirm
  } = props;
  const statusLabel = nextStatus ? formatStatusLabel(nextStatus) : 'Selected status';
  const subscriptionsLabel =
    selectedCount === 1 ? '1 selected subscription' : `${selectedCount} selected subscriptions`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: 600,
          maxWidth: 600
        }
      }}
    >
      <DialogTitle>{`Change status to ${statusLabel}`}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {`Are you sure you want to change the status to ${statusLabel} for ${subscriptionsLabel}?`}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton onClick={onConfirm} disabled={isPending || !nextStatus}>
          Change status
        </PrimaryButton>
      </DialogActions>
    </Dialog>
  );
}

function formatStatusLabel(status: SubscriptionStatus): string {
  if (status === 'DRAFT') {
    return 'Draft';
  }

  if (status === 'ACTIVE') {
    return 'Active';
  }

  if (status === 'PAUSED') {
    return 'Paused';
  }

  return 'Canceled';
}
