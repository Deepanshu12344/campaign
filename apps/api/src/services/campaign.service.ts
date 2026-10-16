import { Prisma, Category as PrismaCategory } from '@prisma/client';
import { prisma } from '../utils/prisma';
import {
  CampaignCardDto,
  CampaignDetailDto,
  CampaignListResponse,
  CampaignQuery,
  Category,
  CATEGORIES,
  CampaignStatus,
  CreatorType,
  ESTIMATE_CONFIG,
  FeedbackInput,
  quote,
  QuoteResult,
  reachAtGoal,
  StoryBlock,
  Source,
  AdCreative,
  ReachSettings,
} from '@campaigns/shared';
import {
  NotFoundError,
  CampaignNotFundingError,
} from '../utils/errors';
import { AuthUser } from '../middlewares/auth.middleware';

export const PUBLIC_STATUSES: CampaignStatus[] = [
  'FUNDING',
  'PROMOTING',
  'COMPLETED',
  'FUNDING_CLOSED',
  'DISTRIBUTION_PREP',
];

const CATEGORY_TO_PRISMA: Record<string, string> = {
  Environment: 'ENVIRONMENT',
  Health: 'HEALTH',
  Science: 'SCIENCE',
  Education: 'EDUCATION',
  'Public Policy': 'PUBLIC_POLICY',
  'Economic Policy': 'ECONOMIC_POLICY',
  Community: 'COMMUNITY',
  'Arts & Culture': 'ARTS_AND_CULTURE',
  Business: 'BUSINESS',
  Other: 'OTHER',
  ENVIRONMENT: 'ENVIRONMENT',
  HEALTH: 'HEALTH',
  SCIENCE: 'SCIENCE',
  EDUCATION: 'EDUCATION',
  PUBLIC_POLICY: 'PUBLIC_POLICY',
  ECONOMIC_POLICY: 'ECONOMIC_POLICY',
  COMMUNITY: 'COMMUNITY',
  ARTS_AND_CULTURE: 'ARTS_AND_CULTURE',
  BUSINESS: 'BUSINESS',
  OTHER: 'OTHER',
};

const PRISMA_TO_CATEGORY: Record<string, Category> = {
  ENVIRONMENT: 'Environment',
  HEALTH: 'Health',
  SCIENCE: 'Science',
  EDUCATION: 'Education',
  PUBLIC_POLICY: 'Public Policy',
  ECONOMIC_POLICY: 'Economic Policy',
  COMMUNITY: 'Community',
  ARTS_AND_CULTURE: 'Arts & Culture',
  BUSINESS: 'Business',
  OTHER: 'Other',
};

function toCardDto(campaign: {
  id: string;
  title: string;
  category: string;
  creatorName: string;
  creatorType: string;
  summary: string;
  coverUrl: string | null;
  status: string;
  fundingGoalCents: number;
  raisedCents: number;
  endsAt: Date | null;
}): CampaignCardDto {
  const percentFunded = campaign.fundingGoalCents > 0
    ? Math.round((campaign.raisedCents / campaign.fundingGoalCents) * 100)
    : 0;

  const daysRemaining = campaign.endsAt
    ? Math.max(0, Math.ceil((new Date(campaign.endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const reach = reachAtGoal(campaign.fundingGoalCents);
  const canonicalCategory = PRISMA_TO_CATEGORY[campaign.category] || (campaign.category as Category);

  return {
    id: campaign.id,
    title: campaign.title,
    category: canonicalCategory,
    creatorName: campaign.creatorName,
    creatorType: campaign.creatorType as CreatorType,
    summary: campaign.summary,
    coverUrl: campaign.coverUrl,
    status: campaign.status as CampaignStatus,
    fundingGoalCents: campaign.fundingGoalCents,
    raisedCents: campaign.raisedCents,
    percentFunded,
    daysRemaining,
    estimatedReachLow: reach.estimatedReachLow,
    estimatedReachHigh: reach.estimatedReachHigh,
    isDemo: true,
  };
}

export class CampaignService {
  async listCampaigns(query: CampaignQuery): Promise<CampaignListResponse> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Filter statuses: for public list, only public statuses allowed
    let statusFilter: CampaignStatus[] = PUBLIC_STATUSES;
    if (query.status) {
      if (PUBLIC_STATUSES.includes(query.status)) {
        statusFilter = [query.status];
      } else {
        // Requested non-public status anonymously -> return empty result
        const emptyCounts: Record<string, number> = {};
        for (const cat of CATEGORIES) {
          emptyCounts[cat] = 0;
        }
        return {
          items: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
          hasNextPage: false,
          categoryCounts: emptyCounts,
        };
      }
    }

    // Server-side search across title, summary, creatorName, category, and story text
    let matchingIds: string[] | null = null;
    if (query.search && query.search.trim().length > 0) {
      const searchTerm = `%${query.search.trim()}%`;
      const matches = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "campaigns"
        WHERE (
          title ILIKE ${searchTerm} OR
          summary ILIKE ${searchTerm} OR
          "creatorName" ILIKE ${searchTerm} OR
          CAST(category AS TEXT) ILIKE ${searchTerm} OR
          CAST(story AS TEXT) ILIKE ${searchTerm}
        )
      `;
      matchingIds = matches.map((m) => m.id);

      if (matchingIds.length === 0) {
        const counts = await this.getCategoryCounts();
        return {
          items: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
          hasNextPage: false,
          categoryCounts: counts,
        };
      }
    }

    const where: Prisma.CampaignWhereInput = {
      status: { in: statusFilter },
      ...(query.category
        ? { category: (CATEGORY_TO_PRISMA[query.category] || query.category) as PrismaCategory }
        : {}),
      ...(query.minGoal !== undefined || query.maxGoal !== undefined
        ? {
            fundingGoalCents: {
              ...(query.minGoal !== undefined ? { gte: query.minGoal } : {}),
              ...(query.maxGoal !== undefined ? { lte: query.maxGoal } : {}),
            },
          }
        : {}),
      ...(matchingIds !== null ? { id: { in: matchingIds } } : {}),
    };

    // Sorting
    let orderBy: Prisma.CampaignOrderByWithRelationInput[];
    switch (query.sort) {
      case 'newest':
        orderBy = [{ createdAt: 'desc' }];
        break;
      case 'most_funded':
        orderBy = [{ raisedCents: 'desc' }, { createdAt: 'desc' }];
        break;
      case 'ending_soon':
        orderBy = [{ endsAt: 'asc' }, { createdAt: 'desc' }];
        break;
      case 'closest_to_goal':
        // We will fetch and order, or order by raisedCents/fundingGoalCents
        orderBy = [{ raisedCents: 'desc' }];
        break;
      case 'trending':
      default:
        orderBy = [{ raisedCents: 'desc' }, { updatedAt: 'desc' }];
        break;
    }

    const [total, campaigns, categoryCounts] = await Promise.all([
      prisma.campaign.count({ where }),
      prisma.campaign.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.getCategoryCounts(),
    ]);

    // In-memory sort refinement for closest_to_goal if requested
    let sortedCampaigns = campaigns;
    if (query.sort === 'closest_to_goal') {
      sortedCampaigns = [...campaigns].sort((a, b) => {
        const diffA = Math.max(0, a.fundingGoalCents - a.raisedCents);
        const diffB = Math.max(0, b.fundingGoalCents - b.raisedCents);
        return diffA - diffB;
      });
    }

    const items = sortedCampaigns.map(toCardDto);
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      categoryCounts,
    };
  }

  async getFeaturedCampaigns(): Promise<CampaignCardDto[]> {
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: { in: ['FUNDING', 'PROMOTING'] },
      },
      orderBy: [{ raisedCents: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    });

    return campaigns.map(toCardDto);
  }

  async getCampaignById(id: string, currentUser?: AuthUser): Promise<CampaignDetailDto> {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        updates: {
          orderBy: { createdAt: 'desc' },
        },
        feedbacks: true,
        contributions: {
          where: { status: 'SUCCEEDED' },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    // Access control: if non-public status, only creator or admin can view
    const isPublicStatus = PUBLIC_STATUSES.includes(campaign.status as CampaignStatus);
    if (!isPublicStatus) {
      const isOwner = currentUser && currentUser.id === campaign.creatorId;
      const isAdmin = currentUser && currentUser.role === 'ADMIN';
      if (!isOwner && !isAdmin) {
        throw new NotFoundError('Campaign not found');
      }
    }

    // Check saved & following status for authenticated user
    let isSaved = false;
    let isFollowing = false;
    if (currentUser) {
      const [saved, followed] = await Promise.all([
        prisma.savedCampaign.findUnique({
          where: { userId_campaignId: { userId: currentUser.id, campaignId: id } },
        }),
        prisma.follow.findUnique({
          where: { userId_campaignId: { userId: currentUser.id, campaignId: id } },
        }),
      ]);
      isSaved = !!saved;
      isFollowing = !!followed;
    }

    // Aggregate feedback counts
    const visualsMap = { NO: 0, SOMEWHAT: 0, YES: 0 };
    const messageMap = { NO: 0, SOMEWHAT: 0, YES: 0 };
    for (const fb of campaign.feedbacks) {
      if (fb.visualsEncouraged in visualsMap) {
        visualsMap[fb.visualsEncouraged as keyof typeof visualsMap]++;
      }
      if (fb.messageChanged in messageMap) {
        messageMap[fb.messageChanged as keyof typeof messageMap]++;
      }
    }

    // Backers summary: aggregate count + only public, non-anonymous backers
    const totalBackersCount = campaign.contributions.length;
    const recentPublicBackers = campaign.contributions
      .filter((c) => !c.isAnonymous && c.publicName && c.publicName.trim().length > 0)
      .slice(0, 10)
      .map((c) => ({
        publicName: c.publicName as string,
        amountCents: c.amountCents,
        createdAt: c.createdAt,
      }));

    // Computed reach & financial breakdown
    const percentFunded = campaign.fundingGoalCents > 0
      ? Math.round((campaign.raisedCents / campaign.fundingGoalCents) * 100)
      : 0;

    const daysRemaining = campaign.endsAt
      ? Math.max(0, Math.ceil((new Date(campaign.endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

    const reach = reachAtGoal(campaign.fundingGoalCents);
    const platformFeeCents = Math.round(campaign.fundingGoalCents * ESTIMATE_CONFIG.platformFeePct);
    const adBudgetCents = campaign.fundingGoalCents - platformFeeCents;

    return {
      id: campaign.id,
      creatorId: campaign.creatorId,
      status: campaign.status as CampaignStatus,
      title: campaign.title,
      category: (PRISMA_TO_CATEGORY[campaign.category] || campaign.category) as Category,
      creatorName: campaign.creatorName,
      creatorType: campaign.creatorType as CreatorType,
      summary: campaign.summary,
      coverUrl: campaign.coverUrl,
      story: (campaign.story as unknown as StoryBlock[]) || [],
      sources: (campaign.sources as unknown as Source[]) || [],
      adCreative: (campaign.adCreative as unknown as AdCreative) || null,
      reach: (campaign.reach as unknown as ReachSettings) || null,
      fundingGoalCents: campaign.fundingGoalCents,
      raisedCents: campaign.raisedCents,
      percentFunded,
      daysRemaining,
      estimatedReachLow: reach.estimatedReachLow,
      estimatedReachHigh: reach.estimatedReachHigh,
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt,
      submittedAt: campaign.submittedAt,
      publishedAt: campaign.publishedAt,
      reviewSummary: {
        reviewNotes: campaign.reviewNotes,
        status: campaign.status as CampaignStatus,
        statement:
          campaign.status === 'COMPLETED'
            ? 'Campaign successfully finished advertising run with transparent reach report.'
            : campaign.status === 'PROMOTING'
            ? 'Campaign is currently actively circulating across vetted digital ad channels.'
            : 'Campaign story, sources, and ad creatives were verified by reviewers before public launch.',
      },
      useOfFundsSummary: {
        platformFeePct: ESTIMATE_CONFIG.platformFeePct * 100,
        adBudgetPct: (1 - ESTIMATE_CONFIG.platformFeePct) * 100,
        platformFeeCents,
        adBudgetCents,
        statement:
          'Your contribution funds ad distribution to spread this message to new audiences. It is not a direct donation to the creator or cause.',
      },
      updates: campaign.updates.map((u) => ({
        id: u.id,
        title: u.title,
        body: u.body,
        createdAt: u.createdAt,
      })),
      feedbackSummary: {
        totalCount: campaign.feedbacks.length,
        visualsEncouraged: visualsMap,
        messageChanged: messageMap,
      },
      backersSummary: {
        totalCount: totalBackersCount,
        recentPublicBackers,
      },
      isSaved,
      isFollowing,
      isDemo: true,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };
  }

  async quoteContribution(campaignId: string, amountCents: number): Promise<QuoteResult> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, status: true },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.status !== 'FUNDING') {
      throw new CampaignNotFundingError();
    }

    return quote(amountCents);
  }

  async submitFeedback(
    campaignId: string,
    data: FeedbackInput,
    userId?: string
  ): Promise<{ success: boolean; message: string }> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    await prisma.feedback.create({
      data: {
        campaignId,
        userId: userId || null,
        visualsEncouraged: data.visualsEncouraged,
        messageChanged: data.messageChanged,
      },
    });

    return { success: true, message: 'Feedback recorded' };
  }

  async toggleSave(campaignId: string, userId: string, save: boolean): Promise<{ saved: boolean }> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (save) {
      await prisma.savedCampaign.upsert({
        where: { userId_campaignId: { userId, campaignId } },
        create: { userId, campaignId },
        update: {},
      });
      return { saved: true };
    } else {
      await prisma.savedCampaign.deleteMany({
        where: { userId, campaignId },
      });
      return { saved: false };
    }
  }

  async toggleFollow(campaignId: string, userId: string, follow: boolean): Promise<{ following: boolean }> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (follow) {
      await prisma.follow.upsert({
        where: { userId_campaignId: { userId, campaignId } },
        create: { userId, campaignId },
        update: {},
      });
      return { following: true };
    } else {
      await prisma.follow.deleteMany({
        where: { userId, campaignId },
      });
      return { following: false };
    }
  }

  private async getCategoryCounts(): Promise<Record<string, number>> {
    const countsRecord: Record<string, number> = {};
    for (const cat of CATEGORIES) {
      countsRecord[cat] = 0;
    }

    const grouped = await prisma.campaign.groupBy({
      by: ['category'],
      where: {
        status: { in: PUBLIC_STATUSES },
      },
      _count: { id: true },
    });

    for (const item of grouped) {
      const canonicalName = PRISMA_TO_CATEGORY[item.category] || item.category;
      countsRecord[canonicalName] = item._count.id;
    }

    return countsRecord;
  }
}

export const campaignService = new CampaignService();
