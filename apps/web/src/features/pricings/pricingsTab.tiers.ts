import type { PricingTier, PricingTreeItem, PricingTreeResolvedTier } from '../../api';
import {
  ACTIONS_COLUMN_WIDTH,
  LEFT_CONTENT_MIN_WIDTH,
  MAX_TIER_COLUMNS,
  PROPERTIES_COLUMN_WIDTH,
  ROW_HORIZONTAL_PADDING_PX,
  TIER_COLUMN_MIN_WIDTH,
  UNITS_COLUMN_WIDTH
} from './pricingsTab.constants';

export function getTierRangeLabel(tier: PricingTreeResolvedTier): string {
  if (!tier) {
    return 'No tier';
  }

  if (tier.toUnit === null) {
    return `> ${Math.max(0, tier.fromUnit - 1)}`;
  }

  return `${tier.fromUnit}-${tier.toUnit}`;
}

function getPricingColumnCount(pricing: PricingTreeItem): number {
  if (pricing.type === 'FIXED') {
    return 1;
  }

  return Math.max(1, Math.min(MAX_TIER_COLUMNS, pricing.tiers.length));
}

export function getProductTierColumnCount(pricings: PricingTreeItem[]): number {
  return Math.max(
    1,
    pricings.reduce((maxCount, pricing) => Math.max(maxCount, getPricingColumnCount(pricing)), 1)
  );
}

export function getProductMinRowWidth(tierColumnCount: number): number {
  return (
    LEFT_CONTENT_MIN_WIDTH +
    PROPERTIES_COLUMN_WIDTH +
    UNITS_COLUMN_WIDTH +
    tierColumnCount * TIER_COLUMN_MIN_WIDTH +
    ACTIONS_COLUMN_WIDTH +
    ROW_HORIZONTAL_PADDING_PX
  );
}

function getPricingColumnOffset(pricing: PricingTreeItem, productTierColumnCount: number): number {
  return Math.max(0, productTierColumnCount - getPricingColumnCount(pricing));
}

function findTierLocalIndex(
  pricing: PricingTreeItem,
  resolvedTier: PricingTreeResolvedTier
): number | null {
  if (pricing.type === 'FIXED') {
    return 0;
  }

  if (!resolvedTier) {
    return null;
  }

  const tierIndex = pricing.tiers.findIndex(
    (tier) => tier.fromUnit === resolvedTier.fromUnit && tier.toUnit === resolvedTier.toUnit
  );

  if (tierIndex >= 0) {
    return tierIndex;
  }

  return pricing.tiers.findIndex(
    (tier) =>
      tier.fromUnit <= resolvedTier.fromUnit &&
      (tier.toUnit === null || (resolvedTier.toUnit !== null && tier.toUnit >= resolvedTier.toUnit))
  );
}

export function getActiveTierColumnIndex(
  pricing: PricingTreeItem,
  productTierColumnCount: number,
  resolvedTier: PricingTreeResolvedTier
): number | null {
  const localIndex = findTierLocalIndex(pricing, resolvedTier);
  if (localIndex === null || localIndex < 0) {
    return null;
  }

  const cappedLocalIndex = Math.min(localIndex, getPricingColumnCount(pricing) - 1);
  return getPricingColumnOffset(pricing, productTierColumnCount) + cappedLocalIndex;
}

export function getTierForColumn(
  pricing: PricingTreeItem,
  productTierColumnCount: number,
  columnIndex: number
): PricingTier | null {
  if (pricing.type === 'FIXED') {
    return null;
  }

  const offset = getPricingColumnOffset(pricing, productTierColumnCount);
  const localIndex = columnIndex - offset;
  if (localIndex < 0 || localIndex >= pricing.tiers.length || localIndex >= MAX_TIER_COLUMNS) {
    return null;
  }

  return pricing.tiers[localIndex] ?? null;
}
