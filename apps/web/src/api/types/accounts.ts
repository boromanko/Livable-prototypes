import type { PaginatedResponse, PaginationParams } from './common';

export type AccountItem = {
  id: string;
  companyName: string;
  email: string;
  createdAt: string;
  propertiesCount: number;
  subscriptionsCount: number;
  totalBillableUnits: number;
};

export type AccountsQueryParams = PaginationParams & {
  search?: string;
};

export type AccountsResponse = PaginatedResponse<AccountItem>;
