import CloseIcon from '@mui/icons-material/Close';
import { Box, Stack, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { AppIconButton } from '../buttons';
import { prototypeTokens } from '../../theme/tokens';

type SelectionActionBarProps = {
  visible: boolean;
  selectedCount: number;
  onClearSelection: () => void;
  children: ReactNode;
  selectedNoun?: string;
  clearAriaLabel?: string;
  selectedLabel?: string;
  sx?: SxProps<Theme>;
};

const BASE_SELECTION_ACTION_BAR_SX: SxProps<Theme> = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: (theme) => theme.zIndex.drawer + 40,
  px: { xs: 2, sm: 4 },
  pt: 2,
  pb: 'calc(16px + env(safe-area-inset-bottom))',
  backgroundColor: prototypeTokens.color.bg.surface,
  borderTop: `1px solid ${prototypeTokens.color.border.default}`,
  boxShadow: '0px -10px 24px rgba(15, 23, 42, 0.12)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 1.5,
  flexWrap: { xs: 'wrap', md: 'nowrap' },
  transition: 'transform 180ms ease, opacity 180ms ease'
};

export function SelectionActionBar(props: SelectionActionBarProps): JSX.Element {
  const {
    visible,
    selectedCount,
    onClearSelection,
    children,
    selectedNoun = 'item',
    clearAriaLabel = 'Clear selection',
    selectedLabel,
    sx
  } = props;
  const resolvedSelectedLabel =
    selectedLabel ??
    `${selectedCount} ${selectedNoun}${selectedCount === 1 ? '' : 's'} selected`;

  return (
    <Box
      sx={[
        BASE_SELECTION_ACTION_BAR_SX,
        {
          transform: visible ? 'translateY(0)' : 'translateY(120%)',
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? 'auto' : 'none'
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <AppIconButton
          tone="plain"
          aria-label={clearAriaLabel}
          onClick={onClearSelection}
          sx={{
            p: 0.75,
            borderRadius: 0.5,
            backgroundColor: prototypeTokens.color.bg.surfaceMuted,
            '&:hover': { backgroundColor: prototypeTokens.color.bg.search }
          }}
        >
          <CloseIcon sx={{ fontSize: 18, color: prototypeTokens.color.text.secondary }} />
        </AppIconButton>
        <Typography
          sx={{
            color: prototypeTokens.color.text.primary,
            fontSize: 13,
            fontWeight: 600
          }}
        >
          {resolvedSelectedLabel}
        </Typography>
      </Stack>
      {children}
    </Box>
  );
}
