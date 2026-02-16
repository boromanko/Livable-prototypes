import { Alert, Typography } from '@mui/material';
import type { PricingTreeItem } from '../../../api';
import { AppConfirmDialog } from '../../../components/layout';
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
      <AppConfirmDialog
        open={Boolean(deletingPricing)}
        title={`Delete ${deletingPricing?.internalName ?? 'pricing'}`}
        onClose={onCloseDelete}
        onConfirm={onConfirmDelete}
        confirmTone="destructive"
        confirmLabel="Delete pricing"
        confirmDisabled={isDeletePending}
        contentMinWidth={320}
      >
        <Typography variant="body2" color="text.secondary">
          This action is permanent and cannot be undone.
        </Typography>
      </AppConfirmDialog>

      <AppConfirmDialog
        open={Boolean(detachConfirmTarget)}
        title="Detach Pricing"
        onClose={onCloseDetach}
        onConfirm={onConfirmDetach}
        confirmTone="destructive"
        confirmLabel="Detach"
        contentSpacing={1.5}
        contentMinWidth={320}
      >
        <Typography variant="body2">
          {detachConfirmTarget?.title ?? 'Detach this pricing usage?'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This action removes selected pricing link from the subscription.
        </Typography>
        {actionError ? <Alert severity="error">{actionError}</Alert> : null}
      </AppConfirmDialog>
    </>
  );
}
