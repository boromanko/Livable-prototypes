import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography
} from '@mui/material';
import { PrimaryButton, SecondaryButton } from '../../../components/buttons';

type SubscriptionsBulkDialogProps = {
  open: boolean;
  selectedCount: number;
  error: string | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function SubscriptionsBulkDialog(props: SubscriptionsBulkDialogProps): JSX.Element {
  const {
    open,
    selectedCount,
    isPending,
    onClose,
    onConfirm
  } = props;
  const subscriptionsLabel =
    selectedCount === 1 ? '1 subscription' : `${selectedCount} subscriptions`;

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
      <DialogTitle>{`Delete ${subscriptionsLabel}`}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {`This will permanently delete selected ${subscriptionsLabel}.`}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton
          sx={{ backgroundColor: '#B3261E', '&:hover': { backgroundColor: '#8C1D18' } }}
          onClick={onConfirm}
          disabled={isPending}
        >
          Delete subscriptions
        </PrimaryButton>
      </DialogActions>
    </Dialog>
  );
}
