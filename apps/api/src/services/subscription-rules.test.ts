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
  subscriptions?: Array<{
    id: string;
    accountId: string;
    scope: 'ACCOUNT' | 'PROPERTY';
    status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CANCELED';
    startDate: Date;
    endDate: Date | null;
    propertyIds: string[];
    pricingIds: string[];
  }>;
};

type MockDb = {
  account: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string } | null>;
  };
  property: {
    findMany: (args: {
      where: { id?: { in: string[] }; accountId?: string };
    }) => Promise<Array<{ id: string; accountId: string }>>;
  };
  subscription: {
    findMany: (args: {
      where: {
        accountId: string;
        status: { in: string[] };
        id?: { not?: string };
      };
    }) => Promise<
      Array<{
        id: string;
        scope: 'ACCOUNT' | 'PROPERTY';
        startDate: Date;
        endDate: Date | null;
        targetProperties: Array<{ propertyId: string }>;
        subscriptionItems: Array<{ pricing: { productId: string } }>;
      }>
    >;
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
  const subscriptions = data.subscriptions ?? [];
  const pricingById = new Map(data.pricings.map((pricing) => [pricing.id, pricing]));

  return {
    account: {
      async findUnique(args) {
        const account = data.accounts.find((item) => item.id === args.where.id);
        return account ?? null;
      }
    },
    property: {
      async findMany(args) {
        if (args.where.id) {
          const requestedIds = new Set(args.where.id.in);
          return data.properties.filter((property) => requestedIds.has(property.id));
        }

        if (args.where.accountId) {
          return data.properties.filter((property) => property.accountId === args.where.accountId);
        }

        return data.properties;
      }
    },
    subscription: {
      async findMany(args) {
        const excludedId = args.where.id?.not;

        return subscriptions
          .filter((subscription) => subscription.accountId === args.where.accountId)
          .filter((subscription) => args.where.status.in.includes(subscription.status))
          .filter((subscription) => !excludedId || subscription.id !== excludedId)
          .map((subscription) => ({
            id: subscription.id,
            scope: subscription.scope,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            targetProperties: subscription.propertyIds.map((propertyId) => ({ propertyId })),
            subscriptionItems: subscription.pricingIds
              .map((pricingId) => pricingById.get(pricingId))
              .filter((pricing): pricing is PricingLookupItem => Boolean(pricing))
              .map((pricing) => ({
                pricing: {
                  productId: pricing.productId
                }
              }))
          }));
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
      pricings: [pricingUnitBase, pricingLateFee],
      subscriptions: []
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

  it('allows empty pricing selection when explicitly configured', async () => {
    const db = createMockDb({
      accounts: [{ id: 'acc-1' }],
      properties: [{ id: 'prop-1', accountId: 'acc-1' }],
      paymentMethods: [],
      pricings: [pricingUnitBase, pricingLateFee],
      subscriptions: []
    });

    const error = await validateSubscriptionCandidate(
      asSubscriptionRulesDb(db),
      buildCandidate({
        pricingIds: []
      }),
      {
        requireAtLeastOnePricing: false
      }
    );

    assert.equal(error, null);
  });

  it('rejects missing account', async () => {
    const db = createMockDb({
      accounts: [],
      properties: [],
      paymentMethods: [],
      pricings: [pricingUnitBase, pricingLateFee],
      subscriptions: []
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
      pricings: [pricingUnitBase, pricingLateFee],
      subscriptions: []
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
      pricings: [pricingUnitBase, pricingLateFee],
      subscriptions: []
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
      pricings: [pricingUnitBase, pricingUnitAlt, pricingLateFee],
      subscriptions: []
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
      pricings: [pricingUnitBase, pricingLateFee],
      subscriptions: []
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
      pricings: [pricingUnitBase, pricingLateFee],
      subscriptions: []
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
      pricings: [pricingUnitBase, pricingLateFee],
      subscriptions: []
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
      pricings: [pricingUnitBase, pricingLateFee],
      subscriptions: []
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
      pricings: [pricingUnitBase, pricingLateFee],
      subscriptions: []
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

  it('rejects overlapping account-level subscriptions with same product', async () => {
    const db = createMockDb({
      accounts: [{ id: 'acc-1' }],
      properties: [{ id: 'prop-1', accountId: 'acc-1' }],
      paymentMethods: [],
      pricings: [pricingUnitBase, pricingLateFee],
      subscriptions: [
        {
          id: 'sub-existing-account',
          accountId: 'acc-1',
          scope: 'ACCOUNT',
          status: 'ACTIVE',
          startDate: new Date('2026-02-01T00:00:00.000Z'),
          endDate: null,
          propertyIds: [],
          pricingIds: [pricingUnitBase.id]
        }
      ]
    });

    const error = await validateSubscriptionCandidate(
      asSubscriptionRulesDb(db),
      buildCandidate({
        scope: 'ACCOUNT',
        pricingIds: [pricingUnitBase.id]
      })
    );

    assert.equal(
      error,
      'Conflicting account-level subscription for product UNIT_SUBSCRIPTION_PRO already exists in overlapping date range'
    );
  });

  it('allows property-level override over account-level subscription', async () => {
    const db = createMockDb({
      accounts: [{ id: 'acc-1' }],
      properties: [{ id: 'prop-1', accountId: 'acc-1' }],
      paymentMethods: [],
      pricings: [pricingUnitBase, pricingLateFee],
      subscriptions: [
        {
          id: 'sub-existing-account',
          accountId: 'acc-1',
          scope: 'ACCOUNT',
          status: 'ACTIVE',
          startDate: new Date('2026-02-01T00:00:00.000Z'),
          endDate: null,
          propertyIds: [],
          pricingIds: [pricingUnitBase.id]
        }
      ]
    });

    const error = await validateSubscriptionCandidate(
      asSubscriptionRulesDb(db),
      buildCandidate({
        scope: 'PROPERTY',
        propertyIds: ['prop-1'],
        pricingIds: [pricingUnitBase.id]
      })
    );

    assert.equal(error, null);
  });

  it('rejects overlapping property-level subscriptions on same property and product', async () => {
    const db = createMockDb({
      accounts: [{ id: 'acc-1' }],
      properties: [
        { id: 'prop-1', accountId: 'acc-1' },
        { id: 'prop-2', accountId: 'acc-1' }
      ],
      paymentMethods: [],
      pricings: [pricingUnitBase, pricingLateFee],
      subscriptions: [
        {
          id: 'sub-existing-property',
          accountId: 'acc-1',
          scope: 'PROPERTY',
          status: 'ACTIVE',
          startDate: new Date('2026-02-01T00:00:00.000Z'),
          endDate: null,
          propertyIds: ['prop-1'],
          pricingIds: [pricingUnitBase.id]
        }
      ]
    });

    const error = await validateSubscriptionCandidate(
      asSubscriptionRulesDb(db),
      buildCandidate({
        scope: 'PROPERTY',
        propertyIds: ['prop-1', 'prop-2'],
        pricingIds: [pricingUnitBase.id]
      })
    );

    assert.equal(
      error,
      'Conflicting property-level subscription for product UNIT_SUBSCRIPTION_PRO already exists for one or more selected properties in overlapping date range'
    );
  });

  it('allows overlapping property-level subscriptions for different properties', async () => {
    const db = createMockDb({
      accounts: [{ id: 'acc-1' }],
      properties: [
        { id: 'prop-1', accountId: 'acc-1' },
        { id: 'prop-2', accountId: 'acc-1' }
      ],
      paymentMethods: [],
      pricings: [pricingUnitBase, pricingLateFee],
      subscriptions: [
        {
          id: 'sub-existing-property',
          accountId: 'acc-1',
          scope: 'PROPERTY',
          status: 'ACTIVE',
          startDate: new Date('2026-02-01T00:00:00.000Z'),
          endDate: null,
          propertyIds: ['prop-1'],
          pricingIds: [pricingUnitBase.id]
        }
      ]
    });

    const error = await validateSubscriptionCandidate(
      asSubscriptionRulesDb(db),
      buildCandidate({
        scope: 'PROPERTY',
        propertyIds: ['prop-2'],
        pricingIds: [pricingUnitBase.id]
      })
    );

    assert.equal(error, null);
  });
});
