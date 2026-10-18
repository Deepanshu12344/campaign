import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Bell,
  Settings,
  Check,
  CheckCheck,
  FileText,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Rocket,
  Trophy,
  Clock,
  Receipt,
  AlertOctagon,
  Radio,
  BarChart2,
  Flag,
  FileSpreadsheet,
  MessageSquare,
  ShieldAlert,
  LogIn,
  Compass,
  ChevronRight,
  TrendingUp,
} from 'lucide-react-native';
import { theme } from '../../theme';
import { SharedHeader } from '../../components/layout/SharedHeader';
import { ScreenState } from '../../components/layout/ScreenState';
import { Segmented, Button, StatusPill, Skeleton, useToast } from '../../components/ui';
import { useNotifications, useMarkRead } from '../../api/hooks/useActivity';
import { useFollowedCampaigns, useFollowCampaign } from '../../api/hooks/useInteractions';
import { useAuthStore } from '../../store/authStore';
import { Notification, NotificationType, CampaignCardDto } from '@campaigns/shared';
import {
  ActivityTab,
  groupNotificationsByDay,
  filterNotificationsByTab,
  getNotificationRoute,
  formatRelativeTime,
  getNotificationMeta,
} from '../../utils/activityHelpers';

const TABS: ActivityTab[] = ['All', 'Updates', 'Funding', 'Following'];

function renderNotificationIcon(type: NotificationType, color: string) {
  const iconProps = { size: 18, color };
  switch (type) {
    case 'SUBMISSION_RECEIVED':
      return <FileText {...iconProps} />;
    case 'CAMPAIGN_APPROVED':
      return <CheckCircle2 {...iconProps} />;
    case 'CHANGES_REQUESTED':
      return <AlertCircle {...iconProps} />;
    case 'CAMPAIGN_REJECTED':
      return <XCircle {...iconProps} />;
    case 'FUNDING_OPEN':
      return <Rocket {...iconProps} />;
    case 'MILESTONE_REACHED':
      return <Trophy {...iconProps} />;
    case 'DEADLINE_APPROACHING':
      return <Clock {...iconProps} />;
    case 'CONTRIBUTION_SUCCEEDED':
      return <Receipt {...iconProps} />;
    case 'CONTRIBUTION_FAILED':
      return <AlertOctagon {...iconProps} />;
    case 'PROMOTION_STARTED':
      return <Radio {...iconProps} />;
    case 'DISTRIBUTION_PROGRESS':
      return <BarChart2 {...iconProps} />;
    case 'CAMPAIGN_COMPLETED':
      return <Flag {...iconProps} />;
    case 'REPORT_READY':
      return <FileSpreadsheet {...iconProps} />;
    case 'CAMPAIGN_UPDATE':
      return <MessageSquare {...iconProps} />;
    case 'SECURITY_ALERT':
      return <ShieldAlert {...iconProps} />;
    default:
      return <Bell {...iconProps} />;
  }
}

interface FollowedCampaignCardProps {
  campaign: CampaignCardDto;
  onPress: () => void;
  onUnfollow: () => void;
  isUnfollowing: boolean;
}

function FollowedCampaignCard({
  campaign,
  onPress,
  onUnfollow,
  isUnfollowing,
}: FollowedCampaignCardProps) {
  const percentFunded = campaign.percentFunded ?? 0;

  return (
    <Pressable
      style={styles.followedCard}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Followed campaign: ${campaign.title}`}
    >
      <View style={styles.followedImageWrapper}>
        {campaign.coverUrl ? (
          <Image
            source={{ uri: campaign.coverUrl }}
            style={styles.followedImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.followedImagePlaceholder}>
            <TrendingUp size={24} color={theme.colors.textSecondary} />
          </View>
        )}
        <View style={styles.followedStatusBadge}>
          <StatusPill status={campaign.status} />
        </View>
      </View>

      <View style={styles.followedContent}>
        <Text style={styles.followedTitle} numberOfLines={2}>
          {campaign.title}
        </Text>

        <View style={styles.followedProgressRow}>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, Math.max(0, percentFunded))}%` },
              ]}
            />
          </View>
          <Text style={styles.followedPercent}>{percentFunded}%</Text>
        </View>

        <View style={styles.followedFooter}>
          <Text style={styles.followedDays}>
            {campaign.daysRemaining !== null
              ? `${campaign.daysRemaining}d left`
              : 'Ongoing'}
          </Text>
          <Button
            title="Unfollow"
            variant="ghost"
            size="sm"
            loading={isUnfollowing}
            onPress={(e) => {
              e?.stopPropagation?.();
              onUnfollow();
            }}
            accessibilityLabel={`Unfollow ${campaign.title}`}
          />
        </View>
      </View>
    </Pressable>
  );
}

export default function ActivityTabScreen() {
  const router = useRouter();
  const toast = useToast();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const activeTab = TABS[selectedTabIndex];

  const {
    data: notificationsData,
    isLoading: isLoadingNotifications,
    isError: isErrorNotifications,
    error: notificationsError,
    refetch: refetchNotifications,
    isRefetching,
  } = useNotifications();

  const markReadMutation = useMarkRead();

  const {
    data: followedCampaigns = [],
    refetch: refetchFollowed,
  } = useFollowedCampaigns();

  const [unfollowingCampaignId, setUnfollowingCampaignId] = useState<string | null>(null);

  const followMutation = useFollowCampaign(unfollowingCampaignId || '');

  const followedCampaignIds = useMemo(() => {
    return new Set(followedCampaigns.map((c) => c.id));
  }, [followedCampaigns]);

  // Flatten all notifications from grouped response
  const rawNotifications = useMemo(() => {
    if (!notificationsData?.groups) return [];
    const all: Notification[] = [];
    for (const group of notificationsData.groups) {
      all.push(...group.items);
    }
    return all;
  }, [notificationsData]);

  // Filter based on active tab
  const filteredNotifications = useMemo(() => {
    return filterNotificationsByTab(rawNotifications, activeTab, followedCampaignIds);
  }, [rawNotifications, activeTab, followedCampaignIds]);

  // Group filtered notifications by day
  const groupedNotifications = useMemo(() => {
    return groupNotificationsByDay(filteredNotifications);
  }, [filteredNotifications]);

  const unreadCount = notificationsData?.unreadCount ?? 0;

  const handleRefresh = useCallback(() => {
    refetchNotifications();
    refetchFollowed();
  }, [refetchNotifications, refetchFollowed]);

  const handleMarkAllRead = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    markReadMutation.mutate(
      { all: true },
      {
        onSuccess: () => {
          toast.success('All notifications marked as read');
        },
        onError: () => {
          toast.error('Unable to mark notifications as read');
        },
      }
    );
  };

  const handleItemPress = (item: Notification) => {
    Haptics.selectionAsync().catch(() => {});
    if (!item.readAt) {
      markReadMutation.mutate({ id: item.id });
    }
    const destination = getNotificationRoute(item);
    router.push(destination as never);
  };

  const handleMarkItemRead = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    markReadMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.info('Notification marked as read');
        },
      }
    );
  };

  const handleUnfollow = (campaign: CampaignCardDto) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setUnfollowingCampaignId(campaign.id);
    followMutation.mutate(false, {
      onSuccess: () => {
        toast.info(`Unfollowed "${campaign.title}"`);
        setUnfollowingCampaignId(null);
      },
      onError: () => {
        toast.error('Failed to unfollow campaign');
        setUnfollowingCampaignId(null);
      },
    });
  };

  // Signed-out State
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <SharedHeader
          title="Activity"
          subtitle="Campaign updates & milestones"
          showBack={false}
          showAvatar={true}
          rightAction={
            <Button
              title=""
              variant="ghost"
              size="sm"
              iconLeft={<Settings size={20} color={theme.colors.textSecondary} />}
              onPress={() => router.push('/profile/notifications-settings')}
              accessibilityLabel="Notification Settings"
            />
          }
        />
        <ScrollView
          contentContainerStyle={styles.signedOutContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.signedOutCard}>
            <View style={styles.iconCircle}>
              <Bell size={36} color={theme.colors.lime} />
            </View>

            <Text style={styles.signedOutTitle}>Track Campaign Activity</Text>
            <Text style={styles.signedOutDescription}>
              Sign in to receive real-time notifications about campaign funding milestones, editorial
              updates from creators, reviewer approvals, and ad performance.
            </Text>

            <View style={styles.infoBanner}>
              <Compass size={18} color={theme.colors.lime} style={styles.bannerIcon} />
              <Text style={styles.bannerText}>
                Browsing, searching, and discovering campaigns never requires an account.
              </Text>
            </View>

            <View style={styles.signedOutButtons}>
              <Button
                title="Sign In"
                variant="primary"
                size="lg"
                fullWidth
                iconLeft={<LogIn size={18} color={theme.colors.onLime} />}
                onPress={() => router.push('/auth/sign-in')}
              />
              <Button
                title="Create Account"
                variant="secondary"
                size="lg"
                fullWidth
                onPress={() => router.push('/auth/sign-up')}
              />
              <Button
                title="Explore Campaigns"
                variant="ghost"
                size="md"
                fullWidth
                onPress={() => router.push('/(tabs)/explore')}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Activity skeleton
  const activitySkeleton = (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonSegmented} />
      {[1, 2, 3, 4].map((key) => (
        <View key={key} style={styles.skeletonItem}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <View style={styles.skeletonTextWrapper}>
            <Skeleton width="45%" height={14} style={{ marginBottom: 6 }} />
            <Skeleton width="85%" height={16} style={{ marginBottom: 6 }} />
            <Skeleton width="60%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );

  const getEmptyTabProps = () => {
    switch (activeTab) {
      case 'Updates':
        return {
          title: 'No editorial updates yet',
          description:
            'Reviewer approvals, editorial story drafts, and creator field updates will appear here.',
        };
      case 'Funding':
        return {
          title: 'No funding milestones yet',
          description:
            'When campaigns reach 25%, 50%, 75%, and 100% of their goal, alerts will be posted here.',
        };
      case 'Following':
        return {
          title: 'No followed campaign activity',
          description:
            'Follow causes and editorial investigations to receive automated milestones and ad delivery reports.',
        };
      case 'All':
      default:
        return {
          title: "You're all caught up",
          description:
            'No notifications right now. Check back soon for campaign updates, review status, and reach reports.',
        };
    }
  };

  const emptyProps = getEmptyTabProps();

  return (
    <View style={styles.container}>
      <SharedHeader
        title="Activity"
        subtitle={unreadCount > 0 ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}` : 'All caught up'}
        showBack={false}
        showAvatar={true}
        rightAction={
          <View style={styles.headerActions}>
            {unreadCount > 0 && (
              <Button
                title="Mark all read"
                variant="ghost"
                size="sm"
                iconLeft={<CheckCheck size={16} color={theme.colors.lime} />}
                onPress={handleMarkAllRead}
                loading={markReadMutation.isPending}
                accessibilityLabel="Mark all notifications as read"
              />
            )}
            <Button
              title=""
              variant="ghost"
              size="sm"
              iconLeft={<Settings size={20} color={theme.colors.textSecondary} />}
              onPress={() => router.push('/profile/notifications-settings')}
              accessibilityLabel="Notification Preferences"
            />
          </View>
        }
      />

      {/* Segmented Tab Bar */}
      <View style={styles.tabBarWrapper}>
        <Segmented
          options={TABS}
          selectedIndex={selectedTabIndex}
          onChange={setSelectedTabIndex}
        />
      </View>

      <ScreenState
        isLoading={isLoadingNotifications && !notificationsData}
        isError={isErrorNotifications}
        error={notificationsError}
        onRetry={handleRefresh}
        skeleton={activitySkeleton}
      >
        <ScrollView
          style={styles.feedScroll}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={theme.colors.lime}
            />
          }
        >
          {/* Following Tab: Followed Campaigns Carousel */}
          {activeTab === 'Following' && (
            <View style={styles.followingSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>Followed Campaigns</Text>
                <Text style={styles.sectionCount}>{followedCampaigns.length}</Text>
              </View>

              {followedCampaigns.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carouselContainer}
                >
                  {followedCampaigns.map((campaign) => (
                    <FollowedCampaignCard
                      key={campaign.id}
                      campaign={campaign}
                      onPress={() => router.push(`/campaign/${campaign.id}`)}
                      onUnfollow={() => handleUnfollow(campaign)}
                      isUnfollowing={unfollowingCampaignId === campaign.id}
                    />
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.emptyFollowedCard}>
                  <Text style={styles.emptyFollowedTitle}>No followed campaigns</Text>
                  <Text style={styles.emptyFollowedDesc}>
                    Follow campaigns to see their live updates, milestone progress, and ad delivery
                    metrics in one place.
                  </Text>
                  <Button
                    title="Discover Campaigns"
                    variant="secondary"
                    size="sm"
                    iconLeft={<Compass size={16} color={theme.colors.lime} />}
                    onPress={() => router.push('/(tabs)/explore')}
                    style={styles.discoverBtn}
                  />
                </View>
              )}
            </View>
          )}

          {/* Grouped Notifications List */}
          {groupedNotifications.length > 0 ? (
            groupedNotifications.map((group) => (
              <View key={group.label} style={styles.groupSection}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupLabel}>{group.label}</Text>
                </View>

                <View style={styles.groupItemsContainer}>
                  {group.items.map((item) => {
                    const isUnread = !item.readAt;
                    const meta = getNotificationMeta(item.type);
                    const timeAgo = formatRelativeTime(item.createdAt);

                    return (
                      <Pressable
                        key={item.id}
                        style={[styles.notificationCard, isUnread && styles.notificationCardUnread]}
                        onPress={() => handleItemPress(item)}
                        accessibilityRole="button"
                        accessibilityLabel={`${isUnread ? 'Unread: ' : ''}${item.title}. ${item.body}`}
                      >
                        {/* Unread Visual Indicator: Dot + Bolder Title (Never color alone) */}
                        <View style={styles.notificationLeft}>
                          <View
                            style={[
                              styles.iconBadge,
                              { backgroundColor: meta.bgColor },
                            ]}
                          >
                            {renderNotificationIcon(item.type, meta.color)}
                          </View>
                          {isUnread && (
                            <View
                              style={styles.unreadDot}
                              accessibilityLabel="Unread notification"
                            />
                          )}
                        </View>

                        <View style={styles.notificationCenter}>
                          <View style={styles.itemMetaRow}>
                            <Text style={styles.itemCategory}>{meta.categoryLabel}</Text>
                            <Text style={styles.metaDivider}>·</Text>
                            <Text style={styles.itemTime}>{timeAgo}</Text>
                          </View>

                          <Text
                            style={[
                              styles.itemTitle,
                              isUnread ? styles.itemTitleUnread : styles.itemTitleRead,
                            ]}
                            numberOfLines={2}
                          >
                            {item.title}
                          </Text>

                          <Text style={styles.itemBody} numberOfLines={2}>
                            {item.body}
                          </Text>
                        </View>

                        <View style={styles.notificationRight}>
                          {isUnread ? (
                            <Pressable
                              style={styles.markReadBtn}
                              onPress={(e) => {
                                e?.stopPropagation?.();
                                handleMarkItemRead(item.id);
                              }}
                              accessibilityRole="button"
                              accessibilityLabel="Mark as read"
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Check size={16} color={theme.colors.lime} />
                            </Pressable>
                          ) : (
                            <ChevronRight size={18} color={theme.colors.textSecondary} />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Bell size={32} color={theme.colors.lime} />
              </View>
              <Text style={styles.emptyTitle}>{emptyProps.title}</Text>
              <Text style={styles.emptyDescription}>{emptyProps.description}</Text>
              <Button
                title="Discover Campaigns"
                variant="secondary"
                size="md"
                iconLeft={<Compass size={18} color={theme.colors.lime} />}
                onPress={() => router.push('/(tabs)/explore')}
                style={styles.emptyActionBtn}
              />
            </View>
          )}
        </ScrollView>
      </ScreenState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  tabBarWrapper: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  feedScroll: {
    flex: 1,
  },
  feedContent: {
    paddingBottom: theme.spacing['4xl'],
  },

  // Following Section
  followingSection: {
    paddingTop: theme.spacing.base,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
    backgroundColor: theme.colors.bg,
    marginBottom: theme.spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.base,
    marginBottom: theme.spacing.sm,
  },
  sectionHeading: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: theme.typography.styles.small.fontSize,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: theme.typography.styles.caption.fontSize,
    color: theme.colors.textSecondary,
  },
  carouselContainer: {
    paddingHorizontal: theme.spacing.base,
    gap: theme.spacing.md,
  },
  followedCard: {
    width: 230,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.surfaceRaised,
    overflow: 'hidden',
  },
  followedImageWrapper: {
    height: 100,
    backgroundColor: theme.colors.surfaceRaised,
    position: 'relative',
  },
  followedImage: {
    width: '100%',
    height: '100%',
  },
  followedImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceRaised,
  },
  followedStatusBadge: {
    position: 'absolute',
    top: theme.spacing.xs,
    left: theme.spacing.xs,
  },
  followedContent: {
    padding: theme.spacing.sm,
  },
  followedTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
    minHeight: 36,
  },
  followedProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.lime,
  },
  followedPercent: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 11,
    color: theme.colors.lime,
    minWidth: 32,
    textAlign: 'right',
  },
  followedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.xxs,
  },
  followedDays: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  emptyFollowedCard: {
    marginHorizontal: theme.spacing.base,
    padding: theme.spacing.base,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.surfaceRaised,
    alignItems: 'center',
  },
  emptyFollowedTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptyFollowedDesc: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  discoverBtn: {
    marginTop: theme.spacing.xs,
  },

  // Grouped Notifications
  groupSection: {
    marginTop: theme.spacing.md,
  },
  groupHeader: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xs,
  },
  groupLabel: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  groupItemsContainer: {
    paddingHorizontal: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.surfaceRaised,
    gap: theme.spacing.md,
  },
  notificationCardUnread: {
    borderColor: '#234F02',
    backgroundColor: theme.colors.tintedPillBg,
  },
  notificationLeft: {
    position: 'relative',
    paddingTop: 2,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.lime,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  notificationCenter: {
    flex: 1,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemCategory: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
    lineHeight: 14,
    color: theme.colors.textSecondary,
  },
  metaDivider: {
    marginHorizontal: 4,
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  itemTime: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    lineHeight: 14,
    color: theme.colors.textSecondary,
  },
  itemTitle: {
    fontSize: 14,
    lineHeight: 19,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  itemTitleUnread: {
    fontFamily: theme.typography.fonts.uiBold,
    color: theme.colors.textPrimary,
  },
  itemTitleRead: {
    fontFamily: theme.typography.fonts.uiMedium,
    color: theme.colors.textSecondary,
  },
  itemBody: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.textSecondary,
  },
  notificationRight: {
    paddingTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markReadBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceRaised,
  },

  // Empty State
  emptyContainer: {
    padding: theme.spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing['2xl'],
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.base,
  },
  emptyTitle: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 18,
    lineHeight: 24,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  emptyDescription: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: theme.spacing.lg,
  },
  emptyActionBtn: {
    minWidth: 180,
  },

  // Skeleton
  skeletonContainer: {
    padding: theme.spacing.base,
    gap: theme.spacing.md,
  },
  skeletonSegmented: {
    height: 40,
    borderRadius: theme.radius.input,
    backgroundColor: theme.colors.line,
    marginBottom: theme.spacing.sm,
  },
  skeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceRaised,
    gap: theme.spacing.md,
  },
  skeletonTextWrapper: {
    flex: 1,
  },

  // Signed out screen
  signedOutContainer: {
    padding: theme.spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  signedOutCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.surfaceRaised,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  signedOutTitle: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 20,
    lineHeight: 26,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  signedOutDescription: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  bannerIcon: {
    flexShrink: 0,
  },
  bannerText: {
    flex: 1,
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.textSecondary,
  },
  signedOutButtons: {
    width: '100%',
    gap: theme.spacing.sm,
  },
});
