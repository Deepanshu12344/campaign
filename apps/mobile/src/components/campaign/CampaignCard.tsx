import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Info, ArrowUpRight } from 'lucide-react-native';
import { CampaignCardDto, reachAtGoal } from '@campaigns/shared';
import { theme } from '../../theme';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { StatusPill } from '../ui/StatusPill';
import { Skeleton } from '../ui/Skeleton';

export type CampaignCardVariant = 'default' | 'compact' | 'featured' | 'skeleton';

export interface CampaignCardProps {
  campaign?: CampaignCardDto;
  variant?: CampaignCardVariant;
  onPress?: () => void;
  onBackPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

function formatCents(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
}

export function CampaignCard({
  campaign,
  variant = 'default',
  onPress,
  onBackPress,
  style,
}: CampaignCardProps) {
  if (variant === 'skeleton' || !campaign) {
    return <CampaignCardSkeleton variant={variant} style={style} />;
  }

  const reach =
    campaign.estimatedReachLow && campaign.estimatedReachHigh
      ? {
          estimatedReachLow: campaign.estimatedReachLow,
          estimatedReachHigh: campaign.estimatedReachHigh,
        }
      : reachAtGoal(campaign.fundingGoalCents);

  const percent = Math.min(
    Math.round((campaign.raisedCents / campaign.fundingGoalCents) * 100),
    100
  );

  const handleCardPress = () => {
    onPress?.();
  };

  const handleBackPress = (e?: GestureResponderEvent) => {
    e?.stopPropagation?.();
    if (onBackPress) {
      onBackPress();
    } else {
      onPress?.();
    }
  };

  if (variant === 'compact') {
    return (
      <Pressable
        onPress={handleCardPress}
        accessibilityRole="button"
        accessibilityLabel={`${campaign.title}, ${percent}% funded`}
        style={({ pressed }) => [
          styles.card,
          styles.compactCard,
          pressed && styles.pressed,
          style,
        ]}
      >
        <View style={styles.compactRow}>
          {campaign.coverUrl ? (
            <Image
              source={{ uri: campaign.coverUrl }}
              style={styles.compactImage}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View style={[styles.compactImage, styles.placeholderImage]} />
          )}
          <View style={styles.compactContent}>
            <Text style={styles.categoryText} numberOfLines={1}>
              {campaign.category}
            </Text>
            <Text style={styles.compactTitle} numberOfLines={2}>
              {campaign.title}
            </Text>
            <View style={styles.progressRow}>
              <ProgressBar value={percent} size="sm" style={{ flex: 1 }} />
              <Text style={styles.percentText}>{percent}%</Text>
            </View>
            <Text style={styles.compactRaisedText}>
              {formatCents(campaign.raisedCents)}{' '}
              <Text style={styles.compactGoalText}>of {formatCents(campaign.fundingGoalCents)}</Text>
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  const isFunding = campaign.status === 'FUNDING';

  return (
    <Pressable
      onPress={handleCardPress}
      accessibilityRole="button"
      accessibilityLabel={`${campaign.title}, by ${campaign.creatorName}. ${percent}% funded.`}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
        style,
      ]}
    >
      {/* 1. Fixed 16:10 Cover Image, 20dp radius */}
      <View style={styles.imageContainer}>
        {campaign.coverUrl ? (
          <Image
            source={{ uri: campaign.coverUrl }}
            style={styles.coverImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.coverImage, styles.placeholderImage]} />
        )}
        {!isFunding && (
          <View style={styles.imageStatusPillWrap}>
            <StatusPill status={campaign.status} style={styles.translucentStatusPill} />
          </View>
        )}
      </View>

      {/* 2. Content Body */}
      <View style={styles.body}>
        {/* Category: small grey text (no chip) */}
        <Text style={styles.categoryText} numberOfLines={1}>
          {campaign.category}
        </Text>

        {/* Title: max 2 lines */}
        <Text style={styles.title} numberOfLines={2}>
          {campaign.title}
        </Text>

        {/* Creator: 1 line grey */}
        <Text style={styles.creatorText} numberOfLines={1}>
          By {campaign.creatorName}
        </Text>

        {/* 3. Funding Block: lime progress bar, "$3,200 raised of $8,000" with % on right */}
        <View style={styles.fundingBlock}>
          <ProgressBar value={percent} size="md" />
          <View style={styles.fundingNumbersRow}>
            <Text style={styles.raisedText}>
              {formatCents(campaign.raisedCents)}{' '}
              <Text style={styles.goalText}>raised of {formatCents(campaign.fundingGoalCents)}</Text>
            </Text>
            <Text style={styles.percentText}>{percent}%</Text>
          </View>
        </View>

        {/* 4. Reach Estimate: Small grey line with info icon */}
        <View style={styles.reachLine}>
          <Info size={13} color={theme.colors.textSecondary} strokeWidth={2} />
          <Text style={styles.reachText} numberOfLines={1} ellipsizeMode="tail">
            Est. reach at goal: {reach.estimatedReachLow.toLocaleString()}-{reach.estimatedReachHigh.toLocaleString()} people
          </Text>
        </View>

        {/* 5. Action Area: Full-width lime pill button (44dp). View Details has trailing arrow, Back This Campaign has NO arrow */}
        <View style={styles.actionRow}>
          {isFunding ? (
            <Button
              title="Back This Campaign"
              variant="primary"
              size="md"
              fullWidth
              onPress={handleBackPress}
              style={styles.actionButton}
              numberOfLines={1}
            />
          ) : (
            <Button
              title="View Details"
              variant="primary"
              size="md"
              fullWidth
              iconRight={<ArrowUpRight size={18} color={theme.colors.onLime} strokeWidth={2.5} />}
              onPress={handleCardPress}
              style={styles.actionButton}
              numberOfLines={1}
            />
          )}
        </View>
      </View>
    </Pressable>
  );
}

function CampaignCardSkeleton({
  variant,
  style,
}: {
  variant?: CampaignCardVariant;
  style?: StyleProp<ViewStyle>;
}) {
  if (variant === 'compact') {
    return (
      <View style={[styles.card, styles.compactCard, style]}>
        <View style={styles.compactRow}>
          <Skeleton width={80} height={80} radius={16} />
          <View style={[styles.compactContent, { justifyContent: 'space-between' }]}>
            <Skeleton width={60} height={12} />
            <Skeleton width="90%" height={16} />
            <Skeleton width="100%" height={6} radius={theme.radius.full} />
            <Skeleton width="50%" height={12} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, style]}>
      {/* 16:10 skeleton cover */}
      <View style={styles.imageContainer}>
        <Skeleton width="100%" height={190} radius={20} />
      </View>
      <View style={styles.body}>
        <Skeleton width={80} height={12} style={{ marginBottom: 8 }} />
        <Skeleton width="95%" height={20} style={{ marginBottom: 6 }} />
        <Skeleton width="70%" height={20} style={{ marginBottom: 12 }} />
        <Skeleton width={120} height={14} style={{ marginBottom: 8 }} />
        <Skeleton width="100%" height={14} style={{ marginBottom: 4 }} />
        <Skeleton width="85%" height={14} style={{ marginBottom: 16 }} />
        <Skeleton width="100%" height={8} radius={theme.radius.full} style={{ marginBottom: 8 }} />
        <Skeleton width="60%" height={14} style={{ marginBottom: 16 }} />
        <Skeleton width="100%" height={44} radius={theme.radius.pill} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface, // #2A2D29
    borderRadius: 24,
    padding: 16,
  },
  pressed: {
    opacity: 0.96,
    transform: [{ scale: 0.99 }],
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceRaised,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: theme.colors.surfaceRaised,
  },
  body: {
    paddingTop: 16,
  },
  categoryText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.textSecondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 18,
    lineHeight: 24,
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  creatorText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  summaryText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  fundingBlock: {
    marginBottom: 12,
  },
  fundingNumbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 8,
  },
  raisedText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  goalText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  percentText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 14,
    color: theme.colors.lime,
  },
  reachLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    overflow: 'hidden',
  },
  reachText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.textSecondary,
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  imageStatusPillWrap: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 2,
  },
  translucentStatusPill: {
    backgroundColor: 'rgba(18, 21, 17, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  actionRow: {
    width: '100%',
  },
  actionButton: {
    height: 44,
  },

  // Compact variant styles
  compactCard: {
    padding: 12,
  },
  compactRow: {
    flexDirection: 'row',
    gap: 12,
  },
  compactImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  compactContent: {
    flex: 1,
    justifyContent: 'center',
  },
  compactTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    lineHeight: 18,
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  compactRaisedText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 12,
    color: theme.colors.textPrimary,
  },
  compactGoalText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
});
