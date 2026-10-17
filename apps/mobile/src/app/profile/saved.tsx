import React from 'react';
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
import { Bookmark, TrendingUp, Trash2 } from 'lucide-react-native';
import { useSavedCampaigns, useSaveCampaign } from '../../api/hooks/useInteractions';
import { SharedHeader } from '../../components/layout/SharedHeader';
import { Card, StatusPill, Button, Skeleton, EmptyState, useToast } from '../../components/ui';
import { theme } from '../../theme';
import { CampaignCardDto } from '@campaigns/shared';

interface SavedCardProps {
  campaign: CampaignCardDto;
  onPress: () => void;
  onRemove: () => void;
  isRemoving: boolean;
}

function SavedCampaignCard({ campaign, onPress, onRemove, isRemoving }: SavedCardProps) {
  const percentFunded = campaign.percentFunded ?? 0;

  return (
    <Card style={styles.card}>
      <Pressable
        onPress={onPress}
        style={styles.cardPressable}
        accessibilityRole="button"
        accessibilityLabel={`Saved campaign: ${campaign.title}`}
      >
        <View style={styles.imageCol}>
          {campaign.coverUrl ? (
            <Image
              source={{ uri: campaign.coverUrl }}
              style={styles.coverImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.coverImage, styles.imagePlaceholder]}>
              <TrendingUp size={20} color={theme.colors.ink400} />
            </View>
          )}
        </View>

        <View style={styles.metaCol}>
          <View style={styles.categoryRow}>
            <Text style={styles.categoryText}>{campaign.category}</Text>
            <StatusPill status={campaign.status} />
          </View>

          <Text style={styles.titleText} numberOfLines={2}>
            {campaign.title}
          </Text>

          <View style={styles.progressRow}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(100, Math.max(0, percentFunded))}%` },
                ]}
              />
            </View>
            <Text style={styles.percentText}>{percentFunded}%</Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.cardFooter}>
        <Text style={styles.daysText}>
          {campaign.daysRemaining !== null ? `${campaign.daysRemaining}d left` : 'Ongoing'}
        </Text>
        <Button
          title="Remove"
          variant="ghost"
          size="sm"
          iconLeft={<Trash2 size={14} color={theme.colors.ink500} />}
          loading={isRemoving}
          onPress={onRemove}
          accessibilityLabel={`Remove ${campaign.title} from saved`}
        />
      </View>
    </Card>
  );
}

export default function SavedCampaignsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { data: savedCampaigns = [], isLoading, isRefetching, refetch } = useSavedCampaigns();
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  const saveMutation = useSaveCampaign(removingId || '');

  const handleRemove = (campaign: CampaignCardDto) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setRemovingId(campaign.id);
    saveMutation.mutate(false, {
      onSuccess: () => {
        toast.info(`Removed "${campaign.title}" from saved`);
        setRemovingId(null);
      },
      onError: (err) => {
        toast.error(err.message || 'Unable to remove saved campaign');
        setRemovingId(null);
      },
    });
  };

  const hasSaved = savedCampaigns.length > 0;

  return (
    <View style={styles.container}>
      <SharedHeader
        title="Saved Campaigns"
        subtitle="Bookmarked for Later"
        fallbackRoute="/(tabs)/profile"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.colors.primary600}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading && (
          <View style={styles.skeletonContainer}>
            <Skeleton height={110} borderRadius={theme.radius.card} />
            <Skeleton height={110} borderRadius={theme.radius.card} />
            <Skeleton height={110} borderRadius={theme.radius.card} />
          </View>
        )}

        {!isLoading && hasSaved && (
          <View style={styles.listContainer}>
            {savedCampaigns.map((item) => (
              <SavedCampaignCard
                key={item.id}
                campaign={item}
                onPress={() => router.push(`/campaign/${item.id}`)}
                onRemove={() => handleRemove(item)}
                isRemoving={removingId === item.id}
              />
            ))}
          </View>
        )}

        {!isLoading && !hasSaved && (
          <EmptyState
            title="No Saved Campaigns"
            description="Keep track of inspiring causes and editorial stories you want to follow or contribute to before their funding windows conclude."
            actionTitle="Discover Campaigns"
            onAction={() => router.push('/(tabs)/explore')}
            icon={<Bookmark size={36} color={theme.colors.primary600} />}
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
  card: {
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  cardPressable: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  imageCol: {
    width: 68,
    height: 68,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.bgMuted,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  metaCol: {
    flex: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 11,
    color: theme.colors.primary700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    lineHeight: 18,
    color: theme.colors.ink900,
    marginBottom: theme.spacing.xs,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  progressBarBg: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.line,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary600,
  },
  percentText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 11,
    color: theme.colors.primary700,
    minWidth: 32,
    textAlign: 'right',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
  },
  daysText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.ink500,
  },
});
