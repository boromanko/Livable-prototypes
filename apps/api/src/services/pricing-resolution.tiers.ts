import { PricingType } from '@stripe-integration/db';
import type { PricingTypeValue, TierSnapshot } from './pricing-resolution.types.js';

export function resolveCurrentTier(tiers: TierSnapshot[], units: number): TierSnapshot | null {
  if (tiers.length === 0 || units <= 0) {
    return null;
  }

  const tier = tiers.find(
    (item) => units >= item.fromUnit && (item.toUnit === null || units <= item.toUnit)
  );

  return tier ?? null;
}

export function resolveUnitAmountCents(
  pricingType: PricingTypeValue,
  fixedAmountCents: number | null,
  tier: TierSnapshot | null
): number | null {
  if (pricingType === PricingType.FIXED) {
    return fixedAmountCents;
  }

  return tier?.unitAmountCents ?? null;
}
