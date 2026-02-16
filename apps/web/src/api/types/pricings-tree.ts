import type { PricingTier, PricingType } from './pricings';

export type PricingTreeResolvedTier = {
  fromUnit: number;
  toUnit: number | null;
  unitAmountCents: number;
} | null;

export type PricingTierScope = 'ACCOUNT_POOL' | 'PROPERTY';
export type PricingTreeSubscriptionScope = 'ACCOUNT' | 'PROPERTY';
export type PricingTreeSubscriptionStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CANCELED';

export type PricingTreeSubscriptionSummary = {
  id: string;
  scope: PricingTreeSubscriptionScope;
  status: PricingTreeSubscriptionStatus;
  createdAt: string;
  account: {
    id: string;
    companyName: string;
    email: string;
  };
  propertiesCount: number;
  totalProperties: number;
  unitsCount: number;
  coverageLabel: string;
};

export type PricingTreePropertyUsage = {
  property: {
    id: string;
    address: string;
    billableUnits: number;
  };
  source: 'INHERITED' | 'OVERRIDE';
  subscriptionId: string | null;
  resolvedBySubscriptionId: string | null;
  excludedFromAccountPool: boolean;
  tierScope: PricingTierScope;
  currentTier: PricingTreeResolvedTier;
  currentUnitAmountCents: number | null;
};

export type PricingTreeAccountUsage = {
  account: {
    id: string;
    companyName: string;
    email: string;
  };
  source: 'ACCOUNT' | 'PROPERTY_ONLY';
  accountSubscriptionId: string | null;
  propertiesMatched: number;
  inheritedPropertiesCount: number;
  overridePropertiesCount: number;
  totalProperties: number;
  totalBillableUnits: number;
  tierScope: PricingTierScope;
  currentTier: PricingTreeResolvedTier;
  currentUnitAmountCents: number | null;
  properties: PricingTreePropertyUsage[];
};

export type PricingTreeItem = {
  id: string;
  product: {
    id: string;
    name: string;
    code: string;
  };
  internalName: string;
  type: PricingType;
  fixedAmountCents: number | null;
  minimumPriceCents: number | null;
  currency: string;
  billingInterval: string;
  isActive: boolean;
  createdAt: string;
  subscriptionsCount: number;
  subscriptions: PricingTreeSubscriptionSummary[];
  tiers: PricingTier[];
  accounts: PricingTreeAccountUsage[];
};

export type PricingsTreeResponse = {
  items: PricingTreeItem[];
};
