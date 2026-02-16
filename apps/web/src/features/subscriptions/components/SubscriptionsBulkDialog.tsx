import { Alert, Typography } from '@mui/material';
import { AppConfirmDialog } from '../../../components/layout';

type SubscriptionsBulkDialogProps = {
  open: boolean;
  selectedCount: number;
  error: string | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function SubscriptionsBulkDialog(props: SubscriptionsBulkDialogProps): JSX.Element {
  const { open, selectedCount, error, isPending, onClose, onConfirm } = props;
  const subscriptionsLabel =
    selectedCount === 1 ? '1 subscription' : `${selectedCount} subscriptions`;

  return (
    <AppConfirmDialog
      open={open}
      title={`Delete ${subscriptionsLabel}`}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmTone="destructive"
      confirmLabel="Delete subscriptions"
      confirmDisabled={isPending}
    >
      <Typography variant="body2" color="text.secondary">
        {`This will permanently delete selected ${subscriptionsLabel}.`}
      </Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
    </AppConfirmDialog>
  );
}
