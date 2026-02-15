import type { PricingSortField } from './pricingsTab.types';

export const SORT_FIELD_LABELS: Record<PricingSortField, string> = {
  NAME: 'Sort by name',
  PRICE: 'Sort by price',
  SUBSCRIPTIONS: 'Sort by subscription count'
};

export const SORT_MENU_LABELS: Record<PricingSortField, string> = {
  NAME: 'Name',
  PRICE: 'Price',
  SUBSCRIPTIONS: 'Subscription count'
};

export const MAX_TIER_COLUMNS = 7;
export const BASE_TREE_MIN_WIDTH = 980;
export const ACTIONS_COLUMN_WIDTH = 118;
export const PROPERTIES_COLUMN_WIDTH = 176;
export const UNITS_COLUMN_WIDTH = 128;
export const TIER_COLUMN_MIN_WIDTH = 124;
export const LEFT_CONTENT_MIN_WIDTH = 340;
export const ROW_HORIZONTAL_PADDING_PX = 24;
export const TREE_INDENT_STEP = 24;
export const TREE_TOGGLE_SLOT_WIDTH = 24;
export const TREE_LABEL_GAP = 8;
export const PRODUCT_ROW_STICKY_TOP = 0;
export const PRICING_ROW_STICKY_TOP = 40;

export const TABLE_GHOST_BUTTON_SX = {
  width: 'fit-content',
  px: 1.5,
  py: 0.75,
  minHeight: 36
} as const;

export const CLICKABLE_ENTITY_LINK_SX = {
  color: '#009299',
  fontWeight: 700,
  textDecoration: 'none',
  cursor: 'pointer',
  '&:hover': { textDecoration: 'underline' }
} as const;

export const PRODUCT_DISPLAY_PRIORITY: Record<string, number> = {
  UNIT_SUBSCRIPTION_PRO: 0,
  UNIT_SUBSCRIPTION_APPFOLIO: 1,
  UNIT_SUBSCRIPTION_CIB: 2
};
