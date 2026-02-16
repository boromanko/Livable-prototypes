import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  subscriptionBulkBodySchema,
  subscriptionManagePricingsPreviewBodySchema
} from './subscription.js';

describe('subscriptionBulkBodySchema', () => {
  it('accepts UPDATE_STATUS with status value', () => {
    const parsed = subscriptionBulkBodySchema.parse({
      action: 'UPDATE_STATUS',
      subscriptionIds: ['sub-1', 'sub-2'],
      status: 'PAUSED'
    });

    assert.equal(parsed.action, 'UPDATE_STATUS');
    assert.equal(parsed.status, 'PAUSED');
  });

  it('rejects UPDATE_STATUS without status', () => {
    assert.throws(
      () =>
        subscriptionBulkBodySchema.parse({
          action: 'UPDATE_STATUS',
          subscriptionIds: ['sub-1']
        }),
      /status is required for UPDATE_STATUS/
    );
  });

  it('accepts MANAGE_PRICINGS with add/remove pricing ids', () => {
    const parsed = subscriptionBulkBodySchema.parse({
      action: 'MANAGE_PRICINGS',
      subscriptionIds: ['sub-1', 'sub-2'],
      addPricingIds: ['price-a'],
      removePricingIds: ['price-b']
    });

    assert.equal(parsed.action, 'MANAGE_PRICINGS');
    assert.deepEqual(parsed.addPricingIds, ['price-a']);
    assert.deepEqual(parsed.removePricingIds, ['price-b']);
  });

  it('accepts MANAGE_PRICINGS with no-op delta', () => {
    const parsed = subscriptionBulkBodySchema.parse({
      action: 'MANAGE_PRICINGS',
      subscriptionIds: ['sub-1']
    });

    assert.equal(parsed.action, 'MANAGE_PRICINGS');
    assert.equal(parsed.addPricingIds, undefined);
    assert.equal(parsed.removePricingIds, undefined);
  });

  it('rejects pricingIds for MANAGE_PRICINGS', () => {
    assert.throws(
      () =>
        subscriptionBulkBodySchema.parse({
          action: 'MANAGE_PRICINGS',
          subscriptionIds: ['sub-1'],
          pricingIds: ['price-a']
        }),
      /pricingIds are not allowed for MANAGE_PRICINGS/
    );
  });

  it('rejects addPricingIds for legacy pricing bulk actions', () => {
    assert.throws(
      () =>
        subscriptionBulkBodySchema.parse({
          action: 'ADD_PRICING',
          subscriptionIds: ['sub-1'],
          pricingIds: ['price-a'],
          addPricingIds: ['price-b']
        }),
      /addPricingIds are only allowed for MANAGE_PRICINGS/
    );
  });

  it('rejects status for non-UPDATE_STATUS actions', () => {
    assert.throws(
      () =>
        subscriptionBulkBodySchema.parse({
          action: 'DELETE_SUBSCRIPTIONS',
          subscriptionIds: ['sub-1'],
          status: 'ACTIVE'
        }),
      /status is only allowed for UPDATE_STATUS/
    );
  });
});

describe('subscriptionManagePricingsPreviewBodySchema', () => {
  it('requires at least one subscription id', () => {
    assert.throws(
      () =>
        subscriptionManagePricingsPreviewBodySchema.parse({
          subscriptionIds: []
        }),
      /Array must contain at least 1 element/
    );
  });
});
