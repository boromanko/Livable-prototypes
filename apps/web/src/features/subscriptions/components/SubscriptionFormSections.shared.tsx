import { Stack, Typography } from '@mui/material';

export function sectionTitle(title: string, subtitle?: string): JSX.Element {
  return (
    <Stack spacing={0.5}>
      <Typography sx={{ fontSize: 16, fontWeight: 600, color: '#212934' }}>{title}</Typography>
      {subtitle ? <Typography sx={{ fontSize: 14, color: '#4B617C' }}>{subtitle}</Typography> : null}
    </Stack>
  );
}

export function getFormFieldSx(hasError = false): Record<string, unknown> {
  return {
    '& .MuiOutlinedInput-root': {
      minHeight: 48,
      alignItems: 'center',
      ...(hasError ? { backgroundColor: '#FFF1F1' } : {})
    },
    '& .MuiOutlinedInput-input': {
      py: '12px'
    },
    '& .MuiSelect-select': {
      py: '12px'
    }
  };
}
