import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildUniqueProductCode, toProductCodeBase } from './products.code.js';

describe('toProductCodeBase', () => {
  it('normalizes whitespace and punctuation', () => {
    assert.equal(toProductCodeBase('Late fee (premium)!'), 'LATE_FEE_PREMIUM');
  });

  it('removes diacritics and keeps alphanumeric symbols', () => {
    assert.equal(toProductCodeBase('Crème Brûlée 2.0'), 'CREME_BRULEE_2_0');
  });

  it('falls back to PRODUCT when no valid characters remain', () => {
    assert.equal(toProductCodeBase('___***___'), 'PRODUCT');
  });
});

describe('buildUniqueProductCode', () => {
  it('returns base code when it does not exist', () => {
    const code = buildUniqueProductCode('UTILITY_BILLING', ['LATE_FEE']);
    assert.equal(code, 'UTILITY_BILLING');
  });

  it('appends numeric suffix when base code exists', () => {
    const code = buildUniqueProductCode('LATE_FEE', ['LATE_FEE']);
    assert.equal(code, 'LATE_FEE_2');
  });

  it('uses first available suffix gap', () => {
    const code = buildUniqueProductCode('SERVICE_FEE', [
      'SERVICE_FEE',
      'SERVICE_FEE_2',
      'SERVICE_FEE_4'
    ]);
    assert.equal(code, 'SERVICE_FEE_3');
  });

  it('handles case-insensitive conflicts', () => {
    const code = buildUniqueProductCode('late fee', ['LATE_FEE', 'late_fee_2']);
    assert.equal(code, 'LATE_FEE_3');
  });
});
