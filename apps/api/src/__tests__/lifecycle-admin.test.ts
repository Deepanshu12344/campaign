import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '../utils/prisma';

describe('Admin & Complete Lifecycle Execution API (/api/v1)', () => {
  let adminToken: string;
  let creatorToken: string;
  let creatorUserId: string;

  beforeAll(async () => {
    // Authenticate Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/sign-in')
      .send({
        email: 'admin@demo.com',
        password: 'Demo@1234',
      });
    adminToken = adminRes.body.tokens.accessToken;

    // Authenticate Creator
    const creatorRes = await request(app)
      .post('/api/v1/auth/sign-in')
      .send({
        email: 'creator@demo.com',
        password: 'Demo@1234',
      });
    creatorToken = creatorRes.body.tokens.accessToken;
    creatorUserId = creatorRes.body.user.id;
  });

  describe('GET /api/v1/admin/queue', () => {
    it('requires ADMIN role (rejects non-admin with 403)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/queue')
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(res.status).toBe(403);
    });

    it('returns queue items for admin', async () => {
      const res = await request(app)
        .get('/api/v1/admin/queue')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Complete End-to-End Campaign Lifecycle Execution', () => {
    let campaignId: string;

    it('Step 1: DRAFT -> Creator creates empty draft', async () => {
      const res = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('DRAFT');
      campaignId = res.body.id;
    });

    it('Step 2: DRAFT -> Creator fills all 5 steps via autosave', async () => {
      const storyText =
        'Neighborhood tree planting reduces summer heat, absorbs stormwater, and restores community pride. '.repeat(4);

      const res = await request(app)
        .patch(`/api/v1/campaigns/${campaignId}/draft`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Urban Canopy Forest Initiative',
          category: 'Environment',
          summary: 'Planting 500 shade trees across neighborhood parks and sidewalks.',
          coverUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09',
          fundingGoalCents: 50000, // $500
          story: [
            { type: 'heading', level: 1, text: 'Cooling Our Neighborhood Streets' },
            { type: 'paragraph', text: storyText },
          ],
          sources: [
            {
              title: 'Urban Forestry Heat Island Study',
              url: 'https://example.com/urban-forestry',
            },
          ],
          adCreative: {
            headline: 'Plant Shade Trees Together',
            description: 'Help cool our local neighborhood sidewalks this summer.',
            cta: 'Join Campaign',
            images: ['https://images.unsplash.com/photo-1542601906990-b4d3fb778b09'],
          },
          reach: {
            locations: ['East Austin, TX'],
            channels: ['Meta Feed', 'Google Search'],
            budgetAllocation: { meta: 50, google: 50 },
            durationDays: 30,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Urban Canopy Forest Initiative');
    });

    it('Step 3: SUBMIT -> Creator submits campaign for reviewer verification', async () => {
      const res = await request(app)
        .post(`/api/v1/campaigns/${campaignId}/submit`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ acceptedRules: true });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('SUBMITTED');
    });

    it('Step 4: APPROVE -> Admin approves campaign, transitioning SUBMITTED -> APPROVED -> FUNDING', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/campaigns/${campaignId}/decision`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          decision: 'APPROVE',
          notes: 'Story, sources, and ad creatives meet all platform publication standards.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dbCampaign = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
      expect(dbCampaign.status).toBe('FUNDING');
      expect(dbCampaign.startsAt).not.toBeNull();
      expect(dbCampaign.endsAt).not.toBeNull();
    });

    it('Step 5: BACK -> Community backs campaign to 100% goal, transitioning to FUNDING_CLOSED', async () => {
      // Create contribution matching full goal ($500 = 50,000 cents)
      const contribRes = await request(app)
        .post('/api/v1/contributions')
        .send({
          campaignId,
          amountCents: 50000,
        });

      const contributionId = contribRes.body.contribution.id;
      const guestToken = contribRes.body.guestReceiptToken;

      // Pay with success magic card
      const payRes = await request(app)
        .post(`/api/v1/contributions/${contributionId}/pay`)
        .set('x-guest-receipt-token', guestToken)
        .send({
          cardNumber: '4242 4242 4242 4242',
          expMonth: '12',
          expYear: '29',
          cvc: '123',
        });

      expect(payRes.status).toBe(200);
      expect(payRes.body.status).toBe('SUCCEEDED');

      // Verify campaign auto-transitioned to FUNDING_CLOSED (never directly to PROMOTING)
      const dbCampaign = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
      expect(dbCampaign.status).toBe('FUNDING_CLOSED');
      expect(dbCampaign.raisedCents).toBe(50000);
    });

    it('Step 6: ADVANCE -> FUNDING_CLOSED -> DISTRIBUTION_PREP', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/campaigns/${campaignId}/advance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Funds verified and settled' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('DISTRIBUTION_PREP');
    });

    it('Step 7: ADVANCE -> DISTRIBUTION_PREP -> PROMOTING', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/campaigns/${campaignId}/advance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Ad campaigns launched on Meta & Google' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PROMOTING');

      // Notification sent to creator
      const notif = await prisma.notification.findFirst({
        where: { campaignId, type: 'PROMOTION_STARTED' },
      });
      expect(notif).toBeDefined();
    });

    it('Step 8: ADVANCE -> PROMOTING -> COMPLETED (Finalized)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/campaigns/${campaignId}/advance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Ad run completed all scheduled impressions' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('COMPLETED');
    });

    it('Step 9: REPORT -> Public Performance Report is available with MEASURED reach', async () => {
      const res = await request(app).get(`/api/v1/campaigns/${campaignId}/report`);

      expect(res.status).toBe(200);
      expect(res.body.campaignId).toBe(campaignId);
      expect(res.body.fundsRaisedCents).toBe(50000);
      expect(res.body.platformFeeCents).toBe(5000); // 10%
      expect(res.body.adSpendCents).toBe(45000); // 90%
      expect(res.body.impressions).toBeGreaterThan(0);
      expect(res.body.reach).toBeGreaterThan(0);
      expect(res.body.reachType).toBe('MEASURED');
      expect(res.body.isDemo).toBe(true);
    });
  });

  describe('Admin Decision: Changes Requested & Rejections', () => {
    it('handles CHANGES_REQUESTED decision and notifies creator', async () => {
      // Create and submit a draft
      const draft = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({});

      const testId = draft.body.id;

      await request(app)
        .patch(`/api/v1/campaigns/${testId}/draft`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Changes Requested Test',
          category: 'Health',
          summary: 'Testing changes requested flow.',
          coverUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276',
          fundingGoalCents: 50000,
          story: [
            { type: 'heading', level: 1, text: 'Health Heading' },
            { type: 'paragraph', text: 'A'.repeat(301) },
          ],
          sources: [{ title: 'Source', url: 'https://example.com' }],
          adCreative: {
            headline: 'Ad Headline',
            description: 'Ad Description',
            cta: 'Click',
            images: ['https://images.unsplash.com/photo-1509391365360-2e959784a276'],
          },
          reach: {
            locations: ['Austin'],
            channels: ['Meta'],
            budgetAllocation: { meta: 100 },
            durationDays: 14,
          },
        });

      await request(app)
        .post(`/api/v1/campaigns/${testId}/submit`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ acceptedRules: true });

      // Reviewer requests changes
      const decisionRes = await request(app)
        .post(`/api/v1/admin/campaigns/${testId}/decision`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          decision: 'CHANGES_REQUESTED',
          notes: 'Please add a peer-reviewed medical source.',
        });

      expect(decisionRes.status).toBe(200);

      const updated = await prisma.campaign.findUniqueOrThrow({ where: { id: testId } });
      expect(updated.status).toBe('CHANGES_REQUESTED');
      expect(updated.reviewNotes).toBe('Please add a peer-reviewed medical source.');
    });
  });

  describe('Pending Revision Re-Review Gate', () => {
    it('approving a pending revision updates live fields and bumps version', async () => {
      // Find or create a funding campaign
      const camp = await prisma.campaign.create({
        data: {
          creatorId: creatorUserId,
          title: 'Live Campaign Before Revision',
          category: 'EDUCATION',
          creatorName: 'Demo Creator',
          summary: 'Summary before revision.',
          status: 'FUNDING',
          fundingGoalCents: 50000,
          version: 1,
          story: [],
          sources: [],
          pendingRevision: {
            title: 'Live Campaign After Revision Approved',
            summary: 'Updated summary after approved revision.',
          },
        },
      });

      // Admin approves revision
      const res = await request(app)
        .post(`/api/v1/admin/campaigns/${camp.id}/decision`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          decision: 'APPROVE',
          notes: 'Revision verified and approved.',
        });

      expect(res.status).toBe(200);

      // Verify live campaign has the new title and version bumped
      const updated = await prisma.campaign.findUniqueOrThrow({ where: { id: camp.id } });
      expect(updated.title).toBe('Live Campaign After Revision Approved');
      expect(updated.summary).toBe('Updated summary after approved revision.');
      expect(updated.version).toBe(2);
      expect(updated.pendingRevision).toBeNull();
    });
  });

  describe('Invalid Lifecycle Transitions & Advancement Guards', () => {
    it('rejects advancing a campaign in DRAFT or FUNDING status', async () => {
      // 1. Create a draft campaign
      const draftCamp = await prisma.campaign.create({
        data: {
          creatorId: creatorUserId,
          title: 'Draft Campaign For Invalid Advance',
          category: 'ENVIRONMENT',
          creatorName: 'Demo Creator',
          summary: 'Testing invalid advance guard.',
          status: 'DRAFT',
          fundingGoalCents: 50000,
          story: [],
          sources: [],
        },
      });

      const draftAdvanceRes = await request(app)
        .post(`/api/v1/admin/campaigns/${draftCamp.id}/advance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Illegal advancement from DRAFT' });

      expect(draftAdvanceRes.status).toBe(400);
      expect(draftAdvanceRes.body.error.message).toContain('Cannot advance campaign from status DRAFT');

      // 2. FUNDING status campaign cannot be advanced via admin advance (must close via funding completion)
      const fundingCamp = await prisma.campaign.create({
        data: {
          creatorId: creatorUserId,
          title: 'Funding Campaign For Invalid Advance',
          category: 'ENVIRONMENT',
          creatorName: 'Demo Creator',
          summary: 'Testing funding advance guard.',
          status: 'FUNDING',
          fundingGoalCents: 50000,
          story: [],
          sources: [],
        },
      });

      const fundingAdvanceRes = await request(app)
        .post(`/api/v1/admin/campaigns/${fundingCamp.id}/advance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Illegal advancement from FUNDING' });

      expect(fundingAdvanceRes.status).toBe(400);
      expect(fundingAdvanceRes.body.error.message).toContain('Cannot advance campaign from status FUNDING');
    });

    it('rejects submitting a campaign that is already published or completed', async () => {
      const activeCamp = await prisma.campaign.findFirst({
        where: { status: { in: ['FUNDING', 'PROMOTING', 'COMPLETED'] }, creatorId: creatorUserId },
      });

      if (activeCamp) {
        const res = await request(app)
          .post(`/api/v1/campaigns/${activeCamp.id}/submit`)
          .set('Authorization', `Bearer ${creatorToken}`)
          .send({ acceptedRules: true });

        expect(res.status).toBe(400);
        expect(res.body.error.message).toContain('Only campaigns in DRAFT or CHANGES_REQUESTED status can be submitted');
      }
    });
  });

  describe('Comprehensive Role-Based Access Control on All Admin Routes', () => {
    const dummyId = '00000000-0000-0000-0000-000000000000';

    it('blocks non-admin users with 403 on all /admin endpoints', async () => {
      const adminEndpoints = [
        { method: 'get', path: '/api/v1/admin/queue', body: undefined },
        { method: 'get', path: '/api/v1/admin/lifecycle', body: undefined },
        { method: 'get', path: `/api/v1/admin/campaigns/${dummyId}/audit`, body: undefined },
        { method: 'post', path: `/api/v1/admin/campaigns/${dummyId}/decision`, body: { decision: 'APPROVE' } },
        { method: 'post', path: `/api/v1/admin/campaigns/${dummyId}/advance`, body: {} },
        { method: 'post', path: `/api/v1/admin/campaigns/${dummyId}/simulate-report`, body: {} },
        { method: 'post', path: `/api/v1/admin/campaigns/${dummyId}/simulate-fund-goal`, body: {} },
        { method: 'post', path: '/api/v1/admin/reset-demo', body: {} },
      ];

      for (const endpoint of adminEndpoints) {
        const req = endpoint.method === 'get' ? request(app).get(endpoint.path) : request(app).post(endpoint.path);
        const res = endpoint.body
          ? await req.set('Authorization', `Bearer ${creatorToken}`).send(endpoint.body)
          : await req.set('Authorization', `Bearer ${creatorToken}`);

        expect(res.status).toBe(403);
      }
    });

    it('blocks unauthenticated requests with 401 on all /admin endpoints', async () => {
      const endpoints = [
        '/api/v1/admin/queue',
        '/api/v1/admin/lifecycle',
        `/api/v1/admin/campaigns/${dummyId}/audit`,
      ];

      for (const path of endpoints) {
        const res = await request(app).get(path);
        expect(res.status).toBe(401);
      }
    });
  });
});
