import type { PaginatedResponse, PaginationParams } from './common';

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
