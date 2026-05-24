import { z } from 'zod';
import { INVITABLE_ROLES } from '../team/seats.js';

export const createOrgInviteSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  role: z.enum(INVITABLE_ROLES).default('member'),
});

export const acceptOrgInviteSchema = z.object({
  token: z.string().trim().min(16, 'Invalid invitation token'),
});

export type CreateOrgInviteInput = z.infer<typeof createOrgInviteSchema>;
export type AcceptOrgInviteInput = z.infer<typeof acceptOrgInviteSchema>;
