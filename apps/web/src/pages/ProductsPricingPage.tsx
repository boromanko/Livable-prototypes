import { Alert, Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';

type HealthResponse = {
  status: string;
};

type AdminListResponse = {
  items: unknown[];
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export function ProductsPricingPage(): JSX.Element {
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: () => fetchJson<HealthResponse>('/api/health')
  });

  const subscriptionsQuery = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => fetchJson<AdminListResponse>('/api/admin/subscriptions')
  });

  const pricingsQuery = useQuery({
    queryKey: ['pricings'],
    queryFn: () => fetchJson<AdminListResponse>('/api/admin/pricings')
  });

  return (
    <Stack spacing={3}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        Products & Pricing
      </Typography>
      {healthQuery.isError ? (
        <Alert severity="error">Failed to load API health status.</Alert>
      ) : (
        <Alert severity="info">
          API status: {healthQuery.data?.status ?? 'loading...'}
        </Alert>
      )}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))'
          }
        }}
      >
        <Box>
          <Card>
            <CardContent>
              <Typography variant="overline">Subscriptions</Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {subscriptionsQuery.data?.items.length ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box>
          <Card>
            <CardContent>
              <Typography variant="overline">Pricings</Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {pricingsQuery.data?.items.length ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Stack>
  );
}
