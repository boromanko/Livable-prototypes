import { Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import type { ReactNode } from 'react';
import { DestructiveButton, PrimaryButton, SecondaryButton } from '../buttons';

type AppConfirmDialogProps = {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: ReactNode;
  confirmTone?: 'primary' | 'destructive';
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
  cancelLabel?: ReactNode;
  contentSpacing?: number;
  contentMinWidth?: number;
  children?: ReactNode;
};

export function AppConfirmDialog(props: AppConfirmDialogProps): JSX.Element {
  const {
    open,
    title,
    onClose,
    onConfirm,
    confirmLabel,
    confirmTone = 'primary',
    confirmDisabled = false,
    cancelDisabled = false,
    cancelLabel = 'Cancel',
    contentSpacing = 2,
    contentMinWidth,
    children
  } = props;

  const ConfirmButton = confirmTone === 'destructive' ? DestructiveButton : PrimaryButton;

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
      <DialogTitle>{title}</DialogTitle>
      {children ? (
        <DialogContent sx={contentMinWidth ? { minWidth: contentMinWidth } : undefined}>
          <Stack spacing={contentSpacing} sx={{ pt: 1 }}>
            {children}
          </Stack>
        </DialogContent>
      ) : null}
      <DialogActions>
        <SecondaryButton onClick={onClose} disabled={cancelDisabled}>
          {cancelLabel}
        </SecondaryButton>
        <ConfirmButton onClick={onConfirm} disabled={confirmDisabled}>
          {confirmLabel}
        </ConfirmButton>
      </DialogActions>
    </Dialog>
  );
}
