import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { CTA_PRESETS } from '@campaigns/shared';

describe('AI Ad Copy API (/api/v1/ai/ad-copy)', () => {
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

  it('requires authentication (returns 401)', async () => {
    const res = await request(app)
      .post('/api/v1/ai/ad-copy')
      .send({ title: 'Clean Water Project' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns deterministic fallback ad copy with 3 headlines, 3 descriptions, and CTA', async () => {
    const res = await request(app)
      .post('/api/v1/ai/ad-copy')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Protect Local Waterways Now',
        summary: 'Raising funds to install water testing sensors in local neighborhoods.',
        category: 'Environment',
        includeFeedback: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.demo).toBe(true);

    // Verify headlines
    expect(Array.isArray(res.body.headlines)).toBe(true);
    expect(res.body.headlines).toHaveLength(3);
    for (const headline of res.body.headlines) {
      expect(typeof headline).toBe('string');
      expect(headline.length).toBeGreaterThan(0);
      expect(headline.length).toBeLessThanOrEqual(40);
    }

    // Verify descriptions
    expect(Array.isArray(res.body.descriptions)).toBe(true);
    expect(res.body.descriptions).toHaveLength(3);
    for (const desc of res.body.descriptions) {
      expect(typeof desc).toBe('string');
      expect(desc.length).toBeGreaterThan(0);
      expect(desc.length).toBeLessThanOrEqual(90);
    }

    // Verify suggested CTA
    expect(CTA_PRESETS).toContain(res.body.suggestedCta);

    // Verify creative feedback tips
    expect(Array.isArray(res.body.creativeFeedback)).toBe(true);
    expect(res.body.creativeFeedback.length).toBeGreaterThan(0);
  });

  it('rejects invalid inputs with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/v1/ai/ad-copy')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        category: 'NonExistentCategory' as unknown as 'Environment',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('includes rate limiting headers', async () => {
    const res = await request(app)
      .post('/api/v1/ai/ad-copy')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Community Garden Initiative',
        category: 'Community',
      });

    expect(res.status).toBe(200);
    expect(res.headers).toHaveProperty('ratelimit-limit');
    expect(res.headers).toHaveProperty('ratelimit-remaining');
  });
});
