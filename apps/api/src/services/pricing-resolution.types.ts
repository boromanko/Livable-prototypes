import { PricingType } from '@stripe-integration/db';

export type ResolutionStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CANCELED';
export type ResolutionScope = 'ACCOUNT' | 'PROPERTY';
export type PricingTypeValue = (typeof PricingType)[keyof typeof PricingType];

export type TierScope = 'ACCOUNT_POOL' | 'PROPERTY';

export type TierSnapshot = {
  fromUnit: number;
  toUnit: number | null;
  unitAmountCents: number;
};

export type PricingProduct = {
  id: string;
  name: string;
  code: string;
};

export type AccountIdentity = {
  id: string;
  companyName: string;
  email: string;
};

export type PricingSubscription = {
  id: string;
  scope: ResolutionScope;
  status: ResolutionStatus;
  createdAt: Date;
  accountId: string;
  propertyIds: string[];
  account: AccountIdentity;
};

export type PricingResolutionInput = {
  id: string;
  product: PricingProduct;
  internalName: string;
  type: PricingTypeValue;
  fixedAmountCents: number | null;
  minimumPriceCents: number | null;
  currency: string;
  billingInterval: string;
  isActive: boolean;
  createdAt: Date;
  subscriptionsCount: number;
  tiers: TierSnapshot[];
  subscriptions: PricingSubscription[];
};

export type ResolutionPropertyInput = {
  id: string;
  accountId: string;
  address: string;
  billableUnits: number;
};

export type ResolutionCandidate = {
  pricingId: string;
  productId: string;
  subscriptionId: string;
  scope: ResolutionScope;
  status: ResolutionStatus;
  createdAt: Date;
  accountId: string;
  propertyId: string | null;
  account: AccountIdentity;
};

export type PricingTreeResolvedTier = TierSnapshot | null;

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
  tierScope: TierScope;
  currentTier: PricingTreeResolvedTier;
  currentUnitAmountCents: number | null;
};

export type PricingTreeAccountUsage = {
  account: AccountIdentity;
  source: 'ACCOUNT' | 'PROPERTY_ONLY';
  accountSubscriptionId: string | null;
  propertiesMatched: number;
  inheritedPropertiesCount: number;
  overridePropertiesCount: number;
  totalProperties: number;
  totalBillableUnits: number;
  tierScope: TierScope;
  currentTier: PricingTreeResolvedTier;
  currentUnitAmountCents: number | null;
  properties: PricingTreePropertyUsage[];
};

export type PricingTreeResolvedItem = {
  id: string;
  product: PricingProduct;
  internalName: string;
  type: PricingTypeValue;
  fixedAmountCents: number | null;
  minimumPriceCents: number | null;
  currency: string;
  billingInterval: string;
  isActive: boolean;
  createdAt: Date;
  subscriptionsCount: number;
  tiers: TierSnapshot[];
  accounts: PricingTreeAccountUsage[];
};

export type CandidatesByProductAndAccount = Map<
  string,
  Map<
    string,
    {
      accountCandidates: ResolutionCandidate[];
      propertyCandidatesByPropertyId: Map<string, ResolutionCandidate[]>;
    }
  >
>;
