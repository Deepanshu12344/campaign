import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter, Href } from 'expo-router';
import { Image } from 'expo-image';
import {
  Check,
  CheckCircle2,
  AlertCircle,
  CircleDollarSign,
  ShieldCheck,
  Eye,
  Send,
  ArrowLeft,
  Save,
  Edit3,
  ExternalLink,
  Target,
  FileText,
  Image as ImageIcon,
  Clock,
  ShieldAlert,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  getAllStepErrors,
  reachAtGoal,
  CreationStepKey,
  Source,
  StoryBlock,
  AdCreative,
  ReachSettings,
} from '@campaigns/shared';
import { useDraftStore } from '../../../store/draftStore';
import { useSubmitCampaign } from '../../../api';
import { ApiError } from '../../../api/types';
import {
  TextField,
  Card,
  Button,
  InfoTip,
  ReachEstimateBadge,
  Accordion,
  Sheet,
  useToast,
} from '../../../components/ui';
import { theme } from '../../../theme';

const QUICK_GOAL_CHIPS = [1000, 2500, 5000, 10000];

const STEP_LABELS: Record<CreationStepKey, string> = {
  basics: 'Step 1: Basics',
  story: 'Step 2: Story & Sources',
  visuals: 'Step 3: Campaign & Ad Visuals',
  reach: 'Step 4: Audience & Reach',
  submit: 'Step 5: Funding Goal & Submit',
};

export default function CreateSubmitScreen() {
  const { draftId } = useLocalSearchParams<{ draftId: string }>();
  const router = useRouter();
  const toast = useToast();

  const draft = useDraftStore((s) => s.getDraft(draftId as string)) || {};
  const updateDraftField = useDraftStore((s) => s.updateDraftField);
  const saveDraftNow = useDraftStore((s) => s.saveDraftNow);
  const setIsSubmittingStore = useDraftStore((s) => s.setIsSubmitting);

  const submitCampaignMutation = useSubmitCampaign();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 4 Required Confirmation Checkboxes
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [guidelinesConfirmed, setGuidelinesConfirmed] = useState(false);
  const [adDistributionOnlyConfirmed, setAdDistributionOnlyConfirmed] = useState(false);
  const [reviewEditsConfirmed, setReviewEditsConfirmed] = useState(false);

  // Terms and Guidelines sheet modal
  const [policySheetType, setPolicySheetType] = useState<'terms' | 'guidelines' | null>(null);

  const allCheckboxesChecked =
    rightsConfirmed &&
    guidelinesConfirmed &&
    adDistributionOnlyConfirmed &&
    reviewEditsConfirmed;

  // Sync acceptedRules with draft store for backend validator
  React.useEffect(() => {
    if (draftId) {
      updateDraftField('acceptedRules', allCheckboxesChecked, { draftId: draftId as string });
    }
  }, [allCheckboxesChecked, updateDraftField, draftId]);

  // Real-time completeness errors across all 5 steps
  const allStepErrors = useMemo(() => {
    return getAllStepErrors({
      ...draft,
      acceptedRules: allCheckboxesChecked,
    });
  }, [draft, allCheckboxesChecked]);

  const hasAnyErrors = Object.values(allStepErrors).some((errs) => errs.length > 0);

  // Funding goal: SOLE SETTER on Step 5
  // Current goal in cents (strictly 50,000 to 5,000,000 cents; $500 to $50,000)
  const currentGoalCents = draft.fundingGoalCents ?? 0;
  const currentGoalDollars = currentGoalCents > 0 ? String(Math.round(currentGoalCents / 100)) : '';

  // Reach and financial math
  const reachEstimate = useMemo(() => {
    return reachAtGoal(currentGoalCents);
  }, [currentGoalCents]);

  const adBudgetCents = reachEstimate.adBudgetCents;
  const platformFeeCents = reachEstimate.platformFeeCents;

  const handleGoalTextChange = (text: string) => {
    const numeric = parseInt(text.replace(/[^0-9]/g, ''), 10);
    const cents = isNaN(numeric) ? 0 : numeric * 100;
    // CRITICAL GUARD: fromSubmitStep: true must be passed here
    updateDraftField('fundingGoalCents', cents, { fromSubmitStep: true, draftId: draftId as string });
  };

  const handleGoalChipPress = (dollars: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const cents = dollars * 100;
    updateDraftField('fundingGoalCents', cents, { fromSubmitStep: true, draftId: draftId as string });
  };

  const handleJumpToStep = (stepKey: CreationStepKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(`/create/${draftId}/${stepKey}?returnTo=submit` as Href);
  };

  const handleSaveDraft = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const success = await saveDraftNow(draftId as string);
    if (success) {
      toast.success('Draft saved');
    } else {
      toast.warning('Draft saved locally (offline)');
    }
  };

  const handlePreview = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(`/create/${draftId}/preview` as Href);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!allCheckboxesChecked) {
      toast.error('Please check all 4 confirmation boxes before submitting.');
      return;
    }

    if (hasAnyErrors) {
      toast.error('Please complete all required steps before submitting.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setIsSubmitting(true);
    setIsSubmittingStore(true);

    try {
      // First ensure local state is flushed to backend
      await saveDraftNow(draftId as string);

      // Call submit endpoint
      await submitCampaignMutation.mutateAsync({
        id: draftId as string,
        input: {
          acceptedRules: true,
        },
      });

      toast.success('Campaign submitted for review!');
      router.replace(`/create/${draftId}/submitted` as Href);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.fields) {
        // Map backend validation field to step
        const firstField = Object.keys(err.fields)[0];
        if (firstField?.includes('step1') || firstField === 'title' || firstField === 'category') {
          handleJumpToStep('basics');
        } else if (firstField?.includes('step2') || firstField === 'story' || firstField === 'sources') {
          handleJumpToStep('story');
        } else if (firstField?.includes('step3') || firstField === 'adCreative') {
          handleJumpToStep('visuals');
        } else if (firstField?.includes('step4') || firstField === 'reach') {
          handleJumpToStep('reach');
        } else {
          handleJumpToStep('submit');
        }
        toast.error(err.message || 'Validation failed. Please fix highlighted errors.');
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to submit campaign';
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
      setIsSubmittingStore(false);
    }
  };

  // Step 2 & 3 summary data
  const storyBlocks = (Array.isArray(draft.story) ? draft.story : []) as StoryBlock[];
  const sources = (Array.isArray(draft.sources) ? draft.sources : []) as Source[];
  const adCreative = (draft.adCreative || {}) as AdCreative;
  const reach = (draft.reach || {}) as ReachSettings;

  const totalStoryWords = useMemo(() => {
    let words = 0;
    for (const b of storyBlocks) {
      if (b.type === 'paragraph' && b.text) words += b.text.trim().split(/\s+/).length;
      if (b.type === 'heading' && b.text) words += b.text.trim().split(/\s+/).length;
      if (b.type === 'quote' && b.text) words += b.text.trim().split(/\s+/).length;
    }
    return words;
  }, [storyBlocks]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Step Header */}
      <View style={styles.headerBox}>
        <Text style={styles.stepTitle}>Step 5: Funding Goal & Review</Text>
        <Text style={styles.stepSubtitle}>
          Set your ad distribution budget, verify your campaign summary, and confirm platform policies before submission.
        </Text>
      </View>

      {/* Status banner */}
      <View
        style={[
          styles.statusBanner,
          !hasAnyErrors && allCheckboxesChecked ? styles.statusBannerSuccess : styles.statusBannerPending,
        ]}
      >
        {!hasAnyErrors && allCheckboxesChecked ? (
          <>
            <CheckCircle2 size={18} color={theme.colors.success} />
            <Text style={[styles.statusBannerText, { color: theme.colors.success }]}>
              All requirements met! Your campaign is ready for submission.
            </Text>
          </>
        ) : (
          <>
            <AlertCircle size={18} color={theme.colors.warning} />
            <Text style={[styles.statusBannerText, { color: theme.colors.textSecondary }]}>
              {!hasAnyErrors
                ? 'Review and check all 4 confirmations below to unlock submission.'
                : 'Complete the remaining checklist items below to submit for review.'}
            </Text>
          </>
        )}
      </View>

      {/* 1. FUNDING GOAL SECTION (SOLE SETTER) */}
      <Card style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <CircleDollarSign size={20} color={theme.colors.lime} />
          <View style={{ flex: 1 }}>
            <View style={styles.inlineHeaderWithTip}>
              <Text style={styles.sectionHeading}>Funding Goal</Text>
              <InfoTip term="useOfFunds" />
            </View>
            <Text style={styles.sectionSubheading}>
              Set the target digital advertising budget. This is the only place it is set.
            </Text>
          </View>
        </View>

        {/* Input */}
        <TextField
          label="Target Ad Distribution Budget ($ USD)"
          placeholder="e.g. 2500"
          value={currentGoalDollars}
          onChangeText={handleGoalTextChange}
          keyboardType="numeric"
          required
          helper="Allowed range: $500 to $50,000 USD (in whole dollars)"
          style={styles.fieldSpacing}
        />

        {/* Quick Goal Chips */}
        <View style={styles.chipsSection}>
          <Text style={styles.chipsLabel}>Quick selections:</Text>
          <View style={styles.chipsRow}>
            {QUICK_GOAL_CHIPS.map((dollars) => {
              const isSelected = currentGoalCents === dollars * 100;
              return (
                <Pressable
                  key={dollars}
                  onPress={() => handleGoalChipPress(dollars)}
                  style={[styles.goalChip, isSelected && styles.goalChipSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={`Set funding goal to $${dollars.toLocaleString()}`}
                >
                  <Text style={[styles.goalChipText, isSelected && styles.goalChipTextSelected]}>
                    ${dollars.toLocaleString()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Live Reach Estimate Badge */}
        {currentGoalCents >= 50000 && (
          <View style={styles.estimateBox}>
            <View style={styles.estimateTopRow}>
              <View style={styles.inlineHeaderWithTip}>
                <Text style={styles.estimateTitle}>Estimated Audience Reach at Goal</Text>
                <InfoTip term="estimatedReach" />
              </View>
              <ReachEstimateBadge
                low={reachEstimate.estimatedReachLow}
                high={reachEstimate.estimatedReachHigh}
                size="md"
                showInfoTip={false}
              />
            </View>
            <Text style={styles.estimateDisclaimer}>
              Based on standard advertising model (~$6.00 CPM, 2.2 avg frequency). Illustrative estimate, not a guarantee.
            </Text>
          </View>
        )}

        {/* 90% Ad Budget / 10% Platform Fee Breakdown */}
        {currentGoalCents > 0 && (
          <View style={styles.financialBreakdown}>
            <View style={styles.inlineHeaderWithTip}>
              <Text style={styles.breakdownHeaderTitle}>Fund Allocation Breakdown</Text>
              <InfoTip term="platformFee" />
            </View>
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownItemLabel}>Ad Budget (90%)</Text>
                <Text style={styles.breakdownItemValue}>
                  ${Math.round(adBudgetCents / 100).toLocaleString()}
                </Text>
                <Text style={styles.breakdownItemDesc}>Purchases verified ad impressions</Text>
              </View>
              <View style={styles.breakdownDivider} />
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownItemLabel}>Platform Fee (10%)</Text>
                <Text style={styles.breakdownItemValue}>
                  ${Math.round(platformFeeCents / 100).toLocaleString()}
                </Text>
                <Text style={styles.breakdownItemDesc}>Review, compliance & hosting</Text>
              </View>
            </View>
          </View>
        )}
      </Card>

      {/* 2. COMPLETE SUMMARY IN EXPANDABLE SECTIONS */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionGroupTitle}>Campaign Summary & Pre-Submission Review</Text>
        <Text style={styles.sectionGroupSubtitle}>
          Tap any section to expand details, or tap "Edit" to jump straight back to that step.
        </Text>

        <View style={styles.accordionsList}>
          {/* Section 1: Basics */}
          <Accordion
            title="Step 1: Campaign Basics"
            icon={<FileText size={18} color={theme.colors.lime} />}
            defaultOpen={false}
          >
            <View style={styles.accordionInner}>
              <View style={styles.summaryItemRow}>
                <Text style={styles.summaryLabel}>Title:</Text>
                <Text style={styles.summaryValue}>{draft.title || '(Untitled)'}</Text>
              </View>
              <View style={styles.summaryItemRow}>
                <Text style={styles.summaryLabel}>Category:</Text>
                <Text style={styles.summaryValue}>{draft.category || '(Not selected)'}</Text>
              </View>
              <View style={styles.summaryItemRow}>
                <Text style={styles.summaryLabel}>Creator:</Text>
                <Text style={styles.summaryValue}>
                  {draft.creatorName || '(None)'} ({draft.creatorType || 'individual'})
                </Text>
              </View>
              <View style={styles.summaryItemRow}>
                <Text style={styles.summaryLabel}>Summary:</Text>
                <Text style={styles.summaryValue}>{draft.summary || '(None)'}</Text>
              </View>
              <View style={styles.summaryItemRow}>
                <Text style={styles.summaryLabel}>Cover Image:</Text>
                <Text style={styles.summaryValue}>{draft.coverUrl ? 'Uploaded' : 'None'}</Text>
              </View>

              <Button
                title="Edit Basics"
                variant="ghost"
                size="sm"
                iconLeft={<Edit3 size={14} color={theme.colors.textSecondary} />}
                onPress={() => handleJumpToStep('basics')}
                style={styles.editStepBtn}
              />
            </View>
          </Accordion>

          {/* Section 2: Story and Sources */}
          <Accordion
            title="Step 2: Story & Sources"
            icon={<FileText size={18} color={theme.colors.lime} />}
            defaultOpen={false}
          >
            <View style={styles.accordionInner}>
              <View style={styles.summaryItemRow}>
                <Text style={styles.summaryLabel}>Story Blocks:</Text>
                <Text style={styles.summaryValue}>{storyBlocks.length} blocks</Text>
              </View>
              <View style={styles.summaryItemRow}>
                <Text style={styles.summaryLabel}>Estimated Word Count:</Text>
                <Text style={styles.summaryValue}>~{totalStoryWords} words</Text>
              </View>
              <View style={styles.summaryItemRow}>
                <Text style={styles.summaryLabel}>Verified Sources:</Text>
                <Text style={styles.summaryValue}>{sources.length} sources linked</Text>
              </View>

              {sources.length > 0 && (
                <View style={styles.sourcesMiniList}>
                  {sources.map((src, idx) => (
                    <Text key={src.url || idx} style={styles.sourceBulletText} numberOfLines={1}>
                      [{idx + 1}] {src.title || src.url}
                    </Text>
                  ))}
                </View>
              )}

              <Button
                title="Edit Story & Sources"
                variant="ghost"
                size="sm"
                iconLeft={<Edit3 size={14} color={theme.colors.textSecondary} />}
                onPress={() => handleJumpToStep('story')}
                style={styles.editStepBtn}
              />
            </View>
          </Accordion>

          {/* Section 3: Visuals */}
          <Accordion
            title="Step 3: Campaign & Ad Visuals"
            icon={<ImageIcon size={18} color={theme.colors.lime} />}
            defaultOpen={false}
          >
            <View style={styles.accordionInner}>
              <View style={styles.summaryItemRow}>
                <Text style={styles.summaryLabel}>Ad Headline:</Text>
                <Text style={styles.summaryValue}>
                  {adCreative.headline || draft.title || '(Will default to title)'}
                </Text>
              </View>
              <View style={styles.summaryItemRow}>
                <Text style={styles.summaryLabel}>Ad Description:</Text>
                <Text style={styles.summaryValue}>
                  {adCreative.description || draft.summary || '(Will default to summary)'}
                </Text>
              </View>
              <View style={styles.summaryItemRow}>
                <Text style={styles.summaryLabel}>Call to Action:</Text>
                <Text style={styles.summaryValue}>
                  {adCreative.cta || 'Learn More'}
                </Text>
              </View>
              <View style={styles.summaryItemRow}>
                <Text style={styles.summaryLabel}>Creative Images:</Text>
                <Text style={styles.summaryValue}>
                  {(adCreative.images || []).length} images uploaded
                </Text>
              </View>

              {/* Cover preview */}
              {draft.coverUrl && (
                <View style={styles.coverThumbnailWrapper}>
                  <Text style={styles.coverThumbnailLabel}>Campaign Cover:</Text>
                  <Image
                    source={{ uri: draft.coverUrl }}
                    style={styles.coverThumbnail}
                    contentFit="cover"
                  />
                </View>
              )}

              <Button
                title="Edit Visuals"
                variant="ghost"
                size="sm"
                iconLeft={<Edit3 size={14} color={theme.colors.textSecondary} />}
                onPress={() => handleJumpToStep('visuals')}
                style={styles.editStepBtn}
              />
            </View>
          </Accordion>

          {/* Section 4: Reach & Distribution */}
          <Accordion
            title="Step 4: Audience & Reach"
            icon={<Target size={18} color={theme.colors.lime} />}
            defaultOpen={false}
          >
            <View style={styles.accordionInner}>
              <View style={styles.summaryItemRow}>
                <Text style={styles.summaryLabel}>Target Locations:</Text>
                <Text style={styles.summaryValue}>
                  {reach.locations && reach.locations.length > 0
                    ? reach.locations.join(', ')
                    : 'Worldwide'}
                </Text>
              </View>
              <View style={styles.summaryItemRow}>
                <Text style={styles.summaryLabel}>Audience Themes:</Text>
                <Text style={styles.summaryValue}>
                  {reach.interests && reach.interests.length > 0
                    ? reach.interests.join(', ')
                    : 'All interested audiences'}
                </Text>
              </View>
              <View style={styles.summaryItemRow}>
                <Text style={styles.summaryLabel}>Age Range:</Text>
                <Text style={styles.summaryValue}>
                  {reach.ageRange ? `${reach.ageRange[0]}–${reach.ageRange[1]}+` : '18 to 65+'}
                </Text>
              </View>
              <View style={styles.summaryItemRow}>
                <Text style={styles.summaryLabel}>Distribution Channels:</Text>
                <Text style={styles.summaryValue}>
                  {reach.channels && reach.channels.length > 0
                    ? reach.channels.join(', ')
                    : 'Social feeds, Display'}
                </Text>
              </View>

              <Button
                title="Edit Audience & Reach"
                variant="ghost"
                size="sm"
                iconLeft={<Edit3 size={14} color={theme.colors.textSecondary} />}
                onPress={() => handleJumpToStep('reach')}
                style={styles.editStepBtn}
              />
            </View>
          </Accordion>

          {/* Section 5: Duration */}
          <Accordion
            title="Campaign Duration & Funding Window"
            icon={<Clock size={18} color={theme.colors.lime} />}
            defaultOpen={false}
          >
            <View style={styles.accordionInner}>
              <View style={styles.summaryItemRow}>
                <Text style={styles.summaryLabel}>Ad Distribution Run:</Text>
                <Text style={styles.summaryValue}>{reach.durationDays || 14} days</Text>
              </View>
              <View style={styles.summaryItemRow}>
                <Text style={styles.summaryLabel}>Funding Window:</Text>
                <Text style={styles.summaryValue}>{reach.fundingWindowDays || 30} days</Text>
              </View>

              <Button
                title="Edit Duration in Reach"
                variant="ghost"
                size="sm"
                iconLeft={<Edit3 size={14} color={theme.colors.textSecondary} />}
                onPress={() => handleJumpToStep('reach')}
                style={styles.editStepBtn}
              />
            </View>
          </Accordion>
        </View>
      </View>

      {/* 3. PLAIN-LANGUAGE FEES AND FUNDING POLICIES */}
      <Card style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <ShieldAlert size={20} color={theme.colors.lime} />
          <View style={{ flex: 1 }}>
            <View style={styles.inlineHeaderWithTip}>
              <Text style={styles.sectionHeading}>Fees & Funding Policies</Text>
              <InfoTip term="reviewProcess" />
            </View>
            <Text style={styles.sectionSubheading}>
              Transparent policies protecting backer funds and ad amplification integrity.
            </Text>
          </View>
        </View>

        <View style={styles.policiesList}>
          <View style={styles.policyRow}>
            <Text style={styles.policyBullet}>•</Text>
            <Text style={styles.policyText}>
              <Text style={styles.policyBold}>90% Ad Budget / 10% Platform Fee</Text>: Exactly 90%
              of all net funds directly purchase digital advertising impressions. The 10% fee covers
              fact-checking, review, and payment processing.
            </Text>
          </View>
          <View style={styles.policyRow}>
            <Text style={styles.policyBullet}>•</Text>
            <Text style={styles.policyText}>
              <Text style={styles.policyBold}>25% Minimum Threshold Refund Policy</Text>: If the
              campaign fails to reach at least 25% of its funding goal by the end of its funding
              window, all backer contributions are automatically refunded.
            </Text>
          </View>
          <View style={styles.policyRow}>
            <Text style={styles.policyBullet}>•</Text>
            <Text style={styles.policyText}>
              <Text style={styles.policyBold}>Unspent Ad Funds Escrow</Text>: All ad funds are held
              in secure platform escrow. Any unspent ad budget after the distribution run concludes is
              accounted for transparently.
            </Text>
          </View>
          <View style={styles.policyRow}>
            <Text style={styles.policyBullet}>•</Text>
            <Text style={styles.policyText}>
              <Text style={styles.policyBold}>NOT a Donation</Text>: Contributions strictly fund digital
              advertising distribution to spread the message. Funds never go to the creator or cause
              as personal gifts or donations.
            </Text>
          </View>
        </View>
      </Card>

      {/* 4. FOUR REQUIRED CONFIRMATION CHECKBOXES */}
      <Card style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <ShieldCheck size={20} color={theme.colors.lime} />
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionHeading}>Creator Confirmations</Text>
            <Text style={styles.sectionSubheading}>
              All 4 confirmations are required to submit this campaign for review.
            </Text>
          </View>
        </View>

        <View style={styles.checkboxesContainer}>
          {/* Checkbox 1: Rights */}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: rightsConfirmed }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setRightsConfirmed(!rightsConfirmed);
            }}
            style={styles.checkboxRow}
          >
            <View style={[styles.checkbox, rightsConfirmed && styles.checkboxSelected]}>
              {rightsConfirmed && <Check size={12} color={theme.colors.onLime} strokeWidth={3} />}
            </View>
            <Text style={styles.checkboxLabel}>
              <Text style={styles.checkboxBold}>Content Rights</Text>: I confirm that I own or have
              secured all necessary rights, licenses, and permissions for the story, images, and
              creative assets included in this campaign.
            </Text>
          </Pressable>

          {/* Checkbox 2: Guidelines */}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: guidelinesConfirmed }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setGuidelinesConfirmed(!guidelinesConfirmed);
            }}
            style={styles.checkboxRow}
          >
            <View style={[styles.checkbox, guidelinesConfirmed && styles.checkboxSelected]}>
              {guidelinesConfirmed && <Check size={12} color={theme.colors.onLime} strokeWidth={3} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.checkboxLabel}>
                <Text style={styles.checkboxBold}>Community Guidelines</Text>: This campaign complies
                with platform Community Guidelines, containing no hate speech, harassment, deceptive
                claims, or prohibited content.
              </Text>
              <Pressable
                onPress={() => setPolicySheetType('guidelines')}
                hitSlop={6}
                style={styles.policyLinkRow}
              >
                <Text style={styles.policyLinkText}>Read Community Guidelines</Text>
                <ExternalLink size={12} color={theme.colors.lime} />
              </Pressable>
            </View>
          </Pressable>

          {/* Checkbox 3: Ad Distribution Only */}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: adDistributionOnlyConfirmed }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setAdDistributionOnlyConfirmed(!adDistributionOnlyConfirmed);
            }}
            style={styles.checkboxRow}
          >
            <View style={[styles.checkbox, adDistributionOnlyConfirmed && styles.checkboxSelected]}>
              {adDistributionOnlyConfirmed && <Check size={12} color={theme.colors.onLime} strokeWidth={3} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.checkboxLabel}>
                <Text style={styles.checkboxBold}>Ad Distribution Only</Text>: I acknowledge and
                agree that backer funds strictly purchase digital advertising distribution to amplify
                this message, and will not be transferred to personal accounts or charity donations.
              </Text>
              <Pressable
                onPress={() => setPolicySheetType('terms')}
                hitSlop={6}
                style={styles.policyLinkRow}
              >
                <Text style={styles.policyLinkText}>View Distribution Terms of Service</Text>
                <ExternalLink size={12} color={theme.colors.lime} />
              </Pressable>
            </View>
          </Pressable>

          {/* Checkbox 4: Review Changes */}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: reviewEditsConfirmed }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setReviewEditsConfirmed(!reviewEditsConfirmed);
            }}
            style={styles.checkboxRow}
          >
            <View style={[styles.checkbox, reviewEditsConfirmed && styles.checkboxSelected]}>
              {reviewEditsConfirmed && <Check size={12} color={theme.colors.onLime} strokeWidth={3} />}
            </View>
            <Text style={styles.checkboxLabel}>
              <Text style={styles.checkboxBold}>Review & Verification</Text>: I understand that the
              editorial and moderation team will review this campaign, and that publication is subject
              to verification and may require revisions.
            </Text>
          </Pressable>
        </View>
      </Card>

      {/* 5. "STILL NEEDED" CHECKLIST CARD */}
      <Card style={styles.checklistCard}>
        <View style={styles.sectionHeaderRow}>
          <ShieldCheck size={18} color={theme.colors.lime} />
          <Text style={styles.sectionHeading}>Still Needed Before Submission</Text>
        </View>

        {!hasAnyErrors ? (
          <View style={styles.allCompleteRow}>
            <CheckCircle2 size={20} color={theme.colors.lime} />
            <Text style={styles.allCompleteText}>
              All 5 steps have met the platform submission requirements!
            </Text>
          </View>
        ) : (
          (['basics', 'story', 'visuals', 'reach', 'submit'] as const).map((stepKey) => {
            const stepErrors = allStepErrors[stepKey];
            const isDone = stepErrors.length === 0;

            return (
              <View key={stepKey} style={styles.checklistItem}>
                <View style={styles.checklistItemHeader}>
                  <View style={styles.checklistTitleRow}>
                    {isDone ? (
                      <CheckCircle2 size={16} color={theme.colors.lime} />
                    ) : (
                      <AlertCircle size={16} color={theme.colors.textSecondary} />
                    )}
                    <Text
                      style={[
                        styles.checklistStepTitle,
                        isDone && styles.checklistStepTitleDone,
                      ]}
                    >
                      {STEP_LABELS[stepKey]}
                    </Text>
                  </View>

                  {!isDone && (
                    <Button
                      title="Fix"
                      variant="ghost"
                      size="sm"
                      onPress={() => handleJumpToStep(stepKey)}
                    />
                  )}
                </View>

                {!isDone && (
                  <View style={styles.errorPillsList}>
                    {stepErrors.map((errMsg, idx) => (
                      <Text key={idx} style={styles.errorBulletText}>
                        • {errMsg}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}
      </Card>

      {/* 6. BOTTOM ACTIONS */}
      <View style={styles.actionSection}>
        <Button
          title="Save as Draft"
          variant="secondary"
          size="lg"
          fullWidth
          iconLeft={<Save size={16} color={theme.colors.textSecondary} />}
          onPress={handleSaveDraft}
        />

        <Button
          title="Preview Campaign"
          variant="secondary"
          size="lg"
          fullWidth
          iconRight={<Eye size={18} color={theme.colors.lime} />}
          onPress={handlePreview}
          style={styles.previewBtn}
        />

        <Button
          title="Submit for Review"
          variant="primary"
          size="lg"
          fullWidth
          disabled={hasAnyErrors || !allCheckboxesChecked || isSubmitting}
          loading={isSubmitting}
          iconRight={<Send size={18} color={theme.colors.onLime} />}
          onPress={handleSubmit}
        />

        {!allCheckboxesChecked && !hasAnyErrors && (
          <Text style={styles.actionHint}>
            Please tick all 4 confirmations above to enable submission.
          </Text>
        )}

        <Button
          title="Back to Reach"
          variant="ghost"
          size="md"
          fullWidth
          iconLeft={<ArrowLeft size={16} color={theme.colors.textSecondary} />}
          onPress={() => router.push(`/create/${draftId}/reach` as Href)}
        />
      </View>

      {/* Policy and Guidelines Modal Sheet */}
      <Sheet
        visible={policySheetType !== null}
        onClose={() => setPolicySheetType(null)}
        title={policySheetType === 'terms' ? 'Advertising Distribution Terms' : 'Community Guidelines'}
      >
        <ScrollView style={styles.policySheetContent} showsVerticalScrollIndicator={false}>
          {policySheetType === 'terms' ? (
            <View style={styles.policySheetBody}>
              <Text style={styles.policyModalHeading}>Ad Distribution Service Terms</Text>
              <Text style={styles.policyModalParagraph}>
                1. <Text style={styles.policyBold}>Purpose</Text>: Backer contributions fund the purchase of digital advertising impressions across social media feeds, search listings, and display networks to amplify the creator's verified public-interest message.
              </Text>
              <Text style={styles.policyModalParagraph}>
                2. <Text style={styles.policyBold}>No Personal Remuneration</Text>: Contributions are never paid to creators as personal income, gifts, or charitable donations. All disbursed funds strictly purchase media inventory.
              </Text>
              <Text style={styles.policyModalParagraph}>
                3. <Text style={styles.policyBold}>25% Threshold Guarantee</Text>: If a campaign reaches less than 25% of its goal by the close of the funding window, 100% of contributions are refunded to backers.
              </Text>
              <Text style={styles.policyModalParagraph}>
                4. <Text style={styles.policyBold}>Transparency</Text>: Real-time advertising delivery metrics, impression counts, and reach metrics are published to the campaign dashboard upon campaign activation.
              </Text>
            </View>
          ) : (
            <View style={styles.policySheetBody}>
              <Text style={styles.policyModalHeading}>Authentic Voice & Truthfulness</Text>
              <Text style={styles.policyModalParagraph}>
                1. <Text style={styles.policyBold}>Verified Citations</Text>: Every factual claim in a campaign must be backed by reputable, inspectable citations.
              </Text>
              <Text style={styles.policyModalParagraph}>
                2. <Text style={styles.policyBold}>Prohibited Content</Text>: We strictly reject hate speech, harassment, medical disinformation, commercial fraud, get-rich-quick schemes, and deceptive impersonation.
              </Text>
              <Text style={styles.policyModalParagraph}>
                3. <Text style={styles.policyBold}>Editorial Review</Text>: Every campaign is vetted by our human moderation team before publication. Reviewers may request edits to headlines or source links.
              </Text>
            </View>
          )}

          <Button
            title="I Understand"
            variant="primary"
            size="md"
            fullWidth
            onPress={() => setPolicySheetType(null)}
            style={{ marginTop: theme.spacing.base }}
          />

          <Button
            title={policySheetType === 'terms' ? 'Read Full Distribution Terms' : 'Read Full Community Guidelines'}
            variant="secondary"
            size="md"
            fullWidth
            onPress={() => {
              const target = policySheetType === 'terms' ? '/info/terms' : '/info/community-guidelines';
              setPolicySheetType(null);
              router.push(target as Href);
            }}
            style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.md }}
          />
        </ScrollView>
      </Sheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    padding: theme.spacing.base,
    paddingBottom: 60,
    gap: theme.spacing.lg,
  },
  headerBox: {
    marginBottom: -4,
  },
  stepTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 24,
    lineHeight: 30,
    color: theme.colors.textPrimary,
  },
  stepSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
  },
  statusBannerSuccess: {
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.lime,
  },
  statusBannerPending: {
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.line,
  },
  statusBannerText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  card: {
    padding: theme.spacing.base,
    gap: theme.spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  inlineHeaderWithTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  sectionHeading: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  sectionSubheading: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  fieldSpacing: {
    marginTop: 4,
  },
  chipsSection: {
    gap: 6,
  },
  chipsLabel: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surfaceRaised,
  },
  goalChipSelected: {
    backgroundColor: theme.colors.tintedPillBg,
    borderColor: theme.colors.lime,
  },
  goalChipText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  goalChipTextSelected: {
    fontFamily: theme.typography.fonts.uiBold,
    color: theme.colors.lime,
  },
  estimateBox: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  estimateTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  estimateTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.textPrimary,
    flexShrink: 1,
  },
  estimateDisclaimer: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textSecondary,
  },
  financialBreakdown: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: theme.spacing.md,
    gap: 8,
  },
  breakdownHeaderTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownItem: {
    flex: 1,
    gap: 2,
  },
  breakdownDivider: {
    width: 1,
    height: 36,
    backgroundColor: theme.colors.line,
    marginHorizontal: theme.spacing.sm,
  },
  breakdownItemLabel: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  breakdownItemValue: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 16,
    color: theme.colors.lime,
  },
  breakdownItemDesc: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  summarySection: {
    gap: theme.spacing.xs,
  },
  sectionGroupTitle: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  sectionGroupSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  accordionsList: {
    gap: theme.spacing.sm,
  },
  accordionInner: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  summaryItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  summaryLabel: {
    width: 130,
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    flex: 1,
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  sourcesMiniList: {
    backgroundColor: theme.colors.inputBg,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    gap: 4,
  },
  sourceBulletText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  coverThumbnailWrapper: {
    marginTop: 4,
    gap: 4,
  },
  coverThumbnailLabel: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  coverThumbnail: {
    width: '100%',
    height: 120,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.inputBg,
  },
  editStepBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  policiesList: {
    gap: 10,
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  policyBullet: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 14,
    color: theme.colors.lime,
    lineHeight: 20,
  },
  policyText: {
    flex: 1,
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
  },
  policyBold: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    color: theme.colors.textPrimary,
  },
  checkboxesContainer: {
    gap: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: theme.colors.surfaceRaised,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: theme.colors.surfaceRaised,
  },
  checkboxSelected: {
    backgroundColor: theme.colors.lime,
    borderColor: theme.colors.lime,
  },
  checkboxLabel: {
    flex: 1,
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  checkboxBold: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    color: theme.colors.textPrimary,
  },
  policyLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  policyLinkText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.lime,
    textDecorationLine: 'underline',
  },
  checklistCard: {
    padding: theme.spacing.base,
    gap: theme.spacing.md,
  },
  allCompleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surfaceRaised,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
  },
  allCompleteText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.lime,
    flex: 1,
  },
  checklistItem: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
    paddingBottom: theme.spacing.sm,
  },
  checklistItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checklistTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checklistStepTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  checklistStepTitleDone: {
    color: theme.colors.textPrimary,
  },
  errorPillsList: {
    marginTop: 6,
    paddingLeft: 24,
    gap: 2,
  },
  errorBulletText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textPrimary,
  },
  actionSection: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  previewBtn: {
    borderColor: theme.colors.line,
  },
  actionHint: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  policySheetContent: {
    maxHeight: 400,
  },
  policySheetBody: {
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  policyModalHeading: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  policyModalParagraph: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
  },
});
