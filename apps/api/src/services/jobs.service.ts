import { prisma } from '../utils/prisma';
import { contributionService } from './contribution.service';
import { logger } from '../utils/logger';

export class JobsService {
  private paymentInterval: NodeJS.Timeout | null = null;
  private deadlineInterval: NodeJS.Timeout | null = null;
  private isProcessingPayments = false;
  private isProcessingDeadlines = false;

  start(): void {
    logger.info('Starting background jobs worker...');

    // 1. Initial boot sweeps
    this.sweepPendingPayments().catch((err) =>
      logger.error({ err }, 'Error during initial pending payments sweep')
    );
    this.sweepDeadlineReminders().catch((err) =>
      logger.error({ err }, 'Error during initial deadline sweep')
    );

    // 2. Periodic intervals
    // Settle pending payments every 30 seconds
    this.paymentInterval = setInterval(() => {
      this.sweepPendingPayments().catch((err) =>
        logger.error({ err }, 'Error in periodic pending payment sweep')
      );
    }, 30 * 1000);

    // Check approaching deadlines every 15 minutes
    this.deadlineInterval = setInterval(() => {
      this.sweepDeadlineReminders().catch((err) =>
        logger.error({ err }, 'Error in periodic deadline sweep')
      );
    }, 15 * 60 * 1000);

    // Prevent intervals from keeping node alive if shutting down
    if (this.paymentInterval.unref) this.paymentInterval.unref();
    if (this.deadlineInterval.unref) this.deadlineInterval.unref();
  }

  stop(): void {
    if (this.paymentInterval) {
      clearInterval(this.paymentInterval);
      this.paymentInterval = null;
    }
    if (this.deadlineInterval) {
      clearInterval(this.deadlineInterval);
      this.deadlineInterval = null;
    }
    logger.info('Background jobs worker stopped.');
  }

  /**
   * Recovers and settles any dangling PENDING contributions older than 15 seconds.
   */
  async sweepPendingPayments(): Promise<number> {
    if (this.isProcessingPayments) return 0;
    this.isProcessingPayments = true;

    try {
      const fifteenSecondsAgo = new Date(Date.now() - 15 * 1000);
      const pendingEvents = await prisma.campaignEvent.findMany({
        where: {
          type: 'PAYMENT_VERIFICATION_PENDING',
          createdAt: { lte: fifteenSecondsAgo },
        },
        take: 20,
      });

      const pendingContributionIds = pendingEvents
        .map((e) => (e.payload as { contributionId?: string })?.contributionId)
        .filter((id): id is string => Boolean(id));

      if (pendingContributionIds.length === 0) {
        return 0;
      }

      const pendingContributions = await prisma.contribution.findMany({
        where: {
          id: { in: pendingContributionIds },
          status: 'PENDING',
        },
      });

      if (pendingContributions.length === 0) {
        return 0;
      }

      logger.info(`Found ${pendingContributions.length} pending contributions to settle...`);

      let settledCount = 0;
      for (const contrib of pendingContributions) {
        try {
          await contributionService.settleContribution(contrib.id, 'Simulated Card', '3220');
          settledCount++;
          logger.info(`Recovered and settled pending contribution: ${contrib.id}`);
        } catch (err) {
          logger.error({ err }, `Failed to settle pending contribution ${contrib.id}`);
        }
      }

      return settledCount;
    } finally {
      this.isProcessingPayments = false;
    }
  }

  /**
   * Emits DEADLINE_APPROACHING notifications for active campaigns ending within 24 hours.
   */
  async sweepDeadlineReminders(): Promise<number> {
    if (this.isProcessingDeadlines) return 0;
    this.isProcessingDeadlines = true;

    try {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const campaigns = await prisma.campaign.findMany({
        where: {
          status: 'FUNDING',
          endsAt: {
            gt: now,
            lte: in24Hours,
          },
        },
        select: {
          id: true,
          title: true,
          creatorId: true,
          endsAt: true,
        },
      });

      let notifiedCount = 0;
      for (const campaign of campaigns) {
        // Check if deadline notification has already been generated
        const existingNotification = await prisma.notification.findFirst({
          where: {
            campaignId: campaign.id,
            type: 'DEADLINE_APPROACHING',
          },
        });

        if (!existingNotification) {
          await prisma.$transaction(async (tx) => {
            await tx.notification.create({
              data: {
                userId: campaign.creatorId,
                type: 'DEADLINE_APPROACHING',
                title: 'Funding deadline in 24 hours',
                body: `Your campaign "${campaign.title}" has less than 24 hours remaining to reach its goal.`,
                campaignId: campaign.id,
              },
            });

            await tx.campaignEvent.create({
              data: {
                campaignId: campaign.id,
                type: 'DEADLINE_APPROACHING',
                payload: {
                  endsAt: campaign.endsAt,
                  notifiedAt: now.toISOString(),
                },
              },
            });
          });

          notifiedCount++;
          logger.info(`Dispatched DEADLINE_APPROACHING notification for campaign ${campaign.id}`);
        }
      }

      return notifiedCount;
    } finally {
      this.isProcessingDeadlines = false;
    }
  }
}

export const jobsService = new JobsService();
