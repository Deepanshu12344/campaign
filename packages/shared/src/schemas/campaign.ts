import { z } from 'zod';
import { CategorySchema } from '../constants/categories';
import { CampaignStatusSchema } from '../lifecycle';

export const CREATOR_TYPES = [
  'individual',
  'creator',
  'nonprofit',
  'business',
  'community',
] as const;

export type CreatorType = (typeof CREATOR_TYPES)[number];
export const CreatorTypeSchema = z.enum(CREATOR_TYPES);

// Story Blocks
export const HeadingBlockSchema = z.object({
  type: z.literal('heading'),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  text: z.string().min(1),
});

export const ParagraphBlockSchema = z.object({
  type: z.literal('paragraph'),
  text: z.string().min(1),
});

export const ImageBlockSchema = z.object({
  type: z.literal('image'),
  url: z.string().url(),
  caption: z.string().optional(),
  credit: z.string().optional(),
});

export const StatBlockSchema = z.object({
  type: z.literal('stat'),
  value: z.string().min(1),
  label: z.string().min(1),
  source: z.string().optional(),
});

export const QuoteBlockSchema = z.object({
  type: z.literal('quote'),
  text: z.string().min(1),
  attribution: z.string().optional(),
});

export const ActionsBlockSchema = z.object({
  type: z.literal('actions'),
  items: z.array(z.string().min(1)).min(1).max(5),
});

export const StoryBlockSchema = z.discriminatedUnion('type', [
  HeadingBlockSchema,
  ParagraphBlockSchema,
  ImageBlockSchema,
  StatBlockSchema,
  QuoteBlockSchema,
  ActionsBlockSchema,
]);

export type StoryBlock = z.infer<typeof StoryBlockSchema>;

// Source Schema
export const SourceSchema = z.object({
  title: z.string().min(1, 'Source title is required'),
  url: z.string().url('Source must have a valid URL'),
  publisher: z.string().optional(),
  note: z.string().optional(),
  isDemo: z.boolean().optional(),
});

export type Source = z.infer<typeof SourceSchema>;

// Ad Creative Schema
export const AdCreativeSchema = z.object({
  images: z.array(z.string().url()).min(0),
  headline: z.string().max(40, 'Ad headline cannot exceed 40 characters'),
  description: z.string().max(90, 'Ad description cannot exceed 90 characters'),
  cta: z.string().min(1, 'CTA text is required'),
  videoUrl: z.string().url().optional(),
});

export type AdCreative = z.infer<typeof AdCreativeSchema>;

// Reach Settings Schema
export const ReachSettingsSchema = z.object({
  locations: z.array(z.string()).min(1, 'Select at least one location'),
  interests: z.array(z.string()).default([]),
  channels: z.array(z.string()).min(1, 'Select at least one channel'),
  budgetAllocation: z.record(z.string(), z.number()).default({}),
  durationDays: z.number().int().min(1).max(90).default(30),
});

export type ReachSettings = z.infer<typeof ReachSettingsSchema>;

// Full Campaign Schema
export const CampaignSchema = z.object({
  id: z.string().uuid(),
  creatorId: z.string(),
  status: CampaignStatusSchema,
  title: z.string().min(1).max(60),
  category: CategorySchema,
  creatorName: z.string().min(1),
  creatorType: CreatorTypeSchema,
  summary: z.string().max(160),
  coverUrl: z.string().url().optional().nullable(),
  story: z.array(StoryBlockSchema).default([]),
  sources: z.array(SourceSchema).default([]),
  adCreative: AdCreativeSchema.optional().nullable(),
  reach: ReachSettingsSchema.optional().nullable(),
  fundingGoalCents: z.number().int().min(50000).max(5000000), // $500 to $50,000
  raisedCents: z.number().int().default(0),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
  submittedAt: z.coerce.date().optional().nullable(),
  publishedAt: z.coerce.date().optional().nullable(),
  reviewNotes: z.string().optional().nullable(),
  version: z.number().int().default(1),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Campaign = z.infer<typeof CampaignSchema>;

// Card DTO for Feed & Explore
export const CampaignCardDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  category: CategorySchema,
  creatorName: z.string(),
  creatorType: CreatorTypeSchema,
  summary: z.string(),
  coverUrl: z.string().nullable(),
  status: CampaignStatusSchema,
  fundingGoalCents: z.number().int(),
  raisedCents: z.number().int(),
  percentFunded: z.number().min(0),
  daysRemaining: z.number().int().nullable(),
  estimatedReachLow: z.number().int(),
  estimatedReachHigh: z.number().int(),
  isDemo: z.boolean().default(true),
});

export type CampaignCardDto = z.infer<typeof CampaignCardDtoSchema>;
