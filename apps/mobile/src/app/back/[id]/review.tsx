import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Href } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import {
  ShieldAlert,
  Check,
  Sparkles,
  FileText,
  TrendingUp,
} from 'lucide-react-native';
import { quote } from '@campaigns/shared';
import {
  useCampaign,
  useQuote,
  useCreateContribution,
} from '../../../api';
import { useAuthStore } from '../../../store/authStore';
import { useBackingStore } from '../../../store/backingStore';
import { SharedHeader } from '../../../components/layout/SharedHeader';
import {
  Card,
  Accordion,
  Skeleton,
  ErrorState,
  useToast,
} from '../../../components/ui';
import { StickyActionBar } from '../../../components/ui/StickyActionBar';
import { theme } from '../../../theme';

const CHECKOUT_STEPS = ['Detail', 'Amount', 'Review', 'Payment', 'Confirmation'];

export default function BackReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const {
    data: campaign,
    isLoading: isCampaignLoading,
    isError: isCampaignError,
    error: campaignError,
    refetch: refetchCampaign,
  } = useCampaign(id as string);

  const {
    amountCents,
    isAnonymous,
    publicName,
    guestEmail,
    setPrivacy,
    setGuestEmail,
    setContribution,
  } = useBackingStore();

  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [localPublicName, setLocalPublicName] = useState(
    publicName || (user?.name ? user.name : '')
  );
  const [localEmail, setLocalEmail] = useState(
    guestEmail || (user?.email ? user.email : '')
  );

  const createContributionMutation = useCreateContribution();

  // Quote calculations
  const { data: apiQuote } = useQuote(campaign?.id, amountCents);
  const quoteData = useMemo(() => {
    if (apiQuote && apiQuote.amountCents === amountCents) {
      return apiQuote;
    }
    return quote(amountCents);
  }, [apiQuote, amountCents]);

  // Dual Progress calculations
  const currentRaised = campaign?.raisedCents ?? 0;
  const currentGoal = campaign?.fundingGoalCents ?? 1;
  const currentPercent = campaign?.percentFunded ?? 0;

  const newRaised = currentRaised + amountCents;
  const newPercent = Math.min(100, Math.round((newRaised / currentGoal) * 100));
  const percentDelta = Math.max(0, newPercent - currentPercent);

  const handleTogglePrivacy = (value: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setPrivacy(!value, localPublicName);
  };

  const handlePublicNameChange = (name: string) => {
    setLocalPublicName(name);
    setPrivacy(isAnonymous, name);
  };

  const handleEmailChange = (email: string) => {
    setLocalEmail(email);
    setGuestEmail(email);
  };

  const handleToggleAcknowledgement = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setHasAcknowledged((prev) => !prev);
  };

  const handleProceed = async () => {
    if (!campaign || !hasAcknowledged || amountCents < 100) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const result = await createContributionMutation.mutateAsync({
        campaignId: campaign.id,
        amountCents,
        guestEmail: localEmail.trim() ? localEmail.trim() : undefined,
        publicName: isAnonymous ? undefined : localPublicName.trim() || undefined,
        isAnonymous,
      });

      setContribution(result.contribution.id, result.guestReceiptToken);
      router.push(`/back/${campaign.id}/pay` as Href);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to initialize contribution. Please try again.';
      toast.error(message);
    }
  };

  if (isCampaignLoading) {
    return (
      <View style={styles.container}>
        <SharedHeader
          title="Review & Impact"
          subtitle="Step 3 of 5"
          fallbackRoute={`/back/${id}/amount`}
          stepConfig={{
            currentStep: 3,
            totalSteps: 5,
            labels: CHECKOUT_STEPS,
          }}
        />
        <View style={styles.skeletonContent}>
          <Skeleton height={140} borderRadius={16} />
          <View style={{ height: theme.spacing.lg }} />
          <Skeleton height={160} borderRadius={16} />
          <View style={{ height: theme.spacing.lg }} />
          <Skeleton height={100} borderRadius={16} />
        </View>
      </View>
    );
  }

  if (isCampaignError || !campaign) {
    return (
      <View style={styles.container}>
        <SharedHeader
          title="Review Contribution"
          fallbackRoute={`/campaign/${id}`}
        />
        <ErrorState
          title="Unable to load campaign"
          message={campaignError?.message || 'Failed to retrieve campaign for review.'}
          onRetry={refetchCampaign}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SharedHeader
        title="Review & Impact"
        subtitle="Step 3 of 5"
        fallbackRoute={`/back/${id}/amount`}
        stepConfig={{
          currentStep: 3,
          totalSteps: 5,
          labels: CHECKOUT_STEPS,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Campaign Summary & Estimated Reach Header */}
        <Card style={styles.summaryCard}>
          <View style={styles.campaignHeaderRow}>
            {campaign.coverUrl ? (
              <Image
                source={{ uri: campaign.coverUrl }}
                style={styles.coverThumbnail}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.coverThumbnail, styles.coverPlaceholder]}>
                <TrendingUp size={20} color={theme.colors.textSecondary} />
              </View>
            )}
            <View style={styles.campaignTextCol}>
              <Text style={styles.campaignTitle} numberOfLines={2}>
                {campaign.title}
              </Text>
              <Text style={styles.creatorName}>
                by {campaign.creatorName}
              </Text>
            </View>
          </View>

          <View style={styles.reachBanner}>
            <View style={styles.reachIconWrapper}>
              <Sparkles size={16} color={theme.colors.lime} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reachBannerTitle}>
                ~{quoteData.estimatedReachLow.toLocaleString()} – {quoteData.estimatedReachHigh.toLocaleString()} people reached
              </Text>
              <View style={styles.estimateBadgeRow}>
                <Text style={styles.estimateBadgeLabel}>Estimate · not a guarantee</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Dual Progress Visualizer */}
        <Card style={styles.progressCard}>
          <Text style={styles.cardHeaderTitle}>Campaign Progress Impact</Text>
          <View style={styles.progressNumbersRow}>
            <View>
              <Text style={styles.progressSubLabel}>Current Progress</Text>
              <Text style={styles.progressValueText}>
                ${(currentRaised / 100).toLocaleString()}{' '}
                <Text style={styles.progressGoalText}>({currentPercent}%)</Text>
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.progressSubLabel}>After Contribution</Text>
              <Text style={[styles.progressValueText, { color: theme.colors.lime }]}>
                ${(newRaised / 100).toLocaleString()}{' '}
                <Text style={[styles.progressGoalText, { color: theme.colors.lime }]}>
                  ({newPercent}%)
                </Text>
              </Text>
            </View>
          </View>

          {/* Dual bar representation */}
          <View style={styles.dualBarContainer}>
            <View
              style={[
                styles.dualBarCurrent,
                { width: `${Math.min(100, currentPercent)}%` },
              ]}
            />
            {percentDelta > 0 && (
              <View
                style={[
                  styles.dualBarDelta,
                  { width: `${Math.min(100 - currentPercent, percentDelta)}%` },
                ]}
              />
            )}
          </View>

          <View style={styles.dualBarLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.surfaceRaised }]} />
              <Text style={styles.legendText}>Current: ${Math.round(currentRaised / 100)}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.lime }]} />
              <Text style={styles.legendText}>Your +${Math.round(amountCents / 100)} ({percentDelta}%)</Text>
            </View>
          </View>
        </Card>

        {/* Transparent Financial Fee Breakdown */}
        <Card style={styles.breakdownCard}>
          <Text style={styles.cardHeaderTitle}>Itemized Cost Breakdown</Text>
          <Text style={styles.cardSubText}>
            Every dollar is accounted for. Net contributions strictly buy digital media spend.
          </Text>

          <View style={styles.breakdownRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.breakdownItemTitle}>Advertising Media Spend</Text>
              <Text style={styles.breakdownItemDesc}>90% allocated directly to ad networks</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              ${(quoteData.adBudgetCents / 100).toFixed(2)}
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.breakdownItemTitle}>Platform Fee</Text>
              <Text style={styles.breakdownItemDesc}>10% platform maintenance & ops</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              ${(quoteData.platformFeeCents / 100).toFixed(2)}
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.breakdownItemTitle}>Payment Processing</Text>
              <Text style={styles.breakdownItemDesc}>Standard 2.9% + $0.30 payment fee</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              ${(quoteData.processingFeeCents / 100).toFixed(2)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Charged</Text>
            <Text style={styles.totalAmount}>
              ${(quoteData.totalCents / 100).toFixed(2)}
            </Text>
          </View>
        </Card>

        {/* Backer Privacy & Identity */}
        <Card style={styles.privacyCard}>
          <Text style={styles.cardHeaderTitle}>Backer Visibility</Text>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.switchTitle}>Show my name publicly</Text>
              <Text style={styles.switchDesc}>
                {!isAnonymous
                  ? 'Your name will appear in the public list of backers.'
                  : 'You will appear as an Anonymous Backer.'}
              </Text>
            </View>
            <Switch
              value={!isAnonymous}
              onValueChange={handleTogglePrivacy}
              trackColor={{ false: theme.colors.line, true: theme.colors.lime }}
              thumbColor={Platform.OS === 'android' ? theme.colors.surface : undefined}
            />
          </View>

          {!isAnonymous && (
            <View style={styles.nameInputContainer}>
              <Text style={styles.inputLabel}>Public Display Name</Text>
              <TextInput
                style={styles.textInput}
                value={localPublicName}
                onChangeText={handlePublicNameChange}
                placeholder="e.g. Jane Doe"
                placeholderTextColor={theme.colors.textSecondary}
                maxLength={50}
              />
            </View>
          )}

          {!isAuthenticated && (
            <View style={styles.guestEmailContainer}>
              <Text style={styles.inputLabel}>Receipt Delivery Email</Text>
              <TextInput
                style={styles.textInput}
                value={localEmail}
                onChangeText={handleEmailChange}
                placeholder="you@example.com (optional)"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.guestEmailHint}>
                Your official receipt token is securely stored on this device. Adding an email delivers an additional copy.
              </Text>
            </View>
          )}
        </Card>

        {/* Terms and Refund Policy Accordion */}
        <View style={styles.accordionWrapper}>
          <Accordion
            title="Refund Policy & Campaign Terms"
            icon={<FileText size={18} color={theme.colors.textSecondary} />}
          >
            <Text style={styles.accordionBodyText}>
              • <Text style={{ fontWeight: '600' }}>All-or-Nothing Escrow:</Text> If this campaign does not achieve its funding goal before the deadline, all contributions are fully refunded.
            </Text>
            <Text style={styles.accordionBodyText}>
              • <Text style={{ fontWeight: '600' }}>Post-Goal Commitment:</Text> Once the funding goal is reached and funds are dispatched to ad networks, advertising impressions are irrevocably delivered and refunds are no longer possible.
            </Text>
            <Text style={styles.accordionBodyText}>
              • <Text style={{ fontWeight: '600' }}>Transparent Auditing:</Text> As ads run, campaign creators publish delivery receipts and real-time impression metrics directly to the campaign dashboard.
            </Text>
          </Accordion>
        </View>

        {/* Non-Donation Statement (Prominent Banner) */}
        <View style={styles.nonDonationBanner}>
          <ShieldAlert size={22} color={theme.colors.lime} style={styles.bannerIcon} />
          <View style={styles.nonDonationTextCol}>
            <Text style={styles.nonDonationTitle}>Non-Donation Disclosure</Text>
            <Text style={styles.nonDonationBody}>
              Your contribution pays to spread this message. It is{' '}
              <Text style={{ fontWeight: '700' }}>NOT a donation</Text> to the cause or the creator. 100% of the net ad budget strictly purchases digital advertising impressions.
            </Text>
            <View style={styles.policyLinkRow}>
              <Pressable onPress={() => router.push('/info/terms' as Href)} hitSlop={6}>
                <Text style={styles.policyLinkText}>Distribution Terms</Text>
              </Pressable>
              <Text style={styles.policyDivider}>•</Text>
              <Pressable onPress={() => router.push('/info/how-it-works' as Href)} hitSlop={6}>
                <Text style={styles.policyLinkText}>Refund Policy & Reach</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Required Acknowledgment Checkbox */}
        <Pressable
          onPress={handleToggleAcknowledgement}
          style={styles.checkboxRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: hasAcknowledged }}
          accessibilityLabel="Acknowledge non-donation terms"
        >
          <View
            style={[
              styles.checkboxBox,
              hasAcknowledged && styles.checkboxBoxChecked,
            ]}
          >
            {hasAcknowledged && <Check size={16} color={theme.colors.onLime} strokeWidth={3} />}
          </View>
          <Text style={styles.checkboxLabel}>
            I understand that my contribution funds digital ad distribution to amplify this campaign, and is not a tax-deductible charitable donation.
          </Text>
        </Pressable>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <StickyActionBar
        primaryTitle="Proceed to Payment"
        onPrimaryPress={handleProceed}
        primaryDisabled={!hasAcknowledged || amountCents < 100}
        primaryLoading={createContributionMutation.isPending}
        secondaryTitle="Change Amount"
        onSecondaryPress={() => router.push(`/back/${campaign.id}/amount` as Href)}
        priceSummary={{
          label: 'Total',
          amount: `$${(quoteData.totalCents / 100).toFixed(2)}`,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  skeletonContent: {
    padding: theme.spacing.base,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: theme.spacing['4xl'],
  },
  summaryCard: {
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    marginBottom: theme.spacing.base,
  },
  campaignHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  coverThumbnail: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceRaised,
    marginRight: theme.spacing.md,
  },
  coverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  campaignTextCol: {
    flex: 1,
  },
  campaignTitle: {
    ...theme.typography.styles.h3,
    color: theme.colors.textPrimary,
  },
  creatorName: {
    ...theme.typography.styles.small,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  reachBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.tintedPillBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  reachIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reachBannerTitle: {
    ...theme.typography.styles.smallMedium,
    color: theme.colors.lime,
    fontWeight: '700',
  },
  estimateBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  estimateBadgeLabel: {
    ...theme.typography.styles.caption,
    color: theme.colors.textSecondary,
  },
  progressCard: {
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    marginBottom: theme.spacing.base,
  },
  cardHeaderTitle: {
    ...theme.typography.styles.h3,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  cardSubText: {
    ...theme.typography.styles.small,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  progressNumbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  progressSubLabel: {
    ...theme.typography.styles.caption,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  progressValueText: {
    ...theme.typography.styles.h3,
    color: theme.colors.textPrimary,
  },
  progressGoalText: {
    ...theme.typography.styles.body,
    color: theme.colors.textSecondary,
  },
  dualBarContainer: {
    height: 12,
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  dualBarCurrent: {
    height: '100%',
    backgroundColor: theme.colors.surfaceRaised,
  },
  dualBarDelta: {
    height: '100%',
    backgroundColor: theme.colors.lime,
  },
  dualBarLegend: {
    flexDirection: 'row',
    gap: theme.spacing.base,
    marginTop: theme.spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    ...theme.typography.styles.caption,
    color: theme.colors.textSecondary,
  },
  breakdownCard: {
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    marginBottom: theme.spacing.base,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: theme.spacing.xs,
  },
  breakdownItemTitle: {
    ...theme.typography.styles.bodyMedium,
    color: theme.colors.textPrimary,
  },
  breakdownItemDesc: {
    ...theme.typography.styles.caption,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  breakdownAmount: {
    ...theme.typography.styles.bodyMedium,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fonts.uiSemiBold,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.line,
    marginVertical: theme.spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    ...theme.typography.styles.h3,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fonts.uiBold,
  },
  totalAmount: {
    ...theme.typography.styles.h2,
    color: theme.colors.lime,
    fontFamily: theme.typography.fonts.uiBold,
  },
  privacyCard: {
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    marginBottom: theme.spacing.base,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchTextCol: {
    flex: 1,
    paddingRight: theme.spacing.md,
  },
  switchTitle: {
    ...theme.typography.styles.smallMedium,
    color: theme.colors.textPrimary,
  },
  switchDesc: {
    ...theme.typography.styles.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  nameInputContainer: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
  },
  guestEmailContainer: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
  },
  inputLabel: {
    ...theme.typography.styles.captionSemiBold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.radius.input,
    backgroundColor: theme.colors.inputBg,
    paddingHorizontal: theme.spacing.md,
    ...theme.typography.styles.body,
    color: theme.colors.textPrimary,
  },
  guestEmailHint: {
    ...theme.typography.styles.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    lineHeight: 18,
  },
  accordionWrapper: {
    marginBottom: theme.spacing.base,
  },
  accordionBodyText: {
    ...theme.typography.styles.small,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  nonDonationBanner: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.line,
    borderWidth: 1.5,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.base,
    gap: theme.spacing.md,
  },
  bannerIcon: {
    marginTop: 2,
  },
  nonDonationTextCol: {
    flex: 1,
  },
  nonDonationTitle: {
    ...theme.typography.styles.smallMedium,
    color: theme.colors.textPrimary,
    fontWeight: '700',
    marginBottom: 4,
  },
  nonDonationBody: {
    ...theme.typography.styles.small,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  policyLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  policyLinkText: {
    ...theme.typography.styles.captionSemiBold,
    color: theme.colors.lime,
    textDecorationLine: 'underline',
  },
  policyDivider: {
    ...theme.typography.styles.caption,
    color: theme.colors.textSecondary,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.base,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxBoxChecked: {
    backgroundColor: theme.colors.lime,
    borderColor: theme.colors.lime,
  },
  checkboxLabel: {
    flex: 1,
    ...theme.typography.styles.small,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
});
