import type { PaginatedResponse, PaginationParams } from './common';

export type PropertyItem = {
  id: string;
  accountId: string;
  address: string;
  billableUnits: number;
  createdAt: string;
  subscriptionsCount: number;
};

export type PropertiesQueryParams = PaginationParams & {
  accountId: string;
  search?: string;
};

export type PropertiesResponse = PaginatedResponse<PropertyItem>;

export type UpdatePropertyUnitsPayload = {
  billableUnits: number;
};

export type UpdatePropertyUnitsResponse = {
  item: PropertyItem;
};
