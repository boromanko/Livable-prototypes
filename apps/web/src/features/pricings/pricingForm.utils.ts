import type { PricingItem, PricingType } from '../../api';

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

export function defaultTier(id: string, maxUnits = ''): TierDraft {
  return {
    id,
    maxUnits,
    unitAmountUsd: ''
  };
}

export function parsePositiveInteger(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }

  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function sanitizeIntegerInput(value: string): string {
  return value.replace(/\D/g, '');
}

export function sanitizeMoneyInput(value: string): string {
  const normalized = value.replace(',', '.');
  let sanitized = '';
  let hasDot = false;

  for (const character of normalized) {
    if (/\d/.test(character)) {
      sanitized += character;
      continue;
    }

    if (character === '.' && !hasDot) {
      sanitized += '.';
      hasDot = true;
    }
  }

  if (sanitized.startsWith('.')) {
    sanitized = `0${sanitized}`;
  }

  if (!sanitized.includes('.')) {
    return sanitized;
  }

  const [integerPart, decimalPart = ''] = sanitized.split('.');
  return `${integerPart}.${decimalPart.slice(0, 2)}`;
}

export function parseUsdToCents(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }

  const normalized = trimmed.replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

export function formatUsdInputOnBlur(value: string): string {
  if (value.trim() === '') {
    return '';
  }

  const parsedCents = parseUsdToCents(value);
  if (parsedCents === null) {
    return value;
  }

  return (parsedCents / 100).toFixed(2);
}

function formatCentsToUsdInput(valueCents: number | null): string {
  if (valueCents === null) {
    return '';
  }

  const dollars = (valueCents / 100).toFixed(2);
  return dollars.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
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

export function getFormValidationState(
  formState: PricingFormState,
  tierValidation: TierValidation
): FormValidationState {
  const internalNameError = formState.internalName.trim() === '';
  const productError = formState.productId === '';

  const minimumPriceCents = parseUsdToCents(formState.minimumPriceUsd);
  const minimumPriceError =
    formState.type === 'TIERED' &&
    formState.minimumPriceUsd.trim() !== '' &&
    minimumPriceCents === null;

  const fixedAmountCents = parseUsdToCents(formState.fixedAmountUsd);
  const fixedAmountError = formState.type === 'FIXED' && fixedAmountCents === null;

  const tiersError =
    formState.type === 'TIERED' && (formState.tiers.length === 0 || tierValidation.hasErrors);

  const hasErrors =
    internalNameError || productError || minimumPriceError || fixedAmountError || tiersError;

  return {
    internalNameError,
    productError,
    fixedAmountError,
    minimumPriceError,
    tiersError,
    hasErrors
  };
}

export function buildDefaultPricingName(pricings: PricingItem[] | undefined): string {
  const maxPriceIndex = (pricings ?? []).reduce((acc, pricing) => {
    const match = pricing.internalName.trim().match(/^Price\s+(\d+)$/i);
    if (!match) {
      return acc;
    }

    const parsed = Number(match[1]);
    if (!Number.isFinite(parsed)) {
      return acc;
    }

    return Math.max(acc, parsed);
  }, 0);

  return `Price ${maxPriceIndex + 1}`;
}

export function buildInitialState(
  pricing?: PricingItem | null,
  defaultPricingName = 'Price 1',
  defaultProductId = ''
): PricingFormState {
  if (!pricing) {
    return {
      productId: defaultProductId,
      internalName: defaultPricingName,
      type: 'FIXED',
      fixedAmountUsd: '',
      minimumPriceUsd: '',
      tiers: [defaultTier(crypto.randomUUID())]
    };
  }

  return {
    productId: pricing.product.id,
    internalName: pricing.internalName,
    type: pricing.type,
    fixedAmountUsd: formatCentsToUsdInput(pricing.fixedAmountCents),
    minimumPriceUsd: formatCentsToUsdInput(pricing.minimumPriceCents),
    tiers:
      pricing.tiers.length > 0
        ? pricing.tiers.map((tier) => ({
            id: tier.id,
            maxUnits: tier.toUnit === null ? '' : String(tier.toUnit),
            unitAmountUsd: formatCentsToUsdInput(tier.unitAmountCents)
          }))
        : [defaultTier(crypto.randomUUID())]
  };
}
