import { z } from 'zod';

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional()
});

export type ListQuery = z.infer<typeof listQuerySchema>;
