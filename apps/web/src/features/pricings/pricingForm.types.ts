import type { PricingType } from '../../api';

export type TierDraft = {
  id: string;
  maxUnits: string;
  unitAmountUsd: string;
};

export type PricingFormState = {
  productId: string;
  internalName: string;
  type: PricingType;
  fixedAmountUsd: string;
  minimumPriceUsd: string;
  tiers: TierDraft[];
};

export type TierDraftErrors = {
  maxUnits?: string;
  unitAmountUsd?: string;
};

export type TierValidation = {
  errors: TierDraftErrors[];
  payload: Array<{
    fromUnit: number;
    toUnit: number | null;
    unitAmountCents: number;
  }>;
  hasErrors: boolean;
};

export type FormValidationState = {
  internalNameError: boolean;
  productError: boolean;
  fixedAmountError: boolean;
  minimumPriceError: boolean;
  tiersError: boolean;
  hasErrors: boolean;
};
