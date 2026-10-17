import { z } from 'zod';

export const CONTACT_TOPICS = [
  'general',
  'backing',
  'creating',
  'verification',
  'technical',
  'refund',
  'other',
] as const;

export const ContactTopicSchema = z.enum(CONTACT_TOPICS);
export type ContactTopic = z.infer<typeof ContactTopicSchema>;

export const ContactInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().trim().email('Please enter a valid email address'),
  topic: ContactTopicSchema,
  message: z
    .string()
    .trim()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message cannot exceed 2000 characters'),
});

export type ContactInput = z.infer<typeof ContactInputSchema>;

export const ContactResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  ticketId: z.string(),
});

export type ContactResponse = z.infer<typeof ContactResponseSchema>;
