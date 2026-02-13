import { PricingType } from '@stripe-integration/db';

type ResolutionStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CANCELED';
type ResolutionScope = 'ACCOUNT' | 'PROPERTY';

type TierScope = 'ACCOUNT_POOL' | 'PROPERTY';

type TierSnapshot = {
  fromUnit: number;
  toUnit: number | null;
  unitAmountCents: number;
};

type PricingProduct = {
  id: string;
  name: string;
  code: string;
};

type PricingSubscription = {
  id: string;
  scope: ResolutionScope;
  status: ResolutionStatus;
  createdAt: Date;
  accountId: string;
  propertyId: string | null;
  account: {
    id: string;
    companyName: string;
    email: string;
  };
};

export type PricingResolutionInput = {
  id: string;
  product: PricingProduct;
  internalName: string;
  type: PricingType;
  fixedAmountCents: number | null;
  minimumPriceCents: number | null;
  currency: string;
  billingInterval: string;
  isActive: boolean;
  createdAt: Date;
  subscriptionsCount: number;
  tiers: TierSnapshot[];
  subscriptions: PricingSubscription[];
};

export type ResolutionPropertyInput = {
  id: string;
  accountId: string;
  name: string;
  address: string;
  billableUnits: number;
};

type ResolutionCandidate = {
  pricingId: string;
  productId: string;
  subscriptionId: string;
  scope: ResolutionScope;
  status: ResolutionStatus;
  createdAt: Date;
  accountId: string;
  propertyId: string | null;
  account: {
    id: string;
    companyName: string;
    email: string;
  };
};

export type PricingTreeResolvedTier = TierSnapshot | null;

export type PricingTreePropertyUsage = {
  property: {
    id: string;
    name: string;
    address: string;
    billableUnits: number;
  };
  source: 'INHERITED' | 'OVERRIDE';
  subscriptionId: string | null;
  resolvedBySubscriptionId: string | null;
  excludedFromAccountPool: boolean;
  tierScope: TierScope;
  currentTier: PricingTreeResolvedTier;
  currentUnitAmountCents: number | null;
};

export type PricingTreeAccountUsage = {
  account: {
    id: string;
    companyName: string;
    email: string;
  };
  source: 'ACCOUNT' | 'PROPERTY_ONLY';
  accountSubscriptionId: string | null;
  propertiesMatched: number;
  inheritedPropertiesCount: number;
  overridePropertiesCount: number;
  totalProperties: number;
  totalBillableUnits: number;
  tierScope: TierScope;
  currentTier: PricingTreeResolvedTier;
  currentUnitAmountCents: number | null;
  properties: PricingTreePropertyUsage[];
};

export type PricingTreeResolvedItem = {
  id: string;
  product: PricingProduct;
  internalName: string;
  type: PricingType;
  fixedAmountCents: number | null;
  minimumPriceCents: number | null;
  currency: string;
  billingInterval: string;
  isActive: boolean;
  createdAt: Date;
  subscriptionsCount: number;
  tiers: TierSnapshot[];
  accounts: PricingTreeAccountUsage[];
};

type CandidatesByProductAndAccount = Map<
  string,
  Map<
    string,
    {
      accountCandidates: ResolutionCandidate[];
      propertyCandidatesByPropertyId: Map<string, ResolutionCandidate[]>;
    }
  >
>;

function isIncludedSubscription(status: ResolutionStatus): boolean {
  return status !== 'CANCELED';
}

function getStatusPriority(status: ResolutionStatus): number {
  switch (status) {
    case 'ACTIVE':
      return 3;
    case 'PAUSED':
      return 2;
    case 'DRAFT':
      return 1;
    default:
      return 0;
  }
}

function pickPreferredCandidate(candidates: ResolutionCandidate[]): ResolutionCandidate | null {
  if (candidates.length === 0) {
    return null;
  }

  const sorted = [...candidates].sort((left, right) => {
    const byStatus = getStatusPriority(right.status) - getStatusPriority(left.status);
    if (byStatus !== 0) {
      return byStatus;
    }

    const bySubscriptionCreatedAt = right.createdAt.getTime() - left.createdAt.getTime();
    if (bySubscriptionCreatedAt !== 0) {
      return bySubscriptionCreatedAt;
    }

    return right.pricingId.localeCompare(left.pricingId);
  });

  return sorted[0] ?? null;
}

function resolveCurrentTier(tiers: TierSnapshot[], units: number): TierSnapshot | null {
  if (tiers.length === 0 || units <= 0) {
    return null;
  }

  const tier = tiers.find(
    (item) => units >= item.fromUnit && (item.toUnit === null || units <= item.toUnit)
  );

  return tier ?? null;
}

function resolveUnitAmountCents(
  pricingType: PricingType,
  fixedAmountCents: number | null,
  tier: TierSnapshot | null
): number | null {
  if (pricingType === PricingType.FIXED) {
    return fixedAmountCents;
  }

  return tier?.unitAmountCents ?? null;
}

function groupCandidates(
  pricings: PricingResolutionInput[]
): {
  candidatesByProductAndAccount: CandidatesByProductAndAccount;
  accountById: Map<string, { id: string; companyName: string; email: string }>;
} {
  const candidatesByProductAndAccount: CandidatesByProductAndAccount = new Map();
  const accountById = new Map<string, { id: string; companyName: string; email: string }>();

  for (const pricing of pricings) {
    for (const subscription of pricing.subscriptions) {
      if (!isIncludedSubscription(subscription.status)) {
        continue;
      }

      accountById.set(subscription.account.id, subscription.account);

      const byAccount =
        candidatesByProductAndAccount.get(pricing.product.id) ?? new Map();
      candidatesByProductAndAccount.set(pricing.product.id, byAccount);

      const grouped = byAccount.get(subscription.accountId) ?? {
        accountCandidates: [],
        propertyCandidatesByPropertyId: new Map<string, ResolutionCandidate[]>()
      };
      byAccount.set(subscription.accountId, grouped);

      const candidate: ResolutionCandidate = {
        pricingId: pricing.id,
        productId: pricing.product.id,
        subscriptionId: subscription.id,
        scope: subscription.scope,
        status: subscription.status,
        createdAt: subscription.createdAt,
        accountId: subscription.accountId,
        propertyId: subscription.propertyId,
        account: subscription.account
      };

      if (candidate.scope === 'ACCOUNT') {
        grouped.accountCandidates.push(candidate);
        continue;
      }

      if (!candidate.propertyId) {
        continue;
      }

      const propertyCandidates =
        grouped.propertyCandidatesByPropertyId.get(candidate.propertyId) ?? [];
      propertyCandidates.push(candidate);
      grouped.propertyCandidatesByPropertyId.set(candidate.propertyId, propertyCandidates);
    }
  }

  return {
    candidatesByProductAndAccount,
    accountById
  };
}

function getPreferredMapByPropertyId(
  propertyCandidatesByPropertyId: Map<string, ResolutionCandidate[]>
): Map<string, ResolutionCandidate> {
  const preferredByPropertyId = new Map<string, ResolutionCandidate>();

  for (const [propertyId, candidates] of propertyCandidatesByPropertyId.entries()) {
    const preferred = pickPreferredCandidate(candidates);
    if (preferred) {
      preferredByPropertyId.set(propertyId, preferred);
    }
  }

  return preferredByPropertyId;
}

export function resolvePricingTree(
  pricings: PricingResolutionInput[],
  properties: ResolutionPropertyInput[]
): PricingTreeResolvedItem[] {
  const { candidatesByProductAndAccount, accountById } = groupCandidates(pricings);

  const propertiesByAccountId = new Map<string, ResolutionPropertyInput[]>();
  for (const property of properties) {
    const current = propertiesByAccountId.get(property.accountId) ?? [];
    current.push(property);
    propertiesByAccountId.set(property.accountId, current);
  }

  for (const accountProperties of propertiesByAccountId.values()) {
    accountProperties.sort((left, right) => left.name.localeCompare(right.name));
  }

  return pricings.map((pricing) => {
    const tiers: TierSnapshot[] = pricing.tiers.map((tier) => ({
      fromUnit: tier.fromUnit,
      toUnit: tier.toUnit,
      unitAmountCents: tier.unitAmountCents
    }));

    const accountsForProduct = candidatesByProductAndAccount.get(pricing.product.id) ?? new Map();
    const accountRows: PricingTreeAccountUsage[] = [];

    for (const [accountId, groupedCandidates] of accountsForProduct.entries()) {
      const account = accountById.get(accountId);
      if (!account) {
        continue;
      }

      const preferredAccountCandidate = pickPreferredCandidate(
        groupedCandidates.accountCandidates
      );
      const preferredByPropertyId = getPreferredMapByPropertyId(
        groupedCandidates.propertyCandidatesByPropertyId
      );

      const accountProperties = propertiesByAccountId.get(accountId) ?? [];
      const accountCandidateMatchesPricing =
        preferredAccountCandidate?.pricingId === pricing.id;

      const accountPoolProperties =
        accountCandidateMatchesPricing
          ? accountProperties.filter((property) => !preferredByPropertyId.has(property.id))
          : [];

      const accountPoolUnits = accountPoolProperties.reduce(
        (sum, property) => sum + property.billableUnits,
        0
      );

      const accountTier = resolveCurrentTier(tiers, accountPoolUnits);
      const accountUnitAmountCents = resolveUnitAmountCents(
        pricing.type,
        pricing.fixedAmountCents,
        accountTier
      );

      const propertyRows: PricingTreePropertyUsage[] = [];

      for (const property of accountProperties) {
        const preferredPropertyCandidate = preferredByPropertyId.get(property.id);

        if (preferredPropertyCandidate) {
          if (preferredPropertyCandidate.pricingId !== pricing.id) {
            continue;
          }

          const propertyTier = resolveCurrentTier(tiers, property.billableUnits);
          const propertyUnitAmountCents = resolveUnitAmountCents(
            pricing.type,
            pricing.fixedAmountCents,
            propertyTier
          );

          propertyRows.push({
            property: {
              id: property.id,
              name: property.name,
              address: property.address,
              billableUnits: property.billableUnits
            },
            source: 'OVERRIDE',
            subscriptionId: preferredPropertyCandidate.subscriptionId,
            resolvedBySubscriptionId: preferredPropertyCandidate.subscriptionId,
            excludedFromAccountPool: true,
            tierScope: 'PROPERTY',
            currentTier: pricing.type === PricingType.TIERED ? propertyTier : null,
            currentUnitAmountCents: propertyUnitAmountCents
          });
          continue;
        }

        if (!accountCandidateMatchesPricing) {
          continue;
        }

        propertyRows.push({
          property: {
            id: property.id,
            name: property.name,
            address: property.address,
            billableUnits: property.billableUnits
          },
          source: 'INHERITED',
          subscriptionId: preferredAccountCandidate?.subscriptionId ?? null,
          resolvedBySubscriptionId: preferredAccountCandidate?.subscriptionId ?? null,
          excludedFromAccountPool: false,
          tierScope: 'ACCOUNT_POOL',
          currentTier: pricing.type === PricingType.TIERED ? accountTier : null,
          currentUnitAmountCents: accountUnitAmountCents
        });
      }

      const includeAccountRow =
        propertyRows.length > 0 || accountCandidateMatchesPricing;
      if (!includeAccountRow) {
        continue;
      }

      const source = accountCandidateMatchesPricing ? 'ACCOUNT' : 'PROPERTY_ONLY';
      const inheritedPropertiesCount = propertyRows.filter(
        (property) => property.source === 'INHERITED'
      ).length;
      const overridePropertiesCount = propertyRows.filter(
        (property) => property.source === 'OVERRIDE'
      ).length;
      const totalProperties = accountProperties.length;
      const totalBillableUnits =
        source === 'ACCOUNT'
          ? accountPoolUnits
          : propertyRows.reduce((sum, property) => sum + property.property.billableUnits, 0);

      const currentTier =
        source === 'ACCOUNT' && pricing.type === PricingType.TIERED
          ? accountTier
          : null;
      const currentUnitAmountCents =
        source === 'ACCOUNT'
          ? accountUnitAmountCents
          : pricing.type === PricingType.FIXED
            ? pricing.fixedAmountCents
            : null;

      accountRows.push({
        account,
        source,
        accountSubscriptionId:
          source === 'ACCOUNT' ? preferredAccountCandidate?.subscriptionId ?? null : null,
        propertiesMatched: inheritedPropertiesCount,
        inheritedPropertiesCount,
        overridePropertiesCount,
        totalProperties,
        totalBillableUnits,
        tierScope: source === 'ACCOUNT' ? 'ACCOUNT_POOL' : 'PROPERTY',
        currentTier,
        currentUnitAmountCents,
        properties: propertyRows
      });
    }

    accountRows.sort((left, right) =>
      left.account.companyName.localeCompare(right.account.companyName)
    );

    return {
      id: pricing.id,
      product: pricing.product,
      internalName: pricing.internalName,
      type: pricing.type,
      fixedAmountCents: pricing.fixedAmountCents,
      minimumPriceCents: pricing.minimumPriceCents,
      currency: pricing.currency,
      billingInterval: pricing.billingInterval,
      isActive: pricing.isActive,
      createdAt: pricing.createdAt,
      subscriptionsCount: pricing.subscriptionsCount,
      tiers,
      accounts: accountRows
    };
  });
}
