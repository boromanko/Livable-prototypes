import { parseUsdToCents } from './pricingForm.sanitize';
import type { FormValidationState, PricingFormState, TierValidation } from './pricingForm.types';

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
