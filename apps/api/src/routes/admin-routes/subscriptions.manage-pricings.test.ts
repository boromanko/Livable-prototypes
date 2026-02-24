import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyManagePricingsDelta,
  buildManagePricingsPreviewItems,
  replaceCurrentPricingsForAddedProducts
} from './subscriptions.manage-pricings.js';

describe('applyManagePricingsDelta', () => {
  it('removes ids first and then appends additions without duplicates', () => {
    const next = applyManagePricingsDelta(
      ['pricing-a', 'pricing-b', 'pricing-c'],
      ['pricing-b', 'pricing-d', 'pricing-d'],
      ['pricing-a', 'pricing-x']
    );

    assert.deepEqual(next, ['pricing-b', 'pricing-c', 'pricing-d']);
  });

  it('returns empty array when all current ids are removed', () => {
    const next = applyManagePricingsDelta(['pricing-a'], [], ['pricing-a']);
    assert.deepEqual(next, []);
  });
});

describe('replaceCurrentPricingsForAddedProducts', () => {
  it('replaces existing pricing of the same product when new pricing is added', () => {
    const pricingLookup = new Map([
      [
        'pricing-old',
        {
          id: 'pricing-old',
          productId: 'product-a',
          product: {
            code: 'PROD_A',
            name: 'Product A'
          }
        }
      ],
      [
        'pricing-new',
        {
          id: 'pricing-new',
          productId: 'product-a',
          product: {
            code: 'PROD_A',
            name: 'Product A'
          }
        }
      ],
      [
        'pricing-b',
        {
          id: 'pricing-b',
          productId: 'product-b',
          product: {
            code: 'PROD_B',
            name: 'Product B'
          }
        }
      ]
    ]);

    const nextCurrent = replaceCurrentPricingsForAddedProducts(
      ['pricing-old', 'pricing-b'],
      ['pricing-new'],
      pricingLookup
    );

    assert.deepEqual(nextCurrent, ['pricing-b']);
  });
});

describe('buildManagePricingsPreviewItems', () => {
  it('builds unique pricing cards with usage counts', () => {
    const items = buildManagePricingsPreviewItems([
      {
        subscriptionId: 'sub-1',
        pricing: {
          id: 'pricing-a',
          internalName: 'Alpha',
          type: 'FIXED',
          fixedAmountCents: 100,
          minimumPriceCents: null,
          currency: 'usd',
          billingInterval: 'month',
          isActive: true,
          product: {
            id: 'prod-1',
            code: 'PROD_A',
            name: 'Product A'
          },
          tiers: []
        }
      },
      {
        subscriptionId: 'sub-2',
        pricing: {
          id: 'pricing-a',
          internalName: 'Alpha',
          type: 'FIXED',
          fixedAmountCents: 100,
          minimumPriceCents: null,
          currency: 'usd',
          billingInterval: 'month',
          isActive: true,
          product: {
            id: 'prod-1',
            code: 'PROD_A',
            name: 'Product A'
          },
          tiers: []
        }
      },
      {
        subscriptionId: 'sub-2',
        pricing: {
          id: 'pricing-b',
          internalName: 'Beta',
          type: 'METERED',
          fixedAmountCents: null,
          minimumPriceCents: 500,
          currency: 'usd',
          billingInterval: 'month',
          isActive: true,
          product: {
            id: 'prod-2',
            code: 'PROD_B',
            name: 'Product B'
          },
          tiers: [
            {
              id: 'tier-1',
              fromUnit: 1,
              toUnit: null,
              unitAmountCents: 500
            }
          ]
        }
      }
    ]);

    assert.equal(items.length, 2);
    assert.equal(items[0]?.id, 'pricing-a');
    assert.equal(items[0]?.usageCount, 2);
    assert.equal(items[1]?.id, 'pricing-b');
    assert.equal(items[1]?.usageCount, 1);
  });
});
