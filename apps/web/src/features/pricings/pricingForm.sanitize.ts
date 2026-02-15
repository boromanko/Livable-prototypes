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

export function formatCentsToUsdInput(valueCents: number | null): string {
  if (valueCents === null) {
    return '';
  }

  const dollars = (valueCents / 100).toFixed(2);
  return dollars.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}
