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
  PricingTreeSubscriptionSummary,
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
    const subscriptionSummaryMetaById = new Map<
      string,
      {
        summary: PricingTreeSubscriptionSummary;
        selectedPropertyIds: Set<string>;
      }
    >();

    for (const subscription of pricing.subscriptions) {
      const accountProperties = propertiesByAccountId.get(subscription.accountId) ?? [];
      const totalProperties = accountProperties.length;
      const accountPropertyIds = new Set(accountProperties.map((property) => property.id));
      const selectedPropertyIds = Array.from(
        new Set(
          subscription.propertyIds.filter((propertyId) =>
            accountPropertyIds.has(propertyId)
          )
        )
      );
      const propertiesCount =
        subscription.scope === 'ACCOUNT' ? totalProperties : selectedPropertyIds.length;
      const coverageLabel =
        subscription.scope === 'ACCOUNT'
          ? `${totalProperties}/${totalProperties} properties`
          : `${propertiesCount} properties`;

      const existingMeta = subscriptionSummaryMetaById.get(subscription.id);
      if (!existingMeta) {
        subscriptionSummaryMetaById.set(subscription.id, {
          summary: {
            id: subscription.id,
            scope: subscription.scope,
            status: subscription.status,
            createdAt: subscription.createdAt,
            account: subscription.account,
            propertiesCount,
            totalProperties,
            coverageLabel
          },
          selectedPropertyIds: new Set(selectedPropertyIds)
        });
        continue;
      }

      // Defensive merge for malformed payloads that might contain duplicate subscription ids.
      if (subscription.scope === 'PROPERTY' && existingMeta.summary.scope === 'PROPERTY') {
        for (const propertyId of selectedPropertyIds) {
          existingMeta.selectedPropertyIds.add(propertyId);
        }

        const mergedPropertiesCount = existingMeta.selectedPropertyIds.size;
        existingMeta.summary.propertiesCount = mergedPropertiesCount;
        existingMeta.summary.coverageLabel = `${mergedPropertiesCount} properties`;
      }
    }

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

    const subscriptionSummaries = Array.from(subscriptionSummaryMetaById.values())
      .map((item) => item.summary)
      .sort((left, right) => {
        const byAccount = left.account.companyName.localeCompare(right.account.companyName);
        if (byAccount !== 0) {
          return byAccount;
        }

        return right.createdAt.getTime() - left.createdAt.getTime();
      });

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
      subscriptionsCount: subscriptionSummaries.length,
      subscriptions: subscriptionSummaries,
      tiers,
      accounts: accountRows
    };
  });
}
