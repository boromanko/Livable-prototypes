import { Popover, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { GhostButton } from '../buttons';
import { prototypeTokens } from '../../theme/tokens';

type FiltersPopoverPanelProps = {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  width: number;
  activeFiltersCount: number;
  onClearFilters: () => void;
  title?: string;
  clearLabel?: string;
  children: ReactNode;
};

export function FiltersPopoverPanel(props: FiltersPopoverPanelProps): JSX.Element {
  const {
    open,
    anchorEl,
    onClose,
    width,
    activeFiltersCount,
    onClearFilters,
    title = 'Filters',
    clearLabel = 'Clear all',
    children
  } = props;

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{
        paper: {
          sx: {
            mt: 0.75,
            width,
            p: 1.5,
            border: `1px solid ${prototypeTokens.color.border.default}`
          }
        }
      }}
    >
      <Stack spacing={1.5}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            color: prototypeTokens.color.text.primary
          }}
        >
          {title}
        </Typography>

        {children}

        <Stack direction="row" justifyContent="flex-end">
          <GhostButton
            onClick={onClearFilters}
            disabled={activeFiltersCount === 0}
            sx={{ minHeight: 34, px: 1.25 }}
          >
            {clearLabel}
          </GhostButton>
        </Stack>
      </Stack>
    </Popover>
  );
}
