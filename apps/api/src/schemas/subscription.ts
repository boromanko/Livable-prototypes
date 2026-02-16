import { z } from 'zod';

export const billingScopeSchema = z.enum(['ACCOUNT', 'PROPERTY']);
export const subscriptionStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'CANCELED']);
const listQueryAccountIdsSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [value];
}, z.array(z.string().trim().min(1)).min(1).optional());
const listQueryPricingIdsSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [value];
}, z.array(z.string().trim().min(1)).min(1).optional());

export const subscriptionListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  accountId: z.string().min(1).optional(),
  accountIds: listQueryAccountIdsSchema,
  pricingIds: listQueryPricingIdsSchema,
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
    propertyIds: z.array(z.string().min(1)).optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().nullable().optional(),
    status: subscriptionStatusSchema.default('DRAFT'),
    paymentMethodId: z.string().min(1).nullable().optional(),
    pricingIds: z.array(z.string().min(1)).min(1)
  })
  .superRefine((payload, ctx) => {
    const propertySelections = payload.propertyIds ?? [];

    if (payload.scope === 'ACCOUNT' && propertySelections.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'propertyIds must be empty for ACCOUNT scope',
        path: ['propertyIds']
      });
    }

    if (payload.scope === 'PROPERTY' && propertySelections.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'propertyIds are required for PROPERTY scope',
        path: ['propertyIds']
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
    accountId: z.string().min(1).optional(),
    scope: billingScopeSchema.optional(),
    propertyIds: z.array(z.string().min(1)).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().nullable().optional(),
    status: subscriptionStatusSchema.optional(),
    paymentMethodId: z.string().min(1).nullable().optional(),
    pricingIds: z.array(z.string().min(1)).min(1).optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'At least one field must be provided'
  });

export const subscriptionTransferEligibilityBodySchema = z
  .object({
    accountIds: z.array(z.string().min(1)).min(1),
    scope: billingScopeSchema,
    propertyIds: z.array(z.string().min(1)).optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().nullable().optional(),
    status: subscriptionStatusSchema.default('DRAFT'),
    pricingIds: z.array(z.string().min(1)).min(1)
  })
  .superRefine((payload, ctx) => {
    const propertySelections = payload.propertyIds ?? [];

    if (payload.scope === 'ACCOUNT' && propertySelections.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'propertyIds must be empty for ACCOUNT scope',
        path: ['propertyIds']
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

export const subscriptionAvailabilityPreviewBodySchema = z
  .object({
    accountId: z.string().min(1),
    scope: billingScopeSchema,
    propertyIds: z.array(z.string().min(1)).optional(),
    pricingIds: z.array(z.string().min(1)).optional(),
    propertyOptionIds: z.array(z.string().min(1)).optional(),
    pricingOptionIds: z.array(z.string().min(1)).optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().nullable().optional(),
    status: subscriptionStatusSchema.optional(),
    excludeSubscriptionId: z.string().min(1).optional()
  })
  .superRefine((payload, ctx) => {
    const propertySelections = payload.propertyIds ?? [];

    if (payload.scope === 'ACCOUNT' && propertySelections.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'propertyIds must be empty for ACCOUNT scope',
        path: ['propertyIds']
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

export const subscriptionBulkActionSchema = z.enum([
  'DELETE_SUBSCRIPTIONS',
  'ADD_PRICING',
  'REPLACE_PRICINGS',
  'DELETE_PRICING',
  'MANAGE_PRICINGS',
  'UPDATE_STATUS'
]);

export const subscriptionManagePricingsPreviewBodySchema = z.object({
  subscriptionIds: z.array(z.string().min(1)).min(1)
});

export const subscriptionStatusPreviewBodySchema = z.object({
  subscriptionIds: z.array(z.string().min(1)).min(1)
});

export const subscriptionBulkBodySchema = z
  .object({
    action: subscriptionBulkActionSchema,
    subscriptionIds: z.array(z.string().min(1)).min(1),
    status: subscriptionStatusSchema.optional(),
    pricingIds: z.array(z.string().min(1)).min(1).optional(),
    addPricingIds: z.array(z.string().min(1)).min(1).optional(),
    removePricingIds: z.array(z.string().min(1)).min(1).optional()
  })
  .superRefine((payload, ctx) => {
    const requiresPricingIds =
      payload.action === 'ADD_PRICING' ||
      payload.action === 'REPLACE_PRICINGS' ||
      payload.action === 'DELETE_PRICING';
    const isManagePricings = payload.action === 'MANAGE_PRICINGS';
    const isUpdateStatus = payload.action === 'UPDATE_STATUS';

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

    if (payload.action === 'DELETE_SUBSCRIPTIONS' && payload.addPricingIds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'addPricingIds are not allowed for DELETE_SUBSCRIPTIONS',
        path: ['addPricingIds']
      });
    }

    if (payload.action === 'DELETE_SUBSCRIPTIONS' && payload.removePricingIds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'removePricingIds are not allowed for DELETE_SUBSCRIPTIONS',
        path: ['removePricingIds']
      });
    }

    if (requiresPricingIds && payload.addPricingIds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'addPricingIds are only allowed for MANAGE_PRICINGS',
        path: ['addPricingIds']
      });
    }

    if (requiresPricingIds && payload.removePricingIds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'removePricingIds are only allowed for MANAGE_PRICINGS',
        path: ['removePricingIds']
      });
    }

    if (isManagePricings && payload.pricingIds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'pricingIds are not allowed for MANAGE_PRICINGS',
        path: ['pricingIds']
      });
    }

    if (isUpdateStatus && !payload.status) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'status is required for UPDATE_STATUS',
        path: ['status']
      });
    }

    if (!isUpdateStatus && payload.status) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'status is only allowed for UPDATE_STATUS',
        path: ['status']
      });
    }
  });
