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
