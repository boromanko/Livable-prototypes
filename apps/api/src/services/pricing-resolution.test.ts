import { PricingType } from '@stripe-integration/db';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolvePricingTree,
  type PricingResolutionInput,
  type ResolutionPropertyInput
} from './pricing-resolution.js';

const account = {
  id: 'acc-1',
  companyName: 'Acme Holdings',
  email: 'ops@acme.test'
};

const baseProperties: ResolutionPropertyInput[] = [
  { id: 'prop-1', accountId: account.id, address: 'Addr 1', billableUnits: 5 },
  { id: 'prop-2', accountId: account.id, address: 'Addr 2', billableUnits: 8 },
  { id: 'prop-3', accountId: account.id, address: 'Addr 3', billableUnits: 10 }
];

function buildTieredPricing(
  id: string,
  productId: string,
  subscriptions: PricingResolutionInput['subscriptions']
): PricingResolutionInput {
  return {
    id,
    product: { id: productId, code: productId.toUpperCase(), name: productId },
    internalName: `Pricing ${id}`,
    type: PricingType.TIERED,
    fixedAmountCents: null,
    minimumPriceCents: null,
    currency: 'usd',
    billingInterval: 'month',
    isActive: true,
    createdAt: new Date('2026-02-10T00:00:00.000Z'),
    subscriptionsCount: subscriptions.length,
    tiers: [
      { fromUnit: 1, toUnit: 20, unitAmountCents: 600 },
      { fromUnit: 21, toUnit: null, unitAmountCents: 500 }
    ],
    subscriptions
  };
}

function buildFixedPricing(
  id: string,
  productId: string,
  fixedAmountCents: number,
  subscriptions: PricingResolutionInput['subscriptions']
): PricingResolutionInput {
  return {
    id,
    product: { id: productId, code: productId.toUpperCase(), name: productId },
    internalName: `Pricing ${id}`,
    type: PricingType.FIXED,
    fixedAmountCents,
    minimumPriceCents: null,
    currency: 'usd',
    billingInterval: 'month',
    isActive: true,
    createdAt: new Date('2026-02-10T00:00:00.000Z'),
    subscriptionsCount: subscriptions.length,
    tiers: [],
    subscriptions
  };
}

function buildSubscription(input: {
  id: string;
  scope: 'ACCOUNT' | 'PROPERTY';
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CANCELED';
  createdAt: string;
  propertyId?: string;
}): PricingResolutionInput['subscriptions'][number] {
  return {
    id: input.id,
    scope: input.scope,
    status: input.status,
    createdAt: new Date(input.createdAt),
    accountId: account.id,
    propertyId: input.propertyId ?? null,
    account
  };
}

describe('resolvePricingTree', () => {
  it('propagates account pool tier to inherited properties', () => {
    const pricing = buildTieredPricing('pricing-a', 'units', [
      buildSubscription({
        id: 'sub-account',
        scope: 'ACCOUNT',
        status: 'ACTIVE',
        createdAt: '2026-02-12T00:00:00.000Z'
      })
    ]);

    const [item] = resolvePricingTree([pricing], baseProperties);
    assert.ok(item);
    assert.equal(item.accounts.length, 1);

    const accountRow = item.accounts[0];
    assert.equal(accountRow.source, 'ACCOUNT');
    assert.equal(accountRow.inheritedPropertiesCount, 3);
    assert.equal(accountRow.overridePropertiesCount, 0);
    assert.equal(accountRow.totalProperties, 3);
    assert.equal(accountRow.totalBillableUnits, 23);
    assert.deepEqual(accountRow.currentTier, {
      fromUnit: 21,
      toUnit: null,
      unitAmountCents: 500
    });

    for (const propertyRow of accountRow.properties) {
      assert.equal(propertyRow.source, 'INHERITED');
      assert.equal(propertyRow.tierScope, 'ACCOUNT_POOL');
      assert.equal(propertyRow.currentTier?.unitAmountCents, 500);
      assert.equal(propertyRow.currentUnitAmountCents, 500);
    }
  });

  it('applies override by product and excludes overridden property from account pool', () => {
    const parentPricing = buildTieredPricing('pricing-parent', 'units', [
      buildSubscription({
        id: 'sub-parent',
        scope: 'ACCOUNT',
        status: 'ACTIVE',
        createdAt: '2026-02-12T00:00:00.000Z'
      })
    ]);
    const overridePricing = buildTieredPricing('pricing-override', 'units', [
      buildSubscription({
        id: 'sub-override',
        scope: 'PROPERTY',
        status: 'ACTIVE',
        createdAt: '2026-02-13T00:00:00.000Z',
        propertyId: 'prop-1'
      })
    ]);

    const items = resolvePricingTree([parentPricing, overridePricing], baseProperties);
    const parentRow = items.find((item) => item.id === 'pricing-parent');
    const overrideRow = items.find((item) => item.id === 'pricing-override');
    assert.ok(parentRow);
    assert.ok(overrideRow);

    const parentAccount = parentRow.accounts[0];
    assert.ok(parentAccount);
    assert.equal(parentAccount.source, 'ACCOUNT');
    assert.equal(parentAccount.inheritedPropertiesCount, 2);
    assert.equal(parentAccount.overridePropertiesCount, 0);
    assert.equal(parentAccount.totalProperties, 3);
    assert.equal(parentAccount.totalBillableUnits, 18);
    assert.equal(parentAccount.currentTier?.unitAmountCents, 600);
    assert.equal(
      parentAccount.properties.some((property) => property.property.id === 'prop-1'),
      false
    );

    const overrideAccount = overrideRow.accounts[0];
    assert.ok(overrideAccount);
    assert.equal(overrideAccount.source, 'PROPERTY_ONLY');
    assert.equal(overrideAccount.inheritedPropertiesCount, 0);
    assert.equal(overrideAccount.overridePropertiesCount, 1);
    assert.equal(overrideAccount.totalProperties, 3);
    assert.equal(overrideAccount.currentTier, null);
    assert.equal(overrideAccount.properties.length, 1);
    assert.equal(overrideAccount.properties[0]?.property.id, 'prop-1');
    assert.equal(overrideAccount.properties[0]?.source, 'OVERRIDE');
    assert.equal(overrideAccount.properties[0]?.tierScope, 'PROPERTY');
    assert.equal(overrideAccount.properties[0]?.excludedFromAccountPool, true);
  });

  it('chooses winner by status before createdAt', () => {
    const draftPricing = buildTieredPricing('pricing-draft', 'units', [
      buildSubscription({
        id: 'sub-draft-new',
        scope: 'ACCOUNT',
        status: 'DRAFT',
        createdAt: '2026-02-15T00:00:00.000Z'
      })
    ]);
    const activePricing = buildTieredPricing('pricing-active', 'units', [
      buildSubscription({
        id: 'sub-active-old',
        scope: 'ACCOUNT',
        status: 'ACTIVE',
        createdAt: '2026-02-10T00:00:00.000Z'
      })
    ]);

    const items = resolvePricingTree([draftPricing, activePricing], baseProperties);
    const draftRow = items.find((item) => item.id === 'pricing-draft');
    const activeRow = items.find((item) => item.id === 'pricing-active');
    assert.ok(draftRow);
    assert.ok(activeRow);

    assert.equal(draftRow.accounts.length, 0);
    assert.equal(activeRow.accounts.length, 1);
    assert.equal(activeRow.accounts[0]?.accountSubscriptionId, 'sub-active-old');
  });

  it('excludes canceled subscriptions from resolution', () => {
    const canceledPricing = buildTieredPricing('pricing-canceled', 'units', [
      buildSubscription({
        id: 'sub-canceled',
        scope: 'ACCOUNT',
        status: 'CANCELED',
        createdAt: '2026-02-12T00:00:00.000Z'
      })
    ]);

    const [item] = resolvePricingTree([canceledPricing], baseProperties);
    assert.ok(item);
    assert.equal(item.accounts.length, 0);
  });

  it('resolves fixed pricing override per product', () => {
    const fixedParent = buildFixedPricing('fixed-parent', 'late-fee', 300, [
      buildSubscription({
        id: 'sub-fixed-parent',
        scope: 'ACCOUNT',
        status: 'ACTIVE',
        createdAt: '2026-02-12T00:00:00.000Z'
      })
    ]);
    const fixedOverride = buildFixedPricing('fixed-override', 'late-fee', 250, [
      buildSubscription({
        id: 'sub-fixed-override',
        scope: 'PROPERTY',
        status: 'ACTIVE',
        createdAt: '2026-02-13T00:00:00.000Z',
        propertyId: 'prop-1'
      })
    ]);

    const items = resolvePricingTree([fixedParent, fixedOverride], baseProperties);
    const parentRow = items.find((item) => item.id === 'fixed-parent');
    const overrideRow = items.find((item) => item.id === 'fixed-override');
    assert.ok(parentRow);
    assert.ok(overrideRow);

    assert.equal(parentRow.accounts[0]?.currentUnitAmountCents, 300);
    assert.equal(
      parentRow.accounts[0]?.properties.some((property) => property.property.id === 'prop-1'),
      false
    );

    assert.equal(overrideRow.accounts[0]?.source, 'PROPERTY_ONLY');
    assert.equal(overrideRow.accounts[0]?.properties[0]?.currentUnitAmountCents, 250);
  });
});
