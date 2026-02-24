export function toProductCodeBase(name: string): string {
  const ascii = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
  const code = ascii
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return code === '' ? 'PRODUCT' : code;
}

export function buildUniqueProductCode(
  baseCode: string,
  existingCodes: Iterable<string>
): string {
  const normalizedBaseCode = toProductCodeBase(baseCode);
  const existingCodeSet = new Set(
    Array.from(existingCodes, (code) => code.trim().toUpperCase())
  );

  if (!existingCodeSet.has(normalizedBaseCode)) {
    return normalizedBaseCode;
  }

  let suffix = 2;
  while (existingCodeSet.has(`${normalizedBaseCode}_${suffix}`)) {
    suffix += 1;
  }

  return `${normalizedBaseCode}_${suffix}`;
}
