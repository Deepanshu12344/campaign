import { Notification, NotificationType } from '@campaigns/shared';
import { theme } from '../theme';

export type ActivityTab = 'All' | 'Updates' | 'Funding' | 'Following';

export interface GroupedNotifications {
  label: 'Today' | 'Yesterday' | 'Earlier';
  items: Notification[];
}

export const UPDATE_NOTIFICATION_TYPES: readonly NotificationType[] = [
  'SUBMISSION_RECEIVED',
  'CAMPAIGN_APPROVED',
  'CHANGES_REQUESTED',
  'CAMPAIGN_REJECTED',
  'PROMOTION_STARTED',
  'DISTRIBUTION_PROGRESS',
  'CAMPAIGN_COMPLETED',
  'REPORT_READY',
  'CAMPAIGN_UPDATE',
] as const;

export const FUNDING_NOTIFICATION_TYPES: readonly NotificationType[] = [
  'FUNDING_OPEN',
  'MILESTONE_REACHED',
  'DEADLINE_APPROACHING',
  'CONTRIBUTION_SUCCEEDED',
  'CONTRIBUTION_FAILED',
] as const;

/**
 * Partitions a list of notifications into Today, Yesterday, and Earlier.
 */
export function groupNotificationsByDay(items: Notification[], referenceNow: Date = new Date()): GroupedNotifications[] {
  const sorted = [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const todayStart = new Date(
    referenceNow.getFullYear(),
    referenceNow.getMonth(),
    referenceNow.getDate()
  ).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

  const todayItems: Notification[] = [];
  const yesterdayItems: Notification[] = [];
  const earlierItems: Notification[] = [];

  for (const item of sorted) {
    const itemTime = new Date(item.createdAt).getTime();
    if (itemTime >= todayStart) {
      todayItems.push(item);
    } else if (itemTime >= yesterdayStart) {
      yesterdayItems.push(item);
    } else {
      earlierItems.push(item);
    }
  }

  const groups: GroupedNotifications[] = [];
  if (todayItems.length > 0) groups.push({ label: 'Today', items: todayItems });
  if (yesterdayItems.length > 0) groups.push({ label: 'Yesterday', items: yesterdayItems });
  if (earlierItems.length > 0) groups.push({ label: 'Earlier', items: earlierItems });

  return groups;
}

/**
 * Filters notifications according to the selected activity tab.
 */
export function filterNotificationsByTab(
  items: Notification[],
  tab: ActivityTab,
  followedCampaignIds: ReadonlySet<string> = new Set()
): Notification[] {
  switch (tab) {
    case 'All':
      return items;
    case 'Updates':
      return items.filter((n) => UPDATE_NOTIFICATION_TYPES.includes(n.type));
    case 'Funding':
      return items.filter((n) => FUNDING_NOTIFICATION_TYPES.includes(n.type));
    case 'Following':
      return items.filter((n) => {
        if (!n.campaignId) return false;
        return followedCampaignIds.has(n.campaignId);
      });
  }
}

/**
 * Returns the destination route for deep-linking on notification tap.
 */
export function getNotificationRoute(notification: Notification): string {
  const campaignId = notification.campaignId;

  switch (notification.type) {
    case 'REPORT_READY':
      return campaignId ? `/campaign/${campaignId}/report` : '/(tabs)/activity';
    case 'CONTRIBUTION_SUCCEEDED':
    case 'CONTRIBUTION_FAILED':
      return '/profile/payments';
    case 'SECURITY_ALERT':
      return '/profile/settings';
    case 'CHANGES_REQUESTED':
    case 'SUBMISSION_RECEIVED':
    case 'CAMPAIGN_APPROVED':
    case 'CAMPAIGN_REJECTED':
      return campaignId ? `/campaign/${campaignId}` : '/creator/dashboard';
    case 'FUNDING_OPEN':
    case 'MILESTONE_REACHED':
    case 'DEADLINE_APPROACHING':
    case 'PROMOTION_STARTED':
    case 'DISTRIBUTION_PROGRESS':
    case 'CAMPAIGN_COMPLETED':
    case 'CAMPAIGN_UPDATE':
    default:
      return campaignId ? `/campaign/${campaignId}` : '/(tabs)/activity';
  }
}

/**
 * Formats relative time in plain language (e.g., Just now, 5m ago, 2h ago, Yesterday, 3d ago).
 */
export function formatRelativeTime(dateInput: Date | string | number, referenceNow: number = Date.now()): string {
  const time = typeof dateInput === 'number' ? dateInput : new Date(dateInput).getTime();
  const diffMs = referenceNow - time;

  if (diffMs < 0 || isNaN(diffMs)) {
    return 'Just now';
  }

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) {
    return 'Just now';
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  const d = new Date(time);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export interface NotificationMeta {
  iconName: string;
  color: string;
  bgColor: string;
  categoryLabel: string;
}

/**
 * Returns icon, visual color, and semantic label for any NotificationType.
 */
export function getNotificationMeta(type: NotificationType): NotificationMeta {
  const defaultBg = theme.colors.surface; // #2A2D29
  const limeColor = theme.colors.lime;    // #9FE870
  const offWhite = theme.colors.textPrimary; // #F2F5EE

  switch (type) {
    case 'SUBMISSION_RECEIVED':
      return {
        iconName: 'FileText',
        color: limeColor,
        bgColor: defaultBg,
        categoryLabel: 'Submission',
      };
    case 'CAMPAIGN_APPROVED':
      return {
        iconName: 'CheckCircle2',
        color: limeColor,
        bgColor: defaultBg,
        categoryLabel: 'Approved',
      };
    case 'CHANGES_REQUESTED':
      return {
        iconName: 'AlertCircle',
        color: offWhite,
        bgColor: defaultBg,
        categoryLabel: 'Action Required',
      };
    case 'CAMPAIGN_REJECTED':
      return {
        iconName: 'XCircle',
        color: offWhite,
        bgColor: defaultBg,
        categoryLabel: 'Review Note',
      };
    case 'FUNDING_OPEN':
      return {
        iconName: 'Rocket',
        color: limeColor,
        bgColor: defaultBg,
        categoryLabel: 'Funding Open',
      };
    case 'MILESTONE_REACHED':
      return {
        iconName: 'Trophy',
        color: limeColor,
        bgColor: defaultBg,
        categoryLabel: 'Milestone',
      };
    case 'DEADLINE_APPROACHING':
      return {
        iconName: 'Clock',
        color: offWhite,
        bgColor: defaultBg,
        categoryLabel: 'Closing Soon',
      };
    case 'CONTRIBUTION_SUCCEEDED':
      return {
        iconName: 'Receipt',
        color: limeColor,
        bgColor: defaultBg,
        categoryLabel: 'Contribution',
      };
    case 'CONTRIBUTION_FAILED':
      return {
        iconName: 'AlertOctagon',
        color: offWhite,
        bgColor: defaultBg,
        categoryLabel: 'Payment Alert',
      };
    case 'PROMOTION_STARTED':
      return {
        iconName: 'Radio',
        color: limeColor,
        bgColor: defaultBg,
        categoryLabel: 'Ad Distribution',
      };
    case 'DISTRIBUTION_PROGRESS':
      return {
        iconName: 'BarChart2',
        color: limeColor,
        bgColor: defaultBg,
        categoryLabel: 'Ad Progress',
      };
    case 'CAMPAIGN_COMPLETED':
      return {
        iconName: 'Flag',
        color: limeColor,
        bgColor: defaultBg,
        categoryLabel: 'Completed',
      };
    case 'REPORT_READY':
      return {
        iconName: 'FileSpreadsheet',
        color: limeColor,
        bgColor: defaultBg,
        categoryLabel: 'Final Report',
      };
    case 'CAMPAIGN_UPDATE':
      return {
        iconName: 'MessageSquare',
        color: limeColor,
        bgColor: defaultBg,
        categoryLabel: 'Creator Update',
      };
    case 'SECURITY_ALERT':
      return {
        iconName: 'ShieldAlert',
        color: offWhite,
        bgColor: defaultBg,
        categoryLabel: 'Security',
      };
    default:
      return {
        iconName: 'Bell',
        color: limeColor,
        bgColor: defaultBg,
        categoryLabel: 'Activity',
      };
  }
}
