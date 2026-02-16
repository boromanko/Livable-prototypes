import { Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { PrimaryButton, SecondaryButton } from '../../../components/buttons';

type SubscriptionDeleteDialogProps = {
  open: boolean;
  subscriptionName: string;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function SubscriptionDeleteDialog(props: SubscriptionDeleteDialogProps): JSX.Element {
  const {
    open,
    subscriptionName,
    isPending,
    onClose,
    onConfirm
  } = props;

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
      <DialogTitle>{`Delete ${subscriptionName}`}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ pt: 1 }}>
          This action is permanent and cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <SecondaryButton onClick={onClose} disabled={isPending}>
          Cancel
        </SecondaryButton>
        <PrimaryButton
          sx={{ backgroundColor: '#B3261E', '&:hover': { backgroundColor: '#8C1D18' } }}
          onClick={onConfirm}
          disabled={isPending}
        >
          Delete subscription
        </PrimaryButton>
      </DialogActions>
    </Dialog>
  );
}
