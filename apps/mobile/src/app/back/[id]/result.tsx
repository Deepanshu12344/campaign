import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Share,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Receipt,
  UserPlus,
  XCircle,
} from 'lucide-react-native';
import { quote } from '@campaigns/shared';
import {
  useCampaign,
  useContribution,
  useReceipt,
  useFollowCampaign,
} from '../../../api';
import { useAuthStore } from '../../../store/authStore';
import { useBackingStore } from '../../../store/backingStore';
import { SharedHeader } from '../../../components/layout/SharedHeader';
import {
  Card,
  Button,
  useToast,
} from '../../../components/ui';
import { theme } from '../../../theme';

const CHECKOUT_STEPS = ['Detail', 'Amount', 'Review', 'Payment', 'Confirmation'];

export default function BackResultScreen() {
  const { id, status: paramStatus, contributionId: paramContributionId } = useLocalSearchParams<{
    id: string;
    status?: string;
    contributionId?: string;
  }>();
  const router = useRouter();
  const toast = useToast();

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const {
    contributionId: storeContributionId,
    guestReceiptToken,
    amountCents,
    previousPercentFunded,
  } = useBackingStore();

  const resolvedContributionId = paramContributionId || storeContributionId || undefined;

  const { data: campaign, refetch: refetchCampaign } = useCampaign(id as string);
  const followMutation = useFollowCampaign(id as string);

  // Poll contribution if pending
  const [isPendingPolling, setIsPendingPolling] = useState(paramStatus === 'pending');

  const {
    data: contribution,
    refetch: refetchContribution,
    isFetching: isContributionFetching,
  } = useContribution(resolvedContributionId, {
    guestReceiptToken,
    refetchInterval: isPendingPolling ? 2500 : false,
  });

  const { data: receipt } = useReceipt(resolvedContributionId, guestReceiptToken);

  // Current effective status
  const currentStatus = useMemo(() => {
    if (contribution?.status) {
      if (contribution.status === 'SUCCEEDED') return 'succeeded';
      if (contribution.status === 'PENDING') return 'pending';
      if (contribution.status === 'FAILED') return 'failed';
      if (contribution.status === 'CANCELLED') return 'cancelled';
    }
    return paramStatus || 'succeeded';
  }, [contribution?.status, paramStatus]);

  // Stop polling once resolved
  useEffect(() => {
    if (contribution?.status && contribution.status !== 'PENDING') {
      setIsPendingPolling(false);
      refetchCampaign();
    }
  }, [contribution?.status, refetchCampaign]);

  // Animated Progress Bar transition
  const targetPercent = campaign?.percentFunded ?? Math.min(100, (previousPercentFunded || 0) + 5);
  const progressAnim = useSharedValue((previousPercentFunded || 0) / 100);

  useEffect(() => {
    if (currentStatus === 'succeeded') {
      // Fire celebratory haptics
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // Animate progress bar to new funded percentage
      progressAnim.value = withTiming(targetPercent / 100, {
        duration: 1200,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [currentStatus, targetPercent, progressAnim]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${Math.min(100, Math.max(0, progressAnim.value * 100))}%`,
  }));

  const quoteData = useMemo(() => {
    return quote(contribution?.amountCents || amountCents || 2500);
  }, [contribution?.amountCents, amountCents]);

  const handleShare = async () => {
    if (!campaign) return;
    try {
      const shareUrl = `https://campaigns.app/campaign/${campaign.id}`;
      const message = `I just backed "${campaign.title}" to fund ad distribution and help reach ~${quoteData.estimatedReachMid.toLocaleString()} more people! Check it out: ${shareUrl}`;
      await Share.share({
        message,
        url: Platform.OS === 'ios' ? shareUrl : undefined,
        title: campaign.title,
      });
    } catch {
      // User cancelled share
    }
  };

  const handleFollowToggle = () => {
    if (!campaign) return;
    followMutation.mutate(!campaign.isFollowing, {
      onSuccess: (res) => {
        toast.info(res.following ? 'Following campaign progress' : 'Unfollowed campaign');
        refetchCampaign();
      },
      onError: (err) => {
        toast.error(err.message || 'Unable to update follow');
      },
    });
  };

  const handleManualRefresh = async () => {
    const res = await refetchContribution();
    if (res.data?.status === 'SUCCEEDED') {
      toast.success('Contribution confirmed!');
      setIsPendingPolling(false);
      refetchCampaign();
    } else {
      toast.info('Verification still in progress...');
    }
  };

  return (
    <View style={styles.container}>
      <SharedHeader
        title={
          currentStatus === 'succeeded'
            ? 'Contribution Confirmed'
            : currentStatus === 'pending'
            ? 'Verifying Payment'
            : currentStatus === 'failed'
            ? 'Payment Unsuccessful'
            : 'Payment Cancelled'
        }
        subtitle="Step 5 of 5"
        showBack={false}
        stepConfig={{
          currentStep: 5,
          totalSteps: 5,
          labels: CHECKOUT_STEPS,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SUCCEEDED VIEW */}
        {currentStatus === 'succeeded' && (
          <View>
            {/* Top Celebration Card */}
            <Card style={styles.heroCard}>
              <View style={styles.successIconWrapper}>
                <CheckCircle2 size={36} color={theme.colors.lime} />
              </View>
              <Text style={styles.heroTitle}>Thank You for Backing!</Text>
              <Text style={styles.heroSubtitle}>
                Your contribution funds digital ad distribution to spread this message. Net funds strictly purchase advertising impressions and are not a charitable donation.
              </Text>

              {/* Receipt Reference */}
              <View style={styles.receiptPill}>
                <Receipt size={14} color={theme.colors.textSecondary} />
                <Text style={styles.receiptPillText}>
                  Receipt #{receipt?.receiptNo || contribution?.receiptNo || 'CONFIRMED'}
                </Text>
              </View>
            </Card>

            {/* Campaign Progress Impact with Animated Bar */}
            <Card style={styles.cardSection}>
              <View style={styles.sectionHeaderRow}>
                <TrendingUp size={18} color={theme.colors.lime} />
                <Text style={styles.sectionHeaderTitle}>Updated Campaign Funding</Text>
              </View>

              <View style={styles.progressRow}>
                <Text style={styles.raisedText}>
                  ${((campaign?.raisedCents ?? 0) / 100).toLocaleString()}{' '}
                  <Text style={styles.goalText}>
                    of ${((campaign?.fundingGoalCents ?? 1) / 100).toLocaleString()} goal
                  </Text>
                </Text>
                <Text style={styles.percentText}>{targetPercent}%</Text>
              </View>

              <View style={styles.progressBarTrack}>
                <Animated.View style={[styles.progressBarFill, animatedProgressStyle]} />
              </View>

              <Text style={styles.progressSubtext}>
                Added +${((contribution?.amountCents || amountCents) / 100).toLocaleString()} into dedicated ad flight distribution.
              </Text>
            </Card>

            {/* Estimated Reach Impact */}
            <Card style={styles.cardSection}>
              <View style={styles.sectionHeaderRow}>
                <Sparkles size={18} color={theme.colors.lime} />
                <Text style={styles.sectionHeaderTitle}>Funded Audience Impact</Text>
              </View>

              <Text style={styles.reachNumber}>
                ~{quoteData.estimatedReachLow.toLocaleString()} – {quoteData.estimatedReachHigh.toLocaleString()}
              </Text>
              <Text style={styles.reachSublabel}>additional people reached with this campaign story</Text>
            </Card>

            {/* Action Buttons: View Receipt, Share, Follow */}
            <View style={styles.actionsGroup}>
              {resolvedContributionId && (
                <Button
                  title="View Itemized Receipt"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onPress={() =>
                    router.push(`/profile/payments/${resolvedContributionId}` as Href)
                  }
                  style={{ marginBottom: theme.spacing.sm }}
                />
              )}

              <View style={styles.dualButtonsRow}>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Share Campaign"
                    variant="secondary"
                    size="md"
                    fullWidth
                    onPress={handleShare}
                  />
                </View>

                {campaign && (
                  <View style={{ flex: 1 }}>
                    <Button
                      title={campaign.isFollowing ? 'Following' : 'Follow Progress'}
                      variant={campaign.isFollowing ? 'ghost' : 'secondary'}
                      size="md"
                      loading={followMutation.isPending}
                      fullWidth
                      onPress={handleFollowToggle}
                    />
                  </View>
                )}
              </View>

              <Button
                title="Return to Campaign"
                variant="ghost"
                size="md"
                fullWidth
                onPress={() => router.replace(`/campaign/${id}` as Href)}
                style={{ marginTop: theme.spacing.xs }}
              />
            </View>

            {/* Guest Account Claim Callout */}
            {!isAuthenticated && guestReceiptToken && (
              <Card style={styles.guestCard}>
                <View style={styles.guestHeaderRow}>
                  <UserPlus size={20} color={theme.colors.lime} />
                  <Text style={styles.guestTitle}>Save Receipt to an Account</Text>
                </View>
                <Text style={styles.guestDesc}>
                  Create a free account to track this contribution, view ad flight delivery metrics, and claim future campaign receipts.
                </Text>
                <Button
                  title="Create Account to Track"
                  variant="secondary"
                  size="sm"
                  onPress={() => router.push('/auth/register' as Href)}
                  style={{ alignSelf: 'flex-start', marginTop: theme.spacing.sm }}
                />
              </Card>
            )}
          </View>
        )}

        {/* PENDING VIEW */}
        {currentStatus === 'pending' && (
          <View>
            <Card style={styles.heroCard}>
              <View style={[styles.successIconWrapper, { backgroundColor: theme.colors.surfaceRaised }]}>
                <Clock size={36} color={theme.colors.lime} />
              </View>
              <Text style={styles.heroTitle}>Verification in Progress</Text>
              <Text style={styles.heroSubtitle}>
                Your bank is currently verifying this simulated transaction. In our prototype, authentication settles automatically within ~15 seconds.
              </Text>
            </Card>

            <Card style={styles.cardSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
                <ActivityIndicator size="small" color={theme.colors.lime} />
                <Text style={styles.sectionHeaderTitle}>Awaiting Bank Confirmation</Text>
              </View>
              <Text style={styles.cardBodyText}>
                You can safely stay on this screen while we poll your bank, or return to the campaign. Your receipt will appear in your profile history as soon as it settles.
              </Text>
            </Card>

            <View style={styles.actionsGroup}>
              <Button
                title="Check Status Now"
                variant="primary"
                size="lg"
                fullWidth
                loading={isContributionFetching}
                onPress={handleManualRefresh}
                style={{ marginBottom: theme.spacing.sm }}
              />
              <Button
                title="Return to Campaign"
                variant="ghost"
                size="md"
                fullWidth
                onPress={() => router.replace(`/campaign/${id}` as Href)}
              />
            </View>
          </View>
        )}

        {/* FAILED VIEW */}
        {currentStatus === 'failed' && (
          <View>
            <Card style={styles.heroCard}>
              <View style={[styles.successIconWrapper, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.line, borderWidth: 1 }]}>
                <XCircle size={36} color={theme.colors.textPrimary} />
              </View>
              <Text style={styles.heroTitle}>Payment Was Not Processed</Text>
              <Text style={styles.heroSubtitle}>
                The simulated transaction could not be completed. Your contribution amount of ${(amountCents / 100).toFixed(2)} has been saved.
              </Text>
            </Card>

            <View style={styles.actionsGroup}>
              <Button
                title="Try Again with Another Card"
                variant="primary"
                size="lg"
                fullWidth
                onPress={() => router.replace(`/back/${id}/pay` as Href)}
                style={{ marginBottom: theme.spacing.sm }}
              />
              <Button
                title="Change Amount"
                variant="secondary"
                size="md"
                fullWidth
                onPress={() => router.replace(`/back/${id}/amount` as Href)}
                style={{ marginBottom: theme.spacing.sm }}
              />
              <Button
                title="Return to Campaign"
                variant="ghost"
                size="md"
                fullWidth
                onPress={() => router.replace(`/campaign/${id}` as Href)}
              />
            </View>
          </View>
        )}

        {/* CANCELLED VIEW */}
        {currentStatus === 'cancelled' && (
          <View>
            <Card style={styles.heroCard}>
              <View style={[styles.successIconWrapper, { backgroundColor: theme.colors.surfaceRaised }]}>
                <AlertCircle size={36} color={theme.colors.textSecondary} />
              </View>
              <Text style={styles.heroTitle}>Contribution Cancelled</Text>
              <Text style={styles.heroSubtitle}>
                This contribution was cancelled. No charges occurred.
              </Text>
            </Card>

            <View style={styles.actionsGroup}>
              <Button
                title="Back Campaign Again"
                variant="primary"
                size="lg"
                fullWidth
                onPress={() => router.replace(`/back/${id}/amount` as Href)}
                style={{ marginBottom: theme.spacing.sm }}
              />
              <Button
                title="Return to Campaign"
                variant="ghost"
                size="md"
                fullWidth
                onPress={() => router.replace(`/campaign/${id}` as Href)}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: theme.spacing['4xl'],
  },
  heroCard: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderRadius: theme.radius.card,
    marginBottom: theme.spacing.base,
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.line,
    borderWidth: 1,
  },
  successIconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.line,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  heroTitle: {
    ...theme.typography.styles.h2,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  heroSubtitle: {
    ...theme.typography.styles.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.base,
  },
  receiptPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.line,
    gap: 6,
  },
  receiptPillText: {
    ...theme.typography.styles.captionSemiBold,
    color: theme.colors.textSecondary,
  },
  cardSection: {
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    marginBottom: theme.spacing.base,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  sectionHeaderTitle: {
    ...theme.typography.styles.h3,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  raisedText: {
    ...theme.typography.styles.smallMedium,
    color: theme.colors.textPrimary,
  },
  goalText: {
    ...theme.typography.styles.small,
    color: theme.colors.textSecondary,
  },
  percentText: {
    ...theme.typography.styles.smallMedium,
    color: theme.colors.lime,
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.lime,
    borderRadius: theme.radius.full,
  },
  progressSubtext: {
    ...theme.typography.styles.small,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  reachNumber: {
    ...theme.typography.styles.display,
    color: theme.colors.lime,
    marginBottom: 4,
  },
  reachSublabel: {
    ...theme.typography.styles.small,
    color: theme.colors.textSecondary,
  },
  actionsGroup: {
    marginBottom: theme.spacing.lg,
  },
  dualButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  guestCard: {
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surfaceRaised,
    marginBottom: theme.spacing.base,
  },
  guestHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  guestTitle: {
    ...theme.typography.styles.smallMedium,
    color: theme.colors.textPrimary,
  },
  guestDesc: {
    ...theme.typography.styles.small,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  cardBodyText: {
    ...theme.typography.styles.small,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});
