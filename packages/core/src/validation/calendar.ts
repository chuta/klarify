import { z } from 'zod';

const eventTypes = [
  'STR_FILING',
  'CTR_FILING',
  'PEP_REGISTER',
  'QUARTERLY_TRAINING',
  'BWRA_REVIEW',
  'ARIP_DEADLINE',
  'CUSTOM',
] as const;

const recurrences = ['daily', 'weekly', 'monthly', 'quarterly', 'annual'] as const;

export const createCalendarEventSchema = z.object({
  eventType: z.enum(eventTypes).default('CUSTOM'),
  title: z.string().trim().min(3, 'Title is required').max(200),
  description: z.string().trim().max(2000).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  recurrence: z.enum(recurrences).optional(),
});

export const updateCalendarEventSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  isComplete: z.boolean().optional(),
});

export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>;
