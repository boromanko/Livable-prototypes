import { z } from 'zod';

export const billingScopeSchema = z.enum(['ACCOUNT', 'PROPERTY']);
export const subscriptionStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'CANCELED']);

export const subscriptionListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  accountId: z.string().min(1).optional(),
  propertyId: z.string().min(1).optional(),
  scope: billingScopeSchema.optional(),
  status: subscriptionStatusSchema.optional(),
  search: z.string().trim().min(1).optional(),
  startFrom: z.coerce.date().optional(),
  startTo: z.coerce.date().optional()
});

export const subscriptionParamsSchema = z.object({
  id: z.string().min(1)
});

export const createSubscriptionBodySchema = z
  .object({
    accountId: z.string().min(1),
    scope: billingScopeSchema,
    propertyId: z.string().min(1).nullable().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().nullable().optional(),
    status: subscriptionStatusSchema.default('DRAFT'),
    paymentMethodId: z.string().min(1).nullable().optional(),
    pricingIds: z.array(z.string().min(1)).min(1)
  })
  .superRefine((payload, ctx) => {
    if (payload.scope === 'ACCOUNT' && payload.propertyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'propertyId must be null for ACCOUNT scope',
        path: ['propertyId']
      });
    }

    if (payload.scope === 'PROPERTY' && !payload.propertyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'propertyId is required for PROPERTY scope',
        path: ['propertyId']
      });
    }

    if (payload.endDate && payload.endDate < payload.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'endDate must be greater than or equal to startDate',
        path: ['endDate']
      });
    }
  });

export const updateSubscriptionBodySchema = z
  .object({
    scope: billingScopeSchema.optional(),
    propertyId: z.string().min(1).nullable().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().nullable().optional(),
    status: subscriptionStatusSchema.optional(),
    paymentMethodId: z.string().min(1).nullable().optional(),
    pricingIds: z.array(z.string().min(1)).min(1).optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'At least one field must be provided'
  });

export const subscriptionBulkActionSchema = z.enum([
  'DELETE_SUBSCRIPTIONS',
  'ADD_PRICING',
  'REPLACE_PRICINGS',
  'DELETE_PRICING'
]);

export const subscriptionBulkBodySchema = z
  .object({
    action: subscriptionBulkActionSchema,
    subscriptionIds: z.array(z.string().min(1)).min(1),
    pricingIds: z.array(z.string().min(1)).min(1).optional()
  })
  .superRefine((payload, ctx) => {
    const requiresPricingIds =
      payload.action === 'ADD_PRICING' ||
      payload.action === 'REPLACE_PRICINGS' ||
      payload.action === 'DELETE_PRICING';

    if (requiresPricingIds && (!payload.pricingIds || payload.pricingIds.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'pricingIds are required for this bulk action',
        path: ['pricingIds']
      });
    }

    if (payload.action === 'DELETE_SUBSCRIPTIONS' && payload.pricingIds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'pricingIds are not allowed for DELETE_SUBSCRIPTIONS',
        path: ['pricingIds']
      });
    }
  });
