import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('AI API (/api/v1/ai)', () => {
  let userToken: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/auth/sign-in')
      .send({
        email: 'creator@demo.com',
        password: 'Demo@1234',
      });
    userToken = res.body.tokens.accessToken;
  });

  describe('POST /api/v1/ai/draft-basics', () => {
    it('requires authentication (returns 401)', async () => {
      const res = await request(app)
        .post('/api/v1/ai/draft-basics')
        .send({ topic: 'Solar energy' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns deterministic demo suggestions when GEMINI_API_KEY is unset or in demo mode', async () => {
      const res = await request(app)
        .post('/api/v1/ai/draft-basics')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          topic: 'Urban clean water initiative',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('title');
      expect(res.body).toHaveProperty('summary');
      expect(res.body).toHaveProperty('category');
      expect(res.body).toHaveProperty('creatorDescription');
      expect(res.body.demo).toBe(true);

      // Verify lengths meet strict platform invariants
      expect(res.body.title.length).toBeGreaterThan(0);
      expect(res.body.title.length).toBeLessThanOrEqual(60);
      expect(res.body.summary.length).toBeGreaterThan(0);
      expect(res.body.summary.length).toBeLessThanOrEqual(160);
      expect(res.body.creatorDescription.length).toBeLessThanOrEqual(80);
      expect(res.body.category).toBe('Environment');
    });

    it('respects explicitly provided currentCategory in fallback suggestion', async () => {
      const res = await request(app)
        .post('/api/v1/ai/draft-basics')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentCategory: 'Health',
          currentTitle: 'Better Sleep for Everyone',
        });

      expect(res.status).toBe(200);
      expect(res.body.category).toBe('Health');
      expect(res.body.title).toContain('Better Sleep for Everyone');
      expect(res.body.demo).toBe(true);
    });

    it('rejects invalid category with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/ai/draft-basics')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentCategory: 'InvalidCategory123',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('handles empty input payload gracefully with default suggestions', async () => {
      const res = await request(app)
        .post('/api/v1/ai/draft-basics')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('title');
      expect(res.body).toHaveProperty('summary');
      expect(res.body).toHaveProperty('category');
      expect(res.body.demo).toBe(true);
    });

    it('includes rate limiting headers', async () => {
      const res = await request(app)
        .post('/api/v1/ai/draft-basics')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.headers).toHaveProperty('ratelimit-limit');
      expect(res.headers).toHaveProperty('ratelimit-remaining');
    });

    it('NEVER writes or returns fundingGoalCents across all AI generation endpoints', async () => {
      // 1. /ai/draft-basics
      const basicsRes = await request(app)
        .post('/api/v1/ai/draft-basics')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ topic: 'Community Library', fundingGoalCents: 100000 });

      expect(basicsRes.status).toBe(200);
      expect(basicsRes.body).not.toHaveProperty('fundingGoalCents');
      expect(basicsRes.body).not.toHaveProperty('fundingGoal');

      // 2. /ai/draft-story
      const storyRes = await request(app)
        .post('/api/v1/ai/draft-story')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Community Library', mode: 'full_story', fundingGoalCents: 100000 });

      expect(storyRes.status).toBe(200);
      expect(storyRes.body).not.toHaveProperty('fundingGoalCents');
      expect(storyRes.body).not.toHaveProperty('fundingGoal');

      // 3. /ai/ad-copy
      const adCopyRes = await request(app)
        .post('/api/v1/ai/ad-copy')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Community Library', summary: 'Expand local books', fundingGoalCents: 100000 });

      expect(adCopyRes.status).toBe(200);
      expect(adCopyRes.body).not.toHaveProperty('fundingGoalCents');
      expect(adCopyRes.body).not.toHaveProperty('fundingGoal');
    }, 20000);
  });
});
