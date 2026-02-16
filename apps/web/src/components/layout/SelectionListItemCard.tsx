import CloseIcon from '@mui/icons-material/Close';
import { IconButton, Stack, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';
import { prototypeTokens } from '../../theme/tokens';

type SelectionListItemCardProps = {
  children: ReactNode;
  hasError?: boolean;
  onRemove?: () => void;
  removeAriaLabel?: string;
  action?: ReactNode;
  sx?: SxProps<Theme>;
};

export function SelectionListItemCard(props: SelectionListItemCardProps): JSX.Element {
  const {
    children,
    hasError = false,
    onRemove,
    removeAriaLabel = 'Remove item',
    action,
    sx
  } = props;

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{
        px: 1.5,
        py: 1.25,
        border: `1px solid ${
          hasError ? prototypeTokens.color.border.error : prototypeTokens.color.border.default
        }`,
        backgroundColor: hasError
          ? prototypeTokens.color.bg.errorSurface
          : prototypeTokens.color.bg.surfaceMuted,
        borderRadius: '2px',
        ...sx
      }}
    >
      <Stack spacing={0.25} sx={{ minWidth: 0, pr: 1 }}>
        {children}
      </Stack>

      {action ??
        (onRemove ? (
          <IconButton
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            aria-label={removeAriaLabel}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        ) : null)}
    </Stack>
  );
}
