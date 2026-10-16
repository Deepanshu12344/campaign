import { z } from 'zod';

export const CATEGORIES = [
  'Environment',
  'Health',
  'Science',
  'Education',
  'Public Policy',
  'Economic Policy',
  'Community',
  'Arts & Culture',
  'Business',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CategorySchema = z.enum(CATEGORIES);
