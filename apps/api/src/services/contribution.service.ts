import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import {
  ClaimContributionsInput,
  Contribution,
  ContributionReceiptDto,
  ContributionStatus,
  CampaignStatus,
  CreateContributionInput,
  PayContributionInput,
  quote,
} from '@campaigns/shared';
import {
  BadRequestError,
  CampaignNotFundingError,
  ForbiddenError,
  NotFoundError,
} from '../utils/errors';
import { AuthUser } from '../middlewares/auth.middleware';
import { simulateCardPayment } from './payments/simulated';

export class ContributionService {
  async createContribution(
    input: CreateContributionInput,
    user?: AuthUser,
    guestReceiptTokenHeader?: string
  ): Promise<{ contribution: Contribution; guestReceiptToken: string | null }> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: input.campaignId },
      select: { id: true, status: true, title: true },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.status !== 'FUNDING') {
      throw new CampaignNotFundingError();
    }

    // Recompute quote to prevent client tampering
    const quoteResult = quote(input.amountCents);
    const amountCents = input.amountCents;
    const feeCents = quoteResult.processingFeeCents;
    const totalCents = quoteResult.totalCents;

    const receiptNo = `REC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto
      .randomBytes(3)
      .toString('hex')
      .toUpperCase()}`;

    let userId: string | null = null;
    let guestEmail: string | null;
    let guestReceiptToken: string | null = null;

    if (user) {
      userId = user.id;
      guestEmail = input.guestEmail || user.email || null;
    } else {
      guestEmail = input.guestEmail || null;
      guestReceiptToken = guestReceiptTokenHeader || crypto.randomUUID();
    }

    const created = await prisma.contribution.create({
      data: {
        campaignId: input.campaignId,
        userId,
        guestEmail,
        guestReceiptToken,
        amountCents,
        feeCents,
        totalCents,
        status: 'PENDING',
        isAnonymous: input.isAnonymous ?? true,
        publicName: input.isAnonymous ? null : input.publicName || null,
        receiptNo,
        isDemo: true,
      },
    });

    await prisma.campaignEvent.create({
      data: {
        campaignId: input.campaignId,
        type: 'CONTRIBUTION_CREATED',
        payload: {
          contributionId: created.id,
          amountCents,
          receiptNo,
          isAnonymous: created.isAnonymous,
        },
      },
    });

    return {
      contribution: {
        id: created.id,
        campaignId: created.campaignId,
        userId: created.userId,
        guestEmail: created.guestEmail,
        guestReceiptToken: created.guestReceiptToken,
        amountCents: created.amountCents,
        feeCents: created.feeCents,
        totalCents: created.totalCents,
        status: created.status as ContributionStatus,
        publicName: created.publicName,
        isAnonymous: created.isAnonymous,
        receiptNo: created.receiptNo,
        isDemo: created.isDemo,
        createdAt: created.createdAt,
      },
      guestReceiptToken,
    };
  }

  async payContribution(
    contributionId: string,
    input: PayContributionInput,
    user?: AuthUser,
    guestReceiptTokenHeader?: string
  ): Promise<{
    status: 'SUCCEEDED' | 'FAILED' | 'PENDING';
    receipt?: ContributionReceiptDto;
    contribution: Contribution;
    failureReason?: string;
    message?: string;
  }> {
    const contribution = await prisma.contribution.findUnique({
      where: { id: contributionId },
      include: {
        campaign: {
          select: { id: true, title: true, creatorId: true, fundingGoalCents: true, raisedCents: true, status: true },
        },
      },
    });

    if (!contribution) {
      throw new NotFoundError('Contribution not found');
    }

    // Verify access
    this.assertContributionAccess(contribution, user, guestReceiptTokenHeader);

    // Idempotency check: if already SUCCEEDED, return existing receipt
    if (contribution.status === 'SUCCEEDED') {
      const receipt = await this.getReceipt(contribution.id, user, guestReceiptTokenHeader);
      return {
        status: 'SUCCEEDED',
        receipt,
        contribution: this.formatContribution(contribution),
        message: 'Contribution has already been settled successfully.',
      };
    }

    if (contribution.status === 'CANCELLED' || contribution.status === 'REFUNDED') {
      throw new BadRequestError(`Cannot pay a ${contribution.status.toLowerCase()} contribution`);
    }

    // Run simulated payment
    const paymentSim = simulateCardPayment(input.cardNumber);

    // Case 1: Failed payment (declined, insufficient funds)
    if (paymentSim.status === 'FAILED') {
      await prisma.$transaction(async (tx) => {
        await tx.contribution.update({
          where: { id: contribution.id },
          data: { status: 'FAILED' },
        });

        await tx.campaignEvent.create({
          data: {
            campaignId: contribution.campaignId,
            type: 'CONTRIBUTION_FAILED',
            payload: {
              contributionId: contribution.id,
              reason: paymentSim.failureReason,
            },
          },
        });
      });

      const updated = await prisma.contribution.findUniqueOrThrow({
        where: { id: contribution.id },
      });

      return {
        status: 'FAILED',
        contribution: this.formatContribution(updated),
        failureReason: paymentSim.failureReason,
        message: paymentSim.failureMessage,
      };
    }

    // Case 2: Verification Pending (card ending in 3220, resolves after 15s)
    if (paymentSim.status === 'PENDING') {
      // Record payment attempt metadata
      await prisma.campaignEvent.create({
        data: {
          campaignId: contribution.campaignId,
          type: 'PAYMENT_VERIFICATION_PENDING',
          payload: {
            contributionId: contribution.id,
            cardBrand: paymentSim.cardBrand,
            cardLast4: paymentSim.cardLast4,
          },
        },
      });

      // Schedule background settlement after 15s
      setTimeout(async () => {
        try {
          await this.settleContribution(contribution.id, paymentSim.cardBrand, paymentSim.cardLast4);
        } catch (err) {
          console.error(`Background payment settlement failed for contribution ${contribution.id}:`, err);
        }
      }, 15000);

      return {
        status: 'PENDING',
        contribution: this.formatContribution(contribution),
        message: paymentSim.failureMessage,
      };
    }

    // Case 3: Immediate success (4242 or standard card)
    const settled = await this.settleContribution(
      contribution.id,
      paymentSim.cardBrand,
      paymentSim.cardLast4
    );

    const receipt = await this.getReceipt(settled.id, user, guestReceiptTokenHeader);

    return {
      status: 'SUCCEEDED',
      receipt,
      contribution: this.formatContribution(settled),
    };
  }

  async cancelContribution(
    contributionId: string,
    user?: AuthUser,
    guestReceiptTokenHeader?: string
  ): Promise<Contribution> {
    const contribution = await prisma.contribution.findUnique({
      where: { id: contributionId },
    });

    if (!contribution) {
      throw new NotFoundError('Contribution not found');
    }

    this.assertContributionAccess(contribution, user, guestReceiptTokenHeader);

    if (contribution.status !== 'PENDING') {
      throw new BadRequestError('Only pending contributions can be cancelled');
    }

    const updated = await prisma.contribution.update({
      where: { id: contributionId },
      data: { status: 'CANCELLED' },
    });

    await prisma.campaignEvent.create({
      data: {
        campaignId: updated.campaignId,
        type: 'CONTRIBUTION_CANCELLED',
        payload: { contributionId: updated.id },
      },
    });

    return this.formatContribution(updated);
  }

  async getContribution(
    contributionId: string,
    user?: AuthUser,
    guestReceiptTokenHeader?: string
  ): Promise<Contribution> {
    const contribution = await prisma.contribution.findUnique({
      where: { id: contributionId },
    });

    if (!contribution) {
      throw new NotFoundError('Contribution not found');
    }

    this.assertContributionAccess(contribution, user, guestReceiptTokenHeader);
    return this.formatContribution(contribution);
  }

  async getMyContributions(userId: string): Promise<
    (Contribution & { campaignTitle: string; campaignCoverUrl: string | null })[]
  > {
    const contributions = await prisma.contribution.findMany({
      where: { userId },
      include: {
        campaign: {
          select: { title: true, coverUrl: true, status: true, fundingGoalCents: true, raisedCents: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return contributions.map((c) => ({
      ...this.formatContribution(c),
      campaignTitle: c.campaign.title,
      campaignCoverUrl: c.campaign.coverUrl,
      campaignStatus: c.campaign.status as CampaignStatus,
      campaignGoalCents: c.campaign.fundingGoalCents,
      campaignRaisedCents: c.campaign.raisedCents,
    }));
  }

  async getReceipt(
    contributionId: string,
    user?: AuthUser,
    guestReceiptTokenHeader?: string
  ): Promise<ContributionReceiptDto> {
    const contribution = await prisma.contribution.findUnique({
      where: { id: contributionId },
      include: {
        campaign: { select: { title: true, creatorId: true } },
      },
    });

    if (!contribution) {
      throw new NotFoundError('Contribution not found');
    }

    this.assertContributionAccess(contribution, user, guestReceiptTokenHeader);

    // Retrieve card details from event log if available
    const paymentEvent = await prisma.campaignEvent.findFirst({
      where: {
        campaignId: contribution.campaignId,
        type: 'CONTRIBUTION_PAID',
        payload: { path: ['contributionId'], equals: contribution.id },
      },
      orderBy: { createdAt: 'desc' },
    });

    const eventPayload = (paymentEvent?.payload as Record<string, unknown>) || {};
    const cardBrand = (eventPayload.cardBrand as string) || 'Visa';
    const cardLast4 = (eventPayload.cardLast4 as string) || '4242';

    return {
      id: contribution.id,
      receiptNo: contribution.receiptNo,
      campaignId: contribution.campaignId,
      campaignTitle: contribution.campaign.title,
      amountCents: contribution.amountCents,
      feeCents: contribution.feeCents,
      totalCents: contribution.totalCents,
      status: contribution.status as ContributionStatus,
      isAnonymous: contribution.isAnonymous,
      publicName: contribution.publicName,
      cardBrand,
      cardLast4,
      guestEmail: contribution.guestEmail,
      createdAt: contribution.createdAt,
      isDemo: contribution.isDemo,
    };
  }

  async claimContributions(userId: string, input: ClaimContributionsInput): Promise<{ claimedCount: number }> {
    const result = await prisma.contribution.updateMany({
      where: {
        guestReceiptToken: { in: input.tokens },
        userId: null,
      },
      data: {
        userId,
      },
    });

    return { claimedCount: result.count };
  }

  /**
   * Settles a pending contribution in a single atomic database transaction.
   * Increments raisedCents, evaluates funding milestones, and closes funding when 100% reached.
   */
  public async settleContribution(
    contributionId: string,
    cardBrand: string,
    cardLast4: string
  ): Promise<Contribution> {
    return prisma.$transaction(async (tx) => {
      const current = await tx.contribution.findUnique({
        where: { id: contributionId },
        include: {
          campaign: true,
        },
      });

      if (!current) {
        throw new NotFoundError('Contribution not found');
      }

      if (current.status === 'SUCCEEDED') {
        return this.formatContribution(current);
      }

      // 1. Mark contribution SUCCEEDED atomically (prevents concurrent race double-settlement)
      const updateResult = await tx.contribution.updateMany({
        where: {
          id: contributionId,
          status: { not: 'SUCCEEDED' },
        },
        data: { status: 'SUCCEEDED' },
      });

      if (updateResult.count === 0) {
        return this.formatContribution(current);
      }

      const updatedContribution = await tx.contribution.findUniqueOrThrow({
        where: { id: contributionId },
      });

      // 2. Increment campaign raisedCents
      const campaign = current.campaign;
      const oldRaised = campaign.raisedCents;
      const newRaised = oldRaised + current.amountCents;

      await tx.campaign.update({
        where: { id: campaign.id },
        data: { raisedCents: newRaised },
      });

      // 3. Log CONTRIBUTION_PAID event
      await tx.campaignEvent.create({
        data: {
          campaignId: campaign.id,
          type: 'CONTRIBUTION_PAID',
          payload: {
            contributionId: current.id,
            amountCents: current.amountCents,
            cardBrand,
            cardLast4,
            receiptNo: current.receiptNo,
          },
        },
      });

      // 4. Send contribution notification to creator
      const backerDisplay = current.isAnonymous
        ? 'A supporter'
        : current.publicName || 'A supporter';

      await tx.notification.create({
        data: {
          userId: campaign.creatorId,
          type: 'CONTRIBUTION_SUCCEEDED',
          title: 'New Contribution Received',
          body: `${backerDisplay} contributed $${(current.amountCents / 100).toFixed(2)} to ${campaign.title}.`,
          campaignId: campaign.id,
        },
      });

      // Also notify backer if registered user
      if (current.userId) {
        await tx.notification.create({
          data: {
            userId: current.userId,
            type: 'CONTRIBUTION_SUCCEEDED',
            title: 'Contribution Confirmed',
            body: `Your contribution of $${(current.amountCents / 100).toFixed(2)} to "${campaign.title}" was successful.`,
            campaignId: campaign.id,
          },
        });
      }

      // 5. Milestone Checks: 25%, 50%, 75%, 100%
      const goal = campaign.fundingGoalCents;
      const oldPct = (oldRaised / goal) * 100;
      const newPct = (newRaised / goal) * 100;

      for (const milestone of [25, 50, 75, 100]) {
        if (oldPct < milestone && newPct >= milestone) {
          // Check if milestone was already triggered
          const existingMilestoneEvent = await tx.campaignEvent.findFirst({
            where: {
              campaignId: campaign.id,
              type: 'MILESTONE_REACHED',
              payload: { path: ['milestone'], equals: milestone },
            },
          });

          if (!existingMilestoneEvent) {
            await tx.campaignEvent.create({
              data: {
                campaignId: campaign.id,
                type: 'MILESTONE_REACHED',
                payload: { milestone, raisedCents: newRaised, goalCents: goal },
              },
            });

            await tx.notification.create({
              data: {
                userId: campaign.creatorId,
                type: 'MILESTONE_REACHED',
                title: `${milestone}% Milestone Reached!`,
                body: `"${campaign.title}" has reached ${milestone}% of its funding goal ($${(newRaised / 100).toFixed(2)} raised).`,
                campaignId: campaign.id,
              },
            });
          }
        }
      }

      // 6. If goal reached, transition to FUNDING_CLOSED
      if (newRaised >= goal && campaign.status === 'FUNDING') {
        await tx.campaign.update({
          where: { id: campaign.id },
          data: { status: 'FUNDING_CLOSED' },
        });

        await tx.campaignEvent.create({
          data: {
            campaignId: campaign.id,
            type: 'FUNDING_CLOSED',
            payload: { raisedCents: newRaised, fundingGoalCents: goal },
          },
        });

        await tx.notification.create({
          data: {
            userId: campaign.creatorId,
            type: 'FUNDING_OPEN',
            title: 'Funding Goal Achieved!',
            body: `"${campaign.title}" has successfully achieved 100% funding! It is now closed to new contributions and prepared for ad distribution.`,
            campaignId: campaign.id,
          },
        });
      }

      return this.formatContribution(updatedContribution);
    }, {
      maxWait: 15000,
      timeout: 30000,
    });
  }

  private assertContributionAccess(
    contribution: { userId: string | null; guestReceiptToken: string | null; campaignId: string },
    user?: AuthUser,
    guestReceiptTokenHeader?: string
  ): void {
    if (user?.role === 'ADMIN') {
      return;
    }

    if (user && contribution.userId && contribution.userId === user.id) {
      return;
    }

    if (
      contribution.guestReceiptToken &&
      guestReceiptTokenHeader &&
      contribution.guestReceiptToken === guestReceiptTokenHeader
    ) {
      return;
    }

    throw new ForbiddenError('You do not have permission to view or manage this contribution');
  }

  private formatContribution(c: Prisma.ContributionGetPayload<Record<string, never>> | Contribution): Contribution {
    return {
      id: c.id,
      campaignId: c.campaignId,
      userId: c.userId,
      guestEmail: c.guestEmail,
      guestReceiptToken: c.guestReceiptToken,
      amountCents: c.amountCents,
      feeCents: c.feeCents,
      totalCents: c.totalCents,
      status: c.status as ContributionStatus,
      publicName: c.publicName,
      isAnonymous: c.isAnonymous,
      receiptNo: c.receiptNo,
      isDemo: c.isDemo,
      createdAt: c.createdAt,
    };
  }
}

export const contributionService = new ContributionService();
