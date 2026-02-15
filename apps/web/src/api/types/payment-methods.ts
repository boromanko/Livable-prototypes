export type PaymentMethodItem = {
  id: string;
  accountId: string;
  type: 'CARD' | 'US_BANK_ACCOUNT';
  label: string;
  last4: string | null;
  isDefault: boolean;
  createdAt: string;
};

export type PaymentMethodsQueryParams = {
  accountId: string;
};

export type PaymentMethodsResponse = {
  items: PaymentMethodItem[];
};
