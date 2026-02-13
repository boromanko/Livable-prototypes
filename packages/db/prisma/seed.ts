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
        name: `${account.companyName} Property ${propertyIndex + 1}`,
        address: buildPropertyAddress(accountIndex, propertyIndex)
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
