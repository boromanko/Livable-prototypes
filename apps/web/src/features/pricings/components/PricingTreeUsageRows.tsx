import { Stack } from '@mui/material';
import type { PricingTreeItem, PricingTreeSubscriptionSummary } from '../../../api';
import type {
  DetachConfirmTarget,
  OpenCreateSubscription,
  ToggleExpanded
} from './pricingTree.types';
import { PricingTreeSubscriptionUsageRow } from './PricingTreeUsageEntityRows';
import {
  PricingTreeUsageAssignSubscriptionRow,
  PricingTreeUsageSectionHeader
} from './PricingTreeUsageSections';

type PricingTreeUsageRowsProps = {
  pricing: PricingTreeItem;
  productTierColumnCount: number;
  subscriptions: PricingTreeSubscriptionSummary[];
  showSubscriptionsSectionHeader: boolean;
  isSubscriptionsCollapsed: boolean;
  isSubscriptionsVisible: boolean;
  subscriptionsSectionKey: string;
  setCollapsedUsageSections: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleExpanded: ToggleExpanded;
  setDetachConfirmTarget: React.Dispatch<React.SetStateAction<DetachConfirmTarget | null>>;
  openCreateSubscription: OpenCreateSubscription;
};

export function PricingTreeUsageRows(props: PricingTreeUsageRowsProps): JSX.Element {
  const {
    pricing,
    productTierColumnCount,
    subscriptions,
    showSubscriptionsSectionHeader,
    isSubscriptionsCollapsed,
    isSubscriptionsVisible,
    subscriptionsSectionKey,
    setCollapsedUsageSections,
    toggleExpanded,
    setDetachConfirmTarget,
    openCreateSubscription
  } = props;
  const showAssignRow = isSubscriptionsVisible || subscriptions.length === 0;

  return (
    <Stack spacing={0}>
      {showSubscriptionsSectionHeader ? (
        <PricingTreeUsageSectionHeader
          title={`${subscriptions.length} subscriptions`}
          collapsed={isSubscriptionsCollapsed}
          expandLabel="Expand subscriptions section"
          collapseLabel="Collapse subscriptions section"
          onToggle={() => toggleExpanded(setCollapsedUsageSections, subscriptionsSectionKey)}
        />
      ) : null}

      {isSubscriptionsVisible
        ? subscriptions.map((subscription) => (
            <PricingTreeSubscriptionUsageRow
              key={`${pricing.id}:${subscription.id}`}
              pricing={pricing}
              productTierColumnCount={productTierColumnCount}
              subscription={subscription}
              showSubscriptionsSectionHeader={showSubscriptionsSectionHeader}
              setDetachConfirmTarget={setDetachConfirmTarget}
            />
          ))
        : null}

      {showAssignRow ? (
        <PricingTreeUsageAssignSubscriptionRow
          pricingId={pricing.id}
          showSectionHeader={showSubscriptionsSectionHeader}
          openCreateSubscription={openCreateSubscription}
        />
      ) : null}
    </Stack>
  );
}
