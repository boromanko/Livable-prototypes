import { Stack } from '@mui/material';
import type { PricingTreeAccountUsage, PricingTreeItem } from '../../../api';
import type {
  DetachConfirmTarget,
  OpenCreateSubscription,
  SpecificPropertyRow,
  ToggleExpanded
} from './pricingTree.types';
import {
  PricingTreeAccountUsageRow,
  PricingTreePropertyUsageRow
} from './PricingTreeUsageEntityRows';
import {
  PricingTreeUsageAssignSubscriptionRow,
  PricingTreeUsageSectionHeader
} from './PricingTreeUsageSections';

type PricingTreeUsageRowsProps = {
  pricing: PricingTreeItem;
  productTierColumnCount: number;
  accountRows: PricingTreeAccountUsage[];
  specificPropertyRows: SpecificPropertyRow[];
  showAccountsSectionHeader: boolean;
  showPropertiesSectionHeader: boolean;
  isAccountsCollapsed: boolean;
  isSpecificPropertiesCollapsed: boolean;
  isAccountsVisible: boolean;
  isSpecificPropertiesVisible: boolean;
  accountsSectionKey: string;
  specificPropertiesSectionKey: string;
  setCollapsedUsageSections: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleExpanded: ToggleExpanded;
  setDetachConfirmTarget: React.Dispatch<React.SetStateAction<DetachConfirmTarget | null>>;
  openCreateSubscription: OpenCreateSubscription;
};

export function PricingTreeUsageRows(props: PricingTreeUsageRowsProps): JSX.Element {
  const {
    pricing,
    productTierColumnCount,
    accountRows,
    specificPropertyRows,
    showAccountsSectionHeader,
    showPropertiesSectionHeader,
    isAccountsCollapsed,
    isSpecificPropertiesCollapsed,
    isAccountsVisible,
    isSpecificPropertiesVisible,
    accountsSectionKey,
    specificPropertiesSectionKey,
    setCollapsedUsageSections,
    toggleExpanded,
    setDetachConfirmTarget,
    openCreateSubscription
  } = props;

  return (
    <Stack spacing={0}>
      {showAccountsSectionHeader ? (
        <PricingTreeUsageSectionHeader
          title={`${accountRows.length} accounts`}
          collapsed={isAccountsCollapsed}
          expandLabel="Expand accounts section"
          collapseLabel="Collapse accounts section"
          onToggle={() => toggleExpanded(setCollapsedUsageSections, accountsSectionKey)}
        />
      ) : null}

      {isAccountsVisible
        ? accountRows.map((accountUsage) => (
            <PricingTreeAccountUsageRow
              key={`${pricing.id}:${accountUsage.account.id}`}
              pricing={pricing}
              productTierColumnCount={productTierColumnCount}
              accountUsage={accountUsage}
              showAccountsSectionHeader={showAccountsSectionHeader}
              setDetachConfirmTarget={setDetachConfirmTarget}
            />
          ))
        : null}

      {isAccountsVisible ? (
        <PricingTreeUsageAssignSubscriptionRow
          pricingId={pricing.id}
          scope="ACCOUNT"
          showSectionHeader={showAccountsSectionHeader}
          openCreateSubscription={openCreateSubscription}
        />
      ) : null}

      {showPropertiesSectionHeader ? (
        <PricingTreeUsageSectionHeader
          title={`${specificPropertyRows.length} specific properties`}
          collapsed={isSpecificPropertiesCollapsed}
          expandLabel="Expand specific properties section"
          collapseLabel="Collapse specific properties section"
          onToggle={() => toggleExpanded(setCollapsedUsageSections, specificPropertiesSectionKey)}
        />
      ) : null}

      {isSpecificPropertiesVisible
        ? specificPropertyRows.map(({ accountUsage, propertyUsage }) => (
            <PricingTreePropertyUsageRow
              key={`${pricing.id}:${accountUsage.account.id}:${propertyUsage.property.id}`}
              pricing={pricing}
              productTierColumnCount={productTierColumnCount}
              accountUsage={accountUsage}
              propertyUsage={propertyUsage}
              showPropertiesSectionHeader={showPropertiesSectionHeader}
              setDetachConfirmTarget={setDetachConfirmTarget}
            />
          ))
        : null}

      {isSpecificPropertiesVisible ? (
        <PricingTreeUsageAssignSubscriptionRow
          pricingId={pricing.id}
          scope="PROPERTY"
          showSectionHeader={showPropertiesSectionHeader}
          openCreateSubscription={openCreateSubscription}
        />
      ) : null}
    </Stack>
  );
}
