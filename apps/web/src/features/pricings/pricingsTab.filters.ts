import type { PricingTreeItem, PricingType } from '../../api';

export function matchesPricingFilters(
  pricing: PricingTreeItem,
  search: string,
  typeFilter: 'ALL' | PricingType,
  productIdFilter: string[],
  accountIdFilter: string[]
): boolean {
  if (typeFilter !== 'ALL' && pricing.type !== typeFilter) {
    return false;
  }

  if (productIdFilter.length > 0 && !productIdFilter.includes(pricing.product.id)) {
    return false;
  }

  if (
    accountIdFilter.length > 0 &&
    !pricing.accounts.some((accountUsage) => accountIdFilter.includes(accountUsage.account.id))
  ) {
    return false;
  }

  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) {
    return true;
  }

  const inPricing =
    pricing.internalName.toLowerCase().includes(normalizedSearch) ||
    pricing.product.name.toLowerCase().includes(normalizedSearch) ||
    pricing.product.code.toLowerCase().includes(normalizedSearch);

  if (inPricing) {
    return true;
  }

  return pricing.accounts.some((accountUsage) => {
    if (
      accountUsage.account.companyName.toLowerCase().includes(normalizedSearch) ||
      accountUsage.account.email.toLowerCase().includes(normalizedSearch)
    ) {
      return true;
    }

    return accountUsage.properties.some((propertyUsage) =>
      propertyUsage.property.address.toLowerCase().includes(normalizedSearch)
    );
  });
}

export function hasStructuredPricingFilters(
  typeFilter: 'ALL' | PricingType,
  productIdFilter: string[],
  accountIdFilter: string[]
): boolean {
  return typeFilter !== 'ALL' || productIdFilter.length > 0 || accountIdFilter.length > 0;
}

export function countActivePricingFilters(
  typeFilter: 'ALL' | PricingType,
  productIdFilter: string[],
  accountIdFilter: string[]
): number {
  let count = 0;
  if (typeFilter !== 'ALL') {
    count += 1;
  }
  if (productIdFilter.length > 0) {
    count += 1;
  }
  if (accountIdFilter.length > 0) {
    count += 1;
  }
  return count;
}
