import { Button, IconButton, type ButtonProps, type IconButtonProps } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

type AppButtonProps = Omit<ButtonProps, 'variant'> & {
  variant?: ButtonProps['variant'];
};

type AppIconButtonTone = 'ghost' | 'subtle' | 'plain' | 'nav';

type AppIconButtonProps = IconButtonProps & {
  tone?: AppIconButtonTone;
};

function composeSx(base: SxProps<Theme>, sx?: SxProps<Theme>): SxProps<Theme> {
  if (!sx) {
    return base;
  }

  const additional = Array.isArray(sx) ? sx : [sx];
  return [base, ...additional] as SxProps<Theme>;
}

const BASE_TEXT_BUTTON_SX: SxProps<Theme> = {
  textTransform: 'none',
  fontWeight: 600,
  borderRadius: 1,
  minHeight: 40,
  px: 1.5,
  py: 0.75,
  lineHeight: 1.25,
  '&.MuiButton-sizeSmall': {
    minHeight: 32,
    px: 1.25,
    py: 0.5
  },
  '&.MuiButton-sizeLarge': {
    minHeight: 44,
    px: 2,
    py: 1
  }
};

function getIconButtonToneSx(tone: AppIconButtonTone): SxProps<Theme> {
  if (tone === 'subtle') {
    return {
      color: '#4B617C',
      border: '1px solid #D7DEE6',
      backgroundColor: '#FFFFFF',
      '&:hover': {
        backgroundColor: '#F3F7FA'
      }
    };
  }

  if (tone === 'plain') {
    return {
      color: '#4B617C',
      backgroundColor: 'transparent',
      '&:hover': {
        backgroundColor: '#EBF0F5'
      }
    };
  }

  if (tone === 'nav') {
    return {
      color: '#8895A7',
      backgroundColor: 'transparent',
      '&:hover': {
        backgroundColor: '#EAF0F5',
        color: '#4B617C'
      }
    };
  }

  return {
    color: '#4B617C',
    backgroundColor: 'transparent',
    '&:hover': {
      backgroundColor: 'rgba(33, 41, 52, 0.08)'
    }
  };
}

export function PrimaryButton({ sx, variant, ...props }: AppButtonProps): JSX.Element {
  return (
    <Button
      {...props}
      variant={variant ?? 'contained'}
      sx={composeSx(
        {
          backgroundColor: '#009299',
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: '#007D83'
          }
        },
        sx
      )}
    />
  );
}

export function SecondaryButton({ sx, variant, ...props }: AppButtonProps): JSX.Element {
  return (
    <Button
      {...props}
      variant={variant ?? 'text'}
      sx={composeSx(
        {
          ...BASE_TEXT_BUTTON_SX,
          backgroundColor: '#F8F9FA',
          color: '#212934',
          '&:hover': {
            backgroundColor: '#EBF0F5'
          }
        },
        sx
      )}
    />
  );
}

export function GhostButton({ sx, variant, ...props }: AppButtonProps): JSX.Element {
  return (
    <Button
      {...props}
      variant={variant ?? 'text'}
      sx={composeSx(
        {
          ...BASE_TEXT_BUTTON_SX,
          backgroundColor: 'transparent',
          color: '#212934',
          '&:hover': {
            backgroundColor: '#EBF0F5'
          }
        },
        sx
      )}
    />
  );
}

export function AppIconButton({
  sx,
  tone = 'ghost',
  size,
  ...props
}: AppIconButtonProps): JSX.Element {
  return (
    <IconButton
      {...props}
      size={size ?? 'small'}
      sx={composeSx(getIconButtonToneSx(tone), sx)}
    />
  );
}
