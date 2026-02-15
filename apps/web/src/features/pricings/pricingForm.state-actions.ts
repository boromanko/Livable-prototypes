import type { PricingType } from '../../api';
import {
  defaultTier,
  formatUsdInputOnBlur,
  getMinAllowedMaxUnits,
  parsePositiveInteger,
  sanitizeIntegerInput,
  sanitizeMoneyInput,
  type PricingFormState
} from './pricingForm.utils';

export function addTierDraft(state: PricingFormState): PricingFormState {
  return {
    ...state,
    tiers: [...state.tiers, defaultTier(crypto.randomUUID())]
  };
}

export function removeTierDraft(state: PricingFormState, tierId: string): PricingFormState {
  const nextTiers = state.tiers.filter((tier) => tier.id !== tierId);
  if (nextTiers.length === 0) {
    return {
      ...state,
      tiers: [defaultTier(crypto.randomUUID())]
    };
  }

  const lastTier = nextTiers[nextTiers.length - 1];
  if (parsePositiveInteger(lastTier.maxUnits) !== null) {
    return {
      ...state,
      tiers: [...nextTiers, defaultTier(crypto.randomUUID())]
    };
  }

  return {
    ...state,
    tiers: nextTiers
  };
}

export function updateTierMaxUnitsDraft(
  state: PricingFormState,
  tierId: string,
  value: string
): PricingFormState {
  const sanitizedValue = sanitizeIntegerInput(value);
  const tierIndex = state.tiers.findIndex((tier) => tier.id === tierId);
  if (tierIndex === -1) {
    return state;
  }

  const isEditingLastTier = tierIndex === state.tiers.length - 1;
  const nextTiers = state.tiers.map((tier) =>
    tier.id === tierId ? { ...tier, maxUnits: sanitizedValue } : tier
  );

  if (isEditingLastTier && parsePositiveInteger(sanitizedValue) !== null) {
    nextTiers.push(defaultTier(crypto.randomUUID()));
  }

  return {
    ...state,
    tiers: nextTiers
  };
}

export function updateTierUnitPriceDraft(
  state: PricingFormState,
  tierId: string,
  value: string
): PricingFormState {
  return {
    ...state,
    tiers: state.tiers.map((tier) =>
      tier.id === tierId ? { ...tier, unitAmountUsd: sanitizeMoneyInput(value) } : tier
    )
  };
}

export function normalizeTierUnitPriceDraft(
  state: PricingFormState,
  tierId: string
): PricingFormState {
  return {
    ...state,
    tiers: state.tiers.map((tier) =>
      tier.id === tierId
        ? { ...tier, unitAmountUsd: formatUsdInputOnBlur(tier.unitAmountUsd) }
        : tier
    )
  };
}

export function normalizeTierMaxUnitsDraft(
  state: PricingFormState,
  tierId: string
): PricingFormState {
  const tierIndex = state.tiers.findIndex((tier) => tier.id === tierId);
  if (tierIndex === -1) {
    return state;
  }

  const currentValue = state.tiers[tierIndex]?.maxUnits ?? '';
  const parsedCurrent = parsePositiveInteger(currentValue);
  if (parsedCurrent === null) {
    return state;
  }

  const minAllowed = getMinAllowedMaxUnits(state.tiers, tierIndex);
  if (parsedCurrent >= minAllowed) {
    return state;
  }

  return {
    ...state,
    tiers: state.tiers.map((tier, index) =>
      index === tierIndex ? { ...tier, maxUnits: String(minAllowed) } : tier
    )
  };
}

export function normalizeFixedAmountDraft(state: PricingFormState): PricingFormState {
  return {
    ...state,
    fixedAmountUsd: formatUsdInputOnBlur(state.fixedAmountUsd)
  };
}

export function normalizeMinimumPriceDraft(state: PricingFormState): PricingFormState {
  return {
    ...state,
    minimumPriceUsd: formatUsdInputOnBlur(state.minimumPriceUsd)
  };
}

export function setPricingTypeDraft(state: PricingFormState, type: PricingType): PricingFormState {
  return {
    ...state,
    type
  };
}

export function setInternalNameDraft(state: PricingFormState, internalName: string): PricingFormState {
  return {
    ...state,
    internalName
  };
}

export function setProductIdDraft(state: PricingFormState, productId: string): PricingFormState {
  return {
    ...state,
    productId
  };
}

export function setFixedAmountDraft(state: PricingFormState, value: string): PricingFormState {
  return {
    ...state,
    fixedAmountUsd: sanitizeMoneyInput(value)
  };
}

export function setMinimumPriceDraft(state: PricingFormState, value: string): PricingFormState {
  return {
    ...state,
    minimumPriceUsd: sanitizeMoneyInput(value)
  };
}
