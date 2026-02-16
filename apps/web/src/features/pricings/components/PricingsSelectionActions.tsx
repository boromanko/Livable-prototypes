import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Box, Stack, Typography } from '@mui/material';
import { AppIconButton, BorderedButton } from '../../../components/buttons';

type PricingsSelectionActionsProps = {
  selectedCount: number;
  isPending: boolean;
  onOpenDeletePricings: () => void;
  onClearSelection: () => void;
};

export function PricingsSelectionActions(props: PricingsSelectionActionsProps): JSX.Element {
  const { selectedCount, isPending, onOpenDeletePricings, onClearSelection } = props;
  const isVisible = selectedCount > 0;
  const selectedLabel = `${selectedCount} item${selectedCount === 1 ? '' : 's'} selected`;

  return (
    <Box
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: (theme) => theme.zIndex.drawer + 40,
        px: { xs: 2, sm: 4 },
        pt: 2,
        pb: 'calc(16px + env(safe-area-inset-bottom))',
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E1E7EC',
        boxShadow: '0px -10px 24px rgba(15, 23, 42, 0.12)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: { xs: 'wrap', md: 'nowrap' },
        transform: isVisible ? 'translateY(0)' : 'translateY(120%)',
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
        transition: 'transform 180ms ease, opacity 180ms ease'
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <AppIconButton
          tone="plain"
          aria-label="Clear selection"
          onClick={onClearSelection}
          sx={{
            p: 0.75,
            borderRadius: '2px',
            backgroundColor: '#F8F9FA',
            '&:hover': { backgroundColor: '#EEF2F6' }
          }}
        >
          <CloseIcon sx={{ fontSize: 18, color: '#4B617C' }} />
        </AppIconButton>
        <Typography sx={{ color: '#212934', fontSize: 13, fontWeight: 600 }}>{selectedLabel}</Typography>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
        <BorderedButton
          startIcon={<DeleteOutlineIcon fontSize="small" />}
          onClick={onOpenDeletePricings}
          disabled={!isVisible || isPending}
        >
          Delete pricings
        </BorderedButton>
      </Stack>
    </Box>
  );
}
