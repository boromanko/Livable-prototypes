import { Stack } from '@mui/material';
import type { PricingTreeItem, PricingTreeSubscriptionSummary } from '../../../api';
import type { DetachConfirmTarget, OpenEditSubscription } from './pricingTree.types';
import { PricingTreeSubscriptionUsageRow } from './PricingTreeUsageEntityRows';

type PricingTreeUsageRowsProps = {
  pricing: PricingTreeItem;
  groupByProduct: boolean;
  productTierColumnCount: number;
  subscriptions: PricingTreeSubscriptionSummary[];
  openEditSubscription: OpenEditSubscription;
  setDetachConfirmTarget: React.Dispatch<React.SetStateAction<DetachConfirmTarget | null>>;
  canManagePricings: boolean;
};

export function PricingTreeUsageRows(props: PricingTreeUsageRowsProps): JSX.Element {
  const {
    pricing,
    groupByProduct,
    productTierColumnCount,
    subscriptions,
    openEditSubscription,
    setDetachConfirmTarget,
    canManagePricings
  } = props;

  return (
    <Stack spacing={0}>
      {subscriptions.map((subscription, index) => (
        <PricingTreeSubscriptionUsageRow
          key={`${pricing.id}:${subscription.id}`}
          pricing={pricing}
          groupByProduct={groupByProduct}
          productTierColumnCount={productTierColumnCount}
          subscription={subscription}
          isLast={index === subscriptions.length - 1}
          onEditSubscription={openEditSubscription}
          setDetachConfirmTarget={setDetachConfirmTarget}
          canManagePricings={canManagePricings}
        />
      ))}
    </Stack>
  );
}
