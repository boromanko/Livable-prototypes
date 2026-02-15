import type {
  BillingScope,
  PricingTreeAccountUsage,
  PricingTreeItem,
  PricingTreePropertyUsage,
  ProductItem
} from '../../../api';

export type PricingActionsMenuTarget = {
  anchorEl: HTMLElement;
  pricingId: string;
};

export type DetachConfirmTarget = {
  pricingId: string;
  subscriptionId: string;
  title: string;
};

export type VisibleProduct = Pick<ProductItem, 'id' | 'name' | 'code'>;

export type ToggleExpanded = (
  setter: React.Dispatch<React.SetStateAction<Set<string>>>,
  key: string
) => void;

export type OpenCreateSubscription = (
  pricingId: string,
  options?: { accountId?: string; scope?: BillingScope }
) => void;

export type OpenEditPricing = (pricing: PricingTreeItem) => void;

export type SpecificPropertyRow = {
  accountUsage: PricingTreeAccountUsage;
  propertyUsage: PricingTreePropertyUsage;
};
