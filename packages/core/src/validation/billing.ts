import { z } from 'zod';

export const flagshipEnquirySchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(100),
  email: z.string().trim().email('Enter a valid email address'),
  company: z.string().trim().min(2, 'Company name is required').max(200),
  phone: z.string().trim().max(30).optional(),
  message: z
    .string()
    .trim()
    .min(10, 'Tell us a little about your needs (at least 10 characters)')
    .max(2000),
  source: z.enum(['billing', 'pricing']).optional(),
});

export type FlagshipEnquiryInput = z.infer<typeof flagshipEnquirySchema>;
