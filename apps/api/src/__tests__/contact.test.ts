import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app, { logger } from '../index';

describe('Contact API (/api/v1/contact)', () => {
  it('accepts a valid contact form submission and returns a ticketId', async () => {
    const logSpy = vi.spyOn(logger, 'info');

    const res = await request(app)
      .post('/api/v1/contact')
      .send({
        name: 'Jordan Public',
        email: 'jordan@example.com',
        topic: 'backing',
        message: 'I have a question about how ad distribution is scheduled after funding closes.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Your message has been received');
    expect(res.body.ticketId).toMatch(/^TICK-[A-Z0-9]+-[A-Z0-9]+$/);

    // Verify privacy requirement: logs must NOT contain personal data (name or email)
    const contactLogCall = logSpy.mock.calls.find((call) => {
      const payload = call[0];
      return payload && typeof payload === 'object' && 'action' in payload && payload.action === 'contact_submission_received';
    });

    expect(contactLogCall).toBeDefined();
    const loggedPayload = contactLogCall?.[0] as Record<string, unknown>;
    expect(loggedPayload.ticketId).toBe(res.body.ticketId);
    expect(loggedPayload.topic).toBe('backing');
    expect(loggedPayload.messageLength).toBeGreaterThan(10);
    // Strict assertion: personal identifiers MUST NOT appear in the logged payload
    expect(loggedPayload).not.toHaveProperty('name');
    expect(loggedPayload).not.toHaveProperty('email');
    expect(JSON.stringify(loggedPayload)).not.toContain('Jordan Public');
    expect(JSON.stringify(loggedPayload)).not.toContain('jordan@example.com');

    logSpy.mockRestore();
  });

  it('rejects an empty name with 400', async () => {
    const res = await request(app)
      .post('/api/v1/contact')
      .send({
        name: '   ',
        email: 'valid@example.com',
        topic: 'general',
        message: 'This is a message about the platform with enough length.',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an invalid email format with 400', async () => {
    const res = await request(app)
      .post('/api/v1/contact')
      .send({
        name: 'Alex Sample',
        email: 'not-an-email',
        topic: 'technical',
        message: 'The website page threw an error when I clicked preview.',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects messages shorter than 10 characters with 400', async () => {
    const res = await request(app)
      .post('/api/v1/contact')
      .send({
        name: 'Alex Sample',
        email: 'alex@example.com',
        topic: 'other',
        message: 'Help me',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects unsupported topics with 400', async () => {
    const res = await request(app)
      .post('/api/v1/contact')
      .send({
        name: 'Alex Sample',
        email: 'alex@example.com',
        topic: 'unknown_topic_category',
        message: 'This has enough characters to pass message validation.',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
