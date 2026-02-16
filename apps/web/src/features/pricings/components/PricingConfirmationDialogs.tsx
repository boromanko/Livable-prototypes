import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography
} from '@mui/material';
import type { PricingTreeItem } from '../../../api';
import { PrimaryButton, SecondaryButton } from '../../../components/buttons';
import type { DetachConfirmTarget } from './pricingTree.types';

type PricingConfirmationDialogsProps = {
  deletingPricing: PricingTreeItem | null;
  detachConfirmTarget: DetachConfirmTarget | null;
  actionError: string | null;
  isDeletePending: boolean;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
  onCloseDetach: () => void;
  onConfirmDetach: () => void;
};

export function PricingConfirmationDialogs(props: PricingConfirmationDialogsProps): JSX.Element {
  const {
    deletingPricing,
    detachConfirmTarget,
    actionError,
    isDeletePending,
    onCloseDelete,
    onConfirmDelete,
    onCloseDetach,
    onConfirmDetach
  } = props;

  return (
    <>
      <Dialog
        open={Boolean(deletingPricing)}
        onClose={onCloseDelete}
        maxWidth={false}
        PaperProps={{
          sx: {
            width: 600,
            maxWidth: 600
          }
        }}
      >
        <DialogTitle>{`Delete ${deletingPricing?.internalName ?? 'pricing'}`}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 320, pt: 1 }}>
            This action is permanent and cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <SecondaryButton onClick={onCloseDelete}>Cancel</SecondaryButton>
          <PrimaryButton
            sx={{ backgroundColor: '#B3261E', '&:hover': { backgroundColor: '#8C1D18' } }}
            onClick={onConfirmDelete}
            disabled={isDeletePending}
          >
            Delete pricing
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(detachConfirmTarget)}
        onClose={onCloseDetach}
        maxWidth={false}
        PaperProps={{
          sx: {
            width: 600,
            maxWidth: 600
          }
        }}
      >
        <DialogTitle>Detach Pricing</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ minWidth: 320, pt: 1 }}>
            <Typography variant="body2">{detachConfirmTarget?.title ?? 'Detach this pricing usage?'}</Typography>
            <Typography variant="body2" color="text.secondary">
              This action removes selected pricing link from the subscription.
            </Typography>
            {actionError ? <Alert severity="error">{actionError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <SecondaryButton onClick={onCloseDetach}>Cancel</SecondaryButton>
          <PrimaryButton
            sx={{ backgroundColor: '#B3261E', '&:hover': { backgroundColor: '#8C1D18' } }}
            onClick={onConfirmDetach}
          >
            Detach
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
