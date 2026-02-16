import CloseIcon from '@mui/icons-material/Close';
import { Dialog, Stack, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { AppIconButton } from '../buttons';
import { prototypeTokens } from '../../theme/tokens';

type AppFormDialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  headerActions?: ReactNode;
  closeButtonAriaLabel?: string;
  closeButtonDisabled?: boolean;
  headerAlignItems?: 'center' | 'flex-start';
  bodySpacing?: number;
  bodySx?: SxProps<Theme>;
  paperSx?: SxProps<Theme>;
  footer?: ReactNode;
  children: ReactNode;
};

const BASE_FORM_DIALOG_PAPER_SX: SxProps<Theme> = {
  width: { xs: 'calc(100vw - 16px)', sm: 760 },
  maxWidth: 760,
  height: 'min(920px, calc(100vh - 16px))',
  m: { xs: 1, sm: 2 },
  overflow: 'hidden',
  borderRadius: 0.5,
  boxShadow: '0px 18px 32px rgba(0, 0, 0, 0.15)'
};

const BASE_FORM_DIALOG_HEADER_SX: SxProps<Theme> = {
  px: { xs: 2.5, sm: 5 },
  py: 3.5,
  background: 'linear-gradient(180deg, #F8F9FA 0%, #FFFFFF 100%)',
  borderBottom: `1px solid ${prototypeTokens.color.border.default}`,
  flexShrink: 0
};

const BASE_FORM_DIALOG_BODY_SX: SxProps<Theme> = {
  px: { xs: 2.5, sm: 4 },
  py: 4,
  flex: 1,
  overflowY: 'auto'
};

const BASE_FORM_DIALOG_FOOTER_SX: SxProps<Theme> = {
  px: 3,
  py: 2,
  borderTop: `1px solid ${prototypeTokens.color.border.default}`,
  backgroundColor: prototypeTokens.color.bg.surface,
  flexShrink: 0
};

export function AppFormDialog(props: AppFormDialogProps): JSX.Element {
  const {
    open,
    onClose,
    title,
    subtitle,
    headerActions,
    closeButtonAriaLabel = 'Close dialog',
    closeButtonDisabled = false,
    headerAlignItems = 'center',
    bodySpacing = 4,
    bodySx,
    paperSx,
    footer,
    children
  } = props;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: [BASE_FORM_DIALOG_PAPER_SX, ...(Array.isArray(paperSx) ? paperSx : paperSx ? [paperSx] : [])]
      }}
    >
      <Stack sx={{ height: '100%' }}>
        <Stack
          direction="row"
          alignItems={headerAlignItems}
          justifyContent="space-between"
          sx={BASE_FORM_DIALOG_HEADER_SX}
        >
          <Stack spacing={subtitle ? 0.75 : 0}>
            <Typography
              sx={{
                color: prototypeTokens.color.text.primary,
                fontSize: 20,
                fontWeight: 600
              }}
            >
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="body2" sx={{ color: prototypeTokens.color.text.secondary }}>
                {subtitle}
              </Typography>
            ) : null}
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1}>
            {headerActions}
            <AppIconButton
              tone="plain"
              onClick={onClose}
              aria-label={closeButtonAriaLabel}
              disabled={closeButtonDisabled}
            >
              <CloseIcon sx={{ color: prototypeTokens.color.text.secondary }} />
            </AppIconButton>
          </Stack>
        </Stack>

        <Stack
          spacing={bodySpacing}
          sx={[BASE_FORM_DIALOG_BODY_SX, ...(Array.isArray(bodySx) ? bodySx : bodySx ? [bodySx] : [])]}
        >
          {children}
        </Stack>

        {footer ? (
          <Stack direction="row" justifyContent="space-between" sx={BASE_FORM_DIALOG_FOOTER_SX}>
            {footer}
          </Stack>
        ) : null}
      </Stack>
    </Dialog>
  );
}
