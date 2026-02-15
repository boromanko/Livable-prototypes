import type { PricingItem } from '../../api';
import { formatCentsToUsdInput } from './pricingForm.sanitize';
import { defaultTier } from './pricingForm.tiers';
import type { PricingFormState } from './pricingForm.types';

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
