export type ProductItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  pricingsCount: number;
};

export type ProductsResponse = {
  items: ProductItem[];
};

export type CreateProductPayload = {
  name: string;
  description?: string | null;
  isActive?: boolean;
};

export type UpsertProductResponse = {
  item: ProductItem;
};
