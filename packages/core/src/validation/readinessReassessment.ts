import { z } from 'zod';
import {
  onboardingStep3Schema,
  onboardingStep4Schema,
  onboardingStep5Schema,
} from './onboarding.js';

/** Payload for POST /api/compliance/score/reassess — steps 3–5 of onboarding. */
export const readinessReassessmentSchema = onboardingStep3Schema
  .merge(onboardingStep4Schema)
  .merge(onboardingStep5Schema);

export type ReadinessReassessmentInput = z.infer<typeof readinessReassessmentSchema>;
