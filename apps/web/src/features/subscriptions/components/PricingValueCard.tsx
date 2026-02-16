import { Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

type PricingValueCardVariant = 'table' | 'form';

type PricingValueCardProps = {
  title: string;
  subtitle?: string;
  usageLabel?: string;
  errorLabel?: string;
  amountLabel: string;
  variant: PricingValueCardVariant;
  onTitleClick?: () => void;
  action?: ReactNode;
};

const VARIANT_SX = {
  table: {
    px: 1,
    py: 0.75,
    amountFontSize: 14,
    titleLineHeight: 1.25,
    subtitleLineHeight: 1.2
  },
  form: {
    px: 1.5,
    py: 1.25,
    amountFontSize: 18,
    titleLineHeight: 1.3,
    subtitleLineHeight: 1.3
  }
} as const;

export function PricingValueCard(props: PricingValueCardProps): JSX.Element {
  const { title, subtitle, usageLabel, errorLabel, amountLabel, variant, onTitleClick, action } = props;
  const styles = VARIANT_SX[variant];
  const hasError = Boolean(errorLabel);

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{
        px: styles.px,
        py: styles.py,
        border: hasError ? '1px solid #E7B5B5' : '1px solid #E1E7EC',
        backgroundColor: hasError ? '#FFF6F6' : '#F8F9FA',
        borderRadius: '2px'
      }}
    >
      <Stack spacing={0.25} sx={{ minWidth: 0, pr: 1 }}>
        {onTitleClick ? (
          <Typography
            component="button"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onTitleClick();
            }}
            variant="body2"
            sx={{
              all: 'unset',
              color: '#212934',
              fontWeight: 500,
              lineHeight: styles.titleLineHeight,
              cursor: 'pointer',
              '&:hover': {
                color: '#1A4E80',
                textDecoration: 'underline'
              }
            }}
          >
            {title}
          </Typography>
        ) : (
          <Typography
            variant="body2"
            sx={{ color: '#212934', fontWeight: 500, lineHeight: styles.titleLineHeight }}
          >
            {title}
          </Typography>
        )}

        {subtitle ? (
          <Typography variant="caption" sx={{ color: '#6F8298', lineHeight: styles.subtitleLineHeight }}>
            {subtitle}
          </Typography>
        ) : null}

        {usageLabel ? (
          <Typography variant="caption" sx={{ color: '#6F8298' }}>
            {usageLabel}
          </Typography>
        ) : null}
        {errorLabel ? (
          <Typography variant="caption" sx={{ color: '#B42318' }}>
            {errorLabel}
          </Typography>
        ) : null}
      </Stack>

      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Typography
          sx={{
            color: '#212934',
            fontWeight: 700,
            fontSize: styles.amountFontSize,
            lineHeight: 1.1,
            fontVariantNumeric: 'tabular-nums',
            flexShrink: 0
          }}
        >
          {amountLabel}
        </Typography>
        {action}
      </Stack>
    </Stack>
  );
}
