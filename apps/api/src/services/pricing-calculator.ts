export type TierInput = {
  fromUnit: number;
  toUnit: number | null;
  unitAmountCents: number;
};

function assertInteger(value: number, field: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${field} must be an integer`);
  }
}

function assertNonNegative(value: number, field: string): void {
  if (value < 0) {
    throw new Error(`${field} must be non-negative`);
  }
}

function normalizeTiers(tiers: TierInput[]): TierInput[] {
  return [...tiers].sort((left, right) => left.fromUnit - right.fromUnit);
}

export function validateTierStructure(tiers: TierInput[]): TierInput[] {
  if (tiers.length === 0) {
    throw new Error('Metered pricing requires at least one tier');
  }

  const normalized = normalizeTiers(tiers);

  if (normalized[0]?.fromUnit !== 1) {
    throw new Error('Metered pricing must start from unit 1');
  }

  for (let index = 0; index < normalized.length; index += 1) {
    const current = normalized[index];
    const next = normalized[index + 1];

    assertInteger(current.fromUnit, 'fromUnit');
    assertInteger(current.unitAmountCents, 'unitAmountCents');
    assertNonNegative(current.unitAmountCents, 'unitAmountCents');

    if (current.fromUnit <= 0) {
      throw new Error('fromUnit must be greater than 0');
    }

    if (current.toUnit !== null) {
      assertInteger(current.toUnit, 'toUnit');
      if (current.toUnit < current.fromUnit) {
        throw new Error('toUnit must be greater than or equal to fromUnit');
      }
    }

    if (!next) {
      continue;
    }

    if (current.toUnit === null) {
      throw new Error('Only the last tier can be open-ended');
    }

    if (next.fromUnit !== current.toUnit + 1) {
      throw new Error('Tiers must be contiguous without gaps or overlaps');
    }
  }

  return normalized;
}
