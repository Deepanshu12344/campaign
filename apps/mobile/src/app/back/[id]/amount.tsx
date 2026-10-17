import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter, Href } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import {
  Sparkles,
  AlertCircle,
  Info,
  TrendingUp,
} from 'lucide-react-native';
import { quote } from '@campaigns/shared';
import { useCampaign, useEstimateConfig, useQuote } from '../../../api';
import { useBackingStore } from '../../../store/backingStore';
import { SharedHeader } from '../../../components/layout/SharedHeader';
import {
  Card,
  ProgressBar,
  InfoTip,
  DemoDataBadge,
  Skeleton,
  ErrorState,
  Button,
} from '../../../components/ui';
import { StickyActionBar } from '../../../components/ui/StickyActionBar';
import { theme } from '../../../theme';

const CHECKOUT_STEPS = ['Detail', 'Amount', 'Review', 'Payment', 'Confirmation'];

export default function BackAmountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    data: campaign,
    isLoading: isCampaignLoading,
    isError: isCampaignError,
    error: campaignError,
    refetch: refetchCampaign,
  } = useCampaign(id as string);

  const { data: estimateConfig } = useEstimateConfig();

  const {
    amountDollars,
    amountCents,
    setAmountDollars,
    setAmountCents,
    initForCampaign,
    setPreviousProgress,
  } = useBackingStore();

  const [inputTouched, setInputTouched] = useState(false);

  // Initialize backing store for this campaign
  useEffect(() => {
    if (campaign?.id) {
      initForCampaign(campaign.id);
      setPreviousProgress(campaign.raisedCents, campaign.percentFunded);
    }
  }, [campaign?.id, initForCampaign, setPreviousProgress, campaign?.raisedCents, campaign?.percentFunded]);

  const presetAmounts = useMemo(
    () => estimateConfig?.presetAmounts ?? [5, 10, 25, 50, 100],
    [estimateConfig?.presetAmounts]
  );

  // Live Quote calculation (client sync + API query)
  const { data: apiQuote } = useQuote(campaign?.id, amountCents);
  const quoteData = useMemo(() => {
    if (apiQuote && apiQuote.amountCents === amountCents) {
      return apiQuote;
    }
    return quote(amountCents);
  }, [apiQuote, amountCents]);

  const remainingCents = useMemo(() => {
    if (!campaign) return 0;
    return Math.max(0, campaign.fundingGoalCents - campaign.raisedCents);
  }, [campaign]);

  const willFullyFund = useMemo(() => {
    return remainingCents > 0 && amountCents >= remainingCents;
  }, [remainingCents, amountCents]);

  const isValidAmount = amountCents >= 100 && amountCents <= 1000000;

  const handlePresetSelect = (preset: number) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setAmountCents(preset * 100);
    setInputTouched(true);
  };

  const handleInputChange = (text: string) => {
    setInputTouched(true);
    setAmountDollars(text);
  };

  const handleContinue = () => {
    if (!isValidAmount || !campaign) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push(`/back/${campaign.id}/review` as Href);
  };

  if (isCampaignLoading) {
    return (
      <View style={styles.container}>
        <SharedHeader
          title="Choose Amount"
          subtitle="Step 2 of 5"
          fallbackRoute={`/campaign/${id}`}
          stepConfig={{
            currentStep: 2,
            totalSteps: 5,
            labels: CHECKOUT_STEPS,
          }}
        />
        <View style={styles.skeletonContent}>
          <Skeleton height={90} borderRadius={16} />
          <View style={{ height: theme.spacing.lg }} />
          <Skeleton height={140} borderRadius={16} />
          <View style={{ height: theme.spacing.lg }} />
          <Skeleton height={120} borderRadius={16} />
        </View>
      </View>
    );
  }

  if (isCampaignError || !campaign) {
    return (
      <View style={styles.container}>
        <SharedHeader
          title="Back Campaign"
          fallbackRoute={`/campaign/${id}`}
        />
        <ErrorState
          title="Could not load campaign"
          message={campaignError?.message || 'Unable to retrieve campaign details.'}
          onRetry={refetchCampaign}
        />
      </View>
    );
  }

  if (campaign.status !== 'FUNDING') {
    return (
      <View style={styles.container}>
        <SharedHeader
          title="Funding Closed"
          fallbackRoute={`/campaign/${id}`}
        />
        <View style={styles.closedContainer}>
          <AlertCircle size={48} color={theme.colors.ink500} />
          <Text style={styles.closedTitle}>This campaign is not accepting funds</Text>
          <Text style={styles.closedMessage}>
            Only campaigns currently in the FUNDING status can accept contributions.
            This campaign is currently {campaign.status.replace(/_/g, ' ').toLowerCase()}.
          </Text>
          <Button
            title="Return to Campaign"
            variant="primary"
            onPress={() => router.replace(`/campaign/${campaign.id}` as Href)}
            style={{ marginTop: theme.spacing.xl }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SharedHeader
        title="Choose Amount"
        subtitle="Step 2 of 5"
        fallbackRoute={`/campaign/${id}`}
        stepConfig={{
          currentStep: 2,
          totalSteps: 5,
          labels: CHECKOUT_STEPS,
        }}
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        {/* Mini Campaign Header Card */}
        <Card style={styles.campaignCard}>
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
                <TrendingUp size={20} color={theme.colors.ink400} />
              </View>
            )}
            <View style={styles.campaignTextCol}>
              <Text style={styles.campaignTitle} numberOfLines={2}>
                {campaign.title}
              </Text>
              <Text style={styles.creatorName} numberOfLines={1}>
                by {campaign.creatorName}
              </Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressTextRow}>
              <Text style={styles.raisedLabel}>
                ${(campaign.raisedCents / 100).toLocaleString()}{' '}
                <Text style={styles.goalLabel}>
                  of ${(campaign.fundingGoalCents / 100).toLocaleString()} goal
                </Text>
              </Text>
              <Text style={styles.percentLabel}>{campaign.percentFunded}%</Text>
            </View>
            <ProgressBar
              progress={campaign.percentFunded / 100}
              size="sm"
            />
          </View>

          {remainingCents > 0 && (
            <View style={styles.remainingBadge}>
              <Info size={14} color={theme.colors.ink600} />
              <Text style={styles.remainingText}>
                ${(remainingCents / 100).toLocaleString()} needed to reach goal
              </Text>
            </View>
          )}
        </Card>

        {/* Milestone Celebration Banner */}
        {willFullyFund && (
          <View style={styles.fullyFundedBanner}>
            <Sparkles size={20} color={theme.colors.primary700} />
            <View style={styles.fullyFundedTextCol}>
              <Text style={styles.fullyFundedTitle}>Goal Milestone!</Text>
              <Text style={styles.fullyFundedDesc}>
                This ${Math.round(amountCents / 100)} contribution will fully fund this campaign and trigger ad distribution prep!
              </Text>
            </View>
          </View>
        )}

        {/* Amount Selector Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Select Contribution</Text>
          <Text style={styles.sectionSubtitle}>
            Choose a preset or enter a custom amount ($1 minimum).
          </Text>

          {/* Preset Buttons */}
          <View style={styles.presetsGrid}>
            {presetAmounts.map((preset) => {
              const isSelected = amountCents === preset * 100;
              return (
                <Pressable
                  key={preset}
                  onPress={() => handlePresetSelect(preset)}
                  style={({ pressed }) => [
                    styles.presetChip,
                    isSelected && styles.presetChipSelected,
                    pressed && styles.presetChipPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`$${preset}`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      isSelected && styles.presetChipTextSelected,
                    ]}
                  >
                    ${preset}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Custom Input */}
          <View style={styles.customInputContainer}>
            <Text style={styles.customInputLabel}>Custom Amount</Text>
            <View
              style={[
                styles.inputWrapper,
                inputTouched && !isValidAmount && styles.inputWrapperError,
              ]}
            >
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.numericInput}
                value={amountDollars}
                onChangeText={handleInputChange}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={theme.colors.ink400}
                maxLength={6}
                selectTextOnFocus
              />
            </View>

            {inputTouched && amountCents < 100 && (
              <View style={styles.errorRow}>
                <AlertCircle size={14} color={theme.colors.danger} />
                <Text style={styles.errorText}>
                  Minimum contribution amount is $1.00
                </Text>
              </View>
            )}

            {inputTouched && amountCents > 1000000 && (
              <View style={styles.errorRow}>
                <AlertCircle size={14} color={theme.colors.danger} />
                <Text style={styles.errorText}>
                  Maximum contribution amount is $10,000
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Live Reach Impact Card */}
        {amountCents >= 100 && (
          <Card style={styles.reachImpactCard}>
            <View style={styles.reachCardHeader}>
              <View style={styles.reachIconWrapper}>
                <Sparkles size={18} color={theme.colors.primary700} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reachCardHeading}>Estimated Ad Reach</Text>
                <View style={styles.estimateBadgeRow}>
                  <Text style={styles.estimateBadgeLabel}>Estimate · not a guarantee</Text>
                  <DemoDataBadge size="sm" />
                </View>
              </View>
            </View>

            <View style={styles.reachNumberContainer}>
              <Text style={styles.reachRangeText}>
                ~{quoteData.estimatedReachLow.toLocaleString()} –{' '}
                {quoteData.estimatedReachHigh.toLocaleString()}
              </Text>
              <Text style={styles.reachUnitText}>people reached</Text>
            </View>

            <Text style={styles.reachFootnote}>
              Based on standardized $6.00 CPM benchmark across multi-channel digital ad networks. 100% of the net ad budget goes to spreading this message.
            </Text>
          </Card>
        )}

        {/* Info Tip - What does this pay for? */}
        <View style={styles.infoTipWrapper}>
          <InfoTip
            title="What does my contribution pay for?"
            content="100% of your net contribution buys ad impressions to spread this message. It strictly funds digital advertising distribution (Meta, Google Search, YouTube) and transparent platform fees. Creators never receive cash payouts."
          />
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <StickyActionBar
        primaryTitle="Continue to Review"
        onPrimaryPress={handleContinue}
        primaryDisabled={!isValidAmount}
        priceSummary={{
          label: 'Contribution',
          amount: amountCents >= 100 ? `$${(amountCents / 100).toFixed(2)}` : '$0.00',
        }}
      />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  keyboardAvoid: {
    flex: 1,
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
  closedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  closedTitle: {
    ...theme.typography.styles.h2,
    color: theme.colors.ink900,
    marginTop: theme.spacing.base,
    textAlign: 'center',
  },
  closedMessage: {
    ...theme.typography.styles.body,
    color: theme.colors.ink600,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
  campaignCard: {
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    marginBottom: theme.spacing.base,
  },
  campaignHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coverThumbnail: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.bgMuted,
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
    color: theme.colors.ink900,
  },
  creatorName: {
    ...theme.typography.styles.small,
    color: theme.colors.ink600,
    marginTop: 2,
  },
  progressSection: {
    marginTop: theme.spacing.md,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  raisedLabel: {
    ...theme.typography.styles.smallMedium,
    color: theme.colors.ink900,
  },
  goalLabel: {
    ...theme.typography.styles.small,
    color: theme.colors.ink500,
  },
  percentLabel: {
    ...theme.typography.styles.captionSemiBold,
    color: theme.colors.primary700,
  },
  remainingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.bgMuted,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    gap: 6,
  },
  remainingText: {
    ...theme.typography.styles.small,
    color: theme.colors.ink600,
  },
  fullyFundedBanner: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary50,
    borderColor: theme.colors.primary100,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.base,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  fullyFundedTextCol: {
    flex: 1,
  },
  fullyFundedTitle: {
    ...theme.typography.styles.smallMedium,
    color: theme.colors.primary700,
  },
  fullyFundedDesc: {
    ...theme.typography.styles.small,
    color: theme.colors.ink700,
    marginTop: 2,
  },
  sectionContainer: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.styles.h3,
    color: theme.colors.ink900,
    marginBottom: 4,
  },
  sectionSubtitle: {
    ...theme.typography.styles.small,
    color: theme.colors.ink600,
    marginBottom: theme.spacing.md,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.base,
  },
  presetChip: {
    flexGrow: 1,
    minWidth: '18%',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipSelected: {
    borderColor: theme.colors.primary600,
    backgroundColor: theme.colors.primary50,
  },
  presetChipPressed: {
    opacity: 0.8,
  },
  presetChipText: {
    ...theme.typography.styles.h3,
    color: theme.colors.ink800,
  },
  presetChipTextSelected: {
    color: theme.colors.primary700,
    fontFamily: theme.typography.fonts.uiBold,
  },
  customInputContainer: {
    marginTop: theme.spacing.xs,
  },
  customInputLabel: {
    ...theme.typography.styles.smallMedium,
    color: theme.colors.ink700,
    marginBottom: theme.spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bgMuted,
    borderWidth: 1.5,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.input,
    paddingHorizontal: theme.spacing.md,
    height: 52,
  },
  inputWrapperError: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.red50,
  },
  dollarSign: {
    ...theme.typography.styles.h2,
    color: theme.colors.ink500,
    marginRight: theme.spacing.xs,
  },
  numericInput: {
    flex: 1,
    ...theme.typography.styles.h2,
    color: theme.colors.ink900,
    padding: 0,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.xs,
  },
  errorText: {
    ...theme.typography.styles.small,
    color: theme.colors.danger,
  },
  reachImpactCard: {
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.primary100,
    borderWidth: 1.5,
    marginBottom: theme.spacing.base,
  },
  reachCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  reachIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reachCardHeading: {
    ...theme.typography.styles.smallMedium,
    color: theme.colors.ink900,
  },
  estimateBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  estimateBadgeLabel: {
    ...theme.typography.styles.caption,
    color: theme.colors.ink500,
  },
  reachNumberContainer: {
    marginVertical: theme.spacing.sm,
  },
  reachRangeText: {
    ...theme.typography.styles.display,
    color: theme.colors.primary700,
    fontSize: 28,
  },
  reachUnitText: {
    ...theme.typography.styles.body,
    color: theme.colors.ink600,
    marginTop: 2,
  },
  reachFootnote: {
    ...theme.typography.styles.small,
    color: theme.colors.ink500,
    lineHeight: 18,
    marginTop: theme.spacing.sm,
  },
  infoTipWrapper: {
    marginBottom: theme.spacing.base,
  },
});
