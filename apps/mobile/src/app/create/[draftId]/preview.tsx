import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter, Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  Eye,
  ArrowLeft,
  Send,
  Sparkles,
  PieChart,
  Target,
  FileCheck2,
  ShieldCheck,
  User,
  HeartHandshake,
  Building2,
  Users,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import {
  StoryBlock,
  Source,
  Category,
  CreatorType,
  reachAtGoal,
  getAllStepErrors,
} from '@campaigns/shared';
import { useDraftStore } from '../../../store/draftStore';
import { useSubmitCampaign } from '../../../api';
import { ApiError } from '../../../api/types';
import { StoryRenderer } from '../../../components/story/StoryRenderer';
import {
  Button,
  CategoryChip,
  StatusPill,
  ProgressBar,
  Accordion,
  SourceItem,
  Avatar,
  Card,
  ReachEstimateBadge,
  DemoDataBadge,
  useToast,
} from '../../../components/ui';
import { theme } from '../../../theme';

export default function CreatePreviewScreen() {
  const { draftId } = useLocalSearchParams<{ draftId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const draft = useDraftStore((s) => s.getDraft(draftId as string)) || {};
  const saveDraftNow = useDraftStore((s) => s.saveDraftNow);
  const setIsSubmittingStore = useDraftStore((s) => s.setIsSubmitting);

  const submitCampaignMutation = useSubmitCampaign();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const storyBlocks = (Array.isArray(draft.story) ? draft.story : []) as StoryBlock[];
  const sources = (Array.isArray(draft.sources) ? draft.sources : []) as Source[];
  const fundingGoalCents = draft.fundingGoalCents || 100000;
  const reachEstimate = reachAtGoal(fundingGoalCents);

  const allStepErrors = getAllStepErrors({
    ...draft,
    acceptedRules: (draft as { acceptedRules?: boolean }).acceptedRules === true,
  });
  const hasErrors = Object.values(allStepErrors).some((errs) => errs.length > 0);

  const handleOpenSource = async (url: string) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      try {
        await WebBrowser.openBrowserAsync(url);
      } catch {
        toast.error('Could not open source URL');
      }
    }
  };

  const handleBackToEditing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(`/create/${draftId}/submit` as Href);
  };

  const handleSubmitForReview = async () => {
    if (hasErrors) {
      toast.warning('Please review and resolve remaining items on Step 5 before submitting.');
      router.push(`/create/${draftId}/submit` as Href);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setIsSubmitting(true);
    setIsSubmittingStore(true);

    try {
      await saveDraftNow(draftId as string);
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
        toast.error(err.message || 'Validation error. Returning to submission checklist.');
        router.push(`/create/${draftId}/submit` as Href);
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to submit campaign';
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
      setIsSubmittingStore(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Preview Banner */}
      <View style={styles.previewNoticeBanner}>
        <Eye size={18} color={theme.colors.primary700} />
        <View style={styles.previewNoticeTextCol}>
          <Text style={styles.previewNoticeTitle}>Preview Mode — Not Published</Text>
          <Text style={styles.previewNoticeSubtitle}>
            This is how community backers will view your campaign. Backing is disabled in preview.
          </Text>
        </View>
        <DemoDataBadge size="sm" />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Cover Image */}
        <View style={styles.heroCoverWrapper}>
          {draft.coverUrl ? (
            <Image
              source={{ uri: draft.coverUrl }}
              style={styles.heroCoverImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.heroCoverFallback}>
              <Sparkles size={48} color={theme.colors.ink400} />
              <Text style={styles.heroCoverFallbackText}>No cover image chosen</Text>
            </View>
          )}
        </View>

        {/* Editorial Header */}
        <View style={styles.editorialHeader}>
          <View style={styles.statusAndCategoryRow}>
            {draft.category && <CategoryChip category={draft.category as Category} />}
            <StatusPill status="DRAFT" />
          </View>

          <Text style={styles.campaignTitle}>{draft.title || 'Untitled Campaign'}</Text>

          {Boolean(draft.summary) && (
            <Text style={styles.campaignSummary}>{draft.summary}</Text>
          )}

          {/* Creator Metadata Row */}
          <View style={styles.creatorRow}>
            <Avatar name={draft.creatorName || 'Creator'} size={42} />
            <View style={styles.creatorMetaCol}>
              <Text style={styles.creatorNameText}>{draft.creatorName || 'Anonymous Creator'}</Text>
              <View style={styles.creatorSubRow}>
                <View style={styles.creatorTypeBadge}>
                  {getCreatorTypeIcon(draft.creatorType as CreatorType)}
                  <Text style={styles.creatorTypeText}>
                    {getCreatorTypeLabel(draft.creatorType as CreatorType)}
                  </Text>
                </View>
                <Text style={styles.metaBullet}>•</Text>
                <Text style={styles.publishDateText}>Draft Preview</Text>
              </View>
            </View>
          </View>

          <View style={styles.editorialDivider} />
        </View>

        {/* Funding & Reach Card */}
        <View style={styles.fundingCardWrapper}>
          <Card style={styles.fundingCard}>
            <View style={styles.fundingCardHeader}>
              <View>
                <Text style={styles.fundingRaisedText}>
                  $0{' '}
                  <Text style={styles.fundingGoalText}>
                    of ${(fundingGoalCents / 100).toLocaleString()} goal
                  </Text>
                </Text>
                <Text style={styles.fundingStatusSub}>0% funded • 0 backers</Text>
              </View>
              <ReachEstimateBadge
                low={reachEstimate.estimatedReachLow}
                high={reachEstimate.estimatedReachHigh}
                size="md"
              />
            </View>

            <ProgressBar progress={0} style={styles.progressBarSpacing} />

            <View style={styles.fundingSplitRow}>
              <View style={styles.fundingSplitCol}>
                <Text style={styles.splitLabel}>Direct Ad Budget (90%)</Text>
                <Text style={styles.splitValue}>
                  ${Math.round(reachEstimate.adBudgetCents / 100).toLocaleString()}
                </Text>
              </View>
              <View style={styles.splitDivider} />
              <View style={styles.fundingSplitCol}>
                <Text style={styles.splitLabel}>Platform Fee (10%)</Text>
                <Text style={styles.splitValue}>
                  ${Math.round(reachEstimate.platformFeeCents / 100).toLocaleString()}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Reusable StoryRenderer */}
        <StoryRenderer
          story={storyBlocks}
          sources={sources}
          containerPaddingHorizontal={theme.spacing.lg}
        />

        {/* Verified Sources & Citations Section */}
        <View style={styles.sourcesSection}>
          <View style={styles.sourcesHeader}>
            <View style={styles.sourcesTitleRow}>
              <FileCheck2 size={20} color={theme.colors.primary600} />
              <Text style={styles.sourcesTitle}>Verified Sources & Citations</Text>
            </View>
            <Text style={styles.sourcesDisclaimer}>
              Sources are provided by the creator and verified during our review process.
            </Text>
          </View>

          {sources.length > 0 ? (
            <View style={styles.sourcesList}>
              {sources.map((src, index) => (
                <SourceItem
                  key={src.url || `source-${index}`}
                  source={src}
                  verified={true}
                  onPress={handleOpenSource}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.noSourcesText}>No external sources linked in this draft.</Text>
          )}
        </View>

        {/* Accordions Section */}
        <View style={styles.accordionsSection}>
          {/* Use of Funds Accordion */}
          <Accordion
            title="Use of Funds & Not a Donation"
            defaultOpen={true}
            icon={<PieChart size={18} color={theme.colors.primary600} />}
            style={styles.accordionSpacing}
          >
            <View style={styles.accordionInner}>
              <View style={styles.nonDonationNoticeBox}>
                <ShieldCheck size={18} color={theme.colors.primary600} style={{ marginTop: 2 }} />
                <Text style={styles.nonDonationNoticeText}>
                  <Text style={styles.boldText}>Contributions strictly fund digital ad distribution</Text>
                  , never direct gifts or donations to the creator or cause.
                </Text>
              </View>

              <Text style={styles.accordionBodyText}>
                10% covers fact-checking, compliance verification, and payment processing. Exactly
                90% directly purchases digital advertising impressions across external channels.
              </Text>

              <View style={styles.termsBox}>
                <Text style={styles.termsHeading}>25% Minimum Threshold Refund Policy</Text>
                <Text style={styles.termsText}>
                  If this campaign achieves less than 25% of its funding goal by the deadline, all
                  contributions are refunded in full.
                </Text>

                <Text style={[styles.termsHeading, { marginTop: theme.spacing.sm }]}>
                  Unspent Ad Budget Escrow
                </Text>
                <Text style={styles.termsText}>
                  Any unspent ad budget after the distribution run is preserved in escrow and disclosed
                  transparently.
                </Text>
              </View>
            </View>
          </Accordion>

          {/* Audience & Distribution Accordion */}
          <Accordion
            title="Audience & Distribution"
            defaultOpen={false}
            icon={<Target size={18} color={theme.colors.primary600} />}
            style={styles.accordionSpacing}
          >
            <View style={styles.accordionInner}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Target Locations:</Text>
                <Text style={styles.detailValue}>
                  {draft.reach?.locations?.join(', ') || 'Worldwide'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Audience Themes:</Text>
                <Text style={styles.detailValue}>
                  {draft.reach?.interests?.join(', ') || 'All interested audiences'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Distribution Channels:</Text>
                <Text style={styles.detailValue}>
                  {draft.reach?.channels?.join(', ') || 'Social feeds, Display'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Distribution Run:</Text>
                <Text style={styles.detailValue}>
                  {draft.reach?.durationDays || 14} days of active promotion once funded
                </Text>
              </View>
            </View>
          </Accordion>
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions Bar (Replaced: NO "Back This Campaign") */}
      <View style={[styles.stickyBottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button
          title="Back to Editing"
          variant="secondary"
          size="md"
          iconLeft={<ArrowLeft size={16} color={theme.colors.ink800} />}
          onPress={handleBackToEditing}
          style={styles.bottomSecondaryBtn}
        />

        <Button
          title="Submit for Review"
          variant="primary"
          size="md"
          loading={isSubmitting}
          iconRight={<Send size={16} color="#FFFFFF" />}
          onPress={handleSubmitForReview}
          style={styles.bottomPrimaryBtn}
        />
      </View>
    </View>
  );
}

function getCreatorTypeIcon(type?: CreatorType) {
  switch (type) {
    case 'nonprofit':
      return <HeartHandshake size={14} color={theme.colors.primary600} />;
    case 'business':
      return <Building2 size={14} color={theme.colors.primary600} />;
    case 'community':
      return <Users size={14} color={theme.colors.primary600} />;
    case 'creator':
      return <Sparkles size={14} color={theme.colors.primary600} />;
    case 'individual':
    default:
      return <User size={14} color={theme.colors.primary600} />;
  }
}

function getCreatorTypeLabel(type?: CreatorType) {
  switch (type) {
    case 'nonprofit':
      return 'Nonprofit';
    case 'business':
      return 'Business';
    case 'community':
      return 'Community Group';
    case 'creator':
      return 'Creator';
    case 'individual':
    default:
      return 'Individual';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  previewNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.primary50,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary100,
  },
  previewNoticeTextCol: {
    flex: 1,
  },
  previewNoticeTitle: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 13,
    color: theme.colors.primary800,
  },
  previewNoticeSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.ink600,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroCoverWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: theme.colors.ink900,
  },
  heroCoverImage: {
    width: '100%',
    height: '100%',
  },
  heroCoverFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heroCoverFallbackText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.ink500,
  },
  editorialHeader: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.base,
  },
  statusAndCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  campaignTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 26,
    lineHeight: 34,
    color: theme.colors.ink900,
    marginBottom: 6,
  },
  campaignSummary: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.ink700,
    marginBottom: theme.spacing.base,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.base,
  },
  creatorMetaCol: {
    flex: 1,
    gap: 2,
  },
  creatorNameText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.ink900,
  },
  creatorSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  creatorTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  creatorTypeText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.ink600,
  },
  metaBullet: {
    fontSize: 12,
    color: theme.colors.ink400,
  },
  publishDateText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.ink500,
  },
  editorialDivider: {
    height: 1,
    backgroundColor: theme.colors.line,
    marginBottom: theme.spacing.base,
  },
  fundingCardWrapper: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  fundingCard: {
    padding: theme.spacing.base,
    gap: theme.spacing.md,
  },
  fundingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  fundingRaisedText: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 22,
    lineHeight: 28,
    color: theme.colors.ink900,
  },
  fundingGoalText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    color: theme.colors.ink600,
  },
  fundingStatusSub: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.ink500,
    marginTop: 2,
  },
  progressBarSpacing: {
    marginVertical: 2,
  },
  fundingSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.bgMuted,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
  },
  fundingSplitCol: {
    flex: 1,
    gap: 2,
  },
  splitDivider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.line,
    marginHorizontal: theme.spacing.sm,
  },
  splitLabel: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
    color: theme.colors.ink600,
  },
  splitValue: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 14,
    color: theme.colors.ink900,
  },
  sourcesSection: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.base,
  },
  sourcesHeader: {
    marginBottom: theme.spacing.md,
    gap: 4,
  },
  sourcesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourcesTitle: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 16,
    color: theme.colors.ink900,
  },
  sourcesDisclaimer: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.ink600,
  },
  sourcesList: {
    gap: theme.spacing.sm,
  },
  noSourcesText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.ink500,
    fontStyle: 'italic',
  },
  accordionsSection: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
    marginTop: theme.spacing.base,
  },
  accordionSpacing: {
    marginBottom: theme.spacing.sm,
  },
  accordionInner: {
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  nonDonationNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.primary50,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary100,
  },
  nonDonationNoticeText: {
    flex: 1,
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.primary800,
  },
  boldText: {
    fontFamily: theme.typography.fonts.uiBold,
  },
  accordionBodyText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.ink700,
  },
  termsBox: {
    backgroundColor: theme.colors.bgMuted,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    gap: 4,
  },
  termsHeading: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.ink800,
  },
  termsText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.ink600,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  detailLabel: {
    width: 140,
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.ink600,
  },
  detailValue: {
    flex: 1,
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.ink900,
  },
  stickyBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.sm,
    ...theme.shadows.elevated,
  },
  bottomSecondaryBtn: {
    flex: 1,
  },
  bottomPrimaryBtn: {
    flex: 1.3,
  },
});
