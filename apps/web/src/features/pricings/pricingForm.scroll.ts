import type { RefObject } from 'react';
import type { FormValidationState } from './pricingForm.utils';

export type PricingFormValidationRefs = {
  internalNameFieldRef: RefObject<HTMLDivElement>;
  productFieldRef: RefObject<HTMLDivElement>;
  fixedAmountFieldRef: RefObject<HTMLDivElement>;
  tierSectionRef: RefObject<HTMLDivElement>;
  minimumPriceFieldRef: RefObject<HTMLDivElement>;
};

export function scrollToFirstPricingValidationError(
  formValidation: FormValidationState,
  refs: PricingFormValidationRefs
): void {
  const scrollOptions: ScrollIntoViewOptions = { behavior: 'smooth', block: 'center' };

  if (formValidation.internalNameError) {
    refs.internalNameFieldRef.current?.scrollIntoView(scrollOptions);
    return;
  }

  if (formValidation.productError) {
    refs.productFieldRef.current?.scrollIntoView(scrollOptions);
    return;
  }

  if (formValidation.fixedAmountError) {
    refs.fixedAmountFieldRef.current?.scrollIntoView(scrollOptions);
    return;
  }

  if (formValidation.tiersError) {
    refs.tierSectionRef.current?.scrollIntoView(scrollOptions);
    return;
  }

  if (formValidation.minimumPriceError) {
    refs.minimumPriceFieldRef.current?.scrollIntoView(scrollOptions);
  }
}
