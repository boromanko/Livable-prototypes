type MoneyFormatOptions = {
  fallback?: string;
};

export function formatMoneyCents(
  amountCents: number | null,
  currency: string,
  options?: MoneyFormatOptions
): string {
  if (amountCents === null) {
    return options?.fallback ?? 'N/A';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2
  }).format(amountCents / 100);
}
