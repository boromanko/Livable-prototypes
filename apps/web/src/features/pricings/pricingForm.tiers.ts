import { parsePositiveInteger, parseUsdToCents } from './pricingForm.sanitize';
import type { TierDraft, TierDraftErrors, TierValidation } from './pricingForm.types';

export function defaultTier(id: string, maxUnits = ''): TierDraft {
  return {
    id,
    maxUnits,
    unitAmountUsd: ''
  };
}

export function getTierStartUnits(tiers: TierDraft[]): number[] {
  const starts: number[] = [];
  let currentStart = 1;

  for (let index = 0; index < tiers.length; index += 1) {
    starts.push(currentStart);

    if (index === tiers.length - 1) {
      continue;
    }

    const maxUnits = parsePositiveInteger(tiers[index]?.maxUnits ?? '');
    if (maxUnits !== null && maxUnits >= currentStart) {
      currentStart = maxUnits + 1;
      continue;
    }

    // Keep placeholder starts monotonic even for empty/invalid draft rows.
    currentStart += 1;
  }

  return starts;
}

export function getMinAllowedMaxUnits(tiers: TierDraft[], index: number): number {
  let currentStart = 1;

  for (let i = 0; i < index; i += 1) {
    const previousMax = parsePositiveInteger(tiers[i]?.maxUnits ?? '');
    if (previousMax !== null && previousMax >= currentStart) {
      currentStart = previousMax + 1;
    }
  }

  return currentStart;
}

export function validateTiers(tiers: TierDraft[]): TierValidation {
  const errors: TierDraftErrors[] = tiers.map(() => ({}));
  const payload: TierValidation['payload'] = [];

  let currentFromUnit = 1;

  for (let index = 0; index < tiers.length; index += 1) {
    const tier = tiers[index];
    const isLastTier = index === tiers.length - 1;

    const unitAmountCents = parseUsdToCents(tier.unitAmountUsd);
    if (unitAmountCents === null) {
      errors[index].unitAmountUsd = 'Unit price is required (USD).';
    }

    const maxUnits = parsePositiveInteger(tier.maxUnits);

    if (isLastTier && maxUnits === null) {
      payload.push({
        fromUnit: currentFromUnit,
        toUnit: null,
        unitAmountCents: unitAmountCents ?? 0
      });
      continue;
    }

    if (maxUnits === null) {
      errors[index].maxUnits = 'Max units is required.';
      payload.push({
        fromUnit: currentFromUnit,
        toUnit: currentFromUnit,
        unitAmountCents: unitAmountCents ?? 0
      });
      continue;
    }

    if (maxUnits < currentFromUnit) {
      errors[index].maxUnits = `Must be greater than or equal to ${currentFromUnit}.`;
      payload.push({
        fromUnit: currentFromUnit,
        toUnit: currentFromUnit,
        unitAmountCents: unitAmountCents ?? 0
      });
      continue;
    }

    payload.push({
      fromUnit: currentFromUnit,
      toUnit: maxUnits,
      unitAmountCents: unitAmountCents ?? 0
    });

    currentFromUnit = maxUnits + 1;
  }

  const hasErrors = errors.some((item) => Boolean(item.maxUnits || item.unitAmountUsd));

  return {
    errors,
    payload,
    hasErrors
  };
}
