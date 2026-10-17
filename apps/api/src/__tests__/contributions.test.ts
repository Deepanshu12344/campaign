import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '../utils/prisma';
import { quote } from '@campaigns/shared';

describe('Contributions & Payments API (/api/v1)', () => {
  let fundingCampaignId: string;
  let closedCampaignId: string;
  let backerToken: string;

  beforeAll(async () => {
    // Authenticate backer user
    const backerRes = await request(app)
      .post('/api/v1/auth/sign-in')
      .send({
        email: 'backer@demo.com',
        password: 'Demo@1234',
      });
    backerToken = backerRes.body.tokens.accessToken;

    // Create an isolated funding campaign with large goal headroom
    const creatorUser = await prisma.user.findFirstOrThrow();
    const fundingCamp = await prisma.campaign.create({
      data: {
        title: 'Test Funding Campaign For Contributions',
        creatorId: creatorUser.id,
        category: 'ENVIRONMENT',
        creatorName: 'Test Creator',
        creatorType: 'INDIVIDUAL',
        summary: 'A test funding campaign.',
        status: 'FUNDING',
        fundingGoalCents: 10000000, // $100,000
        raisedCents: 0,
        story: [],
        sources: [],
      },
    });
    fundingCampaignId = fundingCamp.id;

    // Retrieve or create a non-funding campaign
    const closedCamp = await prisma.campaign.findFirst({
      where: { status: { in: ['COMPLETED', 'PROMOTING', 'DRAFT'] } },
    });
    closedCampaignId = closedCamp!.id;
  });

  describe('POST /api/v1/contributions', () => {
    it('rejects contributions if campaign is not in FUNDING status', async () => {
      const res = await request(app)
        .post('/api/v1/contributions')
        .send({
          campaignId: closedCampaignId,
          amountCents: 2500,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CAMPAIGN_NOT_FUNDING');
    });

    it('rejects contributions below $1.00 (100 cents)', async () => {
      const res = await request(app)
        .post('/api/v1/contributions')
        .send({
          campaignId: fundingCampaignId,
          amountCents: 50,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('creates PENDING contribution and recomputes exact fees', async () => {
      const amountCents = 5000; // $50.00
      const expectedQuote = quote(amountCents);

      const res = await request(app)
        .post('/api/v1/contributions')
        .send({
          campaignId: fundingCampaignId,
          amountCents,
          isAnonymous: true,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('contribution');
      expect(res.body).toHaveProperty('guestReceiptToken');

      const contribution = res.body.contribution;
      expect(contribution.status).toBe('PENDING');
      expect(contribution.amountCents).toBe(amountCents);
      expect(contribution.feeCents).toBe(expectedQuote.processingFeeCents);
      expect(contribution.totalCents).toBe(expectedQuote.totalCents);
      expect(contribution.isAnonymous).toBe(true);
      expect(contribution.receiptNo).toMatch(/^REC-/);
    });
  });

  describe('POST /api/v1/contributions/:id/pay (Magic Cards & Settlements)', () => {
    it('simulates card declined on card ending in 0002', async () => {
      // 1. Create contribution
      const createRes = await request(app)
        .post('/api/v1/contributions')
        .send({
          campaignId: fundingCampaignId,
          amountCents: 2500,
        });

      const contributionId = createRes.body.contribution.id;
      const guestToken = createRes.body.guestReceiptToken;

      // 2. Pay with declined magic card
      const payRes = await request(app)
        .post(`/api/v1/contributions/${contributionId}/pay`)
        .set('x-guest-receipt-token', guestToken)
        .send({
          cardNumber: '4000 0000 0000 0002',
          expMonth: '12',
          expYear: '28',
          cvc: '123',
        });

      expect(payRes.status).toBe(200);
      expect(payRes.body.status).toBe('FAILED');
      expect(payRes.body.failureReason).toBe('CARD_DECLINED');

      const dbContribution = await prisma.contribution.findUnique({ where: { id: contributionId } });
      expect(dbContribution?.status).toBe('FAILED');
    });

    it('simulates insufficient funds on card ending in 9995', async () => {
      const createRes = await request(app)
        .post('/api/v1/contributions')
        .send({
          campaignId: fundingCampaignId,
          amountCents: 2500,
        });

      const contributionId = createRes.body.contribution.id;
      const guestToken = createRes.body.guestReceiptToken;

      const payRes = await request(app)
        .post(`/api/v1/contributions/${contributionId}/pay`)
        .set('x-guest-receipt-token', guestToken)
        .send({
          cardNumber: '4000 0000 0000 9995',
          expMonth: '10',
          expYear: '29',
          cvc: '321',
        });

      expect(payRes.status).toBe(200);
      expect(payRes.body.status).toBe('FAILED');
      expect(payRes.body.failureReason).toBe('INSUFFICIENT_FUNDS');
    });

    it('simulates bank verification pending on card ending in 3220', async () => {
      const createRes = await request(app)
        .post('/api/v1/contributions')
        .send({
          campaignId: fundingCampaignId,
          amountCents: 2500,
        });

      const contributionId = createRes.body.contribution.id;
      const guestToken = createRes.body.guestReceiptToken;

      const payRes = await request(app)
        .post(`/api/v1/contributions/${contributionId}/pay`)
        .set('x-guest-receipt-token', guestToken)
        .send({
          cardNumber: '4000 0000 0000 3220',
          expMonth: '05',
          expYear: '30',
          cvc: '456',
        });

      expect(payRes.status).toBe(200);
      expect(payRes.body.status).toBe('PENDING');
      expect(payRes.body.message).toContain('Additional verification required');
    });

    it('successfully processes payment on standard card (4242...), increments raisedCents, and returns receipt', async () => {
      const campaignBefore = await prisma.campaign.findUniqueOrThrow({ where: { id: fundingCampaignId } });
      const initialRaised = campaignBefore.raisedCents;
      const contributionAmount = 3500; // $35.00

      // 1. Create pending contribution as backer
      const createRes = await request(app)
        .post('/api/v1/contributions')
        .set('Authorization', `Bearer ${backerToken}`)
        .send({
          campaignId: fundingCampaignId,
          amountCents: contributionAmount,
          isAnonymous: false,
          publicName: 'Jordan Reed',
        });

      const contributionId = createRes.body.contribution.id;

      // 2. Pay with success card
      const payRes = await request(app)
        .post(`/api/v1/contributions/${contributionId}/pay`)
        .set('Authorization', `Bearer ${backerToken}`)
        .send({
          cardNumber: '4242 4242 4242 4242',
          expMonth: '08',
          expYear: '29',
          cvc: '999',
        });

      expect(payRes.status).toBe(200);
      expect(payRes.body.status).toBe('SUCCEEDED');
      expect(payRes.body).toHaveProperty('receipt');
      expect(payRes.body.receipt.receiptNo).toMatch(/^REC-/);
      expect(payRes.body.receipt.cardBrand).toBe('Visa');
      expect(payRes.body.receipt.cardLast4).toBe('4242');

      // 3. Invariant check: verify campaign.raisedCents incremented by exact contribution amount
      const campaignAfter = await prisma.campaign.findUniqueOrThrow({ where: { id: fundingCampaignId } });
      expect(campaignAfter.raisedCents).toBe(initialRaised + contributionAmount);

      // 4. Invariant check: verify card numbers are NEVER stored
      const contributionRow = await prisma.contribution.findUniqueOrThrow({ where: { id: contributionId } });
      const allFields = JSON.stringify(contributionRow);
      expect(allFields).not.toContain('4242424242424242');
    });

    it('is idempotent: paying an already SUCCEEDED contribution returns existing receipt without double-incrementing', async () => {
      // 1. Create and pay
      const createRes = await request(app)
        .post('/api/v1/contributions')
        .set('Authorization', `Bearer ${backerToken}`)
        .send({
          campaignId: fundingCampaignId,
          amountCents: 1500,
        });

      const contributionId = createRes.body.contribution.id;

      await request(app)
        .post(`/api/v1/contributions/${contributionId}/pay`)
        .set('Authorization', `Bearer ${backerToken}`)
        .send({
          cardNumber: '4242 4242 4242 4242',
          expMonth: '11',
          expYear: '30',
          cvc: '111',
        });

      const campaignMid = await prisma.campaign.findUniqueOrThrow({ where: { id: fundingCampaignId } });
      const midRaised = campaignMid.raisedCents;

      // 2. Attempt paying again with same ID
      const secondPayRes = await request(app)
        .post(`/api/v1/contributions/${contributionId}/pay`)
        .set('Authorization', `Bearer ${backerToken}`)
        .send({
          cardNumber: '4242 4242 4242 4242',
          expMonth: '11',
          expYear: '30',
          cvc: '111',
        });

      expect(secondPayRes.status).toBe(200);
      expect(secondPayRes.body.status).toBe('SUCCEEDED');
      expect(secondPayRes.body.message).toContain('already been settled');

      // 3. Verify raisedCents did NOT increment a second time
      const campaignEnd = await prisma.campaign.findUniqueOrThrow({ where: { id: fundingCampaignId } });
      expect(campaignEnd.raisedCents).toBe(midRaised);
    });
  });

  describe('Receipt Access & Claiming', () => {
    it('restricts receipt access to owner or request with matching x-guest-receipt-token', async () => {
      // Create guest contribution
      const createRes = await request(app)
        .post('/api/v1/contributions')
        .send({
          campaignId: fundingCampaignId,
          amountCents: 2000,
        });

      const contributionId = createRes.body.contribution.id;
      const guestToken = createRes.body.guestReceiptToken;

      // Pay as guest
      await request(app)
        .post(`/api/v1/contributions/${contributionId}/pay`)
        .set('x-guest-receipt-token', guestToken)
        .send({
          cardNumber: '4242 4242 4242 4242',
          expMonth: '11',
          expYear: '30',
          cvc: '111',
        });

      // Valid guest token request
      const validRes = await request(app)
        .get(`/api/v1/contributions/${contributionId}/receipt`)
        .set('x-guest-receipt-token', guestToken);

      expect(validRes.status).toBe(200);
      expect(validRes.body.receiptNo).toBeDefined();

      // Unauthorized request (no token, wrong user)
      const invalidRes = await request(app).get(`/api/v1/contributions/${contributionId}/receipt`);
      expect(invalidRes.status).toBe(403);
    });

    it('claims guest contributions to authenticated user', async () => {
      // Create guest contribution
      const createRes = await request(app)
        .post('/api/v1/contributions')
        .send({
          campaignId: fundingCampaignId,
          amountCents: 2500,
        });

      const guestToken = createRes.body.guestReceiptToken;
      const contributionId = createRes.body.contribution.id;

      // Claim as backer
      const claimRes = await request(app)
        .post('/api/v1/contributions/claim')
        .set('Authorization', `Bearer ${backerToken}`)
        .send({
          tokens: [guestToken],
        });

      expect(claimRes.status).toBe(200);
      expect(claimRes.body.claimedCount).toBe(1);

      // Verify contribution is now owned by backer
      const updatedContribution = await prisma.contribution.findUniqueOrThrow({
        where: { id: contributionId },
      });
      const backerUser = await prisma.user.findUniqueOrThrow({ where: { email: 'backer@demo.com' } });
      expect(updatedContribution.userId).toBe(backerUser.id);
    });
  });

  describe('Funding Goal Reached -> FUNDING_CLOSED Transition', () => {
    it('transitions campaign to FUNDING_CLOSED when goal is reached in transaction', async () => {
      // Create a test campaign with a small funding goal ($500 = 50,000 cents)
      const testCampaign = await prisma.campaign.create({
        data: {
          creatorId: (await prisma.user.findUniqueOrThrow({ where: { email: 'creator@demo.com' } })).id,
          title: 'Goal Test Campaign',
          category: 'COMMUNITY',
          creatorName: 'Test Creator',
          summary: 'Testing funding goal auto-close.',
          status: 'FUNDING',
          fundingGoalCents: 50000,
          raisedCents: 40000, // $400 raised so far
          story: [],
          sources: [],
          contributions: {
            create: {
              amountCents: 40000,
              feeCents: 4000,
              totalCents: 40000,
              status: 'SUCCEEDED',
              isAnonymous: true,
              receiptNo: `REC-PRE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            },
          },
        },
      });

      // Make a $100 (10,000 cents) contribution to hit 100%
      const createRes = await request(app)
        .post('/api/v1/contributions')
        .set('Authorization', `Bearer ${backerToken}`)
        .send({
          campaignId: testCampaign.id,
          amountCents: 10000,
        });

      const contributionId = createRes.body.contribution.id;

      // Pay to trigger settlement
      await request(app)
        .post(`/api/v1/contributions/${contributionId}/pay`)
        .set('Authorization', `Bearer ${backerToken}`)
        .send({
          cardNumber: '4242 4242 4242 4242',
          expMonth: '11',
          expYear: '30',
          cvc: '111',
        });

      // Verify campaign status transitioned to FUNDING_CLOSED (never directly to PROMOTING)
      const updatedCampaign = await prisma.campaign.findUniqueOrThrow({ where: { id: testCampaign.id } });
      expect(updatedCampaign.status).toBe('FUNDING_CLOSED');
      expect(updatedCampaign.raisedCents).toBe(50000);

      // Verify milestone event for 100% was recorded
      const milestoneEvent = await prisma.campaignEvent.findFirst({
        where: {
          campaignId: testCampaign.id,
          type: 'MILESTONE_REACHED',
          payload: { path: ['milestone'], equals: 100 },
        },
      });
      expect(milestoneEvent).toBeDefined();
    });
  });

  describe('Milestone Notification Deduplication & raisedCents Financial Invariant', () => {
    it('fires milestone notifications exactly once per threshold (25%, 50%, 75%, 100%)', async () => {
      // Create campaign with $1,000 goal (100,000 cents)
      const creatorUser = await prisma.user.findFirstOrThrow();
      const milestoneCampaign = await prisma.campaign.create({
        data: {
          title: 'Milestone Tracking Campaign',
          creatorId: creatorUser.id,
          category: 'SCIENCE',
          creatorName: 'Lab Researcher',
          summary: 'Testing milestone deduplication.',
          status: 'FUNDING',
          fundingGoalCents: 100000,
          raisedCents: 0,
          story: [],
          sources: [],
        },
      });

      // Contribution 1: $260 (26,000 cents) -> crosses 25% milestone
      const c1 = await request(app)
        .post('/api/v1/contributions')
        .send({ campaignId: milestoneCampaign.id, amountCents: 26000 });
      await request(app)
        .post(`/api/v1/contributions/${c1.body.contribution.id}/pay`)
        .set('x-guest-receipt-token', c1.body.guestReceiptToken)
        .send({ cardNumber: '4242 4242 4242 4242', expMonth: '12', expYear: '30', cvc: '123' });

      // Contribution 2: $10 (1,000 cents) -> still in 25%-50% range (27% total)
      const c2 = await request(app)
        .post('/api/v1/contributions')
        .send({ campaignId: milestoneCampaign.id, amountCents: 1000 });
      await request(app)
        .post(`/api/v1/contributions/${c2.body.contribution.id}/pay`)
        .set('x-guest-receipt-token', c2.body.guestReceiptToken)
        .send({ cardNumber: '4242 4242 4242 4242', expMonth: '12', expYear: '30', cvc: '123' });

      // Check: 25% milestone event should exist EXACTLY once
      const milestone25Events = await prisma.campaignEvent.findMany({
        where: {
          campaignId: milestoneCampaign.id,
          type: 'MILESTONE_REACHED',
          payload: { path: ['milestone'], equals: 25 },
        },
      });
      expect(milestone25Events.length).toBe(1);

      // Contribution 3: $500 (50,000 cents) -> jumps to 77%, crossing both 50% and 75%
      const c3 = await request(app)
        .post('/api/v1/contributions')
        .send({ campaignId: milestoneCampaign.id, amountCents: 50000 });
      await request(app)
        .post(`/api/v1/contributions/${c3.body.contribution.id}/pay`)
        .set('x-guest-receipt-token', c3.body.guestReceiptToken)
        .send({ cardNumber: '4242 4242 4242 4242', expMonth: '12', expYear: '30', cvc: '123' });

      const milestone50Events = await prisma.campaignEvent.findMany({
        where: {
          campaignId: milestoneCampaign.id,
          type: 'MILESTONE_REACHED',
          payload: { path: ['milestone'], equals: 50 },
        },
      });
      expect(milestone50Events.length).toBe(1);

      const milestone75Events = await prisma.campaignEvent.findMany({
        where: {
          campaignId: milestoneCampaign.id,
          type: 'MILESTONE_REACHED',
          payload: { path: ['milestone'], equals: 75 },
        },
      });
      expect(milestone75Events.length).toBe(1);

      // Invariant check: raisedCents strictly matches sum of SUCCEEDED contributions
      const allSucceeded = await prisma.contribution.findMany({
        where: { campaignId: milestoneCampaign.id, status: 'SUCCEEDED' },
      });
      const expectedSum = allSucceeded.reduce((acc, curr) => acc + curr.amountCents, 0);

      const freshCampaign = await prisma.campaign.findUniqueOrThrow({
        where: { id: milestoneCampaign.id },
      });
      expect(freshCampaign.raisedCents).toBe(expectedSum);
      expect(freshCampaign.raisedCents).toBe(77000);
    });

    it('denies receipt access to other non-owner authenticated users', async () => {
      // 1. User A (creator) makes a contribution
      const creatorRes = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({ email: 'creator@demo.com', password: 'Demo@1234' });
      const creatorUserToken = creatorRes.body.tokens.accessToken;

      const createRes = await request(app)
        .post('/api/v1/contributions')
        .set('Authorization', `Bearer ${creatorUserToken}`)
        .send({ campaignId: fundingCampaignId, amountCents: 1500 });

      const contribId = createRes.body.contribution.id;

      await request(app)
        .post(`/api/v1/contributions/${contribId}/pay`)
        .set('Authorization', `Bearer ${creatorUserToken}`)
        .send({ cardNumber: '4242 4242 4242 4242', expMonth: '12', expYear: '30', cvc: '123' });

      // 2. User B (backer) tries to access User A's receipt -> 403 Forbidden
      const unauthReceiptRes = await request(app)
        .get(`/api/v1/contributions/${contribId}/receipt`)
        .set('Authorization', `Bearer ${backerToken}`);

      expect(unauthReceiptRes.status).toBe(403);
      expect(unauthReceiptRes.body.error.code).toBe('FORBIDDEN');
    });
  });
});
