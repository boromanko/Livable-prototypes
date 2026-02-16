import { Stack, Typography } from '@mui/material';
import { prototypeTokens } from '../../../theme/tokens';

export function sectionTitle(title: string, subtitle?: string): JSX.Element {
  return (
    <Stack spacing={0.5}>
      <Typography sx={{ fontSize: 16, fontWeight: 600, color: prototypeTokens.color.text.primary }}>
        {title}
      </Typography>
      {subtitle ? (
        <Typography sx={{ fontSize: 14, color: prototypeTokens.color.text.secondary }}>
          {subtitle}
        </Typography>
      ) : null}
    </Stack>
  );
}

export function getFormFieldSx(hasError = false): Record<string, unknown> {
  return {
    '& .MuiOutlinedInput-root': {
      minHeight: 48,
      alignItems: 'center',
      ...(hasError ? { backgroundColor: prototypeTokens.color.bg.errorTint } : {})
    },
    '& .MuiOutlinedInput-input': {
      py: '12px'
    },
    '& .MuiSelect-select': {
      py: '12px'
    }
  };
}

export function getAutocompleteFieldSx(hasError = false): Record<string, unknown> {
  return {
    ...getFormFieldSx(hasError),
    '& .MuiAutocomplete-inputRoot': {
      p: '0 40px 0 14px !important'
    },
    '& .MuiOutlinedInput-root': {
      height: 48,
      minHeight: 48,
      alignItems: 'center',
      pr: 5
    },
    '& .MuiAutocomplete-input': {
      p: '0 !important'
    },
    '& .MuiInputBase-input::placeholder': {
      color: prototypeTokens.color.text.secondary,
      opacity: 1
    },
    '& .MuiAutocomplete-popupIndicator': {
      color: prototypeTokens.color.text.secondary
    }
  };
}

export const AUTOCOMPLETE_LISTBOX_SX: Record<string, unknown> = {
  py: 0,
  '& .MuiAutocomplete-option': {
    minHeight: 52,
    alignItems: 'center'
  }
};

export const AUTOCOMPLETE_PAPER_SX: Record<string, unknown> = {
  mt: 0.5,
  border: `1px solid ${prototypeTokens.color.border.default}`,
  borderRadius: '2px',
  boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.12)'
};

export const AUTOCOMPLETE_PAPER_ANIMATED_SX: Record<string, unknown> = {
  ...AUTOCOMPLETE_PAPER_SX,
  transformOrigin: 'top center',
  animation: 'subscriptionAutocompleteOpen 150ms ease-out',
  '@keyframes subscriptionAutocompleteOpen': {
    from: {
      opacity: 0,
      transform: 'translateY(-4px) scale(0.99)'
    },
    to: {
      opacity: 1,
      transform: 'translateY(0) scale(1)'
    }
  }
};
