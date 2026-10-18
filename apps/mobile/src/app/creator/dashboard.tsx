import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, Href } from 'expo-router';
import {
  Plus,
  TrendingUp,
  Radio,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  AlertCircle,
} from 'lucide-react-native';
import { theme } from '../../theme';
import { SharedHeader } from '../../components/layout/SharedHeader';
import {
  Card,
  Button,
  StatusPill,
  ProgressBar,
  Skeleton,
  EmptyState,
  ErrorState,
} from '../../components/ui';
import { useMyCampaigns, useCreateDraft } from '../../api/hooks/useCreator';
import {
  CREATOR_FILTERS,
  CreatorDashboardFilter,
  filterCampaigns,
  getDashboardFilterCounts,
  calculateCreatorSummary,
  getContextualAction,
} from '../../utils/creatorHelpers';
import { CampaignCardDto } from '@campaigns/shared';

function formatCurrency(cents: number): string {
  const dollars = Math.round(cents / 100);
  return `$${dollars.toLocaleString()}`;
}

function formatReach(low: number, high: number): string {
  if (low <= 0 && high <= 0) return 'Reach calculated on submit';
  if (high >= 1000000) {
    return `~${(low / 1000000).toFixed(1)}M - ${(high / 1000000).toFixed(1)}M people`;
  }
  if (high >= 1000) {
    return `~${Math.round(low / 1000)}k - ${Math.round(high / 1000)}k people`;
  }
  return `~${low.toLocaleString()} - ${high.toLocaleString()} people`;
}

export default function CreatorDashboardScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<CreatorDashboardFilter>('Published/Funding');

  const {
    data: campaigns = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useMyCampaigns();

  const createDraftMutation = useCreateDraft();

  const handleCreateNew = async () => {
    try {
      const draft = await createDraftMutation.mutateAsync();
      router.push(`/create/${draft.id}/basics`);
    } catch {
      // Fallback
      router.push('/create/draft-new/basics');
    }
  };

  // Filter calculations
  const filterCounts = useMemo(() => getDashboardFilterCounts(campaigns), [campaigns]);
  const filteredList = useMemo(
    () => filterCampaigns(campaigns, activeFilter),
    [campaigns, activeFilter]
  );
  const summary = useMemo(() => calculateCreatorSummary(campaigns), [campaigns]);

  // Aggregate contributions estimate: sum of backers/contributions or rough estimate
  const totalContributionsCount = useMemo(() => {
    return campaigns.reduce((acc, c) => {
      // Calculate active backing count indicator
      return acc + (c.raisedCents > 0 ? Math.max(1, Math.round(c.raisedCents / 4500)) : 0);
    }, 0);
  }, [campaigns]);

  return (
    <View style={styles.container}>
      <SharedHeader
        title="Creator Dashboard"
        subtitle="Manage Campaigns Across Lifecycles"
        fallbackRoute="/(tabs)/profile"
        rightAction={
          <Pressable
            onPress={handleCreateNew}
            disabled={createDraftMutation.isPending}
            style={({ pressed }) => [
              styles.headerNewButton,
              pressed && styles.headerNewButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Create campaign"
          >
            <Plus size={16} color={theme.colors.onLime} strokeWidth={2.5} />
            <Text style={styles.headerNewText} numberOfLines={1}>
              New
            </Text>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.colors.lime}
          />
        }
      >
        {/* Top Summary Strip */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryStrip}>
            <View style={styles.summaryItem}>
              <View style={styles.summaryIconCircle}>
                <TrendingUp size={16} color={theme.colors.lime} />
              </View>
              <Text style={styles.summaryValue}>{formatCurrency(summary.totalRaisedCents)}</Text>
              <Text style={styles.summaryLabel}>Total Raised</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <View style={styles.summaryIconCircle}>
                <Radio size={16} color={theme.colors.lime} />
              </View>
              <Text style={styles.summaryValue}>{summary.activeCount}</Text>
              <Text style={styles.summaryLabel}>Active Campaigns</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <View style={styles.summaryIconCircle}>
                <Sparkles size={16} color={theme.colors.lime} />
              </View>
              <Text style={styles.summaryValue}>{totalContributionsCount}</Text>
              <Text style={styles.summaryLabel}>Total Backers</Text>
            </View>
          </View>
        </Card>

        {/* 6 Filter Tabs Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsContainer}
        >
          {CREATOR_FILTERS.map((tab) => {
            const isActive = activeFilter === tab;
            const count = filterCounts[tab];
            const isRequiresAction = tab === 'Requires Action' && count > 0;

            return (
              <Pressable
                key={tab}
                style={[
                  styles.filterTab,
                  isActive && styles.filterTabActive,
                  isRequiresAction && styles.filterTabActionRequired,
                ]}
                onPress={() => setActiveFilter(tab)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    isActive && styles.filterTabTextActive,
                    isRequiresAction && styles.filterTabActionRequiredText,
                  ]}
                >
                  {tab}
                </Text>
                <View
                  style={[
                    styles.tabCountPill,
                    isActive && styles.tabCountPillActive,
                    isRequiresAction && styles.tabCountPillActionRequired,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabCountPillText,
                      isActive && styles.tabCountPillTextActive,
                      isRequiresAction && styles.tabCountPillTextActionRequired,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Content Section */}
        {isLoading ? (
          <View style={styles.skeletonContainer}>
            {[1, 2, 3].map((key) => (
              <Card key={key} style={styles.skeletonCard}>
                <View style={styles.skeletonRow}>
                  <Skeleton width={80} height={80} borderRadius={theme.radius.md} />
                  <View style={styles.skeletonMeta}>
                    <Skeleton width="40%" height={16} borderRadius={4} />
                    <Skeleton width="85%" height={20} borderRadius={4} style={{ marginVertical: 6 }} />
                    <Skeleton width="60%" height={14} borderRadius={4} />
                  </View>
                </View>
                <Skeleton width="100%" height={8} borderRadius={4} style={{ marginTop: 12 }} />
              </Card>
            ))}
          </View>
        ) : isError ? (
          <ErrorState
            title="Failed to load campaigns"
            message={error?.message || 'Could not retrieve your creator campaigns. Check your network connection.'}
            onRetry={refetch}
          />
        ) : filteredList.length === 0 ? (
          <EmptyState
            title={`No ${activeFilter} Campaigns`}
            description={
              activeFilter === 'Requires Action'
                ? 'All your campaigns are in good standing! Any items requiring reviewer revisions will appear here.'
                : activeFilter === 'Drafts'
                ? 'You have no open drafts. Start a new campaign to draft your story, visuals, and targeting.'
                : activeFilter === 'Under Review'
                ? 'No campaigns are currently under review by our editorial moderation team.'
                : activeFilter === 'Promoting'
                ? 'No campaigns are actively running digital ad distribution at this time.'
                : activeFilter === 'Completed'
                ? 'Completed campaigns with final performance reports will appear here.'
                : 'No published campaigns currently funding. Ready to launch a cause?'
            }
            actionLabel="Start a Campaign"
            onAction={handleCreateNew}
          />
        ) : (
          <View style={styles.campaignsList}>
            {filteredList.map((campaign) => (
              <CampaignRowCard
                key={campaign.id}
                campaign={campaign}
                onPressAction={(route) => router.push(route as Href)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function CampaignRowCard({
  campaign,
  onPressAction,
}: {
  campaign: CampaignCardDto;
  onPressAction: (route: string) => void;
}) {
  const action = getContextualAction(campaign);
  const percent = Math.min(100, Math.round(campaign.percentFunded || 0));

  return (
    <Card style={styles.campaignCard}>
      <Pressable
        style={styles.cardHeaderRow}
        onPress={() => onPressAction(action.route)}
      >
        {campaign.coverUrl ? (
          <Image source={{ uri: campaign.coverUrl }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Layers size={24} color={theme.colors.textSecondary} />
          </View>
        )}

        <View style={styles.cardMeta}>
          <View style={styles.statusRow}>
            <StatusPill status={campaign.status} />
            <Text style={styles.categoryLabel}>{campaign.category}</Text>
          </View>

          <Text style={styles.campaignTitle} numberOfLines={2}>
            {campaign.title || 'Untitled Campaign Draft'}
          </Text>

          <Text style={styles.reachEstimateText} numberOfLines={1}>
            {formatReach(campaign.estimatedReachLow, campaign.estimatedReachHigh)}
          </Text>
        </View>
      </Pressable>

      {/* Progress & Funding Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeaderRow}>
          <Text style={styles.raisedAmountText}>
            {formatCurrency(campaign.raisedCents)}{' '}
            <Text style={styles.goalText}>of {formatCurrency(campaign.fundingGoalCents)}</Text>
          </Text>
          <Text style={styles.percentText}>{percent}%</Text>
        </View>

        <ProgressBar value={percent} max={100} style={styles.progressBar} />

        <View style={styles.deadlineRow}>
          <View style={styles.deadlineLeft}>
            <Clock size={13} color={theme.colors.textSecondary} />
            <Text style={styles.deadlineText}>
              {campaign.daysRemaining !== null
                ? `${campaign.daysRemaining} days remaining`
                : campaign.status === 'COMPLETED'
                ? 'Campaign closed'
                : 'No active deadline'}
            </Text>
          </View>

          {campaign.status === 'CHANGES_REQUESTED' && (
            <View style={styles.alertNotice}>
              <AlertCircle size={12} color={theme.colors.textPrimary} />
              <Text style={styles.alertNoticeText}>Revisions needed</Text>
            </View>
          )}
        </View>
      </View>

      {/* Contextual Action Button */}
      <View style={styles.actionRow}>
        <Button
          label={action.label}
          variant={action.variant}
          size="sm"
          onPress={() => onPressAction(action.route)}
          style={styles.actionButton}
        />
        <Pressable
          style={styles.detailsChevronButton}
          onPress={() => onPressAction(`/creator/${campaign.id}`)}
          hitSlop={8}
          accessibilityLabel="View campaign management"
        >
          <Text style={styles.detailsChevronText}>Hub</Text>
          <ArrowRight size={14} color={theme.colors.lime} />
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: theme.spacing['4xl'],
    gap: theme.spacing.base,
  },
  headerNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.lime,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: theme.radius.pill,
    justifyContent: 'center',
  },
  headerNewButtonPressed: {
    backgroundColor: theme.colors.limePressed,
  },
  headerNewText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.onLime,
  },
  summaryCard: {
    padding: theme.spacing.base,
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  summaryValue: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 17,
    color: theme.colors.textPrimary,
  },
  summaryLabel: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: theme.colors.border,
  },
  filterTabsContainer: {
    gap: 8,
    paddingVertical: 2,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceRaised,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterTabActive: {
    backgroundColor: theme.colors.lime,
    borderColor: theme.colors.lime,
  },
  filterTabActionRequired: {
    borderColor: theme.colors.border,
  },
  filterTabText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  filterTabTextActive: {
    color: theme.colors.onLime,
    fontFamily: theme.typography.fonts.uiSemiBold,
  },
  filterTabActionRequiredText: {
    color: theme.colors.textPrimary,
  },
  tabCountPill: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.radius.pill,
  },
  tabCountPillActive: {
    backgroundColor: theme.colors.onLime,
  },
  tabCountPillActionRequired: {
    backgroundColor: theme.colors.surfaceRaised,
  },
  tabCountPillText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  tabCountPillTextActive: {
    color: theme.colors.lime,
  },
  tabCountPillTextActionRequired: {
    color: theme.colors.textPrimary,
  },
  skeletonContainer: {
    gap: theme.spacing.base,
  },
  skeletonCard: {
    padding: theme.spacing.base,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: theme.spacing.base,
  },
  skeletonMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  campaignsList: {
    gap: theme.spacing.base,
  },
  campaignCard: {
    padding: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    gap: theme.spacing.base,
  },
  thumbnail: {
    width: 76,
    height: 76,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceRaised,
  },
  thumbnailPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMeta: {
    flex: 1,
    justifyContent: 'space-between',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryLabel: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  campaignTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 15,
    lineHeight: 20,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  reachEstimateText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.lime,
    marginTop: 2,
  },
  progressSection: {
    backgroundColor: theme.colors.inputBg,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    gap: 6,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  raisedAmountText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  goalText: {
    fontFamily: theme.typography.fonts.uiRegular,
    color: theme.colors.textSecondary,
  },
  percentText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 13,
    color: theme.colors.lime,
  },
  progressBar: {
    height: 6,
  },
  deadlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  deadlineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deadlineText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  alertNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surfaceRaised,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.radius.sm,
  },
  alertNoticeText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
    color: theme.colors.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.xs,
  },
  actionButton: {
    alignSelf: 'flex-start',
  },
  detailsChevronButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  detailsChevronText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.lime,
  },
});
