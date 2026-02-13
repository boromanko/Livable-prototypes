import { Alert, Box, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import {
  useAccountsQuery,
  useHealthQuery,
  usePricingsQuery,
  useProductsQuery,
  useSubscriptionsQuery
} from '../api';
import { PageHeader, SectionCard } from '../components/layout';
import { PricingsTab } from '../features/pricings';
import { SubscriptionsTab } from '../features/subscriptions';

type ProductsPricingTab = 'subscriptions' | 'pricings';

type MetricCardProps = {
  label: string;
  value: number;
};

function MetricCard(props: MetricCardProps): JSX.Element {
  const { label, value } = props;

  return (
    <Box
      sx={{
        border: '1px solid #d9e0ea',
        borderRadius: 2,
        backgroundColor: '#ffffff',
        p: 2
      }}
    >
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
    </Box>
  );
}

export function ProductsPricingPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<ProductsPricingTab>('subscriptions');

  const healthQuery = useHealthQuery();
  const accountsQuery = useAccountsQuery({ page: 1, pageSize: 1 });
  const productsQuery = useProductsQuery();
  const subscriptionsQuery = useSubscriptionsQuery({ page: 1, pageSize: 25 });
  const pricingsQuery = usePricingsQuery({ page: 1, pageSize: 25 });

  const summaryCards = useMemo(
    () => [
      { label: 'Accounts', value: accountsQuery.data?.total ?? 0 },
      { label: 'Products', value: productsQuery.data?.items.length ?? 0 },
      { label: 'Subscriptions', value: subscriptionsQuery.data?.total ?? 0 },
      { label: 'Pricings', value: pricingsQuery.data?.total ?? 0 }
    ],
    [
      accountsQuery.data?.total,
      pricingsQuery.data?.total,
      productsQuery.data?.items.length,
      subscriptionsQuery.data?.total
    ]
  );

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title="Products & Pricing"
        subtitle="Prototype scaffold for subscriptions and pricing management. Stripe billing flows are intentionally out of scope."
      />

      {healthQuery.isError ? (
        <Alert severity="error">Failed to load API health status.</Alert>
      ) : (
        <Alert severity="info">
          API status: {healthQuery.data?.status ?? 'loading...'}.
          Backend scope is ready for Subscriptions and Pricings UI implementation.
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(4, minmax(0, 1fr))'
          }
        }}
      >
        {summaryCards.map((card) => (
          <MetricCard key={card.label} label={card.label} value={card.value} />
        ))}
      </Box>

      <SectionCard
        title="Management Workspace"
        description="Admin area with two tabs required by PRD: Subscriptions and Pricings."
      >
        <Tabs
          value={activeTab}
          onChange={(_event, value: ProductsPricingTab) => setActiveTab(value)}
          sx={{ mb: 2 }}
        >
          <Tab
            value="subscriptions"
            label={`Subscriptions (${subscriptionsQuery.data?.total ?? 0})`}
          />
          <Tab value="pricings" label={`Pricings (${pricingsQuery.data?.total ?? 0})`} />
        </Tabs>

        {activeTab === 'subscriptions' ? (
          <SubscriptionsTab />
        ) : (
          <PricingsTab />
        )}
      </SectionCard>
    </Stack>
  );
}
