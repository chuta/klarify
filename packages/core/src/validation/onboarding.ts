// Zod schemas for the 5-step onboarding wizard — CLAUDE.md §5 (user_profiles table).
import { z } from 'zod';

export const onboardingStep1Schema = z.object({
  product_types: z
    .array(z.enum(['DAX', 'DAOP', 'DAC', 'DAI', 'PAYMENT', 'HYBRID']))
    .min(1, 'Select at least one product type'),
});

export const onboardingStep2Schema = z.object({
  target_markets: z
    .array(z.enum(['NG', 'GH', 'KE', 'ZA', 'MU']))
    .min(1, 'Select at least one target market'),
});

export const onboardingStep3Schema = z.object({
  stage: z.enum(['idea', 'building', 'launched', 'arip', 'licensed']),
});

export const onboardingStep4Schema = z.object({
  team_size: z.number().int().min(1).max(10000),
  has_compliance_officer: z.boolean(),
});

export const onboardingStep5Schema = z.object({
  // Array of "dimension.indicator_key" strings already in place.
  existing_infrastructure: z.array(z.string()),
});

export const onboardingCompleteSchema = onboardingStep1Schema
  .merge(onboardingStep2Schema)
  .merge(onboardingStep3Schema)
  .merge(onboardingStep4Schema)
  .merge(onboardingStep5Schema);

export type OnboardingCompleteInput = z.infer<typeof onboardingCompleteSchema>;
export type OnboardingStep1Input = z.infer<typeof onboardingStep1Schema>;
export type OnboardingStep2Input = z.infer<typeof onboardingStep2Schema>;
export type OnboardingStep3Input = z.infer<typeof onboardingStep3Schema>;
export type OnboardingStep4Input = z.infer<typeof onboardingStep4Schema>;
export type OnboardingStep5Input = z.infer<typeof onboardingStep5Schema>;
