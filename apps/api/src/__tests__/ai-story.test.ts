import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('AI Story API (/api/v1/ai/draft-story)', () => {
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
      .post('/api/v1/ai/draft-story')
      .send({ mode: 'full_story', title: 'Solar Energy' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns deterministic fallback story with blocks and suggested source types', async () => {
    const res = await request(app)
      .post('/api/v1/ai/draft-story')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        mode: 'full_story',
        title: 'Rooftop Gardens for Cooler Cities',
        summary: 'Turning asphalt roofs into green habitats.',
        category: 'Environment',
        creatorName: 'Green Neighborhoods',
      });

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe('full_story');
    expect(res.body.demo).toBe(true);
    expect(res.body).toHaveProperty('headline');
    expect(res.body.headline.length).toBeLessThanOrEqual(60);
    expect(res.body).toHaveProperty('intro');
    expect(res.body.intro.length).toBeLessThanOrEqual(160);

    // Verify blocks
    expect(Array.isArray(res.body.blocks)).toBe(true);
    const blocks = res.body.blocks;
    expect(blocks.length).toBeGreaterThanOrEqual(4);

    // Verify at least one heading block exists
    const hasHeading = blocks.some((b: { type: string; text?: string }) => b.type === 'heading' && b.text);
    expect(hasHeading).toBe(true);

    // Verify every block has a valid stable ID
    for (const b of blocks) {
      expect(typeof b.id).toBe('string');
      expect(b.id.length).toBeGreaterThan(0);
    }

    // Verify total story characters meet the 300+ requirement
    let totalChars = 0;
    for (const b of blocks) {
      if (typeof b.text === 'string') totalChars += b.text.length;
      if (typeof b.label === 'string') totalChars += b.label.length;
      if (typeof b.value === 'string') totalChars += b.value.length;
      if (Array.isArray(b.items)) {
        for (const item of b.items) {
          if (typeof item === 'string') totalChars += item.length;
        }
      }
    }
    expect(totalChars).toBeGreaterThanOrEqual(300);

    // Verify suggested source types are returned WITHOUT fake URLs
    expect(Array.isArray(res.body.suggestedSourceTypes)).toBe(true);
    expect(res.body.suggestedSourceTypes.length).toBeGreaterThan(0);
    for (const st of res.body.suggestedSourceTypes) {
      expect(typeof st).toBe('string');
      expect(st.startsWith('http://') || st.startsWith('https://')).toBe(false);
    }

    // Verify suggested audience actions
    expect(Array.isArray(res.body.suggestedActions)).toBe(true);
    expect(res.body.suggestedActions.length).toBeGreaterThan(0);
    expect(res.body.suggestedActions.length).toBeLessThanOrEqual(5);
  });

  it('improves a single paragraph in improve_paragraph mode', async () => {
    const rawParagraph = 'we need to test our tap water because lead pipes make kids sick in old homes.';
    const res = await request(app)
      .post('/api/v1/ai/draft-story')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        mode: 'improve_paragraph',
        paragraphText: rawParagraph,
        category: 'Health',
      });

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe('improve_paragraph');
    expect(res.body.demo).toBe(true);
    expect(typeof res.body.improvedParagraph).toBe('string');
    expect(res.body.improvedParagraph.length).toBeGreaterThan(rawParagraph.length);
    // Should be properly capitalized
    expect(res.body.improvedParagraph[0]).toBe(res.body.improvedParagraph[0].toUpperCase());
  });

  it('returns 400 when invalid category is passed', async () => {
    const res = await request(app)
      .post('/api/v1/ai/draft-story')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        mode: 'full_story',
        category: 'NotARealCategory',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('includes rate limit headers in response', async () => {
    const res = await request(app)
      .post('/api/v1/ai/draft-story')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ mode: 'full_story' });

    expect(res.status).toBe(200);
    expect(res.headers).toHaveProperty('ratelimit-limit');
    expect(res.headers).toHaveProperty('ratelimit-remaining');
  });
});
