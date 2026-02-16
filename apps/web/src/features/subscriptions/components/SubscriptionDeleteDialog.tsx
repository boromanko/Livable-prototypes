import { Typography } from '@mui/material';
import { AppConfirmDialog } from '../../../components/layout';

type SubscriptionDeleteDialogProps = {
  open: boolean;
  subscriptionName: string;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function SubscriptionDeleteDialog(props: SubscriptionDeleteDialogProps): JSX.Element {
  const { open, subscriptionName, isPending, onClose, onConfirm } = props;

  return (
    <AppConfirmDialog
      open={open}
      title={`Delete ${subscriptionName}`}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmTone="destructive"
      confirmLabel="Delete subscription"
      confirmDisabled={isPending}
      cancelDisabled={isPending}
    >
      <Typography variant="body2" color="text.secondary">
        This action is permanent and cannot be undone.
      </Typography>
    </AppConfirmDialog>
  );
}
