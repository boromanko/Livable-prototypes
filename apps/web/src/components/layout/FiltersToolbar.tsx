import { Box } from '@mui/material';
import type { ReactNode } from 'react';

type FiltersToolbarProps = {
  left: ReactNode;
  right?: ReactNode;
};

export function FiltersToolbar({ left, right }: FiltersToolbarProps): JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 1.5,
        alignItems: { xs: 'stretch', md: 'center' }
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 1.5,
          flex: 1,
          minWidth: 0
        }}
      >
        {left}
      </Box>
      {right ? (
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            alignItems: 'center',
            justifyContent: { xs: 'flex-start', md: 'flex-end' },
            ml: { md: 'auto' }
          }}
        >
          {right}
        </Box>
      ) : null}
    </Box>
  );
}
