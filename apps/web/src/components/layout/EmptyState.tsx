import { Box, Button, Typography } from '@mui/material';
import type { ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onActionClick?: () => void;
  icon?: ReactNode;
};

export function EmptyState(props: EmptyStateProps): JSX.Element {
  const { title, description, actionLabel, onActionClick, icon } = props;

  return (
    <Box
      sx={{
        border: '1px dashed #c4ceda',
        borderRadius: 2,
        p: 3,
        display: 'grid',
        justifyItems: 'start',
        gap: 1
      }}
    >
      {icon}
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
      {actionLabel && onActionClick ? (
        <Button size="small" variant="outlined" onClick={onActionClick}>
          {actionLabel}
        </Button>
      ) : null}
    </Box>
  );
}
