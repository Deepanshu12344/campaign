import { z } from 'zod';
import { CategorySchema } from '../constants/categories';
import { CreatorTypeSchema, StoryBlockSchema } from './campaign';

export const AiDraftBasicsInputSchema = z.object({
  topic: z.string().max(500).optional(),
  currentTitle: z.string().max(100).optional(),
  currentSummary: z.string().max(500).optional(),
  currentCategory: CategorySchema.optional(),
  currentCreatorName: z.string().max(100).optional(),
  currentCreatorType: CreatorTypeSchema.optional(),
  notes: z.string().max(500).optional(),
});

export type AiDraftBasicsInput = z.infer<typeof AiDraftBasicsInputSchema>;

export const AiDraftBasicsResponseSchema = z.object({
  title: z.string().min(1).max(60),
  summary: z.string().min(1).max(160),
  category: CategorySchema,
  creatorDescription: z.string().min(1).max(80),
  demo: z.boolean(),
});

export type AiDraftBasicsResponse = z.infer<typeof AiDraftBasicsResponseSchema>;

// Story AI Assistant Schemas
export const AiDraftStoryModeSchema = z.enum(['full_story', 'improve_paragraph']);
export type AiDraftStoryMode = z.infer<typeof AiDraftStoryModeSchema>;

export const AiDraftStoryInputSchema = z.object({
  mode: AiDraftStoryModeSchema.default('full_story'),
  title: z.string().max(100).optional(),
  summary: z.string().max(500).optional(),
  category: CategorySchema.optional(),
  creatorName: z.string().max(100).optional(),
  creatorType: CreatorTypeSchema.optional(),
  paragraphText: z.string().max(3000).optional(),
  guidance: z.string().max(500).optional(),
});

export type AiDraftStoryInput = z.infer<typeof AiDraftStoryInputSchema>;

export const AiDraftStoryResponseSchema = z.object({
  mode: AiDraftStoryModeSchema,
  headline: z.string().max(60).optional(),
  intro: z.string().max(160).optional(),
  blocks: z.array(StoryBlockSchema).optional(),
  suggestedActions: z.array(z.string().max(100)).max(5).optional(),
  suggestedSourceTypes: z.array(z.string()).optional(),
  improvedParagraph: z.string().optional(),
  demo: z.boolean(),
});

export type AiDraftStoryResponse = z.infer<typeof AiDraftStoryResponseSchema>;

// Ad Copy AI Assistant Schemas
export const AiAdCopyInputSchema = z.object({
  title: z.string().max(100).optional(),
  summary: z.string().max(500).optional(),
  category: CategorySchema.optional(),
  storySummary: z.string().max(2000).optional(),
  currentHeadline: z.string().max(100).optional(),
  currentDescription: z.string().max(200).optional(),
  currentCta: z.string().max(50).optional(),
  hasImages: z.boolean().optional(),
  imageCount: z.number().int().min(0).max(10).optional(),
  includeFeedback: z.boolean().default(false),
});

export type AiAdCopyInput = z.infer<typeof AiAdCopyInputSchema>;

export const AiAdCopyResponseSchema = z.object({
  headlines: z.array(z.string().min(1).max(40)).length(3),
  descriptions: z.array(z.string().min(1).max(90)).length(3),
  suggestedCta: z.enum(['Learn more', 'Read the story', 'Watch now', 'Sign up', 'Get involved']),
  creativeFeedback: z.array(z.string()).optional(),
  demo: z.boolean(),
});

export type AiAdCopyResponse = z.infer<typeof AiAdCopyResponseSchema>;
