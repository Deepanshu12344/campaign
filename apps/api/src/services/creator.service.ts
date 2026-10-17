import { Prisma, Category as PrismaCategory, CreatorType as PrismaCreatorType } from '@prisma/client';
import { prisma } from '../utils/prisma';
import {
  CampaignAnalyticsDto,
  CampaignCardDto,
  CampaignDetailDto,
  CampaignStatus,
  canTransition,
  Category,
  CreatorType,
  DraftUpdateInput,
  quote,
  reachAtGoal,
  StoryBlock,
  Source,
  AdCreative,
  ReachSettings,
  UserRole,
  validateCampaignSubmission,
} from '@campaigns/shared';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../utils/errors';
import {
  CATEGORY_TO_PRISMA,
  PRISMA_TO_CATEGORY,
  toCardDto,
  campaignService,
} from './campaign.service';

export class CreatorService {
  async createDraft(creatorId: string): Promise<CampaignDetailDto> {
    const user = await prisma.user.findUnique({
      where: { id: creatorId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const campaign = await prisma.campaign.create({
      data: {
        creatorId,
        title: 'Untitled Campaign',
        category: 'OTHER',
        creatorName: user.name,
        creatorType: 'INDIVIDUAL',
        summary: '',
        fundingGoalCents: 0, // Must be explicitly set by creator on Step 5
        status: 'DRAFT',
        story: [],
        sources: [],
      },
    });

    await prisma.campaignEvent.create({
      data: {
        campaignId: campaign.id,
        type: 'DRAFT_CREATED',
        payload: { creatorId },
      },
    });

    return campaignService.getCampaignById(campaign.id, {
      id: user.id,
      role: user.role as UserRole,
    });
  }

  async updateDraft(
    campaignId: string,
    creatorId: string,
    data: DraftUpdateInput & { [key: string]: unknown }
  ): Promise<CampaignDetailDto> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.creatorId !== creatorId) {
      throw new ForbiddenError('You can only edit your own campaigns');
    }

    // Reject attempt to modify raisedCents or status through draft autosave
    if (data.raisedCents !== undefined || data.status !== undefined) {
      throw new BadRequestError('Cannot modify status or raisedCents via draft autosave');
    }

    // Material edits after publication (FUNDING or PROMOTING) are diverted to pendingRevision
    if (campaign.status === 'FUNDING' || campaign.status === 'PROMOTING') {
      const materialKeys = ['title', 'summary', 'coverUrl', 'story', 'sources', 'adCreative', 'reach'];
      const hasMaterialEdits = materialKeys.some((k) => data[k] !== undefined);

      if (hasMaterialEdits) {
        const currentPending = (campaign.pendingRevision as Record<string, unknown>) || {};
        const updatedPending: Record<string, unknown> = { ...currentPending };

        for (const k of materialKeys) {
          if (data[k] !== undefined) {
            updatedPending[k] = data[k];
          }
        }

        await prisma.campaign.update({
          where: { id: campaignId },
          data: {
            pendingRevision: updatedPending as Prisma.InputJsonValue,
          },
        });

        await prisma.campaignEvent.create({
          data: {
            campaignId,
            type: 'PENDING_REVISION_UPDATED',
            payload: updatedPending as Prisma.InputJsonValue,
          },
        });

        return campaignService.getCampaignById(campaign.id, {
          id: creatorId,
          role: 'USER',
        });
      }

      return campaignService.getCampaignById(campaign.id, {
        id: creatorId,
        role: 'USER',
      });
    }

    if (campaign.status !== 'DRAFT' && campaign.status !== 'CHANGES_REQUESTED') {
      throw new BadRequestError(
        `Draft autosave is not permitted when campaign status is ${campaign.status}`
      );
    }

    // Prepare deep merge for draft update
    const updateData: Prisma.CampaignUpdateInput = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.summary !== undefined) updateData.summary = data.summary;
    if (data.coverUrl !== undefined) updateData.coverUrl = data.coverUrl || null;
    if (data.creatorName !== undefined) updateData.creatorName = data.creatorName;
    if (data.creatorType !== undefined) {
      updateData.creatorType = data.creatorType.toUpperCase() as PrismaCreatorType;
    }
    if (data.category !== undefined) {
      updateData.category = (CATEGORY_TO_PRISMA[data.category] || data.category) as PrismaCategory;
    }
    if (data.fundingGoalCents !== undefined) {
      updateData.fundingGoalCents = data.fundingGoalCents;
    }

    // Merge JSON fields safely
    if (data.story !== undefined) {
      updateData.story = data.story as Prisma.InputJsonValue;
    }
    if (data.sources !== undefined) {
      updateData.sources = data.sources as Prisma.InputJsonValue;
    }
    if (data.adCreative !== undefined) {
      const existingAdCreative = (campaign.adCreative as Record<string, unknown>) || {};
      const mergedAdCreative = data.adCreative
        ? { ...existingAdCreative, ...data.adCreative }
        : null;
      updateData.adCreative = mergedAdCreative as Prisma.InputJsonValue;
    }
    if (data.reach !== undefined) {
      const existingReach = (campaign.reach as Record<string, unknown>) || {};
      const mergedReach = data.reach ? { ...existingReach, ...data.reach } : null;
      updateData.reach = mergedReach as Prisma.InputJsonValue;
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: updateData,
    });

    return campaignService.getCampaignById(campaign.id, {
      id: creatorId,
      role: 'USER',
    });
  }

  async submitCampaign(
    campaignId: string,
    creatorId: string,
    input: { acceptedRules?: boolean }
  ): Promise<CampaignDetailDto> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.creatorId !== creatorId) {
      throw new ForbiddenError('You can only submit your own campaigns');
    }

    if (campaign.status !== 'DRAFT' && campaign.status !== 'CHANGES_REQUESTED') {
      throw new BadRequestError(
        `Only campaigns in DRAFT or CHANGES_REQUESTED status can be submitted (current status: ${campaign.status})`
      );
    }

    // Full 5-step validation
    const candidateToValidate = {
      ...campaign,
      category: PRISMA_TO_CATEGORY[campaign.category] || (campaign.category as Category),
      creatorType: (campaign.creatorType.toLowerCase() as CreatorType) || 'individual',
      story: campaign.story as unknown as StoryBlock[],
      sources: campaign.sources as unknown as Source[],
      adCreative: campaign.adCreative as unknown as AdCreative | null,
      reach: campaign.reach as unknown as ReachSettings | null,
      acceptedRules: input.acceptedRules,
    };

    const validation = validateCampaignSubmission(candidateToValidate);
    if (!validation.isValid) {
      throw new ValidationError('Campaign submission validation failed', validation.errors);
    }

    if (!canTransition(campaign.status as CampaignStatus, 'SUBMITTED')) {
      throw new BadRequestError(`Cannot transition from ${campaign.status} to SUBMITTED`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
          reviewNotes: null,
        },
      });

      await tx.campaignEvent.create({
        data: {
          campaignId,
          type: 'SUBMISSION_RECEIVED',
          payload: { submittedAt: new Date() },
        },
      });

      await tx.notification.create({
        data: {
          userId: creatorId,
          type: 'SUBMISSION_RECEIVED',
          title: 'Submission Received',
          body: `Your campaign "${campaign.title}" has been submitted and is currently queued for reviewer verification.`,
          campaignId,
        },
      });
    });

    return campaignService.getCampaignById(campaign.id, {
      id: creatorId,
      role: 'USER',
    });
  }

  async getMyCampaigns(userId: string, status?: string): Promise<CampaignCardDto[]> {
    const where: Prisma.CampaignWhereInput = {
      creatorId: userId,
      ...(status ? { status: status as CampaignStatus } : {}),
    };

    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return campaigns.map(toCardDto);
  }

  async getMyCampaign(campaignId: string, userId: string): Promise<CampaignDetailDto> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.creatorId !== userId) {
      throw new ForbiddenError('You can only view your own campaigns');
    }

    return campaignService.getCampaignById(campaignId, {
      id: userId,
      role: 'USER',
    });
  }

  async deleteDraft(campaignId: string, userId: string): Promise<{ success: boolean }> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.creatorId !== userId) {
      throw new ForbiddenError('You can only delete your own campaigns');
    }

    if (campaign.status !== 'DRAFT') {
      throw new BadRequestError('Only draft campaigns can be deleted');
    }

    await prisma.campaign.delete({
      where: { id: campaignId },
    });

    return { success: true };
  }

  async getCampaignAnalytics(campaignId: string, userId: string): Promise<CampaignAnalyticsDto> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        report: true,
      },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.creatorId !== userId) {
      throw new ForbiddenError('Access forbidden');
    }

    const contributionCount = await prisma.contribution.count({
      where: { campaignId, status: 'SUCCEEDED' },
    });

    const percentFunded = campaign.fundingGoalCents > 0
      ? Math.round((campaign.raisedCents / campaign.fundingGoalCents) * 100)
      : 0;

    const reachEstimates = quote(campaign.raisedCents || campaign.fundingGoalCents);
    const reachAtTarget = reachAtGoal(campaign.fundingGoalCents);
    const durationDays = (campaign.reach as unknown as ReachSettings | null)?.durationDays || 30;

    const daysRemaining = campaign.endsAt
      ? Math.max(0, Math.ceil((new Date(campaign.endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

    if (campaign.report) {
      return {
        campaignId,
        fundingGoalCents: campaign.fundingGoalCents,
        raisedCents: campaign.raisedCents,
        percentFunded,
        contributionCount,
        adBudgetAllocatedCents: reachAtTarget.adBudgetCents,
        adBudgetSpentCents: campaign.report.adSpendCents,
        estimatedReachLow: reachAtTarget.estimatedReachLow,
        estimatedReachHigh: reachAtTarget.estimatedReachHigh,
        measuredReach: campaign.report.reach,
        impressions: campaign.report.impressions,
        clicks: campaign.report.clicks,
        durationDays,
        daysRemaining,
      };
    }

    const isLive = campaign.status === 'PROMOTING' || campaign.status === 'COMPLETED';
    const spentAdBudget = isLive ? Math.round(campaign.raisedCents * 0.9) : 0;

    return {
      campaignId,
      fundingGoalCents: campaign.fundingGoalCents,
      raisedCents: campaign.raisedCents,
      percentFunded,
      contributionCount,
      adBudgetAllocatedCents: reachAtTarget.adBudgetCents,
      adBudgetSpentCents: spentAdBudget,
      estimatedReachLow: reachEstimates.estimatedReachLow,
      estimatedReachHigh: reachEstimates.estimatedReachHigh,
      measuredReach: null,
      impressions: 0,
      clicks: 0,
      durationDays,
      daysRemaining,
    };
  }

  async createUpdate(
    campaignId: string,
    userId: string,
    data: { title: string; body: string }
  ): Promise<{ id: string; title: string; body: string; createdAt: Date }> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.creatorId !== userId) {
      throw new ForbiddenError('You can only post updates to your own campaigns');
    }

    const update = await prisma.$transaction(async (tx) => {
      const created = await tx.campaignUpdate.create({
        data: {
          campaignId,
          title: data.title,
          body: data.body,
        },
      });

      await tx.campaignEvent.create({
        data: {
          campaignId,
          type: 'CAMPAIGN_UPDATE',
          payload: { updateId: created.id, title: data.title },
        },
      });

      // Find backers and followers to notify
      const [followers, backers] = await Promise.all([
        tx.follow.findMany({ where: { campaignId }, select: { userId: true } }),
        tx.contribution.findMany({
          where: { campaignId, status: 'SUCCEEDED', userId: { not: null } },
          select: { userId: true },
        }),
      ]);

      const recipientIds = new Set<string>();
      for (const f of followers) recipientIds.add(f.userId);
      for (const b of backers) if (b.userId) recipientIds.add(b.userId);
      recipientIds.delete(userId); // Don't notify creator themselves

      if (recipientIds.size > 0) {
        await tx.notification.createMany({
          data: Array.from(recipientIds).map((uId) => ({
            userId: uId,
            type: 'CAMPAIGN_UPDATE',
            title: `Update on "${campaign.title}"`,
            body: data.title,
            campaignId,
          })),
        });
      }

      return created;
    });

    return update;
  }
}

export const creatorService = new CreatorService();
