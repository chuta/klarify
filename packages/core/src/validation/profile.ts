// Zod schemas for profile and org update payloads.
import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar: z.string().url().optional(),
});

export const updateOrgSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateOrgInput = z.infer<typeof updateOrgSchema>;
