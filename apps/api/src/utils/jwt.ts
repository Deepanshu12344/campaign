import jwt from 'jsonwebtoken';
import { UserRole } from '@campaigns/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-campaigns-jwt-key';
const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

export interface TokenPayload {
  userId: string;
  role: UserRole;
  type: 'access' | 'refresh';
}

export function generateAccessToken(userId: string, role: UserRole): string {
  const payload: TokenPayload = { userId, role, type: 'access' };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

export function generateRefreshToken(userId: string, role: UserRole): string {
  const payload: TokenPayload = { userId, role, type: 'refresh' };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

export function generateTokenPair(userId: string, role: UserRole) {
  const accessToken = generateAccessToken(userId, role);
  const refreshToken = generateRefreshToken(userId, role);
  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60, // 15 minutes in seconds
  };
}

export function verifyAccessToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
  if (decoded.type !== 'access') {
    throw new Error('Invalid token type');
  }
  return decoded;
}

export function verifyRefreshToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return decoded;
}
