import { Button, type ButtonProps } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

type AppButtonProps = Omit<ButtonProps, 'variant'> & {
  variant?: ButtonProps['variant'];
};

function composeSx(base: SxProps<Theme>, sx?: SxProps<Theme>): SxProps<Theme> {
  if (!sx) {
    return base;
  }

  const additional = Array.isArray(sx) ? sx : [sx];
  return [base, ...additional] as SxProps<Theme>;
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
          backgroundColor: 'transparent',
          color: '#212934',
          '&:hover': {
            backgroundColor: 'rgba(33, 41, 52, 0.08)'
          }
        },
        sx
      )}
    />
  );
}
