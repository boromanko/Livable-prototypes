import { z } from 'zod';

export const accountsLookupQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().min(1).optional()
});

export const propertiesLookupQuerySchema = z.object({
  accountId: z.string().min(1),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
  search: z.string().trim().min(1).optional()
});
