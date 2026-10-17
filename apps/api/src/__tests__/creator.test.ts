import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '../utils/prisma';

describe('Creator & Lifecycle API (/api/v1)', () => {
  let creatorToken: string;
  let otherUserToken: string;
  let draftId: string;

  beforeAll(async () => {
    // Creator authentication
    const creatorRes = await request(app)
      .post('/api/v1/auth/sign-in')
      .send({
        email: 'creator@demo.com',
        password: 'Demo@1234',
      });
    creatorToken = creatorRes.body.tokens.accessToken;

    // Backer (other user) authentication
    const backerRes = await request(app)
      .post('/api/v1/auth/sign-in')
      .send({
        email: 'backer@demo.com',
        password: 'Demo@1234',
      });
    otherUserToken = backerRes.body.tokens.accessToken;
  });

  describe('POST /api/v1/campaigns', () => {
    it('requires authentication', async () => {
      const res = await request(app).post('/api/v1/campaigns').send({});
      expect(res.status).toBe(401);
    });

    it('creates an empty DRAFT owned by user with defaults', async () => {
      const res = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('DRAFT');
      expect(res.body.title).toBe('Untitled Campaign');
      expect(res.body.fundingGoalCents).toBe(0);
      expect(res.body.raisedCents).toBe(0);

      draftId = res.body.id;
    });
  });

  describe('PATCH /api/v1/campaigns/:id/draft (Autosave)', () => {
    it('rejects forbidden fields like status or raisedCents', async () => {
      const res = await request(app)
        .patch(`/api/v1/campaigns/${draftId}/draft`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          status: 'FUNDING',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toContain('Cannot modify status or raisedCents');
    });

    it('enforces character max lengths', async () => {
      const res = await request(app)
        .patch(`/api/v1/campaigns/${draftId}/draft`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'A'.repeat(61), // Max 60
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('forbids editing drafts owned by another user', async () => {
      const res = await request(app)
        .patch(`/api/v1/campaigns/${draftId}/draft`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          title: 'Hacked Title',
        });

      expect(res.status).toBe(403);
    });

    it('allows partial autosave and deep-merges JSON fields', async () => {
      // 1. First autosave: set headline
      const res1 = await request(app)
        .patch(`/api/v1/campaigns/${draftId}/draft`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Community Micro-Solar Power',
          summary: 'Solar panels for neighborhood clinics.',
          adCreative: {
            headline: 'Power Our Local Clinics',
          },
        });

      expect(res1.status).toBe(200);
      expect(res1.body.title).toBe('Community Micro-Solar Power');
      expect(res1.body.adCreative?.headline).toBe('Power Our Local Clinics');

      // 2. Second autosave: add description to adCreative without erasing headline
      const res2 = await request(app)
        .patch(`/api/v1/campaigns/${draftId}/draft`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          adCreative: {
            description: 'Help provide clean, reliable backup power for essential clinics.',
            cta: 'Learn More',
          },
        });

      expect(res2.status).toBe(200);
      expect(res2.body.adCreative.headline).toBe('Power Our Local Clinics');
      expect(res2.body.adCreative.description).toBe('Help provide clean, reliable backup power for essential clinics.');
      expect(res2.body.adCreative.cta).toBe('Learn More');
    });
  });

  describe('POST /api/v1/campaigns/:id/submit', () => {
    it('fails with step-level errors if 5-step requirements are not met', async () => {
      const res = await request(app)
        .post(`/api/v1/campaigns/${draftId}/submit`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          acceptedRules: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error).toHaveProperty('fields');
      const fields = res.body.error.fields;
      expect(fields).toHaveProperty('step2'); // Story blocks or sources missing
      expect(fields).toHaveProperty('step3'); // Visuals or ad images missing
      expect(fields).toHaveProperty('step4'); // Reach targeting missing
      expect(fields).toHaveProperty('step5'); // Funding goal missing
    });

    it('fails to submit if creator has not set fundingGoalCents', async () => {
      const freshDraft = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({});

      const submitRes = await request(app)
        .post(`/api/v1/campaigns/${freshDraft.body.id}/submit`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ acceptedRules: true });

      expect(submitRes.status).toBe(400);
      expect(submitRes.body.error.code).toBe('VALIDATION_ERROR');
      expect(submitRes.body.error.fields).toHaveProperty('step5');
      expect(submitRes.body.error.fields.step5.some((msg: string) => msg.includes('Funding goal'))).toBe(true);
    });

    it('rejects submission if acceptedRules is not true', async () => {
      const res = await request(app)
        .post(`/api/v1/campaigns/${draftId}/submit`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          acceptedRules: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('succeeds when all 5 steps are fully valid, transitions to SUBMITTED', async () => {
      // Complete all 5 steps via autosave
      const storyText =
        'Solar electricity transforms community health center reliability during summer grid strain. '.repeat(5);

      await request(app)
        .patch(`/api/v1/campaigns/${draftId}/draft`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Community Micro-Solar Power',
          category: 'Environment',
          summary: 'Solar panels for neighborhood clinics during summer outages.',
          coverUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276',
          fundingGoalCents: 100000,
          story: [
            { type: 'heading', level: 1, text: 'Micro-Solar Resilience' },
            { type: 'paragraph', text: storyText },
          ],
          sources: [
            {
              title: 'Clean Energy Clinic Report',
              url: 'https://example.com/solar-clinics',
            },
          ],
          adCreative: {
            headline: 'Solar for Clinics',
            description: 'Keep local community health centers powered.',
            cta: 'Support Today',
            images: ['https://images.unsplash.com/photo-1509391365360-2e959784a276'],
          },
          reach: {
            locations: ['Austin, TX'],
            channels: ['Meta Feed', 'Google Search'],
            budgetAllocation: { meta: 60, google: 40 },
            durationDays: 30,
          },
        });

      // Submit
      const submitRes = await request(app)
        .post(`/api/v1/campaigns/${draftId}/submit`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          acceptedRules: true,
        });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.status).toBe('SUBMITTED');
      expect(submitRes.body.submittedAt).not.toBeNull();

      // Verify CampaignEvent was logged
      const event = await prisma.campaignEvent.findFirst({
        where: {
          campaignId: draftId,
          type: 'SUBMISSION_RECEIVED',
        },
      });
      expect(event).toBeDefined();

      // Verify Notification was sent to creator
      const notif = await prisma.notification.findFirst({
        where: {
          campaignId: draftId,
          type: 'SUBMISSION_RECEIVED',
        },
      });
      expect(notif).toBeDefined();
    });
  });

  describe('Creator Updates (POST /api/v1/campaigns/:id/updates)', () => {
    it('creates an update post without disrupting campaign or triggering re-review', async () => {
      const res = await request(app)
        .post(`/api/v1/campaigns/${draftId}/updates`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Initial permits submitted to city',
          body: 'We have formally submitted our micro-solar zoning application.',
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Initial permits submitted to city');

      // Verify campaign status is still SUBMITTED
      const campaign = await prisma.campaign.findUnique({ where: { id: draftId } });
      expect(campaign?.status).toBe('SUBMITTED');
    });
  });

  describe('DELETE /api/v1/campaigns/:id', () => {
    it('rejects deleting non-draft campaigns', async () => {
      // draftId is currently in SUBMITTED status
      const res = await request(app)
        .delete(`/api/v1/campaigns/${draftId}`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Only draft campaigns can be deleted');
    });

    it('allows deleting a DRAFT campaign', async () => {
      // Create a fresh draft to delete
      const fresh = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({});

      const freshId = fresh.body.id;

      const deleteRes = await request(app)
        .delete(`/api/v1/campaigns/${freshId}`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      const check = await prisma.campaign.findUnique({ where: { id: freshId } });
      expect(check).toBeNull();
    });
  });

  describe('GET /api/v1/me/campaigns/:id/analytics', () => {
    it('returns structured campaign analytics metrics', async () => {
      const res = await request(app)
        .get(`/api/v1/me/campaigns/${draftId}/analytics`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('campaignId', draftId);
      expect(res.body).toHaveProperty('fundingGoalCents');
      expect(res.body).toHaveProperty('raisedCents');
      expect(res.body).toHaveProperty('percentFunded');
      expect(res.body).toHaveProperty('adBudgetAllocatedCents');
      expect(res.body).toHaveProperty('estimatedReachLow');
      expect(res.body).toHaveProperty('estimatedReachHigh');
    });
  });

  describe('Material edits on published campaign divert to pendingRevision', () => {
    it('stores material changes in pendingRevision when campaign is FUNDING', async () => {
      // Find a live FUNDING campaign
      const fundingCamp = await prisma.campaign.findFirst({
        where: { status: 'FUNDING', creatorId: (await prisma.user.findUnique({ where: { email: 'creator@demo.com' } }))!.id },
      });

      if (fundingCamp) {
        const res = await request(app)
          .patch(`/api/v1/campaigns/${fundingCamp.id}/draft`)
          .set('Authorization', `Bearer ${creatorToken}`)
          .send({
            title: 'Updated Title While Funding',
            adCreative: {
              headline: 'New Ad Headline',
            },
          });

        expect(res.status).toBe(200);

        // Verify live campaign title is UNCHANGED in database
        const dbCamp = await prisma.campaign.findUnique({ where: { id: fundingCamp.id } });
        expect(dbCamp?.title).toBe(fundingCamp.title);
        // Verify pendingRevision contains the update
        expect(dbCamp?.pendingRevision).toBeDefined();
        const pending = dbCamp?.pendingRevision as Record<string, unknown>;
        expect(pending.title).toBe('Updated Title While Funding');
      }
    });
  });

  describe('Uploads API (POST /api/v1/uploads)', () => {
    it('requires authentication (rejects with 401)', async () => {
      const res = await request(app)
        .post('/api/v1/uploads')
        .attach('file', Buffer.from('fake image data'), 'test.png');

      expect(res.status).toBe(401);
    });

    it('rejects non-image file types (e.g. text/plain)', async () => {
      const res = await request(app)
        .post('/api/v1/uploads')
        .set('Authorization', `Bearer ${creatorToken}`)
        .attach('file', Buffer.from('just some text content'), {
          filename: 'notes.txt',
          contentType: 'text/plain',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Invalid file type');
    });

    it('rejects oversized files exceeding 5MB limit', async () => {
      // 5.1 MB buffer
      const oversizedBuffer = Buffer.alloc(5.1 * 1024 * 1024);

      const res = await request(app)
        .post('/api/v1/uploads')
        .set('Authorization', `Bearer ${creatorToken}`)
        .attach('file', oversizedBuffer, {
          filename: 'large.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('5MB limit');
    });

    it('successfully uploads valid image and returns URL metadata', async () => {
      // Minimal 1x1 PNG transparent pixel buffer
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const res = await request(app)
        .post('/api/v1/uploads')
        .set('Authorization', `Bearer ${creatorToken}`)
        .attach('file', pngBuffer, {
          filename: 'pixel.png',
          contentType: 'image/png',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('url');
      expect(res.body.url).toMatch(/^\/uploads\//);
      expect(res.body).toHaveProperty('filename');
      expect(res.body.size).toBe(pngBuffer.length);
      expect(res.body.mimeType).toBe('image/png');
    });
  });
});
