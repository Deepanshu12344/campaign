import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '../utils/prisma';
import { quote } from '@campaigns/shared';

describe('Campaigns & Config API (/api/v1)', () => {
  let creatorToken: string;
  let fundingCampaignId: string;
  let promotingCampaignId: string;
  let draftCampaignId: string;

  beforeAll(async () => {
    // Authenticate creator
    const signInRes = await request(app)
      .post('/api/v1/auth/sign-in')
      .send({
        email: 'creator@demo.com',
        password: 'Demo@1234',
      });
    creatorToken = signInRes.body.tokens.accessToken;

    // Retrieve seeded campaign IDs
    const fundingCamp = await prisma.campaign.findFirst({
      where: { status: 'FUNDING' },
    });
    fundingCampaignId = fundingCamp!.id;

    const promotingCamp = await prisma.campaign.findFirst({
      where: { status: 'PROMOTING' },
    });
    promotingCampaignId = promotingCamp!.id;

    const draftCamp = await prisma.campaign.findFirst({
      where: { status: 'DRAFT' },
    });
    draftCampaignId = draftCamp!.id;
  });

  describe('GET /api/v1/config/estimates', () => {
    it('returns shared estimate config', async () => {
      const res = await request(app).get('/api/v1/config/estimates');
      expect(res.status).toBe(200);
      expect(res.body.platformFeePct).toBe(0.1);
      expect(res.body.cpm).toBe(6);
      expect(res.body.avgFrequency).toBe(2.2);
      expect(res.body.presetAmounts).toEqual([5, 10, 25, 50, 100]);
    });
  });

  describe('GET /api/v1/campaigns', () => {
    it('returns public campaigns and NEVER returns DRAFT, SUBMITTED, or CHANGES_REQUESTED', async () => {
      const res = await request(app).get('/api/v1/campaigns?limit=50');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('categoryCounts');

      const statuses = res.body.items.map((item: { status: string }) => item.status);
      expect(statuses).not.toContain('DRAFT');
      expect(statuses).not.toContain('SUBMITTED');
      expect(statuses).not.toContain('CHANGES_REQUESTED');

      for (const item of res.body.items) {
        expect(['FUNDING', 'PROMOTING', 'COMPLETED', 'FUNDING_CLOSED', 'DISTRIBUTION_PREP']).toContain(
          item.status
        );
        expect(item).toHaveProperty('percentFunded');
        expect(item).toHaveProperty('estimatedReachLow');
        expect(item).toHaveProperty('estimatedReachHigh');
      }
    });

    it('paginates correctly with total and page metadata', async () => {
      const res = await request(app).get('/api/v1/campaigns?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(2);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(2);
      expect(res.body.hasNextPage).toBe(true);
    });

    it('filters by category', async () => {
      const res = await request(app).get('/api/v1/campaigns?category=Health');
      expect(res.status).toBe(200);
      for (const item of res.body.items) {
        expect(item.category).toBe('Health');
      }
    });

    it('filters by status', async () => {
      const res = await request(app).get('/api/v1/campaigns?status=PROMOTING');
      expect(res.status).toBe(200);
      for (const item of res.body.items) {
        expect(item.status).toBe('PROMOTING');
      }
    });

    it('returns empty items when anonymous user requests a non-public status like DRAFT', async () => {
      const res = await request(app).get('/api/v1/campaigns?status=DRAFT');
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(0);
      expect(res.body.total).toBe(0);
    });

    it('filters by min and max funding goal', async () => {
      const res = await request(app).get('/api/v1/campaigns?minGoal=200000&maxGoal=400000');
      expect(res.status).toBe(200);
      for (const item of res.body.items) {
        expect(item.fundingGoalCents).toBeGreaterThanOrEqual(200000);
        expect(item.fundingGoalCents).toBeLessThanOrEqual(400000);
      }
    });

    it('searches server-side across title, summary, creatorName, and story text', async () => {
      // Search for Jackson water campaign
      const res = await request(app).get('/api/v1/campaigns?search=Jackson');
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThan(0);
      expect(res.body.items[0].title).toContain('Jackson');
    });

    it('sorts by most_funded (raisedCents descending)', async () => {
      const res = await request(app).get('/api/v1/campaigns?sort=most_funded&limit=10');
      expect(res.status).toBe(200);
      const items = res.body.items;
      for (let i = 0; i < items.length - 1; i++) {
        expect(items[i].raisedCents).toBeGreaterThanOrEqual(items[i + 1].raisedCents);
      }
    });

    it('sorts by newest', async () => {
      const res = await request(app).get('/api/v1/campaigns?sort=newest&limit=5');
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThan(0);
    });

    it('sorts by closest_to_goal', async () => {
      const res = await request(app).get('/api/v1/campaigns?sort=closest_to_goal&limit=5');
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThan(0);
    });

    it('returns categoryCounts with all 10 categories present', async () => {
      const res = await request(app).get('/api/v1/campaigns');
      expect(res.status).toBe(200);
      expect(res.body.categoryCounts).toHaveProperty('Health');
      expect(res.body.categoryCounts).toHaveProperty('Environment');
      expect(res.body.categoryCounts).toHaveProperty('Public Policy');
      expect(res.body.categoryCounts).toHaveProperty('Education');
    });
  });

  describe('GET /api/v1/campaigns/featured', () => {
    it('returns featured campaigns in public statuses', async () => {
      const res = await request(app).get('/api/v1/campaigns/featured');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      for (const item of res.body) {
        expect(['FUNDING', 'PROMOTING']).toContain(item.status);
      }
    });
  });

  describe('GET /api/v1/campaigns/:id', () => {
    it('returns full campaign detail without exposing private backer identity', async () => {
      const res = await request(app).get(`/api/v1/campaigns/${fundingCampaignId}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(fundingCampaignId);
      expect(res.body).toHaveProperty('story');
      expect(Array.isArray(res.body.story)).toBe(true);
      expect(res.body).toHaveProperty('sources');
      expect(res.body).toHaveProperty('useOfFundsSummary');
      expect(res.body.useOfFundsSummary.platformFeePct).toBe(10);
      expect(res.body.useOfFundsSummary.adBudgetPct).toBe(90);
      expect(res.body).toHaveProperty('reviewSummary');
      expect(res.body).toHaveProperty('feedbackSummary');
      expect(res.body).toHaveProperty('backersSummary');
      expect(res.body.backersSummary).toHaveProperty('totalCount');
      expect(res.body.backersSummary.totalCount).toBeGreaterThan(0);

      // Verify privacy: no emails or private identifiers in recentPublicBackers
      for (const backer of res.body.backersSummary.recentPublicBackers) {
        expect(backer).toHaveProperty('publicName');
        expect(backer).not.toHaveProperty('email');
        expect(backer).not.toHaveProperty('userId');
        expect(backer).not.toHaveProperty('guestEmail');
      }
    });

    it('returns 404 when unauthenticated user requests a DRAFT campaign', async () => {
      const res = await request(app).get(`/api/v1/campaigns/${draftCampaignId}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 200 when creator requests their own DRAFT campaign', async () => {
      const res = await request(app)
        .get(`/api/v1/campaigns/${draftCampaignId}`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(draftCampaignId);
      expect(res.body.status).toBe('DRAFT');
    });

    it('returns 404 for non-existent campaign uuid', async () => {
      const res = await request(app).get('/api/v1/campaigns/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/campaigns/:id/quote', () => {
    it('calculates quote for a FUNDING campaign matching shared reach quote()', async () => {
      const amountCents = 2500; // $25.00
      const expected = quote(amountCents);

      const res = await request(app)
        .post(`/api/v1/campaigns/${fundingCampaignId}/quote`)
        .send({ amountCents });

      expect(res.status).toBe(200);
      expect(res.body.amountCents).toBe(expected.amountCents);
      expect(res.body.adBudgetCents).toBe(expected.adBudgetCents);
      expect(res.body.platformFeeCents).toBe(expected.platformFeeCents);
      expect(res.body.processingFeeCents).toBe(expected.processingFeeCents);
      expect(res.body.totalCents).toBe(expected.totalCents);
      expect(res.body.estimatedReachLow).toBe(expected.estimatedReachLow);
      expect(res.body.estimatedReachMid).toBe(expected.estimatedReachMid);
      expect(res.body.estimatedReachHigh).toBe(expected.estimatedReachHigh);
    });

    it('rejects quote when campaign is not in FUNDING status with CAMPAIGN_NOT_FUNDING', async () => {
      const res = await request(app)
        .post(`/api/v1/campaigns/${promotingCampaignId}/quote`)
        .send({ amountCents: 2500 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CAMPAIGN_NOT_FUNDING');
    });

    it('rejects quote with amount < 100 with VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post(`/api/v1/campaigns/${fundingCampaignId}/quote`)
        .send({ amountCents: 50 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields).toHaveProperty('amountCents');
    });
  });

  describe('POST /api/v1/campaigns/:id/feedback', () => {
    it('accepts feedback from guest', async () => {
      const res = await request(app)
        .post(`/api/v1/campaigns/${fundingCampaignId}/feedback`)
        .send({
          visualsEncouraged: 'YES',
          messageChanged: 'SOMEWHAT',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects invalid feedback input', async () => {
      const res = await request(app)
        .post(`/api/v1/campaigns/${fundingCampaignId}/feedback`)
        .send({
          visualsEncouraged: 'INVALID',
          messageChanged: 'NO',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Saved & Followed Campaigns (Auth Required)', () => {
    it('rejects save without auth', async () => {
      const res = await request(app).post(`/api/v1/campaigns/${fundingCampaignId}/save`);
      expect(res.status).toBe(401);
    });

    it('saves and unsaves campaign with auth', async () => {
      const saveRes = await request(app)
        .post(`/api/v1/campaigns/${fundingCampaignId}/save`)
        .set('Authorization', `Bearer ${creatorToken}`);
      expect(saveRes.status).toBe(200);
      expect(saveRes.body.saved).toBe(true);

      const unsaveRes = await request(app)
        .delete(`/api/v1/campaigns/${fundingCampaignId}/save`)
        .set('Authorization', `Bearer ${creatorToken}`);
      expect(unsaveRes.status).toBe(200);
      expect(unsaveRes.body.saved).toBe(false);
    });

    it('follows and unfollows campaign with auth', async () => {
      const followRes = await request(app)
        .post(`/api/v1/campaigns/${fundingCampaignId}/follow`)
        .set('Authorization', `Bearer ${creatorToken}`);
      expect(followRes.status).toBe(200);
      expect(followRes.body.following).toBe(true);

      const unfollowRes = await request(app)
        .delete(`/api/v1/campaigns/${fundingCampaignId}/follow`)
        .set('Authorization', `Bearer ${creatorToken}`);
      expect(unfollowRes.status).toBe(200);
      expect(unfollowRes.body.following).toBe(false);
    });
  });
});
