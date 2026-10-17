import { describe, it, expect } from 'vitest';
import {
  groupNotificationsByDay,
  filterNotificationsByTab,
  getNotificationRoute,
  formatRelativeTime,
  getNotificationMeta,
} from '../utils/activityHelpers';
import {
  NOTIFICATION_TYPES,
  Notification,
  NotificationType,
  NotificationPrefsSchema,
} from '@campaigns/shared';

describe('Activity Feed & Notification Helpers', () => {
  const mockNow = new Date('2026-10-17T12:00:00Z');

  const createMockNotification = (
    overrides: Partial<Notification> = {}
  ): Notification => ({
    id: 'a0000000-0000-0000-0000-000000000001',
    userId: 'user-1',
    type: 'CAMPAIGN_UPDATE',
    title: 'Community Garden update',
    body: 'We have broken ground on the new irrigation system.',
    campaignId: 'c0000000-0000-0000-0000-000000000001',
    readAt: null,
    createdAt: mockNow,
    ...overrides,
  });

  describe('groupNotificationsByDay', () => {
    it('groups items into Today, Yesterday, and Earlier based on creation timestamp', () => {
      const todayItem = createMockNotification({
        id: '11111111-1111-1111-1111-111111111111',
        createdAt: new Date('2026-10-17T09:00:00Z'),
      });
      const yesterdayItem = createMockNotification({
        id: '22222222-2222-2222-2222-222222222222',
        createdAt: new Date('2026-10-16T15:00:00Z'),
      });
      const earlierItem = createMockNotification({
        id: '33333333-3333-3333-3333-333333333333',
        createdAt: new Date('2026-10-12T10:00:00Z'),
      });

      const groups = groupNotificationsByDay([earlierItem, todayItem, yesterdayItem], mockNow);

      expect(groups).toHaveLength(3);
      expect(groups[0].label).toBe('Today');
      expect(groups[0].items[0].id).toBe(todayItem.id);

      expect(groups[1].label).toBe('Yesterday');
      expect(groups[1].items[0].id).toBe(yesterdayItem.id);

      expect(groups[2].label).toBe('Earlier');
      expect(groups[2].items[0].id).toBe(earlierItem.id);
    });

    it('omits groups that have no items', () => {
      const earlierOnly = [
        createMockNotification({
          id: '33333333-3333-3333-3333-333333333333',
          createdAt: new Date('2026-10-01T10:00:00Z'),
        }),
      ];

      const groups = groupNotificationsByDay(earlierOnly, mockNow);
      expect(groups).toHaveLength(1);
      expect(groups[0].label).toBe('Earlier');
    });

    it('orders items in each day group descending by time', () => {
      const itemMorning = createMockNotification({
        id: 'morning',
        createdAt: new Date('2026-10-17T06:00:00Z'),
      });
      const itemNoon = createMockNotification({
        id: 'noon',
        createdAt: new Date('2026-10-17T11:50:00Z'),
      });

      const groups = groupNotificationsByDay([itemMorning, itemNoon], mockNow);
      expect(groups[0].items[0].id).toBe('noon');
      expect(groups[0].items[1].id).toBe('morning');
    });
  });

  describe('filterNotificationsByTab', () => {
    const updateNotif = createMockNotification({
      id: 'u1',
      type: 'CAMPAIGN_UPDATE',
      campaignId: 'camp-alpha',
    });
    const approvalNotif = createMockNotification({
      id: 'u2',
      type: 'CAMPAIGN_APPROVED',
      campaignId: 'camp-beta',
    });
    const milestoneNotif = createMockNotification({
      id: 'f1',
      type: 'MILESTONE_REACHED',
      campaignId: 'camp-gamma',
    });
    const contribNotif = createMockNotification({
      id: 'f2',
      type: 'CONTRIBUTION_SUCCEEDED',
      campaignId: 'camp-delta',
    });

    const allNotifications = [updateNotif, approvalNotif, milestoneNotif, contribNotif];

    it('returns all notifications for "All" tab', () => {
      const filtered = filterNotificationsByTab(allNotifications, 'All');
      expect(filtered).toHaveLength(4);
    });

    it('filters only updates for "Updates" tab', () => {
      const filtered = filterNotificationsByTab(allNotifications, 'Updates');
      expect(filtered).toHaveLength(2);
      expect(filtered.map((n) => n.id)).toEqual(['u1', 'u2']);
    });

    it('filters only funding/milestones for "Funding" tab', () => {
      const filtered = filterNotificationsByTab(allNotifications, 'Funding');
      expect(filtered).toHaveLength(2);
      expect(filtered.map((n) => n.id)).toEqual(['f1', 'f2']);
    });

    it('filters followed campaigns for "Following" tab', () => {
      const followedSet = new Set(['camp-alpha', 'camp-gamma']);
      const filtered = filterNotificationsByTab(allNotifications, 'Following', followedSet);
      expect(filtered).toHaveLength(2);
      expect(filtered.map((n) => n.id)).toEqual(['u1', 'f1']);
    });

    it('returns empty array when user follows no matching campaigns', () => {
      const followedSet = new Set(['camp-zeta']);
      const filtered = filterNotificationsByTab(allNotifications, 'Following', followedSet);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('getNotificationRoute', () => {
    it('routes final reports to the campaign report view', () => {
      const notif = createMockNotification({
        type: 'REPORT_READY',
        campaignId: 'camp-123',
      });
      expect(getNotificationRoute(notif)).toBe('/campaign/camp-123/report');
    });

    it('routes contributions to profile receipts', () => {
      const successNotif = createMockNotification({
        type: 'CONTRIBUTION_SUCCEEDED',
        campaignId: 'camp-123',
      });
      const failedNotif = createMockNotification({
        type: 'CONTRIBUTION_FAILED',
        campaignId: 'camp-123',
      });

      expect(getNotificationRoute(successNotif)).toBe('/profile/payments');
      expect(getNotificationRoute(failedNotif)).toBe('/profile/payments');
    });

    it('routes security alerts to profile settings', () => {
      const notif = createMockNotification({
        type: 'SECURITY_ALERT',
        campaignId: null,
      });
      expect(getNotificationRoute(notif)).toBe('/profile/settings');
    });

    it('routes review decisions and campaign updates to campaign detail', () => {
      const types: NotificationType[] = [
        'CAMPAIGN_APPROVED',
        'CHANGES_REQUESTED',
        'CAMPAIGN_REJECTED',
        'SUBMISSION_RECEIVED',
        'FUNDING_OPEN',
        'MILESTONE_REACHED',
        'CAMPAIGN_UPDATE',
      ];

      for (const t of types) {
        const notif = createMockNotification({
          type: t,
          campaignId: 'camp-xyz',
        });
        expect(getNotificationRoute(notif)).toBe('/campaign/camp-xyz');
      }
    });

    it('handles missing campaignId gracefully', () => {
      const notif = createMockNotification({
        type: 'CAMPAIGN_UPDATE',
        campaignId: null,
      });
      expect(getNotificationRoute(notif)).toBe('/(tabs)/activity');
    });
  });

  describe('formatRelativeTime', () => {
    const baseTime = new Date('2026-10-17T12:00:00Z').getTime();

    it('formats times under 1 minute as "Just now"', () => {
      expect(formatRelativeTime(baseTime - 30 * 1000, baseTime)).toBe('Just now');
      expect(formatRelativeTime(baseTime - 5 * 1000, baseTime)).toBe('Just now');
    });

    it('formats times under 1 hour in minutes', () => {
      expect(formatRelativeTime(baseTime - 15 * 60 * 1000, baseTime)).toBe('15m ago');
      expect(formatRelativeTime(baseTime - 59 * 60 * 1000, baseTime)).toBe('59m ago');
    });

    it('formats times under 24 hours in hours', () => {
      expect(formatRelativeTime(baseTime - 2 * 3600 * 1000, baseTime)).toBe('2h ago');
      expect(formatRelativeTime(baseTime - 23 * 3600 * 1000, baseTime)).toBe('23h ago');
    });

    it('formats times between 24 and 48 hours as "Yesterday"', () => {
      expect(formatRelativeTime(baseTime - 25 * 3600 * 1000, baseTime)).toBe('Yesterday');
    });

    it('formats times under 7 days in days', () => {
      expect(formatRelativeTime(baseTime - 4 * 24 * 3600 * 1000, baseTime)).toBe('4d ago');
    });
  });

  describe('getNotificationMeta', () => {
    it('defines distinct icons, colors, and category labels for all 15 notification types', () => {
      for (const type of NOTIFICATION_TYPES) {
        const meta = getNotificationMeta(type);
        expect(meta.iconName).toBeDefined();
        expect(meta.color).toBeDefined();
        expect(meta.bgColor).toBeDefined();
        expect(meta.categoryLabel).toBeDefined();
        expect(meta.categoryLabel.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Notification Preferences Schema', () => {
    it('defaults all categories and email to true', () => {
      const parsed = NotificationPrefsSchema.parse({});
      expect(parsed.campaignStatus).toBe(true);
      expect(parsed.fundingMilestones).toBe(true);
      expect(parsed.contributions).toBe(true);
      expect(parsed.campaignUpdates).toBe(true);
      expect(parsed.securityAlerts).toBe(true);
      expect(parsed.emailNotifications).toBe(true);
    });

    it('accepts partial overrides while maintaining boolean validation', () => {
      const parsed = NotificationPrefsSchema.parse({
        campaignUpdates: false,
        emailNotifications: false,
      });
      expect(parsed.campaignUpdates).toBe(false);
      expect(parsed.emailNotifications).toBe(false);
      expect(parsed.campaignStatus).toBe(true);
      expect(parsed.securityAlerts).toBe(true);
    });
  });
});
