import { z } from 'zod';

export const NOTIFICATION_TYPES = [
  'SUBMISSION_RECEIVED',
  'CAMPAIGN_APPROVED',
  'CHANGES_REQUESTED',
  'CAMPAIGN_REJECTED',
  'FUNDING_OPEN',
  'MILESTONE_REACHED',
  'DEADLINE_APPROACHING',
  'CONTRIBUTION_SUCCEEDED',
  'CONTRIBUTION_FAILED',
  'PROMOTION_STARTED',
  'DISTRIBUTION_PROGRESS',
  'CAMPAIGN_COMPLETED',
  'REPORT_READY',
  'CAMPAIGN_UPDATE',
  'SECURITY_ALERT',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export const NotificationTypeSchema = z.enum(NOTIFICATION_TYPES);

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  type: NotificationTypeSchema,
  title: z.string(),
  body: z.string(),
  campaignId: z.string().uuid().optional().nullable(),
  readAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date(),
});

export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationPrefsSchema = z.object({
  campaignStatus: z.boolean().default(true),
  fundingMilestones: z.boolean().default(true),
  contributions: z.boolean().default(true),
  campaignUpdates: z.boolean().default(true),
  securityAlerts: z.boolean().default(true),
});

export type NotificationPrefs = z.infer<typeof NotificationPrefsSchema>;
