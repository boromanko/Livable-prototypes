import type { PaginatedResponse, PaginationParams } from './common';
import type { PaymentMethodItem } from './payment-methods';
import type { PricingTier, PricingType } from './pricings';

export type BillingScope = 'ACCOUNT' | 'PROPERTY';
export type SubscriptionStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CANCELED';

export type SubscriptionPricingItem = {
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
  quantity: number;
  tiers: PricingTier[];
};

export type SubscriptionItem = {
  id: string;
  scope: BillingScope;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  account: {
    id: string;
    companyName: string;
    email: string;
  };
  properties: Array<{
    id: string;
    address: string;
    billableUnits: number;
  }>;
  paymentMethod: {
    id: string;
    type: PaymentMethodItem['type'];
    label: PaymentMethodItem['label'];
    last4: PaymentMethodItem['last4'];
    isDefault: PaymentMethodItem['isDefault'];
  } | null;
  pricings: SubscriptionPricingItem[];
};

export type SubscriptionsQueryParams = PaginationParams & {
  accountId?: string;
  propertyId?: string;
  scope?: BillingScope;
  status?: SubscriptionStatus;
  search?: string;
  startFrom?: string;
  startTo?: string;
};

export type SubscriptionsResponse = PaginatedResponse<SubscriptionItem>;

export type CreateSubscriptionPayload = {
  accountId: string;
  scope: BillingScope;
  propertyIds?: string[];
  startDate: string;
  endDate?: string | null;
  status?: SubscriptionStatus;
  paymentMethodId?: string | null;
  pricingIds: string[];
};

export type UpdateSubscriptionPayload = Partial<
  CreateSubscriptionPayload
>;

export type UpsertSubscriptionResponse = {
  item: SubscriptionItem;
};

export type SubscriptionTransferEligibilityPayload = {
  accountIds: string[];
  scope: BillingScope;
  propertyIds?: string[];
  startDate: string;
  endDate?: string | null;
  status?: SubscriptionStatus;
  pricingIds: string[];
};

export type SubscriptionTransferEligibilityItem = {
  accountId: string;
  eligible: boolean;
  reason: string | null;
};

export type SubscriptionTransferEligibilityResponse = {
  items: SubscriptionTransferEligibilityItem[];
};

export type SubscriptionBulkAction =
  | 'DELETE_SUBSCRIPTIONS'
  | 'ADD_PRICING'
  | 'REPLACE_PRICINGS'
  | 'DELETE_PRICING';

export type SubscriptionBulkPayload = {
  action: SubscriptionBulkAction;
  subscriptionIds: string[];
  pricingIds?: string[];
};

export type SubscriptionBulkResponse = {
  action: SubscriptionBulkAction;
  targetedSubscriptions: number;
  targetedPricings?: number;
  deletedSubscriptions?: number;
  createdLinks?: number;
  deletedLinks?: number;
};
