import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index';

describe('Auth API (/api/v1/auth & /api/v1/me)', () => {
  const uniqueSuffix = Date.now();
  const testUser = {
    email: `test_${uniqueSuffix}@demo.com`,
    password: 'Password@123',
    name: 'Test Engineer',
  };

  it('signs up a new user with valid data and returns tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/sign-up')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.user.name).toBe(testUser.name);
    expect(res.body.user.role).toBe('USER');
    expect(res.body).toHaveProperty('tokens');
    expect(res.body.tokens).toHaveProperty('accessToken');
    expect(res.body.tokens).toHaveProperty('refreshToken');
    expect(res.body.tokens.expiresIn).toBe(900);
  });

  it('rejects sign-up with duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/sign-up')
      .send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('rejects sign-up with invalid email and short password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/sign-up')
      .send({
        email: 'not-an-email',
        password: 'short',
        name: 'A',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields).toHaveProperty('email');
    expect(res.body.error.fields).toHaveProperty('password');
    expect(res.body.error.fields).toHaveProperty('name');
  });

  it('signs in with valid seeded credentials (creator@demo.com / Demo@1234)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/sign-in')
      .send({
        email: 'creator@demo.com',
        password: 'Demo@1234',
      });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('creator@demo.com');
    expect(res.body.tokens).toHaveProperty('accessToken');
    expect(res.body.tokens).toHaveProperty('refreshToken');
  });

  it('rejects sign-in with invalid password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/sign-in')
      .send({
        email: 'creator@demo.com',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('refreshes token with valid refresh token', async () => {
    const signInRes = await request(app)
      .post('/api/v1/auth/sign-in')
      .send({
        email: 'creator@demo.com',
        password: 'Demo@1234',
      });

    const refreshToken = signInRes.body.tokens.refreshToken;

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body).toHaveProperty('tokens');
    expect(refreshRes.body.tokens).toHaveProperty('accessToken');
  });

  it('rejects refresh with invalid token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'invalid.jwt.token' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('fetches current user profile via GET /api/v1/me and /api/v1/auth/me', async () => {
    const signInRes = await request(app)
      .post('/api/v1/auth/sign-in')
      .send({
        email: 'creator@demo.com',
        password: 'Demo@1234',
      });

    const token = signInRes.body.tokens.accessToken;

    const meRes = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe('creator@demo.com');
    expect(meRes.body.name).toBe('Maya Lin (Creator)');

    const authMeRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(authMeRes.status).toBe(200);
    expect(authMeRes.body.email).toBe('creator@demo.com');
  });

  it('rejects GET /api/v1/me without authorization token', async () => {
    const res = await request(app).get('/api/v1/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects GET /api/v1/me with an expired access token', async () => {
    const secret = process.env.JWT_SECRET || 'dev-secret-campaigns-jwt-key';
    const expiredToken = jwt.sign(
      { userId: 'test-user-id', role: 'USER', type: 'access' },
      secret,
      { expiresIn: -10 } // Expired 10 seconds ago
    );

    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(res.body.error.message).toContain('expired');
  });

  it('rejects sign-in with non-existent email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/sign-in')
      .send({
        email: 'nobody_exists@demo.com',
        password: 'Password@123',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects refresh with an expired refresh token', async () => {
    const secret = process.env.JWT_SECRET || 'dev-secret-campaigns-jwt-key';
    const expiredRefreshToken = jwt.sign(
      { userId: 'test-user-id', role: 'USER', type: 'refresh' },
      secret,
      { expiresIn: -10 }
    );

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: expiredRefreshToken });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });
});
