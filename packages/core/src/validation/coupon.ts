import { z } from 'zod';

const planTargets = z.enum(['navigator', 'compass', 'flagship', 'all']);
const billingCycleTargets = z.enum(['monthly', 'annual']);

export const validateCouponSchema = z.object({
  code: z.string().trim().min(3).max(32),
  plan: z.enum(['navigator', 'compass', 'flagship']),
  billingCycle: z.enum(['monthly', 'annual']),
});

export const createCouponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'Code must be at least 3 characters')
      .max(32)
      .regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, hyphens, or underscores only'),
    description: z.string().trim().max(200).optional(),
    discountType: z.enum(['percent', 'fixed_ngn']),
    discountValue: z.number().positive(),
    applicablePlans: z.array(planTargets).min(1).default(['all']),
    billingCycles: z.array(billingCycleTargets).min(1).default(['monthly', 'annual']),
    maxRedemptions: z.number().int().positive().nullable().optional(),
    maxPerOrg: z.number().int().min(1).default(1),
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime().nullable().optional(),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.discountType === 'percent' && data.discountValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Percent discount cannot exceed 100',
        path: ['discountValue'],
      });
    }
  });

export const updateCouponSchema = z.object({
  description: z.string().trim().max(200).optional().nullable(),
  maxRedemptions: z.number().int().positive().nullable().optional(),
  validUntil: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
