import type { BillingScope, SubscriptionStatus } from '../../api';
import type { SubscriptionFormState } from './subscriptionForm.utils';

export type AutoPruneNotice = {
  removedPricingIds: string[];
  removedPropertyIds: string[];
};

type AvailabilityReasonItem = {
  id: string;
  reason: string | null;
};

type AvailabilityConflictData = {
  invalidSelectedPricingIds: string[];
  invalidSelectedPropertyIds: string[];
  pricingAvailability: AvailabilityReasonItem[];
  propertyAvailability: AvailabilityReasonItem[];
};

type TransferEligibilityPayloadInput = {
  accountIds: string[];
  formState: SubscriptionFormState;
};

type AvailabilityPayloadInput = {
  formState: SubscriptionFormState;
  propertyOptionIds: string[];
  pricingOptionIds: string[];
  isEdit: boolean;
  initialSubscriptionId?: string;
};

export function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter((id) => id.trim() !== '')));
}

export function buildTransferEligibilityPayload(input: TransferEligibilityPayloadInput): {
  accountIds: string[];
  scope: BillingScope;
  propertyIds: string[] | undefined;
  startDate: string;
  endDate: string | null;
  status: SubscriptionStatus;
  pricingIds: string[];
} {
  const { accountIds, formState } = input;
  return {
    accountIds,
    scope: formState.scope,
    // Property selection is reset after transfer, so eligibility is evaluated on account-level constraints.
    propertyIds: formState.scope === 'PROPERTY' ? [] : undefined,
    startDate: formState.startDate,
    endDate: formState.endDate !== '' ? formState.endDate : null,
    status: formState.status,
    pricingIds: formState.pricingIds
  };
}

export function buildAvailabilityPayload(input: AvailabilityPayloadInput): {
  accountId: string;
  scope: BillingScope;
  propertyIds: string[] | undefined;
  pricingIds: string[];
  propertyOptionIds: string[];
  pricingOptionIds: string[];
  startDate: string;
  endDate: string | null;
  status: SubscriptionStatus;
  excludeSubscriptionId: string | undefined;
} {
  const { formState, propertyOptionIds, pricingOptionIds, isEdit, initialSubscriptionId } = input;

  return {
    accountId: formState.accountId,
    scope: formState.scope,
    propertyIds: formState.scope === 'PROPERTY' ? formState.propertyIds : undefined,
    pricingIds: formState.pricingIds,
    propertyOptionIds,
    pricingOptionIds,
    startDate: formState.startDate,
    endDate: formState.endDate !== '' ? formState.endDate : null,
    status: formState.status,
    excludeSubscriptionId: isEdit ? initialSubscriptionId : undefined
  };
}

export function mapItemsById<T extends { id: string }>(items: T[] | undefined): Record<string, T> {
  if (!items || items.length === 0) {
    return {};
  }

  return Object.fromEntries(items.map((item) => [item.id, item])) as Record<string, T>;
}

export function getAvailabilityConflictMessage(data: AvailabilityConflictData): string | null {
  const pricingReasonById = Object.fromEntries(
    data.pricingAvailability.map((item) => [item.id, item.reason])
  );
  const propertyReasonById = Object.fromEntries(
    data.propertyAvailability.map((item) => [item.id, item.reason])
  );

  if (data.invalidSelectedPricingIds.length > 0) {
    const reason = pricingReasonById[data.invalidSelectedPricingIds[0]];
    if (reason) {
      return reason;
    }
  }

  if (data.invalidSelectedPropertyIds.length > 0) {
    const reason = propertyReasonById[data.invalidSelectedPropertyIds[0]];
    if (reason) {
      return reason;
    }
  }

  return null;
}

export function pruneInvalidSelections(
  prev: SubscriptionFormState,
  invalidPricingIds: string[],
  invalidPropertyIds: string[]
): { nextState: SubscriptionFormState; notice: AutoPruneNotice | null } {
  const invalidPricingIdSet = new Set(invalidPricingIds);
  const invalidPropertyIdSet = new Set(invalidPropertyIds);
  const removedPricingIds = prev.pricingIds.filter((pricingId) => invalidPricingIdSet.has(pricingId));
  const removedPropertyIds = prev.propertyIds.filter((propertyId) => invalidPropertyIdSet.has(propertyId));

  if (removedPricingIds.length === 0 && removedPropertyIds.length === 0) {
    return {
      nextState: prev,
      notice: null
    };
  }

  return {
    nextState: {
      ...prev,
      pricingIds: prev.pricingIds.filter((pricingId) => !invalidPricingIdSet.has(pricingId)),
      propertyIds: prev.propertyIds.filter((propertyId) => !invalidPropertyIdSet.has(propertyId))
    },
    notice: {
      removedPricingIds,
      removedPropertyIds
    }
  };
}
