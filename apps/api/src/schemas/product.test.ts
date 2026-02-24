import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createProductBodySchema } from './product.js';

describe('createProductBodySchema', () => {
  it('accepts required fields and defaults isActive to true', () => {
    const parsed = createProductBodySchema.parse({
      name: 'Application Fee'
    });

    assert.equal(parsed.name, 'Application Fee');
    assert.equal(parsed.description, undefined);
    assert.equal(parsed.isActive, true);
  });

  it('trims whitespace in string fields', () => {
    const parsed = createProductBodySchema.parse({
      name: '  Utility Billing  ',
      description: '  Optional note  ',
      isActive: false
    });

    assert.equal(parsed.name, 'Utility Billing');
    assert.equal(parsed.description, 'Optional note');
    assert.equal(parsed.isActive, false);
  });

  it('rejects empty product name', () => {
    assert.throws(
      () =>
        createProductBodySchema.parse({
          name: '   '
        }),
      /String must contain at least 1 character/
    );
  });
});
