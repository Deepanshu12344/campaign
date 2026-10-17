import { prisma } from '../utils/prisma';
import { Notification, NotificationPrefs, NotificationType } from '@campaigns/shared';
import { NotFoundError } from '../utils/errors';

export interface GroupedNotificationsResponse {
  unreadCount: number;
  groups: {
    label: string; // 'Today' | 'Yesterday' | 'Earlier'
    items: Notification[];
  }[];
}

export class NotificationService {
  async getNotifications(userId: string): Promise<GroupedNotificationsResponse> {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, readAt: null },
    });

    // Deduplicate / collapse rapid duplicate notifications (e.g., within 5 minutes of same type + campaignId)
    const deduped: typeof notifications = [];
    for (const n of notifications) {
      const isDuplicate = deduped.some((existing) => {
        const sameType = existing.type === n.type;
        const sameCampaign = existing.campaignId === n.campaignId;
        const timeDiff = Math.abs(new Date(existing.createdAt).getTime() - new Date(n.createdAt).getTime());
        return sameType && sameCampaign && timeDiff < 5 * 60 * 1000;
      });

      if (!isDuplicate) {
        deduped.push(n);
      }
    }

    // Group by Day (Today, Yesterday, Earlier)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

    const todayItems: Notification[] = [];
    const yesterdayItems: Notification[] = [];
    const earlierItems: Notification[] = [];

    for (const n of deduped) {
      const itemTime = new Date(n.createdAt).getTime();
      const formatted: Notification = {
        id: n.id,
        userId: n.userId,
        type: n.type as NotificationType,
        title: n.title,
        body: n.body,
        campaignId: n.campaignId,
        readAt: n.readAt,
        createdAt: n.createdAt,
      };

      if (itemTime >= todayStart) {
        todayItems.push(formatted);
      } else if (itemTime >= yesterdayStart) {
        yesterdayItems.push(formatted);
      } else {
        earlierItems.push(formatted);
      }
    }

    const groups = [];
    if (todayItems.length > 0) groups.push({ label: 'Today', items: todayItems });
    if (yesterdayItems.length > 0) groups.push({ label: 'Yesterday', items: yesterdayItems });
    if (earlierItems.length > 0) groups.push({ label: 'Earlier', items: earlierItems });

    return {
      unreadCount,
      groups,
    };
  }

  async markRead(
    userId: string,
    options: { id?: string; all?: boolean }
  ): Promise<{ updatedCount: number }> {
    if (options.all) {
      const result = await prisma.notification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
      });
      return { updatedCount: result.count };
    }

    if (options.id) {
      const existing = await prisma.notification.findUnique({
        where: { id: options.id },
      });

      if (!existing || existing.userId !== userId) {
        throw new NotFoundError('Notification not found');
      }

      await prisma.notification.update({
        where: { id: options.id },
        data: { readAt: new Date() },
      });

      return { updatedCount: 1 };
    }

    return { updatedCount: 0 };
  }

  async updateNotificationPrefs(userId: string, prefs: Partial<NotificationPrefs>): Promise<NotificationPrefs> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPrefs: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const currentPrefs = (user.notificationPrefs as Record<string, unknown>) || {};
    const merged = {
      campaignStatus: prefs.campaignStatus ?? currentPrefs.campaignStatus ?? true,
      fundingMilestones: prefs.fundingMilestones ?? currentPrefs.fundingMilestones ?? true,
      contributions: prefs.contributions ?? currentPrefs.contributions ?? true,
      campaignUpdates: prefs.campaignUpdates ?? currentPrefs.campaignUpdates ?? true,
      securityAlerts: prefs.securityAlerts ?? currentPrefs.securityAlerts ?? true,
      emailNotifications: prefs.emailNotifications ?? currentPrefs.emailNotifications ?? true,
    };

    await prisma.user.update({
      where: { id: userId },
      data: { notificationPrefs: merged },
    });

    return merged as NotificationPrefs;
  }
}

export const notificationService = new NotificationService();
