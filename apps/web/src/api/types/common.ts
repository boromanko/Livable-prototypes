export type PaginationParams = {
  page?: number;
  pageSize?: number;
};

export type PaginatedResponse<TItem> = {
  items: TItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type HealthResponse = {
  status: string;
};
