import { z } from 'zod';

export const UserRoleSchema = z.enum(['USER', 'ADMIN']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const SignUpInputSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(60),
  avatarUrl: z.string().url('Avatar must be a valid URL').optional().nullable(),
});

export type SignUpInput = z.infer<typeof SignUpInputSchema>;

export const SignInInputSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type SignInInput = z.infer<typeof SignInInputSchema>;

export const RefreshTokenInputSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenInputSchema>;

export const UserSummarySchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatarUrl: z.string().nullable().optional(),
  role: UserRoleSchema,
});

export type UserSummary = z.infer<typeof UserSummarySchema>;

export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatarUrl: z.string().nullable().optional(),
  role: UserRoleSchema,
  notificationPrefs: z.record(z.string(), z.any()).nullable().optional(),
  createdAt: z.coerce.date(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

export type AuthTokens = z.infer<typeof AuthTokensSchema>;

export const AuthResponseSchema = z.object({
  user: UserSummarySchema,
  tokens: AuthTokensSchema,
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const UpdateProfileInputSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(60).optional(),
  avatarUrl: z.string().url('Avatar must be a valid URL').optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>;

export const ChangePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export type ChangePasswordInput = z.infer<typeof ChangePasswordInputSchema>;
