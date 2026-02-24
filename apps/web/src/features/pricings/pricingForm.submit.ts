import type { PricingFormState, TierValidation } from './pricingForm.utils';
import { parseUsdToCents } from './pricingForm.utils';

type PricingMutationPayload = {
  internalName: string;
  type: PricingFormState['type'];
  fixedAmountCents?: number | null;
  minimumPriceCents?: number | null;
  tiers: TierValidation['payload'];
};

export function buildPricingMutationPayload(
  formState: PricingFormState,
  tierValidation: TierValidation
): PricingMutationPayload {
  const minimumPriceCents =
    formState.type === 'METERED' ? parseUsdToCents(formState.minimumPriceUsd) : null;
  const fixedAmountCents = parseUsdToCents(formState.fixedAmountUsd);

  return {
    internalName: formState.internalName.trim(),
    type: formState.type,
    fixedAmountCents: formState.type === 'FIXED' ? (fixedAmountCents ?? undefined) : null,
    minimumPriceCents:
      formState.type === 'METERED' && formState.minimumPriceUsd.trim() !== ''
        ? minimumPriceCents
        : null,
    tiers: formState.type === 'METERED' ? tierValidation.payload : []
  };
}
