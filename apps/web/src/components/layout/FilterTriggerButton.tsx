import FilterListIcon from '@mui/icons-material/FilterList';
import { Box, Stack } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { BorderedButton } from '../buttons';
import { prototypeTokens } from '../../theme/tokens';

type FilterTriggerButtonProps = {
  activeFiltersCount: number;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  label?: string;
  disabled?: boolean;
  sx?: SxProps<Theme>;
};

export function FilterTriggerButton(props: FilterTriggerButtonProps): JSX.Element {
  const {
    activeFiltersCount,
    onClick,
    label = 'Filters',
    disabled = false,
    sx
  } = props;

  return (
    <BorderedButton
      onClick={onClick}
      startIcon={<FilterListIcon fontSize="small" />}
      disabled={disabled}
      sx={[{ px: 1.5 }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    >
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Box component="span">{label}</Box>
        {activeFiltersCount > 0 ? (
          <Box
            component="span"
            sx={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              backgroundColor: prototypeTokens.color.brand.teal500,
              color: prototypeTokens.color.bg.surface,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              lineHeight: 1
            }}
          >
            {activeFiltersCount}
          </Box>
        ) : null}
      </Stack>
    </BorderedButton>
  );
}
