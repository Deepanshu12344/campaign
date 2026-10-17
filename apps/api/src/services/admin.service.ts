import crypto from 'crypto';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import {
  AdminAdvanceInput,
  AdminDecisionInput,
  canTransition,
  SimulateReportInput,
  CampaignDetailDto,
  AdCreative,
  ReachSettings,
  Report,
  ReachType,
} from '@campaigns/shared';
import {
  BadRequestError,
  NotFoundError,
  PreconditionFailedError,
} from '../utils/errors';
import { PRISMA_TO_CATEGORY, campaignService } from './campaign.service';

export class AdminService {
  async getQueue(): Promise<Record<string, unknown>[]> {
    const campaigns = await prisma.campaign.findMany({
      where: {
        OR: [
          { status: 'SUBMITTED' },
          { pendingRevision: { not: Prisma.DbNull } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    });


    return campaigns.map((c) => ({
      id: c.id,
      title: c.title,
      category: PRISMA_TO_CATEGORY[c.category] || c.category,
      creatorName: c.creatorName,
      creatorType: c.creatorType.toLowerCase(),
      creatorId: c.creatorId,
      status: c.status,
      summary: c.summary,
      coverUrl: c.coverUrl,
      reviewType: c.pendingRevision ? 'PENDING_REVISION' : 'NEW_SUBMISSION',
      fundingGoalCents: c.fundingGoalCents,
      submittedAt: c.submittedAt || c.updatedAt,
      pendingRevision: c.pendingRevision,
      story: c.story,
      sources: c.sources,
      adCreative: c.adCreative,
      reach: c.reach,
    }));
  }

  async makeDecision(
    campaignId: string,
    reviewerId: string,
    input: AdminDecisionInput
  ): Promise<{ success: boolean; message: string }> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    // Branch 1: Handling a Pending Revision on an active campaign
    if (campaign.pendingRevision) {
      const revision = campaign.pendingRevision as Record<string, unknown>;

      if (input.decision === 'APPROVE') {
        const updateData: Record<string, unknown> = {
          pendingRevision: Prisma.DbNull,
          version: campaign.version + 1,
        };

        const allowedKeys = ['title', 'summary', 'coverUrl', 'story', 'sources', 'adCreative', 'reach', 'category'];
        for (const k of allowedKeys) {
          if (revision[k] !== undefined) {
            updateData[k] = revision[k];
          }
        }

        await prisma.$transaction(async (tx) => {
          await tx.campaign.update({
            where: { id: campaignId },
            data: updateData as Prisma.CampaignUpdateInput,
          });

          await tx.reviewDecision.create({
            data: {
              campaignId,
              reviewerId,
              decision: 'APPROVED',
              notes: input.notes || 'Revision approved by reviewer',
            },
          });

          await tx.campaignEvent.create({
            data: {
              campaignId,
              type: 'REVISION_APPROVED',
              payload: { version: campaign.version + 1, notes: input.notes },
            },
          });

          await tx.notification.create({
            data: {
              userId: campaign.creatorId,
              type: 'CAMPAIGN_APPROVED',
              title: 'Revision Approved',
              body: `Your updates to "${campaign.title}" have been approved and published to the live campaign.`,
              campaignId,
            },
          });
        });

        return { success: true, message: 'Pending revision approved and applied to live campaign.' };
      } else if (input.decision === 'CHANGES_REQUESTED') {
        await prisma.$transaction(async (tx) => {
          await tx.reviewDecision.create({
            data: {
              campaignId,
              reviewerId,
              decision: 'CHANGES_REQUESTED',
              notes: input.notes || 'Modifications requested on revision',
            },
          });

          await tx.campaignEvent.create({
            data: {
              campaignId,
              type: 'REVISION_CHANGES_REQUESTED',
              payload: { notes: input.notes },
            },
          });

          await tx.notification.create({
            data: {
              userId: campaign.creatorId,
              type: 'CHANGES_REQUESTED',
              title: 'Changes Requested on Revision',
              body: input.notes || 'Reviewer requested changes to your pending revision.',
              campaignId,
            },
          });
        });

        return { success: true, message: 'Changes requested on revision.' };
      } else {
        // REJECT
        await prisma.$transaction(async (tx) => {
          await tx.campaign.update({
            where: { id: campaignId },
            data: { pendingRevision: Prisma.DbNull },
          });

          await tx.reviewDecision.create({
            data: {
              campaignId,
              reviewerId,
              decision: 'REJECTED',
              notes: input.notes || 'Revision rejected by reviewer',
            },
          });

          await tx.campaignEvent.create({
            data: {
              campaignId,
              type: 'REVISION_REJECTED',
              payload: { notes: input.notes },
            },
          });

          await tx.notification.create({
            data: {
              userId: campaign.creatorId,
              type: 'CAMPAIGN_REJECTED',
              title: 'Revision Rejected',
              body: input.notes || 'Your proposed revision was rejected. Live campaign remains active.',
              campaignId,
            },
          });
        });

        return { success: true, message: 'Revision rejected.' };
      }
    }

    // Branch 2: Handling a SUBMITTED campaign
    if (campaign.status !== 'SUBMITTED') {
      throw new BadRequestError(
        `Campaign is in ${campaign.status} status and does not have a pending revision awaiting decision`
      );
    }

    if (input.decision === 'APPROVE') {
      // Transition SUBMITTED -> APPROVED -> FUNDING
      const durationDays = (campaign.reach as unknown as ReachSettings | null)?.durationDays || 30;
      const startsAt = new Date();
      const endsAt = new Date(startsAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

      await prisma.$transaction(async (tx) => {
        await tx.campaign.update({
          where: { id: campaignId },
          data: {
            status: 'FUNDING',
            publishedAt: startsAt,
            startsAt,
            endsAt,
            reviewNotes: input.notes || null,
          },
        });

        await tx.reviewDecision.create({
          data: {
            campaignId,
            reviewerId,
            decision: 'APPROVED',
            notes: input.notes || 'Approved for public funding',
          },
        });

        await tx.campaignEvent.create({
          data: {
            campaignId,
            type: 'CAMPAIGN_APPROVED',
            payload: { notes: input.notes },
          },
        });

        await tx.campaignEvent.create({
          data: {
            campaignId,
            type: 'FUNDING_OPEN',
            payload: { startsAt, endsAt },
          },
        });

        await tx.notification.create({
          data: {
            userId: campaign.creatorId,
            type: 'CAMPAIGN_APPROVED',
            title: 'Campaign Approved & Live',
            body: `Congratulations! "${campaign.title}" is approved and now open for community funding.`,
            campaignId,
          },
        });
      });

      return { success: true, message: 'Campaign approved and opened for funding.' };
    }

    if (input.decision === 'CHANGES_REQUESTED') {
      if (!canTransition('SUBMITTED', 'CHANGES_REQUESTED')) {
        throw new BadRequestError('Cannot transition from SUBMITTED to CHANGES_REQUESTED');
      }

      await prisma.$transaction(async (tx) => {
        await tx.campaign.update({
          where: { id: campaignId },
          data: {
            status: 'CHANGES_REQUESTED',
            reviewNotes: input.notes,
          },
        });

        await tx.reviewDecision.create({
          data: {
            campaignId,
            reviewerId,
            decision: 'CHANGES_REQUESTED',
            notes: input.notes,
          },
        });

        await tx.campaignEvent.create({
          data: {
            campaignId,
            type: 'CHANGES_REQUESTED',
            payload: { notes: input.notes },
          },
        });

        await tx.notification.create({
          data: {
            userId: campaign.creatorId,
            type: 'CHANGES_REQUESTED',
            title: 'Changes Requested',
            body: input.notes || 'Reviewer requested modifications before your campaign can be approved.',
            campaignId,
          },
        });
      });

      return { success: true, message: 'Changes requested.' };
    }

    if (input.decision === 'REJECT') {
      if (!canTransition('SUBMITTED', 'REJECTED')) {
        throw new BadRequestError('Cannot transition from SUBMITTED to REJECTED');
      }

      await prisma.$transaction(async (tx) => {
        await tx.campaign.update({
          where: { id: campaignId },
          data: {
            status: 'REJECTED',
            reviewNotes: input.notes,
          },
        });

        await tx.reviewDecision.create({
          data: {
            campaignId,
            reviewerId,
            decision: 'REJECTED',
            notes: input.notes,
          },
        });

        await tx.campaignEvent.create({
          data: {
            campaignId,
            type: 'CAMPAIGN_REJECTED',
            payload: { notes: input.notes },
          },
        });

        await tx.notification.create({
          data: {
            userId: campaign.creatorId,
            type: 'CAMPAIGN_REJECTED',
            title: 'Campaign Submission Rejected',
            body: input.notes || 'Your campaign submission did not meet publication criteria.',
            campaignId,
          },
        });
      });

      return { success: true, message: 'Campaign rejected.' };
    }

    throw new BadRequestError(`Unknown decision type: ${input.decision}`);
  }

  async advanceCampaign(
    campaignId: string,
    reviewerId: string,
    input?: AdminAdvanceInput
  ): Promise<CampaignDetailDto> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        contributions: true,
        report: true,
      },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    const failedChecks: string[] = [];

    // Stage 1: FUNDING_CLOSED -> DISTRIBUTION_PREP
    if (campaign.status === 'FUNDING_CLOSED') {
      const pendingCount = await prisma.contribution.count({
        where: { campaignId, status: 'PENDING' },
      });
      if (pendingCount > 0) {
        failedChecks.push(`All contributions must be resolved (${pendingCount} pending contributions remain)`);
      }

      if (campaign.raisedCents <= 0) {
        failedChecks.push('Campaign must have raised funds greater than $0 to fund ad distribution');
      }

      if (failedChecks.length > 0) {
        throw new PreconditionFailedError('Checklist preconditions failed for distribution prep', {
          checks: failedChecks,
        });
      }

      if (!canTransition('FUNDING_CLOSED', 'DISTRIBUTION_PREP')) {
        throw new BadRequestError('Cannot transition from FUNDING_CLOSED to DISTRIBUTION_PREP');
      }

      await prisma.$transaction(async (tx) => {
        await tx.campaign.update({
          where: { id: campaignId },
          data: { status: 'DISTRIBUTION_PREP' },
        });

        await tx.campaignEvent.create({
          data: {
            campaignId,
            type: 'LIFECYCLE_ADVANCED',
            payload: { from: 'FUNDING_CLOSED', to: 'DISTRIBUTION_PREP', reviewerId, notes: input?.notes },
          },
        });

        await tx.notification.create({
          data: {
            userId: campaign.creatorId,
            type: 'DISTRIBUTION_PROGRESS',
            title: 'Ad Distribution Preparation',
            body: `Ad creatives and audience targeting for "${campaign.title}" are now queued for network setup.`,
            campaignId,
          },
        });
      });

      return campaignService.getCampaignById(campaignId, { id: reviewerId, role: 'ADMIN' });
    }

    // Stage 2: DISTRIBUTION_PREP -> PROMOTING
    if (campaign.status === 'DISTRIBUTION_PREP') {
      const adCreative = campaign.adCreative as unknown as AdCreative | null;
      if (!adCreative || !adCreative.images?.length || !adCreative.headline) {
        failedChecks.push('Ad creative must include verified image assets, headline, and CTA');
      }

      const reach = campaign.reach as unknown as ReachSettings | null;
      if (!reach || !reach.channels?.length || !reach.locations?.length) {
        failedChecks.push('Reach targeting must specify at least one location and advertising channel');
      }

      if (failedChecks.length > 0) {
        throw new PreconditionFailedError('Checklist preconditions failed for promotion launch', {
          checks: failedChecks,
        });
      }

      if (!canTransition('DISTRIBUTION_PREP', 'PROMOTING')) {
        throw new BadRequestError('Cannot transition from DISTRIBUTION_PREP to PROMOTING');
      }

      await prisma.$transaction(async (tx) => {
        await tx.campaign.update({
          where: { id: campaignId },
          data: { status: 'PROMOTING' },
        });

        await tx.campaignEvent.create({
          data: {
            campaignId,
            type: 'LIFECYCLE_ADVANCED',
            payload: { from: 'DISTRIBUTION_PREP', to: 'PROMOTING', reviewerId, notes: input?.notes },
          },
        });

        // Notify creator and followers/backers
        await tx.notification.create({
          data: {
            userId: campaign.creatorId,
            type: 'PROMOTION_STARTED',
            title: 'Ad Promotion Active',
            body: `"${campaign.title}" is now actively circulating across selected digital advertising channels!`,
            campaignId,
          },
        });
      });

      return campaignService.getCampaignById(campaignId, { id: reviewerId, role: 'ADMIN' });
    }

    // Stage 3: PROMOTING -> COMPLETED
    if (campaign.status === 'PROMOTING') {
      if (!canTransition('PROMOTING', 'COMPLETED')) {
        throw new BadRequestError('Cannot transition from PROMOTING to COMPLETED');
      }

      const platformFeeCents = Math.round(campaign.raisedCents * 0.1);
      const adSpendCents = campaign.raisedCents - platformFeeCents;
      const impressions = Math.round(((adSpendCents / 100) / 6.0) * 1000);
      const reach = Math.round(impressions / 2.2);
      const clicks = Math.round(impressions * 0.024);
      const ctr = 0.024;
      const startedAt = campaign.startsAt || campaign.publishedAt || campaign.createdAt;
      const endedAt = new Date();

      await prisma.$transaction(async (tx) => {
        await tx.campaign.update({
          where: { id: campaignId },
          data: { status: 'COMPLETED', endsAt: endedAt },
        });

        // Ensure final performance report is recorded
        await tx.report.upsert({
          where: { campaignId },
          create: {
            campaignId,
            fundsRaisedCents: campaign.raisedCents,
            adSpendCents,
            impressions,
            reach,
            reachType: 'MEASURED',
            clicks,
            ctr,
            startedAt,
            endedAt,
            isDemo: true,
          },
          update: {
            reachType: 'MEASURED',
            endedAt,
          },
        });

        await tx.campaignEvent.create({
          data: {
            campaignId,
            type: 'LIFECYCLE_ADVANCED',
            payload: { from: 'PROMOTING', to: 'COMPLETED', reviewerId, notes: input?.notes },
          },
        });

        await tx.notification.create({
          data: {
            userId: campaign.creatorId,
            type: 'CAMPAIGN_COMPLETED',
            title: 'Campaign Distribution Completed',
            body: `Ad distribution for "${campaign.title}" has successfully concluded. Your final reach report is ready.`,
            campaignId,
          },
        });
      });

      return campaignService.getCampaignById(campaignId, { id: reviewerId, role: 'ADMIN' });
    }

    throw new BadRequestError(
      `Cannot advance campaign from status ${campaign.status}. Allowed advancement origins: FUNDING_CLOSED, DISTRIBUTION_PREP, PROMOTING.`
    );
  }

  async simulateReport(campaignId: string, input?: SimulateReportInput): Promise<Report> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    const platformFeeCents = Math.round(campaign.raisedCents * 0.1);
    const adBudgetCents = campaign.raisedCents - platformFeeCents;
    const impressions = input?.impressions ?? Math.round(((adBudgetCents / 100) / 6.0) * 1000);
    const reach = input?.reach ?? Math.round(impressions / 2.2);
    const clicks = input?.clicks ?? Math.round(impressions * 0.024);
    const ctr = input?.ctr ?? (impressions > 0 ? clicks / impressions : 0.024);

    const report = await prisma.report.upsert({
      where: { campaignId },
      create: {
        campaignId,
        fundsRaisedCents: campaign.raisedCents,
        adSpendCents: adBudgetCents,
        impressions,
        reach,
        reachType: input?.reachType || 'MEASURED',
        clicks,
        ctr,
        startedAt: campaign.startsAt || campaign.createdAt,
        endedAt: campaign.endsAt || new Date(),
        isDemo: true,
      },
      update: {
        impressions,
        reach,
        reachType: input?.reachType || 'MEASURED',
        clicks,
        ctr,
      },
    });

    return {
      id: report.id,
      campaignId: report.campaignId,
      fundsRaisedCents: report.fundsRaisedCents,
      platformFeeCents,
      adSpendCents: report.adSpendCents,
      impressions: report.impressions,
      reach: report.reach,
      reachType: report.reachType as ReachType,
      clicks: report.clicks,
      ctr: report.ctr,
      startedAt: report.startedAt || campaign.startsAt || campaign.createdAt,
      endedAt: report.endedAt || campaign.endsAt || new Date(),
      isDemo: report.isDemo,
      notes: 'Transparent simulated performance report',
    };
  }

  async resetDemo(): Promise<{ success: boolean; message: string }> {
    const nodeBin = process.execPath;
    const candidates = [
      path.resolve(__dirname, 'seed.js'),
      path.resolve(__dirname, '../seed.js'),
      path.resolve(process.cwd(), 'dist/seed.js'),
      path.resolve(process.cwd(), 'apps/api/dist/seed.js'),
    ];
    const foundSeed = candidates.find((p) => fs.existsSync(p));
    const tsxSeed = path.resolve(__dirname, '../../prisma/seed.ts');

    try {
      if (foundSeed) {
        execSync(`"${nodeBin}" "${foundSeed}" --prod --force`, {
          stdio: 'inherit',
          env: { ...process.env, I_KNOW_THIS_IS_PRODUCTION: 'true' },
        });
      } else {
        execSync(`npx tsx "${tsxSeed}" --force`, {
          stdio: 'inherit',
          env: { ...process.env, I_KNOW_THIS_IS_PRODUCTION: 'true' },
        });
      }
      return { success: true, message: 'Demo database has been successfully reset to initial seed state.' };
    } catch (err) {
      throw new BadRequestError(`Failed to reset demo data: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async simulateFundingToGoal(campaignId: string, reviewerId: string): Promise<CampaignDetailDto> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.status !== 'FUNDING') {
      throw new BadRequestError(
        `Campaign must be in FUNDING status to simulate goal reached (current status: ${campaign.status})`
      );
    }

    const neededCents = Math.max(100, campaign.fundingGoalCents - campaign.raisedCents);
    const feeCents = Math.round(neededCents * 0.1);

    await prisma.$transaction(async (tx) => {
      // 1. Create simulated contribution
      await tx.contribution.create({
        data: {
          campaignId,
          amountCents: neededCents,
          feeCents,
          totalCents: neededCents + feeCents,
          status: 'SUCCEEDED',
          isAnonymous: true,
          isDemo: true,
          receiptNo: `REC-DEMO-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
          guestReceiptToken: `demo_receipt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
        },
      });

      // 2. Update campaign to FUNDING_CLOSED with raised = goal
      const newRaised = campaign.raisedCents + neededCents;
      await tx.campaign.update({
        where: { id: campaignId },
        data: {
          raisedCents: newRaised,
          status: 'FUNDING_CLOSED',
        },
      });

      // 3. Log event
      await tx.campaignEvent.create({
        data: {
          campaignId,
          type: 'FUNDING_CLOSED',
          payload: {
            simulated: true,
            raisedCents: newRaised,
            fundingGoalCents: campaign.fundingGoalCents,
            reviewerId,
          },
        },
      });

      // 4. Send notification to creator
      await tx.notification.create({
        data: {
          userId: campaign.creatorId,
          type: 'FUNDING_OPEN',
          title: 'Funding Goal Achieved! (Simulated)',
          body: `"${campaign.title}" has reached 100% of its funding goal ($${Math.round(campaign.fundingGoalCents / 100).toLocaleString()}) and moved to Distribution Prep.`,
          campaignId,
        },
      });
    });

    return campaignService.getCampaignById(campaignId, { id: reviewerId, role: 'ADMIN' });
  }

  async getAuditTrail(campaignId: string): Promise<{
    decisions: Array<{ id: string; decision: string; notes: string; reviewerName: string; createdAt: Date }>;
    events: Array<{ id: string; type: string; payload: unknown; createdAt: Date }>;
  }> {
    const decisions = await prisma.reviewDecision.findMany({
      where: { campaignId },
      include: { reviewer: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const events = await prisma.campaignEvent.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      decisions: decisions.map((d) => ({
        id: d.id,
        decision: d.decision,
        notes: d.notes,
        reviewerName: d.reviewer.name || d.reviewer.email,
        createdAt: d.createdAt,
      })),
      events: events.map((e) => ({
        id: e.id,
        type: e.type,
        payload: e.payload,
        createdAt: e.createdAt,
      })),
    };
  }

  async getLifecycleCampaigns(): Promise<Record<string, unknown>[]> {
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: { in: ['FUNDING', 'FUNDING_CLOSED', 'DISTRIBUTION_PREP', 'PROMOTING', 'COMPLETED'] },
      },
      include: {
        contributions: { select: { id: true, status: true, amountCents: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return campaigns.map((c) => ({
      id: c.id,
      title: c.title,
      category: PRISMA_TO_CATEGORY[c.category] || c.category,
      creatorName: c.creatorName,
      creatorType: c.creatorType.toLowerCase(),
      summary: c.summary,
      coverUrl: c.coverUrl,
      status: c.status,
      fundingGoalCents: c.fundingGoalCents,
      raisedCents: c.raisedCents,
      percentFunded: c.fundingGoalCents > 0 ? (c.raisedCents / c.fundingGoalCents) * 100 : 0,
      daysRemaining: c.endsAt ? Math.max(0, Math.ceil((c.endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null,
      estimatedReachLow: c.fundingGoalCents > 0 ? Math.round(((c.fundingGoalCents / 100) * 0.9 / 6.0) * 1000 * 0.45) : 0,
      estimatedReachHigh: c.fundingGoalCents > 0 ? Math.round(((c.fundingGoalCents / 100) * 0.9 / 6.0) * 1000 * 0.65) : 0,
      isDemo: true,
      pendingContributionsCount: c.contributions.filter((ct) => ct.status === 'PENDING').length,
      hasAdCreative: Boolean(
        c.adCreative &&
          typeof c.adCreative === 'object' &&
          Array.isArray((c.adCreative as Record<string, unknown>).images) &&
          ((c.adCreative as Record<string, unknown>).images as unknown[]).length > 0 &&
          Boolean((c.adCreative as Record<string, unknown>).headline)
      ),
      hasTargeting: Boolean(
        c.reach &&
          typeof c.reach === 'object' &&
          Array.isArray((c.reach as Record<string, unknown>).locations) &&
          ((c.reach as Record<string, unknown>).locations as unknown[]).length > 0 &&
          Array.isArray((c.reach as Record<string, unknown>).channels) &&
          ((c.reach as Record<string, unknown>).channels as unknown[]).length > 0
      ),
    }));
  }
}

export const adminService = new AdminService();
