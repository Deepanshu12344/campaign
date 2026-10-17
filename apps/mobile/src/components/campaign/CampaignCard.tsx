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
import {
  User,
  Sparkles,
  HeartHandshake,
  Briefcase,
  Users,
  Clock,
} from 'lucide-react-native';
import { CampaignCardDto, CreatorType, reachAtGoal } from '@campaigns/shared';
import { theme } from '../../theme';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { CategoryChip } from '../ui/CategoryChip';
import { StatusPill } from '../ui/StatusPill';
import { DemoDataBadge } from '../ui/DemoDataBadge';
import { ReachEstimateBadge } from '../ui/ReachEstimateBadge';
import { Skeleton } from '../ui/Skeleton';

export type CampaignCardVariant = 'default' | 'compact' | 'featured' | 'skeleton';

export interface CampaignCardProps {
  campaign?: CampaignCardDto;
  variant?: CampaignCardVariant;
  onPress?: () => void;
  onBackPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

function getCreatorIcon(type: CreatorType) {
  const iconProps = { size: 14, color: theme.colors.ink500 };
  switch (type) {
    case 'individual':
      return <User {...iconProps} />;
    case 'creator':
      return <Sparkles {...iconProps} />;
    case 'nonprofit':
      return <HeartHandshake {...iconProps} />;
    case 'business':
      return <Briefcase {...iconProps} />;
    case 'community':
      return <Users {...iconProps} />;
    default:
      return <User {...iconProps} />;
  }
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
        accessibilityLabel={`${campaign.title}, ${campaign.category}, ${percent}% funded`}
        style={({ pressed }) => [
          styles.compactContainer,
          pressed && styles.pressed,
          style,
        ]}
      >
        <Card style={styles.compactCard}>
          <View style={styles.compactRow}>
            {campaign.coverUrl ? (
              <Image
                source={{ uri: campaign.coverUrl }}
                style={styles.compactImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.compactImage, styles.placeholderImage]} />
            )}
            <View style={styles.compactContent}>
              <View style={styles.metaRow}>
                <CategoryChip category={campaign.category} style={styles.smallChip} />
                {campaign.isDemo && <DemoDataBadge size="sm" />}
              </View>
              <Text style={styles.compactTitle} numberOfLines={2}>
                {campaign.title}
              </Text>
              <View style={styles.compactProgressRow}>
                <ProgressBar
                  value={percent}
                  size="sm"
                  style={styles.compactProgress}
                />
                <Text style={styles.compactPercentText}>{percent}%</Text>
              </View>
              <View style={styles.compactFooter}>
                <Text style={styles.compactRaisedText}>
                  {formatCents(campaign.raisedCents)}{' '}
                  <Text style={styles.subtleText}>of {formatCents(campaign.fundingGoalCents)}</Text>
                </Text>
              </View>
            </View>
          </View>
        </Card>
      </Pressable>
    );
  }

  const isFeatured = variant === 'featured';

  return (
    <Pressable
      onPress={handleCardPress}
      accessibilityRole="button"
      accessibilityLabel={`${campaign.title}, campaign by ${campaign.creatorName}. ${percent}% funded.`}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Card style={styles.cardContainer}>
        {/* Cover Image */}
        <View style={styles.imageWrap}>
          {campaign.coverUrl ? (
            <Image
              source={{ uri: campaign.coverUrl }}
              style={isFeatured ? styles.featuredImage : styles.coverImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View
              style={[
                isFeatured ? styles.featuredImage : styles.coverImage,
                styles.placeholderImage,
              ]}
            />
          )}
          {/* Badges on image overlay */}
          <View style={styles.overlayBadges}>
            <View style={styles.overlayBadgesLeft}>
              <CategoryChip category={campaign.category} />
              {campaign.status !== 'FUNDING' && (
                <StatusPill status={campaign.status} style={styles.overlayStatusPill} />
              )}
            </View>
            {campaign.isDemo && <DemoDataBadge size="sm" />}
          </View>
        </View>

        {/* Card Body */}
        <View style={styles.body}>
          {/* Creator info */}
          <View style={styles.creatorRow}>
            {getCreatorIcon(campaign.creatorType)}
            <Text style={styles.creatorName} numberOfLines={1}>
              {campaign.creatorName}
            </Text>
            {campaign.daysRemaining !== null && campaign.daysRemaining !== undefined && (
              <View style={styles.daysRow}>
                <Clock size={12} color={theme.colors.ink400} />
                <Text style={styles.daysText}>
                  {campaign.daysRemaining > 0
                    ? `${campaign.daysRemaining}d left`
                    : 'Goal reached'}
                </Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text
            style={isFeatured ? styles.featuredTitle : styles.title}
            numberOfLines={2}
          >
            {campaign.title}
          </Text>

          {/* Summary */}
          <Text style={styles.summary} numberOfLines={2}>
            {campaign.summary}
          </Text>

          {/* Reach estimate badge */}
          <View style={styles.reachWrap}>
            <ReachEstimateBadge
              low={reach.estimatedReachLow}
              high={reach.estimatedReachHigh}
              size="sm"
              showSubtitle
            />
          </View>

          {/* Financials & Progress */}
          <View style={styles.financialSection}>
            <View style={styles.financialNumbers}>
              <Text style={styles.raisedNumber}>
                {formatCents(campaign.raisedCents)}{' '}
                <Text style={styles.goalSubtext}>
                  raised of {formatCents(campaign.fundingGoalCents)}
                </Text>
              </Text>
              <Text style={styles.percentNumber}>{percent}%</Text>
            </View>
            <ProgressBar value={percent} size="md" />
          </View>

          {/* Action Area */}
          <View style={styles.actionWrap}>
            {campaign.status === 'FUNDING' ? (
              <Button
                title="Back This Campaign"
                variant="primary"
                size={isFeatured ? 'lg' : 'md'}
                fullWidth
                onPress={handleBackPress}
              />
            ) : (
              <View style={styles.nonFundingActionRow}>
                <StatusPill status={campaign.status} />
                <Button
                  title="View Campaign"
                  variant="secondary"
                  size={isFeatured ? 'lg' : 'md'}
                  style={styles.viewDetailsButton}
                  onPress={handleCardPress}
                />
              </View>
            )}
          </View>
        </View>
      </Card>
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
      <Card style={[styles.compactCard, style]}>
        <View style={styles.compactRow}>
          <Skeleton width={88} height={88} radius={theme.radius.sm} />
          <View style={[styles.compactContent, { justifyContent: 'space-between' }]}>
            <Skeleton width={80} height={20} radius={theme.radius.full} />
            <Skeleton width="100%" height={16} />
            <Skeleton width="60%" height={12} />
            <Skeleton width="100%" height={6} radius={theme.radius.full} />
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card style={[styles.cardContainer, style]}>
      <Skeleton width="100%" height={170} radius={0} />
      <View style={styles.body}>
        <View style={styles.creatorRow}>
          <Skeleton width={16} height={16} radius={8} />
          <Skeleton width={120} height={14} style={{ marginLeft: 6 }} />
        </View>
        <Skeleton width="90%" height={22} style={{ marginTop: theme.spacing.xs }} />
        <Skeleton width="60%" height={22} style={{ marginTop: 4 }} />
        <Skeleton width="100%" height={14} style={{ marginTop: theme.spacing.sm }} />
        <Skeleton width="80%" height={14} style={{ marginTop: 4 }} />
        <Skeleton
          width={180}
          height={24}
          radius={theme.radius.full}
          style={{ marginTop: theme.spacing.md }}
        />
        <Skeleton width="100%" height={8} radius={theme.radius.full} style={{ marginTop: theme.spacing.base }} />
        <Skeleton width="100%" height={44} radius={theme.radius.md} style={{ marginTop: theme.spacing.base }} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.radius.card,
  },
  pressed: {
    opacity: 0.96,
    transform: [{ scale: 0.99 }],
  },
  cardContainer: {
    padding: 0,
    overflow: 'hidden',
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    backgroundColor: theme.colors.slate100,
  },
  coverImage: {
    width: '100%',
    height: 175,
  },
  featuredImage: {
    width: '100%',
    height: 220,
  },
  placeholderImage: {
    backgroundColor: theme.colors.slate200,
  },
  overlayBadges: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    right: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overlayBadgesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overlayStatusPill: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  body: {
    padding: theme.spacing.base,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  creatorName: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: theme.typography.styles.caption.fontSize,
    color: theme.colors.ink600,
    marginLeft: theme.spacing.xxs,
    flex: 1,
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  daysText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    color: theme.colors.ink500,
  },
  title: {
    fontFamily: theme.typography.fonts.serifSemiBold,
    fontSize: 19,
    lineHeight: 25,
    color: theme.colors.ink900,
    marginBottom: theme.spacing.xs,
  },
  featuredTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 22,
    lineHeight: 28,
    color: theme.colors.ink900,
    marginBottom: theme.spacing.xs,
  },
  summary: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.body.fontSize,
    lineHeight: theme.typography.styles.body.lineHeight,
    color: theme.colors.ink700,
    marginBottom: theme.spacing.md,
  },
  reachWrap: {
    marginBottom: theme.spacing.base,
  },
  financialSection: {
    marginBottom: theme.spacing.base,
  },
  financialNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: theme.spacing.xs,
  },
  raisedNumber: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: theme.typography.styles.body.fontSize,
    color: theme.colors.ink900,
  },
  goalSubtext: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.caption.fontSize,
    color: theme.colors.ink500,
  },
  percentNumber: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: theme.typography.styles.body.fontSize,
    color: theme.colors.primary700,
  },
  actionWrap: {
    marginTop: theme.spacing.xxs,
  },
  nonFundingActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  viewDetailsButton: {
    flex: 1,
  },

  // Compact variant styles
  compactContainer: {
    borderRadius: theme.radius.card,
  },
  compactCard: {
    padding: theme.spacing.sm,
  },
  compactRow: {
    flexDirection: 'row',
  },
  compactImage: {
    width: 90,
    height: 90,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.slate100,
  },
  compactContent: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  smallChip: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  compactTitle: {
    fontFamily: theme.typography.fonts.serifSemiBold,
    fontSize: 15,
    lineHeight: 20,
    color: theme.colors.ink900,
    marginBottom: 6,
  },
  compactProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  compactProgress: {
    flex: 1,
  },
  compactPercentText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 11,
    color: theme.colors.primary700,
  },
  compactFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  compactRaisedText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    color: theme.colors.ink800,
  },
  subtleText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    color: theme.colors.ink500,
  },
});
