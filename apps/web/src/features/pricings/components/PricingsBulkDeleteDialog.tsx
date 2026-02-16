import { Alert, Typography } from '@mui/material';
import { AppConfirmDialog } from '../../../components/layout';

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
    <AppConfirmDialog
      open={open}
      title={`Delete ${pricingsLabel}`}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmTone="destructive"
      confirmLabel="Delete pricings"
      confirmDisabled={isPending}
      cancelDisabled={isPending}
    >
      <Typography variant="body2" color="text.secondary">
        {`This will permanently delete selected ${pricingsLabel}.`}
      </Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
    </AppConfirmDialog>
  );
}
