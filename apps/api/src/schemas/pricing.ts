import { z } from 'zod';

export const pricingTypeSchema = z.enum(['FIXED', 'TIERED']);

export const pricingTierInputSchema = z
  .object({
    fromUnit: z.number().int().positive(),
    toUnit: z.number().int().positive().nullable(),
    unitAmountCents: z.number().int().nonnegative()
  })
  .refine((tier) => tier.toUnit === null || tier.toUnit >= tier.fromUnit, {
    message: 'toUnit must be greater than or equal to fromUnit',
    path: ['toUnit']
  });

function validateTierSequence(
  tiers: Array<z.infer<typeof pricingTierInputSchema>>,
  ctx: z.RefinementCtx
): void {
  const sorted = [...tiers].sort((a, b) => a.fromUnit - b.fromUnit);

  if (sorted[0]?.fromUnit !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Tiered pricing must start from unit 1',
      path: ['tiers']
    });
  }

  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index];
    const next = sorted[index + 1];

    if (index < sorted.length - 1 && current.toUnit === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Only the last tier can be open-ended',
        path: ['tiers']
      });
      return;
    }

    if (!next) {
      continue;
    }

    if (current.toUnit === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Open-ended tier must be the final tier',
        path: ['tiers']
      });
      continue;
    }

    if (next.fromUnit !== current.toUnit + 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Tiers must be contiguous without gaps',
        path: ['tiers']
      });
    }
  }
}

const pricingBaseSchema = z.object({
  productId: z.string().min(1),
  internalName: z.string().trim().min(1),
  minimumPriceCents: z.number().int().nonnegative().nullable().optional(),
  currency: z.string().trim().length(3).default('usd'),
  billingInterval: z.string().trim().min(1).default('month'),
  isActive: z.boolean().default(true)
});

export const createPricingBodySchema = pricingBaseSchema
  .extend({
    type: pricingTypeSchema,
    fixedAmountCents: z.number().int().nonnegative().nullable().optional(),
    tiers: z.array(pricingTierInputSchema).optional()
  })
  .superRefine((payload, ctx) => {
    if (payload.type === 'FIXED') {
      if (payload.fixedAmountCents === undefined || payload.fixedAmountCents === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'fixedAmountCents is required for FIXED pricing',
          path: ['fixedAmountCents']
        });
      }

      if ((payload.tiers?.length ?? 0) > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'tiers are not allowed for FIXED pricing',
          path: ['tiers']
        });
      }

      return;
    }

    if (!payload.tiers || payload.tiers.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'tiers are required for TIERED pricing',
        path: ['tiers']
      });
      return;
    }

    if (payload.fixedAmountCents !== undefined && payload.fixedAmountCents !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'fixedAmountCents must be null for TIERED pricing',
        path: ['fixedAmountCents']
      });
    }

    validateTierSequence(payload.tiers, ctx);
  });

export const updatePricingBodySchema = z
  .object({
    internalName: z.string().trim().min(1).optional(),
    type: pricingTypeSchema.optional(),
    fixedAmountCents: z.number().int().nonnegative().nullable().optional(),
    minimumPriceCents: z.number().int().nonnegative().nullable().optional(),
    currency: z.string().trim().length(3).optional(),
    billingInterval: z.string().trim().min(1).optional(),
    isActive: z.boolean().optional(),
    tiers: z.array(pricingTierInputSchema).optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'At least one field must be provided'
  });

export const pricingParamsSchema = z.object({
  id: z.string().min(1)
});

export const pricingListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  productId: z.string().min(1).optional(),
  type: pricingTypeSchema.optional(),
  search: z.string().trim().min(1).optional()
});

export function normalizeTiers(
  tiers: Array<z.infer<typeof pricingTierInputSchema>>
): Array<z.infer<typeof pricingTierInputSchema>> {
  return [...tiers].sort((a, b) => a.fromUnit - b.fromUnit);
}
