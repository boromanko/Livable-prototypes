import { Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

type SectionCardProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function SectionCard(props: SectionCardProps): JSX.Element {
  const { title, description, actions, children } = props;

  return (
    <Card elevation={0} sx={{ border: '1px solid #d9e0ea', borderRadius: 2 }}>
      <CardContent sx={{ pb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Stack spacing={0.75}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            {description ? (
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            ) : null}
          </Stack>
          {actions}
        </Stack>
      </CardContent>
      <Divider />
      <CardContent>{children}</CardContent>
    </Card>
  );
}
