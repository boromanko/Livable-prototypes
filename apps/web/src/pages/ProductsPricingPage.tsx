import { Box, Tab, Tabs, Typography } from '@mui/material';
import { Suspense, lazy, useEffect, useState } from 'react';
import { canViewPricings, useDemoRole } from '../demoRole';
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
  const { role } = useDemoRole();
  const canOpenPricingsTab = canViewPricings(role);
  const [activeTab, setActiveTab] = useState<ProductsPricingTab>('subscriptions');

  useEffect(() => {
    if (!canOpenPricingsTab && activeTab === 'pricings') {
      setActiveTab('subscriptions');
    }
  }, [activeTab, canOpenPricingsTab]);

  return (
    <Box sx={{ minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          pt: 1.5,
          borderBottom: `1px solid ${prototypeTokens.color.border.default}`,
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'flex-end'
        }}
      >
        <Box sx={{ pl: 2, pr: 2, display: 'flex', alignItems: 'flex-start' }}>
          <Tabs
            value={activeTab}
            onChange={(_event, value: ProductsPricingTab) => setActiveTab(value)}
            sx={{
              minHeight: 60,
              '& .MuiTabs-indicator': {
                height: 3,
                backgroundColor: prototypeTokens.color.brand.teal500
              },
              '& .MuiTab-root': {
                minHeight: 60,
                px: 2,
                minWidth: 'auto',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: 17,
                lineHeight: '24px',
                color: '#4B617C'
              },
              '& .MuiTab-root.Mui-selected': {
                color: prototypeTokens.color.text.primary
              }
            }}
          >
            <Tab value="subscriptions" label="Subscriptions" />
            {canOpenPricingsTab ? <Tab value="pricings" label="Pricings" /> : null}
          </Tabs>
        </Box>
      </Box>

      <Box sx={{ minHeight: 0, flex: 1, overflow: 'hidden' }}>
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
  );
}
