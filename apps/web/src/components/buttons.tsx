import { Button, ButtonGroup, IconButton, type ButtonProps, type IconButtonProps } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { prototypeTokens } from '../theme/tokens';

type AppButtonProps = Omit<ButtonProps, 'variant'> & {
  variant?: ButtonProps['variant'];
};

type AppIconButtonTone = 'ghost' | 'subtle' | 'plain' | 'nav';

type AppIconButtonProps = IconButtonProps & {
  tone?: AppIconButtonTone;
};

type AppSplitButtonProps = {
  mainLabel: ReactNode;
  onMainClick: NonNullable<ButtonProps['onClick']>;
  onAuxClick: NonNullable<ButtonProps['onClick']>;
  mainStartIcon?: ReactNode;
  mainEndIcon?: ReactNode;
  auxIcon: ReactNode;
  mainButtonProps?: Omit<ButtonProps, 'children' | 'onClick' | 'startIcon' | 'endIcon' | 'variant'>;
  auxButtonProps?: Omit<ButtonProps, 'children' | 'onClick' | 'variant'>;
  sx?: SxProps<Theme>;
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

const BASE_BORDERED_BUTTON_SX: SxProps<Theme> = {
  ...BASE_TEXT_BUTTON_SX,
  borderColor: prototypeTokens.color.border.strong,
  backgroundColor: prototypeTokens.color.bg.surface,
  color: prototypeTokens.color.text.primary,
  '&:hover': {
    borderColor: prototypeTokens.color.border.strong,
    backgroundColor: prototypeTokens.color.bg.surfaceSubtle
  }
};

const BASE_SPLIT_BUTTON_GROUP_SX: SxProps<Theme> = {
  borderRadius: prototypeTokens.radius.r2,
  '& .MuiButtonGroup-grouped': {
    borderColor: prototypeTokens.color.border.strong
  }
};

function getIconButtonToneSx(tone: AppIconButtonTone): SxProps<Theme> {
  if (tone === 'subtle') {
    return {
      color: prototypeTokens.color.text.secondary,
      border: `1px solid ${prototypeTokens.color.border.strong}`,
      backgroundColor: prototypeTokens.color.bg.surface,
      '&:hover': {
        backgroundColor: prototypeTokens.color.bg.surfaceSubtle
      }
    };
  }

  if (tone === 'plain') {
    return {
      color: prototypeTokens.color.text.secondary,
      backgroundColor: 'transparent',
      '&:hover': {
        backgroundColor: prototypeTokens.color.bg.search
      }
    };
  }

  if (tone === 'nav') {
    return {
      color: prototypeTokens.color.icon.muted,
      backgroundColor: 'transparent',
      '&:hover': {
        backgroundColor: '#EAF0F5',
        color: prototypeTokens.color.text.secondary
      }
    };
  }

  return {
    color: prototypeTokens.color.text.secondary,
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
          backgroundColor: prototypeTokens.color.brand.teal500,
          color: prototypeTokens.color.bg.surface,
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
          backgroundColor: prototypeTokens.color.bg.surfaceMuted,
          color: prototypeTokens.color.text.primary,
          '&:hover': {
            backgroundColor: prototypeTokens.color.bg.search
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
          color: prototypeTokens.color.text.primary,
          '&:hover': {
            backgroundColor: prototypeTokens.color.bg.search
          }
        },
        sx
      )}
    />
  );
}

export function BorderedButton({ sx, variant, ...props }: AppButtonProps): JSX.Element {
  return (
    <Button
      {...props}
      variant={variant ?? 'outlined'}
      sx={composeSx(BASE_BORDERED_BUTTON_SX, sx)}
    />
  );
}

export function AppSplitButton(props: AppSplitButtonProps): JSX.Element {
  const {
    mainLabel,
    onMainClick,
    onAuxClick,
    mainStartIcon,
    mainEndIcon,
    auxIcon,
    mainButtonProps,
    auxButtonProps,
    sx
  } = props;

  const { sx: mainButtonSx, ...mainButtonRest } = mainButtonProps ?? {};
  const { sx: auxButtonSx, ...auxButtonRest } = auxButtonProps ?? {};

  return (
    <ButtonGroup variant="outlined" disableElevation sx={composeSx(BASE_SPLIT_BUTTON_GROUP_SX, sx)}>
      <Button
        {...mainButtonRest}
        onClick={onMainClick}
        startIcon={mainStartIcon}
        endIcon={mainEndIcon}
        sx={composeSx(BASE_BORDERED_BUTTON_SX, composeSx({ borderRadius: 0 }, mainButtonSx))}
      >
        {mainLabel}
      </Button>
      <Button
        {...auxButtonRest}
        onClick={onAuxClick}
        sx={composeSx(
          BASE_BORDERED_BUTTON_SX,
          composeSx(
            {
              borderRadius: 0,
              minWidth: 40,
              px: 0
            },
            auxButtonSx
          )
        )}
      >
        {auxIcon}
      </Button>
    </ButtonGroup>
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
