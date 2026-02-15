import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COMPANIES = [
  { id: 'acct-cedarstone', companyName: 'Cedarstone Realty Group', email: 'ops@cedarstone-demo.com' },
  { id: 'acct-maple-ridge', companyName: 'Maple Ridge Management', email: 'billing@mapleridge-demo.com' },
  { id: 'acct-skyline-harbor', companyName: 'Skyline Harbor Properties', email: 'finance@skylineharbor-demo.com' },
  { id: 'acct-northfield', companyName: 'Northfield Residential', email: 'accounts@northfield-demo.com' },
  { id: 'acct-oakline', companyName: 'Oakline Property Partners', email: 'ap@oakline-demo.com' },
  { id: 'acct-bluewater', companyName: 'Bluewater Asset Living', email: 'ops@bluewater-demo.com' },
  { id: 'acct-summit-key', companyName: 'Summit Key Communities', email: 'billing@summitkey-demo.com' },
  { id: 'acct-elmwood', companyName: 'Elmwood Housing Co', email: 'finance@elmwood-demo.com' },
  { id: 'acct-rivergate', companyName: 'Rivergate Property Services', email: 'ar@rivergate-demo.com' },
  { id: 'acct-westbridge', companyName: 'Westbridge Portfolio Management', email: 'ops@westbridge-demo.com' }
] as const;

type TierSeed = {
  fromUnit: number;
  toUnit: number | null;
  unitUsd: number;
};

type PricingSeed =
  | {
      id: string;
      productId: string;
      internalName: string;
      type: 'FIXED';
      fixedUsd: number;
      minimumUsd?: null;
      tiers?: never;
    }
  | {
      id: string;
      productId: string;
      internalName: string;
      type: 'TIERED';
      fixedUsd?: null;
      minimumUsd: number;
      tiers: TierSeed[];
    };

const PRICINGS: PricingSeed[] = [
  {
    id: 'prc-unit-pro-standard',
    productId: 'prod-unit-subscription-pro',
    internalName: 'Unit Subscription Pro - Standard',
    type: 'TIERED',
    minimumUsd: 6.0,
    tiers: [
      { fromUnit: 1, toUnit: 100, unitUsd: 9.5 },
      { fromUnit: 101, toUnit: 200, unitUsd: 8.4 },
      { fromUnit: 201, toUnit: 400, unitUsd: 7.2 },
      { fromUnit: 401, toUnit: 700, unitUsd: 6.1 },
      { fromUnit: 701, toUnit: null, unitUsd: 5.2 }
    ]
  },
  {
    id: 'prc-unit-pro-volume',
    productId: 'prod-unit-subscription-pro',
    internalName: 'Unit Subscription Pro - Volume',
    type: 'TIERED',
    minimumUsd: 5.5,
    tiers: [
      { fromUnit: 1, toUnit: 80, unitUsd: 8.9 },
      { fromUnit: 81, toUnit: 160, unitUsd: 7.8 },
      { fromUnit: 161, toUnit: 320, unitUsd: 6.8 },
      { fromUnit: 321, toUnit: 600, unitUsd: 5.9 },
      { fromUnit: 601, toUnit: 900, unitUsd: 5.0 },
      { fromUnit: 901, toUnit: null, unitUsd: 4.2 }
    ]
  },
  {
    id: 'prc-unit-appfolio-core',
    productId: 'prod-unit-subscription-appfolio',
    internalName: 'Unit Subscription Appfolio - Core',
    type: 'TIERED',
    minimumUsd: 6.5,
    tiers: [
      { fromUnit: 1, toUnit: 75, unitUsd: 10.2 },
      { fromUnit: 76, toUnit: 150, unitUsd: 9.1 },
      { fromUnit: 151, toUnit: 300, unitUsd: 8.0 },
      { fromUnit: 301, toUnit: 600, unitUsd: 6.9 },
      { fromUnit: 601, toUnit: null, unitUsd: 5.8 }
    ]
  },
  {
    id: 'prc-unit-appfolio-enterprise',
    productId: 'prod-unit-subscription-appfolio',
    internalName: 'Unit Subscription Appfolio - Enterprise',
    type: 'TIERED',
    minimumUsd: 6.0,
    tiers: [
      { fromUnit: 1, toUnit: 60, unitUsd: 9.4 },
      { fromUnit: 61, toUnit: 140, unitUsd: 8.3 },
      { fromUnit: 141, toUnit: 260, unitUsd: 7.4 },
      { fromUnit: 261, toUnit: 500, unitUsd: 6.4 },
      { fromUnit: 501, toUnit: 800, unitUsd: 5.4 },
      { fromUnit: 801, toUnit: null, unitUsd: 4.6 }
    ]
  },
  {
    id: 'prc-unit-cib-core',
    productId: 'prod-unit-subscription-cib',
    internalName: 'Unit Subscription CIB - Core',
    type: 'TIERED',
    minimumUsd: 5.0,
    tiers: [
      { fromUnit: 1, toUnit: 120, unitUsd: 8.7 },
      { fromUnit: 121, toUnit: 240, unitUsd: 7.7 },
      { fromUnit: 241, toUnit: 480, unitUsd: 6.7 },
      { fromUnit: 481, toUnit: 800, unitUsd: 5.8 },
      { fromUnit: 801, toUnit: null, unitUsd: 4.9 }
    ]
  },
  {
    id: 'prc-unit-cib-volume',
    productId: 'prod-unit-subscription-cib',
    internalName: 'Unit Subscription CIB - Volume',
    type: 'TIERED',
    minimumUsd: 4.5,
    tiers: [
      { fromUnit: 1, toUnit: 100, unitUsd: 8.2 },
      { fromUnit: 101, toUnit: 220, unitUsd: 7.1 },
      { fromUnit: 221, toUnit: 420, unitUsd: 6.2 },
      { fromUnit: 421, toUnit: 700, unitUsd: 5.3 },
      { fromUnit: 701, toUnit: 1000, unitUsd: 4.5 },
      { fromUnit: 1001, toUnit: null, unitUsd: 3.8 }
    ]
  },
  {
    id: 'prc-billing-auto-pro-core',
    productId: 'prod-billing-automation-pro',
    internalName: 'Billing Automation Pro - Core',
    type: 'FIXED',
    fixedUsd: 6.5
  },
  {
    id: 'prc-billing-auto-pro-growth',
    productId: 'prod-billing-automation-pro',
    internalName: 'Billing Automation Pro - Growth',
    type: 'FIXED',
    fixedUsd: 7.75
  },
  {
    id: 'prc-billing-plus-pro-advanced',
    productId: 'prod-billing-automation-plus-pro',
    internalName: 'Billing Automation Plus Pro - Advanced',
    type: 'FIXED',
    fixedUsd: 10.5
  },
  {
    id: 'prc-billing-auto-appfolio-core',
    productId: 'prod-billing-automation-appfolio',
    internalName: 'Billing Automation Appfolio - Core',
    type: 'FIXED',
    fixedUsd: 7.25
  },
  {
    id: 'prc-billing-auto-appfolio-growth',
    productId: 'prod-billing-automation-appfolio',
    internalName: 'Billing Automation Appfolio - Growth',
    type: 'FIXED',
    fixedUsd: 8.5
  },
  {
    id: 'prc-billing-plus-appfolio-elite',
    productId: 'prod-billing-automation-plus-appfolio',
    internalName: 'Billing Automation Plus Appfolio - Elite',
    type: 'FIXED',
    fixedUsd: 11.75
  },
  {
    id: 'prc-ap-auto-appfolio-core',
    productId: 'prod-ap-automation-appfolio',
    internalName: 'AP Automation Appfolio - Core',
    type: 'FIXED',
    fixedUsd: 9.25
  },
  {
    id: 'prc-ap-auto-appfolio-scale',
    productId: 'prod-ap-automation-appfolio',
    internalName: 'AP Automation Appfolio - Scale',
    type: 'FIXED',
    fixedUsd: 10.95
  },
  {
    id: 'prc-late-fee-standard',
    productId: 'prod-late-fee',
    internalName: 'Late Fee - Standard',
    type: 'FIXED',
    fixedUsd: 2.5
  },
  {
    id: 'prc-late-fee-portfolio',
    productId: 'prod-late-fee',
    internalName: 'Late Fee - Portfolio',
    type: 'FIXED',
    fixedUsd: 3.25
  }
];

const ACCOUNT_BUNDLES: string[][] = [
  [
    'prc-unit-pro-standard',
    'prc-billing-auto-pro-core',
    'prc-billing-plus-pro-advanced',
    'prc-late-fee-standard'
  ],
  [
    'prc-unit-appfolio-core',
    'prc-billing-auto-appfolio-core',
    'prc-ap-auto-appfolio-core',
    'prc-late-fee-standard'
  ],
  [
    'prc-unit-cib-core',
    'prc-billing-auto-pro-core',
    'prc-billing-plus-appfolio-elite',
    'prc-late-fee-portfolio'
  ],
  [
    'prc-unit-pro-volume',
    'prc-billing-auto-appfolio-growth',
    'prc-ap-auto-appfolio-scale',
    'prc-late-fee-portfolio'
  ]
] as const;

const PRODUCTS = [
  {
    id: 'prod-unit-subscription-pro',
    code: 'UNIT_SUBSCRIPTION_PRO',
    name: 'Unit Subscription (Pro)',
    description: 'Unit subscription for Pro accounts'
  },
  {
    id: 'prod-billing-automation-pro',
    code: 'BILLING_AUTOMATION_PRO',
    name: 'Billing Automation (Pro)',
    description: 'Billing automation for Pro accounts'
  },
  {
    id: 'prod-billing-automation-plus-pro',
    code: 'BILLING_AUTOMATION_PLUS_PRO',
    name: 'Billing Automation Plus (Pro)',
    description: 'Advanced billing automation for Pro accounts'
  },
  {
    id: 'prod-unit-subscription-appfolio',
    code: 'UNIT_SUBSCRIPTION_APPFOLIO',
    name: 'Unit Subscription (Appfolio)',
    description: 'Unit subscription for Appfolio integrated accounts'
  },
  {
    id: 'prod-billing-automation-appfolio',
    code: 'BILLING_AUTOMATION_APPFOLIO',
    name: 'Billing Automation (Appfolio)',
    description: 'Billing automation for Appfolio integrated accounts'
  },
  {
    id: 'prod-billing-automation-plus-appfolio',
    code: 'BILLING_AUTOMATION_PLUS_APPFOLIO',
    name: 'Billing Automation Plus (Appfolio)',
    description: 'Advanced billing automation for Appfolio integrated accounts'
  },
  {
    id: 'prod-ap-automation-appfolio',
    code: 'AP_AUTOMATION_APPFOLIO',
    name: 'AP Automation (Appfolio)',
    description: 'Accounts payable automation for Appfolio integrated accounts'
  },
  {
    id: 'prod-unit-subscription-cib',
    code: 'UNIT_SUBSCRIPTION_CIB',
    name: 'Unit Subscription (CIB)',
    description: 'Unit subscription for Cable & Internet Billing'
  },
  {
    id: 'prod-late-fee',
    code: 'LATE_FEE',
    name: 'Late fee',
    description: 'Fixed late fee product example'
  }
] as const;

function buildPropertyAddress(accountIndex: number, propertyIndex: number): string {
  const streetNo = 100 + accountIndex * 10 + propertyIndex;
  const streetNames = [
    'Oak Street',
    'Maple Avenue',
    'River Lane',
    'Harbor Blvd',
    'Cedar Drive',
    'Summit Way',
    'Northfield Road',
    'Elm Court',
    'Westbridge Place',
    'Bluewater Circle'
  ];
  const cityNames = [
    'Austin, TX',
    'Denver, CO',
    'Nashville, TN',
    'Phoenix, AZ',
    'Charlotte, NC',
    'Tampa, FL',
    'Raleigh, NC',
    'Boise, ID',
    'Madison, WI',
    'Salt Lake City, UT'
  ];

  return `${streetNo} ${streetNames[propertyIndex % streetNames.length]}, ${cityNames[accountIndex % cityNames.length]}`;
}

function buildBillableUnits(accountIndex: number, propertyIndex: number): number {
  const minUnits = 5;
  const maxUnits = 50;
  const span = maxUnits - minUnits + 1;

  return ((accountIndex * 17 + propertyIndex * 11 + 7) % span) + minUnits;
}

function toCents(usd: number): number {
  return Math.round(usd * 100);
}

function assertPriceRange(usd: number, context: string): void {
  if (usd < 1.5 || usd > 12.5) {
    throw new Error(`${context} must be in 1.50..12.50 USD range (got ${usd.toFixed(2)})`);
  }
}

function getPropertyId(accountId: string, propertyNumber: number): string {
  return `prop-${accountId}-${String(propertyNumber).padStart(2, '0')}`;
}

function getPropertyIds(accountId: string, propertyNumbers: number[]): string[] {
  return Array.from(
    new Set(propertyNumbers.map((propertyNumber) => getPropertyId(accountId, propertyNumber)))
  );
}

async function main(): Promise<void> {
  await prisma.pricingTier.deleteMany();
  await prisma.subscriptionPricing.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.pricing.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.property.deleteMany();
  await prisma.product.deleteMany();
  await prisma.account.deleteMany();

  await prisma.account.createMany({
    data: COMPANIES.map((company) => ({
      id: company.id,
      companyName: company.companyName,
      email: company.email
    }))
  });

  for (const [accountIndex, account] of COMPANIES.entries()) {
    await prisma.property.createMany({
      data: Array.from({ length: 10 }, (_, propertyIndex) => ({
        id: `prop-${account.id}-${String(propertyIndex + 1).padStart(2, '0')}`,
        accountId: account.id,
        address: buildPropertyAddress(accountIndex, propertyIndex),
        billableUnits: buildBillableUnits(accountIndex, propertyIndex)
      }))
    });

    await prisma.paymentMethod.createMany({
      data: [
        {
          id: `pm-${account.id}-card-default`,
          accountId: account.id,
          type: 'CARD',
          label: 'Visa ending in 4242',
          last4: '4242',
          isDefault: true
        },
        {
          id: `pm-${account.id}-bank`,
          accountId: account.id,
          type: 'US_BANK_ACCOUNT',
          label: 'US Bank ending in 6789',
          last4: '6789',
          isDefault: false
        }
      ]
    });
  }

  await prisma.product.createMany({
    data: PRODUCTS.map((product) => ({
      id: product.id,
      code: product.code,
      name: product.name,
      description: product.description
    }))
  });

  for (const pricing of PRICINGS) {
    if (pricing.type === 'FIXED') {
      assertPriceRange(pricing.fixedUsd, `${pricing.id} fixedUsd`);

      await prisma.pricing.create({
        data: {
          id: pricing.id,
          productId: pricing.productId,
          internalName: pricing.internalName,
          type: 'FIXED',
          fixedAmountCents: toCents(pricing.fixedUsd),
          minimumPriceCents: null,
          currency: 'usd',
          billingInterval: 'month',
          isActive: true
        }
      });
      continue;
    }

    if (pricing.tiers.length > 6) {
      throw new Error(`${pricing.id} has more than 6 tiers`);
    }
    assertPriceRange(pricing.minimumUsd, `${pricing.id} minimumUsd`);

    for (const tier of pricing.tiers) {
      assertPriceRange(tier.unitUsd, `${pricing.id} tier ${tier.fromUnit}-${tier.toUnit ?? '∞'}`);
    }

    await prisma.pricing.create({
      data: {
        id: pricing.id,
        productId: pricing.productId,
        internalName: pricing.internalName,
        type: 'TIERED',
        fixedAmountCents: null,
        minimumPriceCents: toCents(pricing.minimumUsd),
        currency: 'usd',
        billingInterval: 'month',
        isActive: true,
        tiers: {
          create: pricing.tiers.map((tier) => ({
            fromUnit: tier.fromUnit,
            toUnit: tier.toUnit,
            unitAmountCents: toCents(tier.unitUsd)
          }))
        }
      }
    });
  }

  const pricingById = new Map(PRICINGS.map((pricing) => [pricing.id, pricing]));

  function getAlternatePricing(currentPricingId: string): string | null {
    const current = pricingById.get(currentPricingId);
    if (!current) {
      return null;
    }

    const alternative = PRICINGS.find(
      (candidate) =>
        candidate.productId === current.productId &&
        candidate.id !== current.id
    );

    return alternative?.id ?? null;
  }

  for (const [accountIndex, account] of COMPANIES.entries()) {
    const defaultBundle = ACCOUNT_BUNDLES[accountIndex % ACCOUNT_BUNDLES.length] ?? [];
    const accountStatus =
      accountIndex % 9 === 0
        ? 'CANCELED'
        : accountIndex % 7 === 0
          ? 'PAUSED'
          : accountIndex % 5 === 0
            ? 'DRAFT'
            : 'ACTIVE';
    const accountStartDate = new Date(Date.UTC(2026, 0, 5 + accountIndex));

    await prisma.subscription.create({
      data: {
        id: `sub-account-${account.id}`,
        accountId: account.id,
        scope: 'ACCOUNT',
        startDate: accountStartDate,
        endDate: null,
        status: accountStatus,
        paymentMethodId: `pm-${account.id}-card-default`,
        subscriptionItems: {
          create: defaultBundle.map((pricingId) => ({
            pricingId,
            quantity: 1
          }))
        }
      }
    });

    const unitPricingId = defaultBundle.find((pricingId) =>
      pricingId.startsWith('prc-unit-')
    );
    const lateFeePricingId = defaultBundle.find((pricingId) =>
      pricingId.startsWith('prc-late-fee-')
    );
    const automationPricingId = defaultBundle.find((pricingId) =>
      pricingId.includes('billing-auto')
    );

    const propertyUnitOverride = unitPricingId ? getAlternatePricing(unitPricingId) : null;
    if (propertyUnitOverride) {
      const propertyIds = getPropertyIds(account.id, accountIndex % 2 === 0 ? [3, 4] : [3, 4, 5]);
      await prisma.subscription.create({
        data: {
          id: `sub-property-unit-${account.id}`,
          accountId: account.id,
          scope: 'PROPERTY',
          startDate: new Date(Date.UTC(2026, 0, 10 + accountIndex)),
          endDate: null,
          status: accountIndex % 6 === 0 ? 'PAUSED' : 'ACTIVE',
          paymentMethodId: `pm-${account.id}-card-default`,
          targetProperties: {
            create: propertyIds.map((propertyId) => ({ propertyId }))
          },
          subscriptionItems: {
            create: [{ pricingId: propertyUnitOverride, quantity: 1 }]
          }
        }
      });
    }

    const propertyLateFeeOverride = lateFeePricingId ? getAlternatePricing(lateFeePricingId) : null;
    if (propertyLateFeeOverride) {
      const propertyIds = getPropertyIds(account.id, accountIndex % 3 === 0 ? [8, 9] : [8]);
      await prisma.subscription.create({
        data: {
          id: `sub-property-latefee-${account.id}`,
          accountId: account.id,
          scope: 'PROPERTY',
          startDate: new Date(Date.UTC(2026, 0, 15 + accountIndex)),
          endDate: null,
          status:
            accountIndex % 5 === 0
              ? 'CANCELED'
              : accountIndex % 4 === 0
                ? 'DRAFT'
                : 'ACTIVE',
          paymentMethodId: `pm-${account.id}-card-default`,
          targetProperties: {
            create: propertyIds.map((propertyId) => ({ propertyId }))
          },
          subscriptionItems: {
            create: [{ pricingId: propertyLateFeeOverride, quantity: 1 }]
          }
        }
      });
    }

    const propertyAutomationOverride = automationPricingId
      ? getAlternatePricing(automationPricingId)
      : null;
    if (propertyAutomationOverride && accountIndex % 3 === 0) {
      const propertyIds = getPropertyIds(account.id, [1, 2, 10]);
      await prisma.subscription.create({
        data: {
          id: `sub-property-automation-${account.id}`,
          accountId: account.id,
          scope: 'PROPERTY',
          startDate: new Date(Date.UTC(2026, 0, 20 + accountIndex)),
          endDate: null,
          status: accountIndex % 2 === 0 ? 'CANCELED' : 'ACTIVE',
          paymentMethodId: `pm-${account.id}-card-default`,
          targetProperties: {
            create: propertyIds.map((propertyId) => ({ propertyId }))
          },
          subscriptionItems: {
            create: [{ pricingId: propertyAutomationOverride, quantity: 1 }]
          }
        }
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
