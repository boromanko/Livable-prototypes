import { PricingType } from '@stripe-integration/db';
import {
  getPreferredMapByPropertyId,
  groupCandidates,
  pickPreferredCandidate
} from './pricing-resolution.candidates.js';
import { resolveCurrentTier, resolveUnitAmountCents } from './pricing-resolution.tiers.js';
import type {
  PricingResolutionInput,
  PricingTreeAccountUsage,
  PricingTreePropertyUsage,
  PricingTreeResolvedItem,
  ResolutionPropertyInput,
  TierSnapshot
} from './pricing-resolution.types.js';

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
    accountProperties.sort((left, right) => left.address.localeCompare(right.address));
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

      const preferredAccountCandidate = pickPreferredCandidate(groupedCandidates.accountCandidates);
      const preferredByPropertyId = getPreferredMapByPropertyId(
        groupedCandidates.propertyCandidatesByPropertyId
      );

      const accountProperties = propertiesByAccountId.get(accountId) ?? [];
      const accountCandidateMatchesPricing = preferredAccountCandidate?.pricingId === pricing.id;

      const accountPoolProperties = accountCandidateMatchesPricing
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

      const includeAccountRow = propertyRows.length > 0 || accountCandidateMatchesPricing;
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
        source === 'ACCOUNT' && pricing.type === PricingType.TIERED ? accountTier : null;
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
