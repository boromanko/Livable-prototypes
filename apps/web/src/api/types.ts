export type PaginationParams = {
  page?: number;
  pageSize?: number;
};

export type PaginatedResponse<TItem> = {
  items: TItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type HealthResponse = {
  status: string;
};

export type AccountItem = {
  id: string;
  companyName: string;
  email: string;
  createdAt: string;
  propertiesCount: number;
  subscriptionsCount: number;
};

export type AccountsQueryParams = PaginationParams & {
  search?: string;
};

export type AccountsResponse = PaginatedResponse<AccountItem>;

export type PropertyItem = {
  id: string;
  accountId: string;
  name: string;
  address: string;
  createdAt: string;
  subscriptionsCount: number;
};

export type PropertiesQueryParams = PaginationParams & {
  accountId: string;
  search?: string;
};

export type PropertiesResponse = PaginatedResponse<PropertyItem>;

export type PaymentMethodItem = {
  id: string;
  accountId: string;
  type: 'CARD' | 'US_BANK_ACCOUNT';
  label: string;
  last4: string | null;
  isDefault: boolean;
  createdAt: string;
};

export type PaymentMethodsQueryParams = {
  accountId: string;
};

export type PaymentMethodsResponse = {
  items: PaymentMethodItem[];
};

export type ProductItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  pricingsCount: number;
};

export type ProductsResponse = {
  items: ProductItem[];
};

export type PricingType = 'FIXED' | 'TIERED';

export type PricingTier = {
  id: string;
  fromUnit: number;
  toUnit: number | null;
  unitAmountCents: number;
};

export type PricingItem = {
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
  tiers: PricingTier[];
};

export type PricingsQueryParams = PaginationParams & {
  productId?: string;
  type?: PricingType;
  search?: string;
};

export type PricingsResponse = PaginatedResponse<PricingItem>;

export type CreatePricingPayload = {
  productId: string;
  internalName: string;
  type: PricingType;
  fixedAmountCents?: number | null;
  minimumPriceCents?: number | null;
  currency?: string;
  billingInterval?: string;
  isActive?: boolean;
  tiers?: Array<{
    fromUnit: number;
    toUnit: number | null;
    unitAmountCents: number;
  }>;
};

export type UpdatePricingPayload = Partial<CreatePricingPayload>;

export type UpsertPricingResponse = {
  item: PricingItem;
};

export type DeletePricingResponse = {
  deleted: boolean;
  id: string;
};

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
  property: {
    id: string;
    name: string;
    address: string;
  } | null;
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
  propertyId?: string | null;
  startDate: string;
  endDate?: string | null;
  status?: SubscriptionStatus;
  paymentMethodId?: string | null;
  pricingIds: string[];
};

export type UpdateSubscriptionPayload = Partial<
  Omit<CreateSubscriptionPayload, 'accountId'>
>;

export type UpsertSubscriptionResponse = {
  item: SubscriptionItem;
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
