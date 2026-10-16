import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import {
  SignUpInput,
  SignInInput,
  RefreshTokenInput,
  AuthResponse,
  UserProfile,
  UserRole,
} from '@campaigns/shared';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt';
import { ConflictError, UnauthorizedError, NotFoundError } from '../utils/errors';

export class AuthService {
  async signUp(input: SignUpInput): Promise<AuthResponse> {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictError('An account with this email already exists', 'EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        name: input.name,
        avatarUrl: input.avatarUrl || null,
        role: 'USER',
      },
    });

    const tokens = generateTokenPair(user.id, user.role as UserRole);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role as UserRole,
      },
      tokens,
    };
  }

  async signIn(input: SignInInput): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const tokens = generateTokenPair(user.id, user.role as UserRole);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role as UserRole,
      },
      tokens,
    };
  }

  async refreshToken(input: RefreshTokenInput): Promise<AuthResponse> {
    try {
      const payload = verifyRefreshToken(input.refreshToken);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new UnauthorizedError('User account not found', 'USER_NOT_FOUND');
      }

      const tokens = generateTokenPair(user.id, user.role as UserRole);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          role: user.role as UserRole,
        },
        tokens,
      };
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
    }
  }

  async getMe(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role as UserRole,
      notificationPrefs: user.notificationPrefs as Record<string, unknown> | null,
      createdAt: user.createdAt,
    };
  }
}

export const authService = new AuthService();
