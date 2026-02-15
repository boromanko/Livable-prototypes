import type {
  AccountIdentity,
  CandidatesByProductAndAccount,
  PricingResolutionInput,
  ResolutionCandidate,
  ResolutionStatus
} from './pricing-resolution.types.js';

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

export function pickPreferredCandidate(
  candidates: ResolutionCandidate[]
): ResolutionCandidate | null {
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

export function groupCandidates(pricings: PricingResolutionInput[]): {
  candidatesByProductAndAccount: CandidatesByProductAndAccount;
  accountById: Map<string, AccountIdentity>;
} {
  const candidatesByProductAndAccount: CandidatesByProductAndAccount = new Map();
  const accountById = new Map<string, AccountIdentity>();

  for (const pricing of pricings) {
    for (const subscription of pricing.subscriptions) {
      if (!isIncludedSubscription(subscription.status)) {
        continue;
      }

      accountById.set(subscription.account.id, subscription.account);

      const byAccount = candidatesByProductAndAccount.get(pricing.product.id) ?? new Map();
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

      const propertyCandidates = grouped.propertyCandidatesByPropertyId.get(candidate.propertyId) ?? [];
      propertyCandidates.push(candidate);
      grouped.propertyCandidatesByPropertyId.set(candidate.propertyId, propertyCandidates);
    }
  }

  return {
    candidatesByProductAndAccount,
    accountById
  };
}

export function getPreferredMapByPropertyId(
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
