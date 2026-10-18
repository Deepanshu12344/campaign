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
export const CreatorTypeSchema = z.preprocess((val) => {
  if (typeof val !== 'string') return val;
  const match = CREATOR_TYPES.find((ct) => ct.toLowerCase() === val.toLowerCase());
  return match || val;
}, z.enum(CREATOR_TYPES));

// Story Blocks
export const HeadingBlockSchema = z.object({
  id: z.string().optional(),
  type: z.literal('heading'),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  text: z.string().min(1).max(100),
});

export const ParagraphBlockSchema = z.object({
  id: z.string().optional(),
  type: z.literal('paragraph'),
  text: z.string().min(1),
});

export const ImageBlockSchema = z.object({
  id: z.string().optional(),
  type: z.literal('image'),
  url: z.string().url(),
  caption: z.string().optional(),
  credit: z.string().optional(),
});

export const StatBlockSchema = z.object({
  id: z.string().optional(),
  type: z.literal('stat'),
  value: z.string().min(1),
  label: z.string().min(1),
  source: z.string().optional(),
});

export const QuoteBlockSchema = z.object({
  id: z.string().optional(),
  type: z.literal('quote'),
  text: z.string().min(1),
  attribution: z.string().optional(),
});

export const ActionsBlockSchema = z.object({
  id: z.string().optional(),
  type: z.literal('actions'),
  items: z.array(z.string().min(1)).min(1).max(5),
});

export const STORY_BLOCK_TYPES = [
  'heading',
  'paragraph',
  'image',
  'stat',
  'quote',
  'actions',
] as const;

export type StoryBlockType = (typeof STORY_BLOCK_TYPES)[number];

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

// CTA Presets for Ad Creatives
export const CTA_PRESETS = [
  'Learn more',
  'Read the story',
  'Watch now',
  'Sign up',
  'Get involved',
] as const;

export type CtaPreset = (typeof CTA_PRESETS)[number];

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
  fundingWindowDays: z.number().int().min(7).max(60).default(30).optional(),
  ageRange: z.string().default('18-65+').optional(),
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

export const CAMPAIGN_SORTS = [
  'trending',
  'newest',
  'most_funded',
  'ending_soon',
  'closest_to_goal',
] as const;

export type CampaignSort = (typeof CAMPAIGN_SORTS)[number];
export const CampaignSortSchema = z.enum(CAMPAIGN_SORTS);

export const PROGRESS_RANGES = ['under_25', '25_75', 'over_75'] as const;
export type ProgressRange = (typeof PROGRESS_RANGES)[number];
export const ProgressRangeSchema = z.enum(PROGRESS_RANGES);

export const GOAL_RANGES = ['under_1000', '1000_5000', 'over_5000'] as const;
export type GoalRange = (typeof GOAL_RANGES)[number];
export const GoalRangeSchema = z.enum(GOAL_RANGES);

export const CampaignQuerySchema = z.object({
  search: z.string().optional(),
  category: CategorySchema.optional(),
  status: CampaignStatusSchema.optional(),
  sort: CampaignSortSchema.default('trending'),
  minGoal: z.coerce.number().int().nonnegative().optional(),
  maxGoal: z.coerce.number().int().positive().optional(),
  creatorType: CreatorTypeSchema.optional(),
  progressRange: ProgressRangeSchema.optional(),
  goalRange: GoalRangeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  cursor: z.string().optional(),
});

export type CampaignQuery = z.infer<typeof CampaignQuerySchema>;

export const CampaignListResponseSchema = z.object({
  items: z.array(CampaignCardDtoSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
  hasNextPage: z.boolean(),
  categoryCounts: z.record(z.string(), z.number()),
});

export type CampaignListResponse = z.infer<typeof CampaignListResponseSchema>;

// Detailed DTO
export const CampaignDetailDtoSchema = z.object({
  id: z.string().uuid(),
  creatorId: z.string(),
  status: CampaignStatusSchema,
  title: z.string(),
  category: CategorySchema,
  creatorName: z.string(),
  creatorType: CreatorTypeSchema,
  summary: z.string(),
  coverUrl: z.string().nullable(),
  story: z.array(StoryBlockSchema),
  sources: z.array(SourceSchema),
  adCreative: AdCreativeSchema.nullable(),
  reach: ReachSettingsSchema.nullable(),
  fundingGoalCents: z.number().int(),
  raisedCents: z.number().int(),
  percentFunded: z.number().min(0),
  daysRemaining: z.number().int().nullable(),
  estimatedReachLow: z.number().int(),
  estimatedReachHigh: z.number().int(),
  startsAt: z.coerce.date().nullable(),
  endsAt: z.coerce.date().nullable(),
  submittedAt: z.coerce.date().nullable(),
  publishedAt: z.coerce.date().nullable(),
  reviewSummary: z.object({
    reviewNotes: z.string().nullable().optional(),
    status: CampaignStatusSchema,
    statement: z.string(),
  }),
  useOfFundsSummary: z.object({
    platformFeePct: z.number(),
    adBudgetPct: z.number(),
    platformFeeCents: z.number(),
    adBudgetCents: z.number(),
    statement: z.string(),
  }),
  updates: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      body: z.string(),
      createdAt: z.coerce.date(),
    })
  ),
  feedbackSummary: z.object({
    totalCount: z.number().int(),
    visualsEncouraged: z.object({
      NO: z.number().int(),
      SOMEWHAT: z.number().int(),
      YES: z.number().int(),
    }),
    messageChanged: z.object({
      NO: z.number().int(),
      SOMEWHAT: z.number().int(),
      YES: z.number().int(),
    }),
  }),
  backersSummary: z.object({
    totalCount: z.number().int(),
    recentPublicBackers: z.array(
      z.object({
        publicName: z.string(),
        amountCents: z.number().int(),
        createdAt: z.coerce.date(),
      })
    ),
  }),
  isSaved: z.boolean().default(false),
  isFollowing: z.boolean().default(false),
  isDemo: z.boolean().default(true),
  reviewDecisions: z
    .array(
      z.object({
        id: z.string(),
        decision: z.string(),
        notes: z.string(),
        requestedChanges: z.array(z.string()).optional(),
        createdAt: z.coerce.date(),
      })
    )
    .optional()
    .default([]),
  pendingRevision: z.record(z.unknown()).nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CampaignDetailDto = z.infer<typeof CampaignDetailDtoSchema>;

// Feedback Input Schema
export const FeedbackInputSchema = z.object({
  visualsEncouraged: z.enum(['NO', 'SOMEWHAT', 'YES']),
  messageChanged: z.enum(['NO', 'SOMEWHAT', 'YES']),
});

export type FeedbackInput = z.infer<typeof FeedbackInputSchema>;

// Quote Input Schema
export const QuoteInputSchema = z.object({
  amountCents: z.number().int().min(100, 'Minimum contribution is $1.00 (100 cents)'),
});

export type QuoteInput = z.infer<typeof QuoteInputSchema>;

// Partial Draft Autosave Schema
export const DraftUpdateSchema = z.object({
  title: z.string().max(60, 'Title cannot exceed 60 characters').optional(),
  category: CategorySchema.optional(),
  creatorName: z.string().max(80).optional(),
  creatorType: CreatorTypeSchema.optional(),
  summary: z.string().max(160, 'Summary cannot exceed 160 characters').optional(),
  coverUrl: z.string().url().nullable().optional().or(z.literal('')),
  story: z.array(z.any()).optional(),
  sources: z.array(z.any()).optional(),
  adCreative: z
    .object({
      images: z.array(z.string()).optional(),
      headline: z.string().max(40, 'Ad headline cannot exceed 40 characters').optional(),
      description: z.string().max(90, 'Ad description cannot exceed 90 characters').optional(),
      cta: z.string().optional(),
      videoUrl: z.string().url().nullable().optional().or(z.literal('')),
    })
    .partial()
    .nullable()
    .optional(),
  reach: z
    .object({
      locations: z.array(z.string()).optional(),
      interests: z.array(z.string()).optional(),
      channels: z.array(z.string()).optional(),
      budgetAllocation: z.record(z.string(), z.number()).optional(),
      durationDays: z.number().int().min(1).max(90).optional(),
      fundingWindowDays: z.number().int().min(7).max(60).optional(),
      ageRange: z.string().optional(),
    })
    .partial()
    .nullable()
    .optional(),
  fundingGoalCents: z
    .number()
    .int()
    .min(50000, 'Minimum funding goal is $500 (50,000 cents)')
    .max(5000000, 'Maximum funding goal is $50,000 (5,000,000 cents)')
    .optional(),
  status: z.any().optional(),
  raisedCents: z.any().optional(),
});

export type DraftUpdateInput = z.infer<typeof DraftUpdateSchema>;

// Submit Campaign Input Schema
export const SubmitCampaignInputSchema = z.object({
  acceptedRules: z.boolean().refine((val) => val === true, {
    message: 'You must accept the platform rules to submit your campaign',
  }),
});

export type SubmitCampaignInput = z.infer<typeof SubmitCampaignInputSchema>;

// Creator Update Input Schema
export const CampaignUpdateInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title cannot exceed 100 characters'),
  body: z.string().min(1, 'Update body is required').max(5000, 'Body cannot exceed 5000 characters'),
});

export type CampaignUpdateInput = z.infer<typeof CampaignUpdateInputSchema>;

// Analytics DTO Schema
export const CampaignAnalyticsDtoSchema = z.object({
  campaignId: z.string().uuid(),
  fundingGoalCents: z.number().int(),
  raisedCents: z.number().int(),
  percentFunded: z.number(),
  contributionCount: z.number().int(),
  adBudgetAllocatedCents: z.number().int(),
  adBudgetSpentCents: z.number().int(),
  estimatedReachLow: z.number().int(),
  estimatedReachHigh: z.number().int(),
  measuredReach: z.number().int().nullable(),
  impressions: z.number().int(),
  clicks: z.number().int(),
  durationDays: z.number().int(),
  daysRemaining: z.number().int().nullable(),
});

export type CampaignAnalyticsDto = z.infer<typeof CampaignAnalyticsDtoSchema>;

export interface SubmissionValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
}

/**
 * Validates all 5 creation steps for campaign submission.
 */
export function validateCampaignSubmission(
  campaign: Partial<Campaign> & { acceptedRules?: boolean }
): SubmissionValidationResult {
  const errors: Record<string, string[]> = {};

  const addError = (step: string, message: string) => {
    if (!errors[step]) {
      errors[step] = [];
    }
    errors[step].push(message);
  };

  // Step 1: Basics
  if (!campaign.title || campaign.title.trim().length === 0) {
    addError('step1', 'Title is required');
  } else if (campaign.title.length > 60) {
    addError('step1', 'Title cannot exceed 60 characters');
  }

  if (!campaign.category) {
    addError('step1', 'Category is required');
  } else {
    const catResult = CategorySchema.safeParse(campaign.category);
    if (!catResult.success) {
      addError('step1', 'A valid category must be selected');
    }
  }

  if (!campaign.creatorName || campaign.creatorName.trim().length === 0) {
    addError('step1', 'Creator name is required');
  }

  if (!campaign.creatorType) {
    addError('step1', 'Creator type is required');
  }

  if (!campaign.summary || campaign.summary.trim().length === 0) {
    addError('step1', 'Summary is required');
  } else if (campaign.summary.length > 160) {
    addError('step1', 'Summary cannot exceed 160 characters');
  }

  // Step 2: Story
  const story = Array.isArray(campaign.story) ? campaign.story : [];
  const hasHeading = story.some((block) => block && block.type === 'heading' && !!block.text?.trim());
  if (!hasHeading) {
    addError('step2', 'Story must contain at least one heading block');
  }

  // Calculate total story text characters
  let totalStoryChars = 0;
  for (const block of story) {
    if (!block || typeof block !== 'object') continue;
    const b = block as Record<string, unknown>;
    if (typeof b.text === 'string') totalStoryChars += b.text.trim().length;
    if (typeof b.label === 'string') totalStoryChars += b.label.trim().length;
    if (typeof b.value === 'string') totalStoryChars += b.value.trim().length;
    if (Array.isArray(b.items)) {
      totalStoryChars += b.items.reduce(
        (sum: number, item: unknown) => sum + (typeof item === 'string' ? item.trim().length : 0),
        0
      );
    }
  }
  if (totalStoryChars < 300) {
    addError('step2', `Story must contain at least 300 characters of written content (currently ${totalStoryChars})`);
  }

  const sources = Array.isArray(campaign.sources) ? campaign.sources : [];
  if (sources.length === 0) {
    addError('step2', 'At least one verified source is required');
  } else {
    const validSources = sources.filter((s) => s && s.title && s.url);
    if (validSources.length === 0) {
      addError('step2', 'Sources must include a title and valid URL');
    }
  }

  // Step 3: Visuals & Ad Creative
  if (!campaign.coverUrl || !campaign.coverUrl.trim().startsWith('http')) {
    addError('step3', 'A valid cover image URL is required');
  }

  const adCreative = campaign.adCreative;
  if (!adCreative) {
    addError('step3', 'Ad creative settings are required');
  } else {
    const images = Array.isArray(adCreative.images) ? adCreative.images : [];
    if (images.length === 0) {
      addError('step3', 'At least one ad creative image is required');
    }
    if (!adCreative.headline || adCreative.headline.trim().length === 0) {
      addError('step3', 'Ad headline is required');
    } else if (adCreative.headline.length > 40) {
      addError('step3', 'Ad headline cannot exceed 40 characters');
    }
    if (!adCreative.description || adCreative.description.trim().length === 0) {
      addError('step3', 'Ad description is required');
    } else if (adCreative.description.length > 90) {
      addError('step3', 'Ad description cannot exceed 90 characters');
    }
    if (!adCreative.cta || adCreative.cta.trim().length === 0) {
      addError('step3', 'Call-to-action (CTA) is required');
    }
  }

  // Step 4: Reach
  const reach = campaign.reach;
  if (!reach) {
    addError('step4', 'Reach settings are required');
  } else {
    const locations = Array.isArray(reach.locations) ? reach.locations : [];
    if (locations.length === 0) {
      addError('step4', 'Select at least one target location');
    }
    const channels = Array.isArray(reach.channels) ? reach.channels : [];
    if (channels.length === 0) {
      addError('step4', 'Select at least one advertising channel');
    } else {
      const hasAvailable = channels.some((c) => {
        const def = DISTRIBUTION_CHANNELS.find((dc) => dc.id === c);
        return !def || def.status === 'available';
      });
      if (!hasAvailable) {
        addError('step4', 'Select at least one available advertising channel');
      }
    }
    const allocation = reach.budgetAllocation || {};
    const allocationValues = Object.values(allocation);
    if (channels.length > 0) {
      if (allocationValues.length === 0) {
        addError('step4', 'Budget allocation across channels must total 100% (currently 0%)');
      } else {
        const sum = allocationValues.reduce((a, b) => Number(a) + Number(b), 0);
        if (Math.abs(sum - 100) > 0.5 && Math.abs(sum - 1.0) > 0.01) {
          addError('step4', `Budget allocation across channels must total 100% (currently ${sum}%)`);
        }
      }
    }
    const duration = reach.durationDays;
    if (typeof duration !== 'number' || duration < 1 || duration > 90) {
      addError('step4', 'Campaign duration must be between 1 and 90 days');
    }
  }

  // Step 5: Funding Goal & Acceptance
  const goal = campaign.fundingGoalCents;
  if (typeof goal !== 'number' || isNaN(goal)) {
    addError('step5', 'Funding goal is required');
  } else if (goal < 50000 || goal > 5000000) {
    addError('step5', 'Funding goal must be between $500 and $50,000');
  }

  if (campaign.acceptedRules !== true) {
    addError('step5', 'You must review and accept the platform rules before submitting');
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export type CreationStepKey = 'basics' | 'story' | 'visuals' | 'reach' | 'submit';
export type StepIdentifier = 1 | 2 | 3 | 4 | 5 | CreationStepKey;

export function normalizeStepKey(step: StepIdentifier): CreationStepKey {
  if (typeof step === 'number') {
    switch (step) {
      case 1:
        return 'basics';
      case 2:
        return 'story';
      case 3:
        return 'visuals';
      case 4:
        return 'reach';
      case 5:
        return 'submit';
      default:
        return 'basics';
    }
  }
  return step.toLowerCase() as CreationStepKey;
}

export function getStepErrors(
  draft: Partial<CampaignDetailDto> | Partial<DraftUpdateInput> | Record<string, unknown>,
  step: StepIdentifier
): string[] {
  const stepKey = normalizeStepKey(step);
  const errors: string[] = [];

  switch (stepKey) {
    case 'basics': {
      const title = typeof draft.title === 'string' ? draft.title.trim() : '';
      if (!title) {
        errors.push('Title is required');
      } else if (title.length > 60) {
        errors.push('Title cannot exceed 60 characters');
      }

      if (!draft.category) {
        errors.push('Category is required');
      } else {
        const catResult = CategorySchema.safeParse(draft.category);
        if (!catResult.success) {
          errors.push('A valid category must be selected');
        }
      }

      const creatorName = typeof draft.creatorName === 'string' ? draft.creatorName.trim() : '';
      if (!creatorName) {
        errors.push('Creator name is required');
      } else if (creatorName.length > 80) {
        errors.push('Creator name cannot exceed 80 characters');
      }

      const rawCreatorType =
        typeof draft.creatorType === 'string' ? draft.creatorType.trim() : draft.creatorType;
      if (!rawCreatorType) {
        errors.push('Creator type is required');
      } else {
        const typeResult = CreatorTypeSchema.safeParse(rawCreatorType);
        if (!typeResult.success) {
          errors.push('A valid creator type must be selected');
        }
      }

      const summary = typeof draft.summary === 'string' ? draft.summary.trim() : '';
      if (!summary) {
        errors.push('Summary is required');
      } else if (summary.length > 160) {
        errors.push('Summary cannot exceed 160 characters');
      }
      break;
    }

    case 'story': {
      const story = Array.isArray(draft.story) ? (draft.story as unknown[]) : [];
      const hasHeading = story.some(
        (block) =>
          block &&
          typeof block === 'object' &&
          (block as Record<string, unknown>).type === 'heading' &&
          Boolean(typeof (block as Record<string, unknown>).text === 'string' && ((block as Record<string, unknown>).text as string).trim())
      );
      if (!hasHeading) {
        errors.push('Story must contain at least one heading block');
      }

      for (const block of story) {
        if (!block || typeof block !== 'object') continue;
        const b = block as Record<string, unknown>;
        if (b.type === 'heading' && typeof b.text === 'string' && b.text.trim().length > 100) {
          errors.push('Section headings cannot exceed 100 characters');
          break;
        }
      }

      let totalStoryChars = 0;
      for (const block of story) {
        if (!block || typeof block !== 'object') continue;
        const b = block as Record<string, unknown>;
        if (typeof b.text === 'string') totalStoryChars += b.text.trim().length;
        if (typeof b.label === 'string') totalStoryChars += b.label.trim().length;
        if (typeof b.value === 'string') totalStoryChars += b.value.trim().length;
        if (Array.isArray(b.items)) {
          totalStoryChars += b.items.reduce(
            (sum: number, item: unknown) => sum + (typeof item === 'string' ? item.trim().length : 0),
            0
          );
        }
      }
      if (totalStoryChars < 300) {
        errors.push(`Story must contain at least 300 characters of written content (currently ${totalStoryChars})`);
      }

      const sources = Array.isArray(draft.sources) ? (draft.sources as unknown[]) : [];
      if (sources.length === 0) {
        errors.push('At least one verified source is required');
      } else {
        const validSources = sources.filter(
          (s) =>
            s &&
            typeof s === 'object' &&
            Boolean((s as Record<string, unknown>).title) &&
            Boolean((s as Record<string, unknown>).url)
        );
        if (validSources.length === 0) {
          errors.push('Sources must include a title and valid URL');
        }
      }
      break;
    }

    case 'visuals': {
      const coverUrl = typeof draft.coverUrl === 'string' ? draft.coverUrl.trim() : '';
      if (!coverUrl || !coverUrl.startsWith('http')) {
        errors.push('A valid cover image URL is required');
      }

      const adCreative = draft.adCreative as Record<string, unknown> | null | undefined;
      if (!adCreative) {
        errors.push('Ad creative settings are required');
      } else {
        const images = Array.isArray(adCreative.images) ? adCreative.images : [];
        if (images.length === 0) {
          errors.push('At least one ad creative image is required');
        }

        const headline = typeof adCreative.headline === 'string' ? adCreative.headline.trim() : '';
        if (!headline) {
          errors.push('Ad headline is required');
        } else if (headline.length > 40) {
          errors.push('Ad headline cannot exceed 40 characters');
        }

        const description = typeof adCreative.description === 'string' ? adCreative.description.trim() : '';
        if (!description) {
          errors.push('Ad description is required');
        } else if (description.length > 90) {
          errors.push('Ad description cannot exceed 90 characters');
        }

        const cta = typeof adCreative.cta === 'string' ? adCreative.cta.trim() : '';
        if (!cta) {
          errors.push('Call-to-action (CTA) is required');
        }
      }
      break;
    }

    case 'reach': {
      const reach = draft.reach as Record<string, unknown> | null | undefined;
      if (!reach) {
        errors.push('Reach settings are required');
      } else {
        const locations = Array.isArray(reach.locations) ? reach.locations : [];
        if (locations.length === 0) {
          errors.push('Select at least one target location');
        }

        const channels = Array.isArray(reach.channels) ? reach.channels : [];
        if (channels.length === 0) {
          errors.push('Select at least one advertising channel');
        } else {
          const hasAvailable = channels.some((c) => {
            const def = DISTRIBUTION_CHANNELS.find((dc) => dc.id === c);
            return !def || def.status === 'available';
          });
          if (!hasAvailable) {
            errors.push('Select at least one available advertising channel');
          }
        }

        const allocation = (reach.budgetAllocation as Record<string, number> | undefined) || {};
        const allocationValues = Object.values(allocation);
        if (channels.length > 0) {
          if (allocationValues.length === 0) {
            errors.push('Budget allocation across channels must total 100% (currently 0%)');
          } else {
            const sum = allocationValues.reduce((a, b) => Number(a) + Number(b), 0);
            if (Math.abs(sum - 100) > 0.5 && Math.abs(sum - 1.0) > 0.01) {
              errors.push(`Budget allocation across channels must total 100% (currently ${sum}%)`);
            }
          }
        }

        const duration = reach.durationDays;
        if (typeof duration !== 'number' || duration < 1 || duration > 90) {
          errors.push('Campaign duration must be between 1 and 90 days');
        }
      }
      break;
    }

    case 'submit': {
      const goal = draft.fundingGoalCents;
      if (typeof goal !== 'number' || isNaN(goal)) {
        errors.push('Funding goal is required');
      } else if (goal < 50000 || goal > 5000000) {
        errors.push('Funding goal must be between $500 and $50,000');
      }

      if ((draft as { acceptedRules?: boolean }).acceptedRules !== true) {
        errors.push('You must review and accept the platform rules before submitting');
      }
      break;
    }
  }

  return errors;
}

export function getAllStepErrors(
  draft: Partial<CampaignDetailDto> | Partial<DraftUpdateInput> | Record<string, unknown>
): Record<CreationStepKey, string[]> {
  return {
    basics: getStepErrors(draft, 'basics'),
    story: getStepErrors(draft, 'story'),
    visuals: getStepErrors(draft, 'visuals'),
    reach: getStepErrors(draft, 'reach'),
    submit: getStepErrors(draft, 'submit'),
  };
}

export function isStepComplete(
  draft: Partial<CampaignDetailDto> | Partial<DraftUpdateInput> | Record<string, unknown>,
  step: StepIdentifier
): boolean {
  return getStepErrors(draft, step).length === 0;
}

// Block Manipulation & Pure Story Functions

export function generateStoryBlockId(): string {
  return 'b_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
}

export function createStoryBlock(
  type: StoryBlockType,
  initial?: Partial<StoryBlock>
): StoryBlock {
  const id = initial?.id || generateStoryBlockId();

  switch (type) {
    case 'heading': {
      const headingInit = initial as { level?: 1 | 2 | 3; text?: string } | undefined;
      return {
        id,
        type: 'heading',
        level: headingInit?.level ?? 2,
        text: headingInit?.text ?? '',
      };
    }
    case 'paragraph': {
      const pInit = initial as { text?: string } | undefined;
      return {
        id,
        type: 'paragraph',
        text: pInit?.text ?? '',
      };
    }
    case 'image': {
      const imgInit = initial as { url?: string; caption?: string; credit?: string } | undefined;
      return {
        id,
        type: 'image',
        url: imgInit?.url ?? '',
        caption: imgInit?.caption,
        credit: imgInit?.credit,
      };
    }
    case 'stat': {
      const statInit = initial as { value?: string; label?: string; source?: string } | undefined;
      return {
        id,
        type: 'stat',
        value: statInit?.value ?? '',
        label: statInit?.label ?? '',
        source: statInit?.source,
      };
    }
    case 'quote': {
      const quoteInit = initial as { text?: string; attribution?: string } | undefined;
      return {
        id,
        type: 'quote',
        text: quoteInit?.text ?? '',
        attribution: quoteInit?.attribution,
      };
    }
    case 'actions': {
      const actInit = initial as { items?: string[] } | undefined;
      return {
        id,
        type: 'actions',
        items: actInit?.items && actInit.items.length > 0 ? actInit.items : [''],
      };
    }
  }
}

export function moveBlockUp<T>(blocks: T[], index: number): T[] {
  if (index <= 0 || index >= blocks.length) return [...blocks];
  const item = blocks[index];
  const prev = blocks[index - 1];
  if (item === undefined || prev === undefined) return [...blocks];
  const next = [...blocks];
  next[index] = prev;
  next[index - 1] = item;
  return next;
}

export function moveBlockDown<T>(blocks: T[], index: number): T[] {
  if (index < 0 || index >= blocks.length - 1) return [...blocks];
  const item = blocks[index];
  const nextItem = blocks[index + 1];
  if (item === undefined || nextItem === undefined) return [...blocks];
  const next = [...blocks];
  next[index] = nextItem;
  next[index + 1] = item;
  return next;
}

export function duplicateBlock(blocks: StoryBlock[], index: number): StoryBlock[] {
  if (index < 0 || index >= blocks.length) return [...blocks];
  const target = blocks[index];
  if (!target) return [...blocks];
  const clone = {
    ...target,
    id: generateStoryBlockId(),
  } as StoryBlock;
  const next = [...blocks];
  next.splice(index + 1, 0, clone);
  return next;
}

export function deleteBlock(
  blocks: StoryBlock[],
  index: number
): { blocks: StoryBlock[]; deletedBlock: StoryBlock; deletedIndex: number } {
  if (index < 0 || index >= blocks.length) {
    throw new Error('Index out of bounds for deleteBlock');
  }
  const deletedBlock = blocks[index];
  if (!deletedBlock) {
    throw new Error('Block not found at index');
  }
  const next = blocks.filter((_, i) => i !== index);
  return { blocks: next, deletedBlock, deletedIndex: index };
}

export function restoreBlock(
  blocks: StoryBlock[],
  block: StoryBlock,
  index: number
): StoryBlock[] {
  const next = [...blocks];
  const safeIndex = Math.max(0, Math.min(index, next.length));
  next.splice(safeIndex, 0, block);
  return next;
}

export function validateSourceUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export type MarkdownFormatType = 'bold' | 'italic' | 'link' | 'bullet';

export function applyMarkdownFormat(
  text: string,
  selection: { start: number; end: number },
  format: MarkdownFormatType,
  url?: string
): { text: string; selection: { start: number; end: number } } {
  const { start, end } = selection;
  const hasSelection = start !== end;
  const before = text.slice(0, start);
  const selected = text.slice(start, end);
  const after = text.slice(end);

  switch (format) {
    case 'bold': {
      if (hasSelection) {
        const replacement = `**${selected}**`;
        return {
          text: before + replacement + after,
          selection: { start: start + 2, end: start + 2 + selected.length },
        };
      }
      const placeholder = 'bold text';
      const replacement = `**${placeholder}**`;
      return {
        text: before + replacement + after,
        selection: { start: start + 2, end: start + 2 + placeholder.length },
      };
    }
    case 'italic': {
      if (hasSelection) {
        const replacement = `*${selected}*`;
        return {
          text: before + replacement + after,
          selection: { start: start + 1, end: start + 1 + selected.length },
        };
      }
      const placeholder = 'italic text';
      const replacement = `*${placeholder}*`;
      return {
        text: before + replacement + after,
        selection: { start: start + 1, end: start + 1 + placeholder.length },
      };
    }
    case 'link': {
      const linkUrl = url && url.trim() ? url.trim() : 'https://';
      if (hasSelection) {
        const replacement = `[${selected}](${linkUrl})`;
        return {
          text: before + replacement + after,
          selection: { start: start + 1, end: start + 1 + selected.length },
        };
      }
      const placeholder = 'link text';
      const replacement = `[${placeholder}](${linkUrl})`;
      return {
        text: before + replacement + after,
        selection: { start: start + 1, end: start + 1 + placeholder.length },
      };
    }
    case 'bullet': {
      if (hasSelection) {
        const lines = selected.split('\n');
        const bulleted = lines
          .map((line) => (line.startsWith('- ') ? line : `- ${line}`))
          .join('\n');
        return {
          text: before + bulleted + after,
          selection: { start, end: start + bulleted.length },
        };
      }
      const replacement = `- `;
      return {
        text: before + replacement + after,
        selection: { start: start + replacement.length, end: start + replacement.length },
      };
    }
  }
}

// Visuals & Creative Asset Validation Utilities

export interface ImageFileValidationInput {
  name?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
}

export interface ImageFileValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

export const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;
export const MIN_RECOMMENDED_IMAGE_DIMENSION = 1080;

/**
 * Validates image file type, size, and short-side resolution.
 */
export function validateImageFile(input: ImageFileValidationInput): ImageFileValidationResult {
  const { name, mimeType, sizeBytes, width, height } = input;

  // 1. Mime & Extension Check
  let isMimeValid = false;
  if (mimeType) {
    const normalizedMime = mimeType.toLowerCase();
    isMimeValid = (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(normalizedMime);
  }

  let isExtValid = false;
  if (name) {
    const ext = name.split('.').pop()?.toLowerCase();
    isExtValid = Boolean(ext && (ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(ext));
  }

  // If mime is provided but invalid, or no mime and ext is invalid
  if (mimeType && !isMimeValid) {
    return {
      isValid: false,
      error: 'Only JPEG, PNG, or WebP images are supported. Document or unsupported image formats cannot be used.',
    };
  }

  if (!mimeType && name && !isExtValid) {
    return {
      isValid: false,
      error: 'Only JPEG, PNG, or WebP images are supported. Document or unsupported image formats cannot be used.',
    };
  }

  // 2. Size Check
  if (typeof sizeBytes === 'number' && sizeBytes > MAX_IMAGE_FILE_SIZE_BYTES) {
    const mbSize = (sizeBytes / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `File size (${mbSize}MB) exceeds the 5MB limit. Please choose a smaller image.`,
    };
  }

  // 3. Resolution Check (Non-blocking warning)
  let warning: string | undefined;
  if (typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0) {
    const shortSide = Math.min(width, height);
    if (shortSide < MIN_RECOMMENDED_IMAGE_DIMENSION) {
      warning = `Image resolution (${width}×${height}px) is below 1080px on the short side. It will still work, but may look blurry in high-resolution placements.`;
    }
  }

  return {
    isValid: true,
    warning,
  };
}

/**
 * Pre-fills an ad headline from the campaign title (max 40 characters).
 */
export function deriveAdHeadlineFromTitle(title?: string): string {
  if (!title) return '';
  const trimmed = title.trim();
  if (trimmed.length <= 40) return trimmed;
  return trimmed.slice(0, 40).trim();
}

// -----------------------------------------------------------------------------
// STEP 4: REACH TARGETING, LOCATIONS, CHANNELS & BUDGET ALLOCATION
// -----------------------------------------------------------------------------

export interface CuratedLocation {
  id: string;
  name: string;
  type: 'global' | 'country' | 'region' | 'city';
  country?: string;
}

export const TARGET_LOCATIONS: readonly CuratedLocation[] = [
  { id: 'Worldwide', name: 'Worldwide', type: 'global' },
  // Countries
  { id: 'United States', name: 'United States', type: 'country' },
  { id: 'United Kingdom', name: 'United Kingdom', type: 'country' },
  { id: 'Canada', name: 'Canada', type: 'country' },
  { id: 'Australia', name: 'Australia', type: 'country' },
  { id: 'Germany', name: 'Germany', type: 'country' },
  { id: 'France', name: 'France', type: 'country' },
  { id: 'Japan', name: 'Japan', type: 'country' },
  { id: 'India', name: 'India', type: 'country' },
  { id: 'Brazil', name: 'Brazil', type: 'country' },
  // Regions
  { id: 'European Union', name: 'European Union', type: 'region' },
  { id: 'California, US', name: 'California, US', type: 'region', country: 'United States' },
  { id: 'Texas, US', name: 'Texas, US', type: 'region', country: 'United States' },
  { id: 'New York State, US', name: 'New York State, US', type: 'region', country: 'United States' },
  // Major Cities
  { id: 'New York City, NY', name: 'New York City, NY', type: 'city', country: 'United States' },
  { id: 'San Francisco Bay Area, CA', name: 'San Francisco Bay Area, CA', type: 'city', country: 'United States' },
  { id: 'Los Angeles, CA', name: 'Los Angeles, CA', type: 'city', country: 'United States' },
  { id: 'Austin, TX', name: 'Austin, TX', type: 'city', country: 'United States' },
  { id: 'Chicago, IL', name: 'Chicago, IL', type: 'city', country: 'United States' },
  { id: 'London, UK', name: 'London, UK', type: 'city', country: 'United Kingdom' },
  { id: 'Toronto, Canada', name: 'Toronto, Canada', type: 'city', country: 'Canada' },
  { id: 'Sydney, Australia', name: 'Sydney, Australia', type: 'city', country: 'Australia' },
  { id: 'Berlin, Germany', name: 'Berlin, Germany', type: 'city', country: 'Germany' },
  { id: 'Paris, France', name: 'Paris, France', type: 'city', country: 'France' },
  { id: 'Tokyo, Japan', name: 'Tokyo, Japan', type: 'city', country: 'Japan' },
] as const;

export const TARGET_LOCATION_IDS = TARGET_LOCATIONS.map((l) => l.id);
export type TargetLocationId = (typeof TARGET_LOCATION_IDS)[number];

/**
 * Toggles a target location with Worldwide clearing behavior:
 * - If 'Worldwide' is chosen: clears all other locations and returns ['Worldwide'].
 * - If 'Worldwide' was already active and clicked again: deselects it, returning [].
 * - If a specific location is chosen when 'Worldwide' is active: clears 'Worldwide' and adds the specific location.
 * - Otherwise toggles the location normally.
 */
export function toggleTargetLocation(currentLocations: string[], locationId: string): string[] {
  if (locationId === 'Worldwide') {
    if (currentLocations.includes('Worldwide')) {
      return [];
    }
    return ['Worldwide'];
  }

  const withoutWorldwide = currentLocations.filter((l) => l !== 'Worldwide');
  if (withoutWorldwide.includes(locationId)) {
    return withoutWorldwide.filter((l) => l !== locationId);
  }
  return [...withoutWorldwide, locationId];
}

export interface InterestTheme {
  theme: string;
  interests: string[];
}

export const AUDIENCE_INTEREST_THEMES: readonly InterestTheme[] = [
  {
    theme: 'Civic life',
    interests: [
      'Democracy & Voting',
      'Civil Rights',
      'Climate & Environment',
      'Local Community',
      'Public Transit',
    ],
  },
  {
    theme: 'Health & wellbeing',
    interests: [
      'Mental Health',
      'Public Health',
      'Nutrition & Food Access',
      'Healthcare Reform',
      'Preventative Care',
    ],
  },
  {
    theme: 'Science & tech',
    interests: [
      'Clean Energy',
      'AI & Future of Work',
      'Space & Astronomy',
      'Digital Privacy',
      'Biotechnology',
    ],
  },
  {
    theme: 'Money & work',
    interests: [
      'Small Business',
      'Labor & Workers Rights',
      'Economic Mobility',
      'Consumer Protection',
      'Financial Literacy',
    ],
  },
  {
    theme: 'Culture',
    interests: [
      'Independent Arts',
      'Local Journalism',
      'Public Media',
      'Music & Performance',
      'Education Equity',
    ],
  },
] as const;

export const ALL_AUDIENCE_INTERESTS = AUDIENCE_INTEREST_THEMES.flatMap((t) => t.interests);

export const AGE_RANGE_PRESETS = [
  '18-65+',
  '18-34',
  '25-54',
  '35-64',
  '55+',
] as const;

export interface ChannelDefinition {
  id: string;
  name: string;
  description: string;
  status: 'available' | 'coming_soon';
  disabledReason?: string;
  iconName: string;
}

export const DISTRIBUTION_CHANNELS: readonly ChannelDefinition[] = [
  {
    id: 'Social feeds',
    name: 'Social feeds',
    description: 'High-engagement in-feed native cards across Instagram, Facebook, and Threads.',
    status: 'available',
    iconName: 'Share2',
  },
  {
    id: 'Search',
    name: 'Search',
    description: 'Intent-driven placements matched to relevant topic searches.',
    status: 'available',
    iconName: 'Search',
  },
  {
    id: 'Display network',
    name: 'Display network',
    description: 'Visual banners across independent media and news publisher sites.',
    status: 'available',
    iconName: 'Layout',
  },
  {
    id: 'Video',
    name: 'Video',
    description: 'Short-form native video pre-rolls and interstitial clips.',
    status: 'coming_soon',
    disabledReason: 'Video transcoding and multi-platform review workflows are currently in private preview.',
    iconName: 'Film',
  },
] as const;

export const AVAILABLE_CHANNELS = DISTRIBUTION_CHANNELS.filter(
  (c) => c.status === 'available'
).map((c) => c.id);

/**
 * Auto-rebalances budget allocation across selected channels so that the percentages
 * are integers that always sum to exactly 100%.
 */
export function rebalanceBudgetAllocation(
  selectedChannels: string[],
  currentAllocation?: Record<string, number>
): Record<string, number> {
  if (selectedChannels.length === 0) {
    return {};
  }

  if (selectedChannels.length === 1) {
    const single = selectedChannels[0];
    return single ? { [single]: 100 } : {};
  }

  const existingFiltered: Record<string, number> = {};
  let existingSum = 0;
  if (currentAllocation) {
    for (const ch of selectedChannels) {
      if (typeof currentAllocation[ch] === 'number' && (currentAllocation[ch] as number) > 0) {
        existingFiltered[ch] = currentAllocation[ch] as number;
        existingSum += currentAllocation[ch] as number;
      }
    }
  }

  const allChannelsHaveWeights =
    Object.keys(existingFiltered).length === selectedChannels.length && existingSum > 0;

  // If all channels already had weights, rescale proportionally to 100
  if (allChannelsHaveWeights) {
    let allocated = 0;
    const result: Record<string, number> = {};
    selectedChannels.forEach((ch, idx) => {
      if (idx === selectedChannels.length - 1) {
        result[ch] = Math.max(0, 100 - allocated);
      } else {
        const weight = existingFiltered[ch] ?? 0;
        const share = Math.round((weight / existingSum) * 100);
        result[ch] = share;
        allocated += share;
      }
    });
    return result;
  }

  // Equal integer distribution
  const n = selectedChannels.length;
  const base = Math.floor(100 / n);
  const remainder = 100 - base * n;
  const result: Record<string, number> = {};

  selectedChannels.forEach((ch, idx) => {
    result[ch] = base + (idx < remainder ? 1 : 0);
  });

  return result;
}

/**
 * Adjusts a single channel's allocation (via stepper or slider) while distributing
 * the difference across the other selected channels so that the total is always strictly 100%.
 */
export function adjustChannelAllocation(
  targetChannel: string,
  newPercent: number,
  currentAllocation: Record<string, number>,
  selectedChannels: string[]
): Record<string, number> {
  if (!selectedChannels.includes(targetChannel)) {
    return currentAllocation;
  }

  if (selectedChannels.length <= 1) {
    return { [targetChannel]: 100 };
  }

  const clampedTarget = Math.max(0, Math.min(100, Math.round(newPercent)));
  const remainingPercent = 100 - clampedTarget;
  const otherChannels = selectedChannels.filter((c) => c !== targetChannel);

  const result: Record<string, number> = { [targetChannel]: clampedTarget };

  if (otherChannels.length === 1) {
    const onlyOther = otherChannels[0];
    if (onlyOther) {
      result[onlyOther] = remainingPercent;
    }
    return result;
  }

  let otherSum = 0;
  for (const ch of otherChannels) {
    otherSum += Math.max(0, currentAllocation[ch] || 0);
  }

  if (otherSum === 0) {
    const base = Math.floor(remainingPercent / otherChannels.length);
    const rem = remainingPercent - base * otherChannels.length;
    otherChannels.forEach((ch, idx) => {
      result[ch] = base + (idx < rem ? 1 : 0);
    });
    return result;
  }

  let allocated = 0;
  otherChannels.forEach((ch, idx) => {
    if (idx === otherChannels.length - 1) {
      result[ch] = Math.max(0, remainingPercent - allocated);
    } else {
      const share = Math.round(((currentAllocation[ch] || 0) / otherSum) * remainingPercent);
      result[ch] = share;
      allocated += share;
    }
  });

  return result;
}

/**
 * Validates budget allocation across selected channels.
 */
export function validateBudgetAllocation(
  allocation: Record<string, number>,
  selectedChannels: string[]
): { isValid: boolean; sum: number; error?: string } {
  if (selectedChannels.length === 0) {
    return { isValid: false, sum: 0, error: 'Select at least one advertising channel' };
  }

  let sum = 0;
  for (const ch of selectedChannels) {
    const val = allocation[ch];
    if (typeof val !== 'number' || isNaN(val) || val < 0) {
      return { isValid: false, sum, error: `Invalid budget allocation for ${ch}` };
    }
    sum += val;
  }

  if (Math.abs(sum - 100) > 0.5) {
    return {
      isValid: false,
      sum,
      error: `Budget allocation across channels must total 100% (currently ${sum}%)`,
    };
  }

  return { isValid: true, sum: 100 };
}

/**
 * Validates campaign duration days (1 to 90 days).
 */
export function validateDurationDays(days: number): { isValid: boolean; error?: string } {
  if (typeof days !== 'number' || isNaN(days) || !Number.isInteger(days)) {
    return { isValid: false, error: 'Campaign duration must be a whole number of days' };
  }
  if (days < 1 || days > 90) {
    return { isValid: false, error: 'Campaign duration must be between 1 and 90 days' };
  }
  return { isValid: true };
}

/**
 * Formats a plain-language summary of the audience reach settings.
 * Example: "This campaign is intended to reach 18 to 65+ people interested in Climate & Environment in Austin, TX, mainly through Social feeds and Search."
 */
export function formatAudienceSummary(reach: Partial<ReachSettings>): string {
  const age = reach.ageRange ? reach.ageRange.replace('-', ' to ') : '18 to 65+';
  const interests =
    reach.interests && reach.interests.length > 0
      ? reach.interests.slice(0, 3).join(', ') + (reach.interests.length > 3 ? `, and ${reach.interests.length - 3} more` : '')
      : 'civic and community topics';

  const locations =
    reach.locations && reach.locations.length > 0
      ? reach.locations.includes('Worldwide')
        ? 'Worldwide'
        : reach.locations.slice(0, 3).join(', ') + (reach.locations.length > 3 ? ` (+${reach.locations.length - 3} more)` : '')
      : 'targeted geographic regions';

  const channels =
    reach.channels && reach.channels.length > 0
      ? reach.channels.length === 1
        ? reach.channels[0]
        : reach.channels.slice(0, -1).join(', ') + ' and ' + reach.channels[reach.channels.length - 1]
      : 'selected digital channels';

  return `This campaign is intended to reach ${age} people interested in ${interests} in ${locations}, mainly through ${channels}.`;
}

