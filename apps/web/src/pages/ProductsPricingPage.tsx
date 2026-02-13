import { Box, Divider, Tab, Tabs, Typography } from '@mui/material';
import { Suspense, lazy, useState } from 'react';
import { prototypeTokens } from '../theme/tokens';

type ProductsPricingTab = 'subscriptions' | 'pricings';

const SubscriptionsTab = lazy(async () => {
  const module = await import('../features/subscriptions/SubscriptionsTab');
  return { default: module.SubscriptionsTab };
});

const PricingsTab = lazy(async () => {
  const module = await import('../features/pricings/PricingsTab');
  return { default: module.PricingsTab };
});

export function ProductsPricingPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<ProductsPricingTab>('subscriptions');

  return (
    <Box sx={{ minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: `1px solid ${prototypeTokens.color.border.default}`
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontFamily: prototypeTokens.typography.title.family,
            fontWeight: prototypeTokens.typography.title.weight,
            fontSize: `${prototypeTokens.typography.title.sizePx}px`,
            color: prototypeTokens.color.text.primary
          }}
        >
          Products & Pricing
        </Typography>
      </Box>

      <Box sx={{ minHeight: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ px: { xs: 1.5, sm: 2 } }}>
          <Tabs
            value={activeTab}
            onChange={(_event, value: ProductsPricingTab) => setActiveTab(value)}
          >
            <Tab value="subscriptions" label="Subscriptions" />
            <Tab value="pricings" label="Pricings" />
          </Tabs>
        </Box>
        <Divider />
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <Suspense
            fallback={
              <Typography variant="body2" color="text.secondary">
                Loading section...
              </Typography>
            }
          >
            {activeTab === 'subscriptions' ? <SubscriptionsTab /> : <PricingsTab />}
          </Suspense>
        </Box>
      </Box>
    </Box>
  );
}
