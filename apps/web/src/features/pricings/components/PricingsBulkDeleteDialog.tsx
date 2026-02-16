import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { PrimaryButton, SecondaryButton } from '../../../components/buttons';

type PricingsBulkDeleteDialogProps = {
  open: boolean;
  selectedCount: number;
  error: string | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function PricingsBulkDeleteDialog(props: PricingsBulkDeleteDialogProps): JSX.Element {
  const { open, selectedCount, error, isPending, onClose, onConfirm } = props;
  const pricingsLabel = selectedCount === 1 ? '1 pricing' : `${selectedCount} pricings`;

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
      <DialogTitle>{`Delete ${pricingsLabel}`}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ pt: 1 }}>
          {`This will permanently delete selected ${pricingsLabel}.`}
        </Typography>
        {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
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
          Delete pricings
        </PrimaryButton>
      </DialogActions>
    </Dialog>
  );
}
