import { z } from 'zod';

const specialistTopicSchema = z.enum([
  'enforcement_response',
  'arip',
  'aml',
  'cbn_payments',
  'corporate',
  'general',
]);

const specialistContextSchema = z
  .object({
    conversationId: z.string().uuid().optional(),
    documentId: z.string().uuid().optional(),
    orgName: z.string().trim().max(200).optional(),
    productTypes: z.array(z.string().trim().max(50)).max(10).optional(),
    lastUserMessage: z.string().trim().max(500).optional(),
    urgencyLevel: z.string().trim().max(20).optional(),
    regulatorCode: z.string().trim().max(50).optional(),
    documentFilename: z.string().trim().max(255).optional(),
  })
  .optional();

export const specialistRequestSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(100),
  email: z.string().trim().email('Enter a valid email address'),
  company: z.string().trim().min(2, 'Company name is required').max(200),
  phone: z.string().trim().max(30).optional(),
  topic: specialistTopicSchema,
  urgency: z.enum(['critical', 'standard']),
  message: z
    .string()
    .trim()
    .min(20, 'Describe your situation in at least 20 characters')
    .max(3000),
  preferredSpecialistId: z.string().trim().max(64).optional(),
  source: z.enum(['directory', 'chat', 'document_analyser', 'dashboard']).optional(),
  context: specialistContextSchema,
});

export type SpecialistRequestInput = z.infer<typeof specialistRequestSchema>;
