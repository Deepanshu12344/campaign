import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Image } from 'expo-image';
import {
  TrendingUp,
  ChevronRight,
} from 'lucide-react-native';
import { useMyContributions } from '../../api';
import { SharedHeader } from '../../components/layout/SharedHeader';
import {
  Card,
  Button,
  Skeleton,
  EmptyState,
  StatusPill,
} from '../../components/ui';
import { CampaignStatus } from '@campaigns/shared';
import { theme } from '../../theme';

export default function BackedCampaignsScreen() {
  const router = useRouter();
  const {
    data: contributions,
    isLoading,
    isRefetching,
    refetch,
  } = useMyContributions();

  // Deduplicate and aggregate contributions by campaign
  const campaignMap = useMemo(() => {
    if (!contributions) return [];
    const map = new Map<
      string,
      {
        campaignId: string;
        campaignTitle: string;
        campaignCoverUrl: string | null;
        totalBackedCents: number;
        contributionCount: number;
        latestContributionId: string;
        status?: CampaignStatus;
        goalCents: number;
        raisedCents: number;
      }
    >();

    for (const c of contributions) {
      const existing = map.get(c.campaignId);
      if (existing) {
        existing.totalBackedCents += c.amountCents;
        existing.contributionCount += 1;
      } else {
        map.set(c.campaignId, {
          campaignId: c.campaignId,
          campaignTitle: c.campaignTitle,
          campaignCoverUrl: c.campaignCoverUrl,
          totalBackedCents: c.amountCents,
          contributionCount: 1,
          latestContributionId: c.id,
          status: c.campaignStatus,
          goalCents: c.campaignGoalCents || 0,
          raisedCents: c.campaignRaisedCents || 0,
        });
      }
    }

    return Array.from(map.values());
  }, [contributions]);

  const hasBacked = campaignMap.length > 0;

  return (
    <View style={styles.container}>
      <SharedHeader
        title="Backed Campaigns"
        subtitle="Your Amplification Portfolio"
        fallbackRoute="/(tabs)/profile"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.colors.lime}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading && (
          <View style={styles.skeletonContainer}>
            <Skeleton height={110} borderRadius={16} />
            <View style={{ height: theme.spacing.md }} />
            <Skeleton height={110} borderRadius={16} />
          </View>
        )}

        {!isLoading && hasBacked && (
          <View style={styles.listContainer}>
            {campaignMap.map((item) => (
              <Card key={item.campaignId} style={styles.campaignCard}>
                <Pressable
                  onPress={() => router.push(`/campaign/${item.campaignId}` as Href)}
                  style={styles.cardHeaderRow}
                >
                  {item.campaignCoverUrl ? (
                    <Image
                      source={{ uri: item.campaignCoverUrl }}
                      style={styles.coverThumbnail}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : (
                    <View style={[styles.coverThumbnail, styles.coverPlaceholder]}>
                      <TrendingUp size={20} color={theme.colors.textSecondary} />
                    </View>
                  )}

                  <View style={styles.campaignMetaCol}>
                    <View style={styles.titleRow}>
                      <Text style={styles.campaignTitle} numberOfLines={2}>
                        {item.campaignTitle}
                      </Text>
                      {item.status && <StatusPill status={item.status} />}
                    </View>

                    <Text style={styles.fundedText}>
                      You funded: ${(item.totalBackedCents / 100).toFixed(2)}
                    </Text>

                    {item.goalCents > 0 && (
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBarBg}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                width: `${Math.min(
                                  100,
                                  Math.round((item.raisedCents / item.goalCents) * 100)
                                )}%`,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.progressLabel}>
                          {Math.round((item.raisedCents / item.goalCents) * 100)}% of ${(item.goalCents / 100).toLocaleString()}
                        </Text>
                      </View>
                    )}
                  </View>

                  <ChevronRight size={18} color={theme.colors.textSecondary} />
                </Pressable>

                <View style={styles.divider} />

                <View style={styles.cardActionsRow}>
                  <Button
                    title="View Campaign"
                    variant="secondary"
                    size="sm"
                    onPress={() => router.push(`/campaign/${item.campaignId}` as Href)}
                  />
                  <Button
                    title="View Receipt"
                    variant="ghost"
                    size="sm"
                    onPress={() =>
                      router.push(`/profile/payments/${item.latestContributionId}` as Href)
                    }
                  />
                </View>
              </Card>
            ))}
          </View>
        )}

        {!isLoading && !hasBacked && (
          <EmptyState
            title="No Backed Campaigns"
            description="You haven't backed any campaigns yet. Backing funds digital advertising distribution to bring vital stories and causes to wider audiences."
            actionTitle="Explore Campaigns"
            onAction={() => router.push('/(tabs)/explore' as Href)}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: theme.spacing['4xl'],
  },
  skeletonContainer: {
    gap: theme.spacing.md,
  },
  listContainer: {
    gap: theme.spacing.md,
  },
  campaignCard: {
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  coverThumbnail: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceRaised,
  },
  coverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  campaignMetaCol: {
    flex: 1,
  },
  campaignTitle: {
    ...theme.typography.styles.h3,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
    marginBottom: 2,
  },
  fundedText: {
    ...theme.typography.styles.small,
    color: theme.colors.lime,
    fontFamily: theme.typography.fonts.uiSemiBold,
    marginTop: 2,
  },
  progressContainer: {
    marginTop: theme.spacing.xs,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 3,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.lime,
  },
  progressLabel: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
});
