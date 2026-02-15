import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePricingSelection,
  validateSubscriptionCandidate,
  type PricingLookupItem,
  type SubscriptionCandidate
} from './subscription-rules.js';

const pricingUnitBase: PricingLookupItem = {
  id: 'pricing-unit-base',
  productId: 'product-unit',
  product: {
    code: 'UNIT_SUBSCRIPTION_PRO',
    name: 'Unit Subscription'
  }
};

const pricingUnitAlt: PricingLookupItem = {
  id: 'pricing-unit-alt',
  productId: 'product-unit',
  product: {
    code: 'UNIT_SUBSCRIPTION_PRO',
    name: 'Unit Subscription'
  }
};

const pricingLateFee: PricingLookupItem = {
  id: 'pricing-late-fee',
  productId: 'product-late-fee',
  product: {
    code: 'LATE_FEE',
    name: 'Late Fee'
  }
};

function buildPricingLookup(
  items: PricingLookupItem[] = [pricingUnitBase, pricingUnitAlt, pricingLateFee]
): Map<string, PricingLookupItem> {
  return new Map(items.map((item) => [item.id, item]));
}

type MockDbData = {
  accounts: Array<{ id: string }>;
  properties: Array<{ id: string; accountId: string }>;
  paymentMethods: Array<{ id: string; accountId: string }>;
  pricings: PricingLookupItem[];
};

type MockDb = {
  account: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string } | null>;
  };
  property: {
    findMany: (args: {
      where: { id: { in: string[] } };
    }) => Promise<Array<{ id: string; accountId: string }>>;
  };
  paymentMethod: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; accountId: string } | null>;
  };
  pricing: {
    findMany: (args: {
      where: { id: { in: string[] } };
    }) => Promise<PricingLookupItem[]>;
  };
};

function createMockDb(data: MockDbData): MockDb {
  return {
    account: {
      async findUnique(args) {
        const account = data.accounts.find((item) => item.id === args.where.id);
        return account ?? null;
      }
    },
    property: {
      async findMany(args) {
        const requestedIds = new Set(args.where.id.in);
        return data.properties.filter((property) => requestedIds.has(property.id));
      }
    },
    paymentMethod: {
      async findUnique(args) {
        const paymentMethod = data.paymentMethods.find((item) => item.id === args.where.id);
        return paymentMethod ?? null;
      }
    },
    pricing: {
      async findMany(args) {
        const requestedIds = new Set(args.where.id.in);
        return data.pricings.filter((pricing) => requestedIds.has(pricing.id));
      }
    }
  };
}

function buildCandidate(overrides: Partial<SubscriptionCandidate> = {}): SubscriptionCandidate {
  return {
    accountId: 'acc-1',
    scope: 'ACCOUNT',
    propertyIds: [],
    startDate: new Date('2026-02-01T00:00:00.000Z'),
    endDate: null,
    status: 'ACTIVE',
    paymentMethodId: null,
    pricingIds: [pricingUnitBase.id, pricingLateFee.id],
    ...overrides
  };
}

function asSubscriptionRulesDb(
  db: MockDb
): Parameters<typeof validateSubscriptionCandidate>[0] {
  return db as unknown as Parameters<typeof validateSubscriptionCandidate>[0];
}

describe('validatePricingSelection', () => {
  it('accepts unique pricings for different products', () => {
    const validation = validatePricingSelection({
      pricingIds: [pricingUnitBase.id, pricingLateFee.id],
      pricingLookup: buildPricingLookup()
    });

    assert.equal(validation.error, null);
    assert.deepEqual(validation.normalizedPricingIds, [pricingUnitBase.id, pricingLateFee.id]);
  });

  it('rejects duplicate pricing ids', () => {
    const validation = validatePricingSelection({
      pricingIds: [pricingUnitBase.id, pricingUnitBase.id],
      pricingLookup: buildPricingLookup()
    });

    assert.equal(
      validation.error,
      `Duplicate pricingIds are not allowed: ${pricingUnitBase.id}`
    );
  });

  it('rejects unknown pricing ids', () => {
    const validation = validatePricingSelection({
      pricingIds: [pricingUnitBase.id, 'pricing-missing'],
      pricingLookup: buildPricingLookup()
    });

    assert.equal(validation.error, 'One or more pricingIds are invalid');
  });

  it('rejects multiple pricings for the same product', () => {
    const validation = validatePricingSelection({
      pricingIds: [pricingUnitBase.id, pricingUnitAlt.id],
      pricingLookup: buildPricingLookup()
    });

    assert.equal(
      validation.error,
      'Subscription cannot contain multiple pricings for the same product: UNIT_SUBSCRIPTION_PRO'
    );
  });

  it('rejects empty selection by default', () => {
    const validation = validatePricingSelection({
      pricingIds: [],
      pricingLookup: buildPricingLookup()
    });

    assert.equal(validation.error, 'Subscription must contain at least one pricing');
  });

  it('allows empty selection when explicitly configured', () => {
    const validation = validatePricingSelection({
      pricingIds: [],
      pricingLookup: buildPricingLookup(),
      requireAtLeastOne: false
    });

    assert.equal(validation.error, null);
    assert.deepEqual(validation.normalizedPricingIds, []);
  });
});

describe('validateSubscriptionCandidate', () => {
  it('returns null for a valid candidate', async () => {
    const db = createMockDb({
      accounts: [{ id: 'acc-1' }],
      properties: [{ id: 'prop-1', accountId: 'acc-1' }],
      paymentMethods: [{ id: 'pm-1', accountId: 'acc-1' }],
      pricings: [pricingUnitBase, pricingLateFee]
    });

    const error = await validateSubscriptionCandidate(
      asSubscriptionRulesDb(db),
      buildCandidate({
        scope: 'PROPERTY',
        propertyIds: ['prop-1'],
        paymentMethodId: 'pm-1'
      })
    );

    assert.equal(error, null);
  });

  it('rejects missing account', async () => {
    const db = createMockDb({
      accounts: [],
      properties: [],
      paymentMethods: [],
      pricings: [pricingUnitBase, pricingLateFee]
    });

    const error = await validateSubscriptionCandidate(
      asSubscriptionRulesDb(db),
      buildCandidate()
    );

    assert.equal(error, 'Account not found');
  });

  it('rejects property that belongs to another account', async () => {
    const db = createMockDb({
      accounts: [{ id: 'acc-1' }],
      properties: [{ id: 'prop-1', accountId: 'acc-2' }],
      paymentMethods: [],
      pricings: [pricingUnitBase, pricingLateFee]
    });

    const error = await validateSubscriptionCandidate(
      asSubscriptionRulesDb(db),
      buildCandidate({
        scope: 'PROPERTY',
        propertyIds: ['prop-1']
      })
    );

    assert.equal(error, 'One or more properties do not belong to the selected account');
  });

  it('rejects payment method owned by another account', async () => {
    const db = createMockDb({
      accounts: [{ id: 'acc-1' }],
      properties: [],
      paymentMethods: [{ id: 'pm-1', accountId: 'acc-2' }],
      pricings: [pricingUnitBase, pricingLateFee]
    });

    const error = await validateSubscriptionCandidate(
      asSubscriptionRulesDb(db),
      buildCandidate({
        paymentMethodId: 'pm-1'
      })
    );

    assert.equal(error, 'Payment method does not belong to the selected account');
  });

  it('rejects candidate with duplicate product pricings', async () => {
    const db = createMockDb({
      accounts: [{ id: 'acc-1' }],
      properties: [],
      paymentMethods: [],
      pricings: [pricingUnitBase, pricingUnitAlt, pricingLateFee]
    });

    const error = await validateSubscriptionCandidate(
      asSubscriptionRulesDb(db),
      buildCandidate({
        pricingIds: [pricingUnitBase.id, pricingUnitAlt.id]
      })
    );

    assert.equal(
      error,
      'Subscription cannot contain multiple pricings for the same product: UNIT_SUBSCRIPTION_PRO'
    );
  });

  it('accepts multiple properties for PROPERTY scope', async () => {
    const db = createMockDb({
      accounts: [{ id: 'acc-1' }],
      properties: [
        { id: 'prop-1', accountId: 'acc-1' },
        { id: 'prop-2', accountId: 'acc-1' }
      ],
      paymentMethods: [],
      pricings: [pricingUnitBase, pricingLateFee]
    });

    const error = await validateSubscriptionCandidate(
      asSubscriptionRulesDb(db),
      buildCandidate({
        scope: 'PROPERTY',
        propertyIds: ['prop-1', 'prop-2']
      })
    );

    assert.equal(error, null);
  });

  it('rejects duplicate property ids in PROPERTY scope', async () => {
    const db = createMockDb({
      accounts: [{ id: 'acc-1' }],
      properties: [{ id: 'prop-1', accountId: 'acc-1' }],
      paymentMethods: [],
      pricings: [pricingUnitBase, pricingLateFee]
    });

    const error = await validateSubscriptionCandidate(
      asSubscriptionRulesDb(db),
      buildCandidate({
        scope: 'PROPERTY',
        propertyIds: ['prop-1', 'prop-1']
      })
    );

    assert.equal(error, 'Duplicate propertyIds are not allowed: prop-1');
  });

  it('rejects PROPERTY scope without any property ids', async () => {
    const db = createMockDb({
      accounts: [{ id: 'acc-1' }],
      properties: [],
      paymentMethods: [],
      pricings: [pricingUnitBase, pricingLateFee]
    });

    const error = await validateSubscriptionCandidate(
      asSubscriptionRulesDb(db),
      buildCandidate({
        scope: 'PROPERTY',
        propertyIds: []
      })
    );

    assert.equal(error, 'propertyIds are required for PROPERTY scope');
  });

  it('rejects ACCOUNT scope with property ids', async () => {
    const db = createMockDb({
      accounts: [{ id: 'acc-1' }],
      properties: [{ id: 'prop-1', accountId: 'acc-1' }],
      paymentMethods: [],
      pricings: [pricingUnitBase, pricingLateFee]
    });

    const error = await validateSubscriptionCandidate(
      asSubscriptionRulesDb(db),
      buildCandidate({
        scope: 'ACCOUNT',
        propertyIds: ['prop-1']
      })
    );

    assert.equal(error, 'propertyIds must be empty for ACCOUNT scope');
  });

  it('rejects unknown property ids', async () => {
    const db = createMockDb({
      accounts: [{ id: 'acc-1' }],
      properties: [{ id: 'prop-1', accountId: 'acc-1' }],
      paymentMethods: [],
      pricings: [pricingUnitBase, pricingLateFee]
    });

    const error = await validateSubscriptionCandidate(
      asSubscriptionRulesDb(db),
      buildCandidate({
        scope: 'PROPERTY',
        propertyIds: ['prop-1', 'prop-missing']
      })
    );

    assert.equal(error, 'One or more propertyIds are invalid');
  });
});
