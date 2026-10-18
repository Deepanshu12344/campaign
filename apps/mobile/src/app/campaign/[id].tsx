import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter, Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ChevronLeft,
  Share2,
  Bookmark,
  User,
  Sparkles,
  HeartHandshake,
  Building2,
  Users,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  PieChart,
  Target,
  FileCheck2,
  Clock,
} from 'lucide-react-native';
import {
  useCampaign,
  useEstimateConfig,
  useSaveCampaign,
  useFollowCampaign,
  useSubmitFeedback,
} from '../../api';
import { useAuthStore } from '../../store/authStore';
import { useRequireAuth } from '../../auth/requireAuth';
import { StoryRenderer } from '../../components/story/StoryRenderer';
import {
  Button,
  StatusPill,
  ProgressBar,
  Accordion,
  SourceItem,
  Timeline,
  Avatar,
  Sheet,
  Skeleton,
  useToast,
  EmptyState,
} from '../../components/ui';
import { ScreenState } from '../../components/layout';
import { theme } from '../../theme';
import { CreatorType } from '@campaigns/shared';

const FEEDBACK_STORAGE_KEY_PREFIX = '@campaign_feedback_';

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { requireAuth } = useRequireAuth();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const {
    data: campaign,
    isLoading,
    isError,
    error,
    refetch,
  } = useCampaign(id as string);

  const { data: estimateConfig } = useEstimateConfig();

  const saveMutation = useSaveCampaign(id as string);
  const followMutation = useFollowCampaign(id as string);
  const submitFeedbackMutation = useSubmitFeedback(id as string);

  // Bottom Reach/Progress Sheet state
  const [isDetailSheetVisible, setIsDetailSheetVisible] = useState(false);

  // Feedback State
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);
  const [visualsChoice, setVisualsChoice] = useState<'NO' | 'SOMEWHAT' | 'YES' | null>(null);
  const [mindChoice, setMindChoice] = useState<'NO' | 'SOMEWHAT' | 'YES' | null>(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Check if user already submitted feedback on this device
  useEffect(() => {
    if (id) {
      AsyncStorage.getItem(`${FEEDBACK_STORAGE_KEY_PREFIX}${id}`)
        .then((val) => {
          if (val === 'true') {
            setHasSubmittedFeedback(true);
          }
        })
        .catch(() => {});
    }
  }, [id]);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/explore' as Href);
    }
  };

  const handleShare = async () => {
    if (!campaign) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const shareUrl = `https://campaigns.app/campaign/${campaign.id}`;
    try {
      await Share.share({
        title: campaign.title,
        message: `${campaign.title} — Pool community reach for this message on Campaigns: ${shareUrl}`,
        url: shareUrl,
      });
    } catch {
      // User cancelled or share dismissed
    }
  };

  const handleToggleSave = () => {
    if (!campaign) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    if (!isAuthenticated) {
      requireAuth({
        reason: 'Sign in to bookmark this campaign and revisit it anytime.',
        returnTo: `/campaign/${campaign.id}`,
        onAuthenticated: () => {
          saveMutation.mutate(!campaign.isSaved, {
            onSuccess: (data) => {
              toast.info(data.saved ? 'Campaign saved to bookmarks' : 'Campaign removed from bookmarks');
            },
          });
        },
      });
      return;
    }

    saveMutation.mutate(!campaign.isSaved, {
      onSuccess: (data) => {
        toast.info(data.saved ? 'Campaign saved to bookmarks' : 'Campaign removed from bookmarks');
      },
      onError: (err) => {
        toast.error(err.message || 'Could not update bookmark');
      },
    });
  };

  const handleOpenSource = async (url: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      await WebBrowser.openBrowserAsync(url);
    } catch {
      toast.error('Unable to open link');
    }
  };

  const handleSubmitFeedback = async () => {
    if (!visualsChoice || !mindChoice || !campaign) return;
    try {
      setIsSubmittingFeedback(true);
      await submitFeedbackMutation.mutateAsync({
        visualsEncouraged: visualsChoice,
        messageChanged: mindChoice,
      });
      await AsyncStorage.setItem(`${FEEDBACK_STORAGE_KEY_PREFIX}${campaign.id}`, 'true');
      setHasSubmittedFeedback(true);
      toast.success('Thank you for your feedback!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to submit feedback';
      toast.error(msg);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Custom Skeleton matching the editorial layout
  const renderLoadingSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <Skeleton height={260} width="100%" borderRadius={0} />
      <View style={styles.skeletonBody}>
        <Skeleton height={28} width={120} borderRadius={theme.radius.pill} style={styles.skeletonMargin} />
        <Skeleton height={32} width="92%" style={styles.skeletonMargin} />
        <Skeleton height={32} width="70%" style={styles.skeletonMargin} />
        <View style={styles.skeletonCreatorRow}>
          <Skeleton height={40} width={40} borderRadius={20} />
          <View style={{ gap: 6, flex: 1 }}>
            <Skeleton height={16} width={140} />
            <Skeleton height={12} width={100} />
          </View>
        </View>
        <View style={styles.skeletonDivider} />
        <Skeleton height={18} width="100%" style={styles.skeletonMargin} />
        <Skeleton height={18} width="95%" style={styles.skeletonMargin} />
        <Skeleton height={18} width="88%" style={styles.skeletonMargin} />
        <Skeleton height={160} width="100%" borderRadius={theme.radius.card} style={styles.skeletonMargin} />
      </View>
    </View>
  );

  return (
    <ScreenState
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={refetch}
      skeleton={renderLoadingSkeleton()}
      isEmpty={!isLoading && !campaign}
      emptyTitle="Campaign Not Found"
      emptyDescription="The campaign you are looking for does not exist or may have been archived."
      emptyActionLabel="Explore Campaigns"
      onEmptyAction={() => router.replace('/(tabs)/explore' as Href)}
    >
      {campaign && (
        <View style={styles.screenRoot}>
          {/* Top Floating Navigation Overlay */}
          <View style={[styles.topFloatingBar, { top: insets.top + 8 }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Navigate back"
              onPress={handleBack}
              style={styles.floatingCircleBtn}
              hitSlop={8}
            >
              <ChevronLeft size={22} color={theme.colors.textPrimary} />
            </Pressable>

            <View style={styles.topRightActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={campaign.isSaved ? 'Remove bookmark' : 'Bookmark campaign'}
                onPress={handleToggleSave}
                style={styles.floatingCircleBtn}
                hitSlop={8}
              >
                <Bookmark
                  size={20}
                  color={campaign.isSaved ? theme.colors.lime : theme.colors.textPrimary}
                  fill={campaign.isSaved ? theme.colors.lime : 'transparent'}
                />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share campaign link"
                onPress={handleShare}
                style={styles.floatingCircleBtn}
                hitSlop={8}
              >
                <Share2 size={20} color={theme.colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          {/* Editorial Content ScrollView */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: 220 + insets.bottom },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Cover Image */}
            <View style={styles.heroCoverWrapper}>
              {campaign.coverUrl ? (
                <Image
                  source={{ uri: campaign.coverUrl }}
                  style={styles.heroCoverImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={styles.heroCoverFallback}>
                  <Sparkles size={48} color={theme.colors.textSecondary} />
                </View>
              )}
            </View>

            {/* Editorial Metadata & Title Header */}
            <View style={styles.editorialHeader}>
              <View style={styles.statusAndCategoryRow}>
                <Text style={styles.categoryLabel}>{campaign.category.toUpperCase()}</Text>
                {campaign.status !== 'FUNDING' && (
                  <StatusPill status={campaign.status} />
                )}
              </View>

              <Text style={styles.campaignTitle}>{campaign.title}</Text>

              {Boolean(campaign.summary) && (
                <Text style={styles.campaignSummary}>{campaign.summary}</Text>
              )}

              {/* Creator Metadata Row */}
              <View style={styles.creatorRow}>
                <Avatar name={campaign.creatorName} size={42} />
                <View style={styles.creatorMetaCol}>
                  <Text style={styles.creatorNameText}>{campaign.creatorName}</Text>
                  <View style={styles.creatorSubRow}>
                    <View style={styles.creatorTypeBadge}>
                      {getCreatorTypeIcon(campaign.creatorType)}
                      <Text style={styles.creatorTypeText}>
                        {getCreatorTypeLabel(campaign.creatorType)}
                      </Text>
                    </View>
                    <Text style={styles.metaBullet}>•</Text>
                    <Text style={styles.publishDateText}>
                      {formatPublicationDate(campaign.publishedAt || campaign.createdAt)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.editorialDivider} />
            </View>

            {/* Story Content via Reusable StoryRenderer */}
            <StoryRenderer
              story={campaign.story}
              sources={campaign.sources}
              containerPaddingHorizontal={theme.spacing.lg}
            />

            {/* Visible Sources Section */}
            <View style={styles.sourcesSection}>
              <View style={styles.sourcesHeader}>
                <View style={styles.sourcesTitleRow}>
                  <FileCheck2 size={20} color={theme.colors.lime} />
                  <Text style={styles.sourcesTitle}>Verified Sources & Citations</Text>
                </View>
                <Text style={styles.sourcesDisclaimer}>
                  Sources are provided by the creator and are checked as part of our review. We do
                  not independently verify external research or claim primary authority.
                </Text>
              </View>

              {campaign.sources && campaign.sources.length > 0 ? (
                <View style={styles.sourcesList}>
                  {campaign.sources.map((src, index) => (
                    <SourceItem
                      key={`source-${index}`}
                      source={src}
                      verified={true}
                      onPress={handleOpenSource}
                    />
                  ))}
                </View>
              ) : (
                <Text style={styles.noSourcesText}>
                  No external sources registered for this story.
                </Text>
              )}
            </View>

            {/* 5 Accordions Section */}
            <View style={styles.accordionsSection}>
              {/* 1. Use of Funds (Open by default) */}
              <Accordion
                title="Use of Funds"
                defaultOpen={true}
                icon={<PieChart size={18} color={theme.colors.lime} />}
                style={styles.accordionSpacing}
              >
                <View style={styles.accordionInner}>
                  {/* Non-donation primary disclaimer */}
                  <View style={styles.nonDonationNoticeBox}>
                    <ShieldCheck size={18} color={theme.colors.lime} style={{ marginTop: 2 }} />
                    <Text style={styles.nonDonationNoticeText}>
                      <Text style={styles.boldText}>Your contribution funds the distribution of this message</Text>
                      , not direct charitable support for the cause.
                    </Text>
                  </View>

                  <Text style={styles.accordionBodyText}>
                    10% covers fact-checking, human review, compliance, platform hosting, and payment
                    infrastructure. The remaining 90% is allocated strictly to digital advertising to
                    deliver this message to external audiences.
                  </Text>

                  {/* Fund Breakdown Stats */}
                  <View style={styles.fundsGrid}>
                    <View style={styles.fundsGridCard}>
                      <Text style={styles.fundsCardLabel}>Total Funding Goal</Text>
                      <Text style={styles.fundsCardValue}>
                        ${(campaign.fundingGoalCents / 100).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.fundsGridCard}>
                      <Text style={styles.fundsCardLabel}>Direct Ad Budget (90%)</Text>
                      <Text style={[styles.fundsCardValue, { color: theme.colors.lime }]}>
                        ${Math.round((campaign.fundingGoalCents * 0.9) / 100).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Channel Allocation if configured */}
                  {campaign.reach?.budgetAllocation &&
                    Object.keys(campaign.reach.budgetAllocation).length > 0 && (
                      <View style={styles.allocationBox}>
                        <Text style={styles.allocationTitle}>Channel Budget Allocation</Text>
                        {Object.entries(campaign.reach.budgetAllocation).map(([channel, pct]) => (
                          <View key={channel} style={styles.channelRow}>
                            <Text style={styles.channelName}>{channel}</Text>
                            <Text style={styles.channelPct}>{pct}%</Text>
                          </View>
                        ))}
                      </View>
                    )}

                  <View style={styles.termsBox}>
                    <Text style={styles.termsHeading}>Refund Policy</Text>
                    <Text style={styles.termsText}>
                      If this campaign does not achieve at least 25% of its funding goal by the
                      deadline, contributions are automatically refunded or reallocated to backers
                      without platform retention.
                    </Text>

                    <Text style={[styles.termsHeading, { marginTop: theme.spacing.sm }]}>
                      Unspent Budget Rules
                    </Text>
                    <Text style={styles.termsText}>
                      Any ad budget remaining after campaign completion due to ad auction
                      efficiencies is preserved in escrow and disclosed in the final report.
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.sm, paddingTop: theme.spacing.xs, borderTopWidth: 1, borderTopColor: theme.colors.line }}>
                      <Pressable onPress={() => router.push('/info/how-it-works' as Href)} hitSlop={6}>
                        <Text style={{ ...theme.typography.styles.captionSemiBold, color: theme.colors.lime, textDecorationLine: 'underline' }}>
                          How Funding Works
                        </Text>
                      </Pressable>
                      <Text style={{ color: theme.colors.textSecondary }}>•</Text>
                      <Pressable onPress={() => router.push('/info/terms' as Href)} hitSlop={6}>
                        <Text style={{ ...theme.typography.styles.captionSemiBold, color: theme.colors.lime, textDecorationLine: 'underline' }}>
                          Distribution Terms
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </Accordion>

              {/* 2. Audience & Distribution */}
              <Accordion
                title="Audience & Distribution"
                defaultOpen={false}
                icon={<Target size={18} color={theme.colors.lime} />}
                style={styles.accordionSpacing}
              >
                <View style={styles.accordionInner}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Target Locations:</Text>
                    <Text style={styles.detailValue}>
                      {campaign.reach?.locations?.join(', ') || 'United States (Nationwide)'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Target Topics & Interests:</Text>
                    <Text style={styles.detailValue}>
                      {campaign.reach?.interests?.join(', ') || 'General public & community interest'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Distribution Channels:</Text>
                    <Text style={styles.detailValue}>
                      {campaign.reach?.channels?.join(', ') || 'Meta (Instagram/Facebook), YouTube, Open Web Display'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Promotion Schedule:</Text>
                    <Text style={styles.detailValue}>
                      {campaign.reach?.durationDays || 30} days of active promotion once funding concludes
                    </Text>
                  </View>

                  <View style={styles.privacyNoteBox}>
                    <Text style={styles.privacyNoteText}>
                      Ad placements are published transparently with sponsor disclosures. Backer
                      identities and personal payment records are strictly private and never shared
                      with advertising networks or publishers.
                    </Text>
                  </View>
                </View>
              </Accordion>

              {/* 3. Review & Trust */}
              <Accordion
                title="Review & Trust"
                defaultOpen={false}
                icon={<FileCheck2 size={18} color={theme.colors.lime} />}
                style={styles.accordionSpacing}
              >
                <View style={styles.accordionInner}>
                  <Text style={styles.accordionBodyText}>
                    Every campaign undergoes a 4-step manual and automated review prior to publication:
                  </Text>

                  <View style={styles.reviewStepsList}>
                    <View style={styles.reviewStepItem}>
                      <Text style={styles.reviewStepNumber}>1</Text>
                      <View style={styles.reviewStepContent}>
                        <Text style={styles.reviewStepTitle}>Creator Identity Verification</Text>
                        <Text style={styles.reviewStepDesc}>
                          Authenticity of the organizing individual or entity is confirmed.
                        </Text>
                      </View>
                    </View>

                    <View style={styles.reviewStepItem}>
                      <Text style={styles.reviewStepNumber}>2</Text>
                      <View style={styles.reviewStepContent}>
                        <Text style={styles.reviewStepTitle}>Citation & Source Audit</Text>
                        <Text style={styles.reviewStepDesc}>
                          Key claims are inspected against the creator's submitted primary citations.
                        </Text>
                      </View>
                    </View>

                    <View style={styles.reviewStepItem}>
                      <Text style={styles.reviewStepNumber}>3</Text>
                      <View style={styles.reviewStepContent}>
                        <Text style={styles.reviewStepTitle}>Ad Policy Compliance</Text>
                        <Text style={styles.reviewStepDesc}>
                          Visual assets and ad copy conform to digital advertising standards.
                        </Text>
                      </View>
                    </View>

                    <View style={styles.reviewStepItem}>
                      <Text style={styles.reviewStepNumber}>4</Text>
                      <View style={styles.reviewStepContent}>
                        <Text style={styles.reviewStepTitle}>Reach & Budget Feasibility</Text>
                        <Text style={styles.reviewStepDesc}>
                          Audience sizing and CPM parameters are validated for realistic delivery.
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.honestStandardBox}>
                    <Text style={styles.honestStandardText}>
                      Our review verifies that claims are grounded in provided sources and comply
                      with platform integrity standards. We do not independently verify external
                      research or claim primary scientific authority. We do not issue synthetic trust
                      scores.
                    </Text>
                    <Pressable
                      onPress={() => router.push('/info/community-guidelines' as Href)}
                      hitSlop={6}
                      style={{ marginTop: theme.spacing.sm, paddingTop: theme.spacing.xs, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }}
                    >
                      <Text style={{ ...theme.typography.styles.captionSemiBold, color: theme.colors.lime, textDecorationLine: 'underline' }}>
                        Read Platform Community Guidelines →
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </Accordion>

              {/* 4. Updates */}
              <Accordion
                title={`Updates (${campaign.updates?.length || 0})`}
                defaultOpen={false}
                icon={<Clock size={18} color={theme.colors.lime} />}
                style={styles.accordionSpacing}
              >
                <View style={styles.accordionInner}>
                  {campaign.updates && campaign.updates.length > 0 ? (
                    <Timeline
                      items={campaign.updates.map((u) => ({
                        id: u.id,
                        title: u.title,
                        description: u.body,
                        date: new Date(u.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }),
                        status: 'completed',
                      }))}
                    />
                  ) : (
                    <EmptyState
                      title="No updates yet"
                      description="The creator has not posted updates yet. Milestone announcements and distribution progress will be listed here."
                    />
                  )}
                </View>
              </Accordion>

              {/* 5. Backers */}
              <Accordion
                title={`Backers (${campaign.backersSummary?.totalCount || 0})`}
                defaultOpen={false}
                icon={<Users size={18} color={theme.colors.lime} />}
                style={styles.accordionSpacing}
              >
                <View style={styles.accordionInner}>
                  <Text style={styles.backersSummaryCount}>
                    {campaign.backersSummary?.totalCount || 0} community members have backed this message.
                  </Text>

                  <View style={styles.privacyNoteBox}>
                    <Text style={styles.privacyNoteText}>
                      Backer names are kept private by default to protect individual privacy. Only
                      backers who explicitly opt in have their names displayed.
                    </Text>
                  </View>

                  {campaign.backersSummary?.recentPublicBackers &&
                  campaign.backersSummary.recentPublicBackers.length > 0 ? (
                    <View style={styles.publicBackersList}>
                      {campaign.backersSummary.recentPublicBackers.map((backer, idx) => (
                        <View key={`backer-${idx}`} style={styles.publicBackerRow}>
                          <Avatar name={backer.publicName} size={32} />
                          <View style={styles.publicBackerInfo}>
                            <Text style={styles.publicBackerName}>{backer.publicName}</Text>
                            <Text style={styles.publicBackerDate}>
                              {new Date(backer.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </Text>
                          </View>
                          <Text style={styles.publicBackerAmount}>
                            ${(backer.amountCents / 100).toFixed(0)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.allPrivateNotice}>
                      All current backers chose to remain anonymous.
                    </Text>
                  )}
                </View>
              </Accordion>
            </View>

            {/* Reader Perception Feedback Widget */}
            <View style={styles.feedbackSection}>
              <View style={styles.feedbackCard}>
                <View style={styles.feedbackHeader}>
                  <Sparkles size={20} color={theme.colors.lime} />
                  <Text style={styles.feedbackTitle}>Reader Perception</Text>
                </View>

                {hasSubmittedFeedback ? (
                  <View style={styles.feedbackSuccessBox}>
                    <CheckCircle2 size={24} color={theme.colors.lime} />
                    <Text style={styles.feedbackSuccessTitle}>Thank you for your feedback!</Text>
                    <Text style={styles.feedbackSuccessText}>
                      Your response helps evaluate the clarity and impact of community-funded messages.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.feedbackForm}>
                    <Text style={styles.feedbackIntro}>
                      Help assess this story's effectiveness. Responses are anonymous.
                    </Text>

                    {/* Question 1 */}
                    <View style={styles.questionContainer}>
                      <Text style={styles.questionText}>
                        Did the visuals encourage you to keep reading?
                      </Text>
                      <View style={styles.optionRow}>
                        {(['NO', 'SOMEWHAT', 'YES'] as const).map((opt) => {
                          const isSelected = visualsChoice === opt;
                          const label = opt === 'NO' ? 'No' : opt === 'SOMEWHAT' ? 'Somewhat' : 'Yes';
                          return (
                            <Pressable
                              key={opt}
                              accessibilityRole="button"
                              accessibilityState={{ selected: isSelected }}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                setVisualsChoice(opt);
                              }}
                              style={[
                                styles.optionBtn,
                                isSelected && styles.optionBtnSelected,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.optionBtnText,
                                  isSelected && styles.optionBtnTextSelected,
                                ]}
                              >
                                {label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    {/* Question 2 */}
                    <View style={styles.questionContainer}>
                      <Text style={styles.questionText}>Did this change your mind?</Text>
                      <View style={styles.optionRow}>
                        {(['NO', 'SOMEWHAT', 'YES'] as const).map((opt) => {
                          const isSelected = mindChoice === opt;
                          const label = opt === 'NO' ? 'No' : opt === 'SOMEWHAT' ? 'Somewhat' : 'Yes';
                          return (
                            <Pressable
                              key={opt}
                              accessibilityRole="button"
                              accessibilityState={{ selected: isSelected }}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                setMindChoice(opt);
                              }}
                              style={[
                                styles.optionBtn,
                                isSelected && styles.optionBtnSelected,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.optionBtnText,
                                  isSelected && styles.optionBtnTextSelected,
                                ]}
                              >
                                {label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    <Button
                      title="Submit Feedback"
                      variant="primary"
                      size="md"
                      disabled={!visualsChoice || !mindChoice}
                      loading={isSubmittingFeedback}
                      onPress={handleSubmitFeedback}
                      style={{ marginTop: theme.spacing.sm }}
                    />
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Sticky Bottom Funding Panel */}
          <View
            style={[
              styles.stickyFundingPanel,
              { paddingBottom: Math.max(insets.bottom, 12) },
            ]}
          >
            {/* Header row: Raised / Goal and Percent / Days */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View full funding and reach breakdown"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setIsDetailSheetVisible(true);
              }}
              style={styles.panelTopRow}
            >
              <View style={styles.panelAmountsCol}>
                <Text style={styles.panelRaisedText}>
                  ${(campaign.raisedCents / 100).toLocaleString()}{' '}
                  <Text style={styles.panelGoalText}>
                    of ${(campaign.fundingGoalCents / 100).toLocaleString()}
                  </Text>
                </Text>
              </View>
              <View style={styles.panelMetaCol}>
                <Text style={styles.panelPercentText}>{campaign.percentFunded}% funded</Text>
                <Text style={styles.panelDaysText}>
                  {campaign.daysRemaining !== null
                    ? `${campaign.daysRemaining} days left`
                    : 'Ending soon'}
                </Text>
              </View>
            </Pressable>

            {/* Progress Bar */}
            <ProgressBar
              value={campaign.percentFunded}
              height={6}
              style={styles.panelProgressBar}
            />

            {/* 3. Projected Reach Row with Chevron */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Estimated reach details"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setIsDetailSheetVisible(true);
              }}
              style={styles.panelReachRow}
            >
              <Text style={styles.panelReachText}>
                Projected reach ~{campaign.estimatedReachLow.toLocaleString()} - {campaign.estimatedReachHigh.toLocaleString()} people (estimate)
              </Text>
              <ChevronRight size={16} color={theme.colors.lime} strokeWidth={2} />
            </Pressable>

            {/* 4. Full-width Action Button */}
            <View style={styles.panelButtonContainer}>
              {renderStatusActionButton({
                campaign,
                onBack: () => router.push(`/back/${campaign.id}/amount` as Href),
                onReport: () => router.push(`/campaign/${campaign.id}/report` as Href),
                onFollow: () => {
                  followMutation.mutate(!campaign.isFollowing, {
                    onSuccess: (res) => {
                      toast.info(res.following ? 'Following campaign progress' : 'Unfollowed campaign');
                    },
                    onError: (err) => {
                      toast.error(err.message || 'Unable to update follow state');
                    },
                  });
                },
                isFollowingPending: followMutation.isPending,
              })}
            </View>
          </View>

          {/* Full Progress & Reach Math Breakdown Sheet */}
          <Sheet
            visible={isDetailSheetVisible}
            onClose={() => setIsDetailSheetVisible(false)}
            title="Funding & Audience Reach"
          >
            <View style={styles.sheetBody}>
              <View style={styles.sheetSummaryGrid}>
                <View style={styles.sheetStatBox}>
                  <Text style={styles.sheetStatVal}>
                    ${(campaign.raisedCents / 100).toLocaleString()}
                  </Text>
                  <Text style={styles.sheetStatLbl}>Total Raised</Text>
                </View>
                <View style={styles.sheetStatBox}>
                  <Text style={styles.sheetStatVal}>
                    ${(campaign.fundingGoalCents / 100).toLocaleString()}
                  </Text>
                  <Text style={styles.sheetStatLbl}>Funding Goal</Text>
                </View>
                <View style={styles.sheetStatBox}>
                  <Text style={styles.sheetStatVal}>
                    {campaign.backersSummary?.totalCount || 0}
                  </Text>
                  <Text style={styles.sheetStatLbl}>Backers</Text>
                </View>
              </View>

              <View style={styles.sheetReachMathCard}>
                <View style={styles.sheetReachHeader}>
                  <Target size={18} color={theme.colors.lime} />
                  <Text style={styles.sheetReachTitle}>Demonstration Reach Math</Text>
                </View>

                <View style={styles.mathRow}>
                  <Text style={styles.mathLabel}>Ad Budget (90%)</Text>
                  <Text style={styles.mathValue}>
                    ${Math.round((campaign.fundingGoalCents * 0.9) / 100).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.mathRow}>
                  <Text style={styles.mathLabel}>Illustrative CPM</Text>
                  <Text style={styles.mathValue}>${(estimateConfig?.cpm ?? 6).toFixed(2)}</Text>
                </View>
                <View style={styles.mathRow}>
                  <Text style={styles.mathLabel}>Avg. Ad Frequency</Text>
                  <Text style={styles.mathValue}>{estimateConfig?.avgFrequency ?? 2.2}x</Text>
                </View>
                <View style={styles.mathRow}>
                  <Text style={styles.mathLabel}>Projected Unique Reach</Text>
                  <Text style={[styles.mathValue, { color: theme.colors.lime, fontFamily: theme.typography.fonts.uiBold }]}>
                    ~{campaign.estimatedReachLow.toLocaleString()} - {campaign.estimatedReachHigh.toLocaleString()} people
                  </Text>
                </View>

                <Text style={styles.sheetDisclaimerText}>
                  Estimated reach based on demo assumptions. Not a guarantee. Real advertising
                  auctions fluctuate depending on season, placement, and targeting.
                </Text>
              </View>

              <Button
                title="Share Campaign"
                variant="secondary"
                size="lg"
                fullWidth
                iconLeft={<Share2 size={18} color={theme.colors.lime} />}
                onPress={() => {
                  setIsDetailSheetVisible(false);
                  handleShare();
                }}
                style={{ marginTop: theme.spacing.md }}
              />
            </View>
          </Sheet>
        </View>
      )}
    </ScreenState>
  );
}

interface ActionButtonProps {
  campaign: {
    id: string;
    status: string;
    isFollowing?: boolean;
  };
  onBack: () => void;
  onReport: () => void;
  onFollow: () => void;
  isFollowingPending: boolean;
}

function renderStatusActionButton({
  campaign,
  onBack,
  onReport,
  onFollow,
  isFollowingPending,
}: ActionButtonProps) {
  switch (campaign.status) {
    case 'FUNDING':
      return (
        <Button
          title="Back This Campaign"
          variant="primary"
          size="lg"
          onPress={onBack}
          fullWidth
          style={styles.panelFullWidthBtn}
          numberOfLines={1}
        />
      );
    case 'FUNDING_CLOSED':
    case 'DISTRIBUTION_PREP':
      return (
        <Button
          title="Funding closed"
          variant="secondary"
          size="lg"
          disabled={true}
          fullWidth
          style={styles.panelFullWidthBtn}
          numberOfLines={1}
        />
      );
    case 'PROMOTING':
      return (
        <Button
          title={campaign.isFollowing ? 'Following' : 'Follow progress'}
          variant={campaign.isFollowing ? 'secondary' : 'primary'}
          size="lg"
          loading={isFollowingPending}
          onPress={onFollow}
          fullWidth
          style={styles.panelFullWidthBtn}
          numberOfLines={1}
        />
      );
    case 'COMPLETED':
      return (
        <Button
          title="View final report"
          variant="primary"
          size="lg"
          onPress={onReport}
          fullWidth
          style={styles.panelFullWidthBtn}
          numberOfLines={1}
        />
      );
    default:
      return (
        <Button
          title="Inactive"
          variant="secondary"
          size="lg"
          disabled={true}
          fullWidth
          style={styles.panelFullWidthBtn}
          numberOfLines={1}
        />
      );
  }
}

function getCreatorTypeIcon(type: CreatorType) {
  const iconSize = 13;
  const color = theme.colors.textSecondary;
  const normalized = typeof type === 'string' ? type.toLowerCase() : type;

  switch (normalized) {
    case 'individual':
      return <User size={iconSize} color={color} />;
    case 'creator':
      return <Sparkles size={iconSize} color={color} />;
    case 'nonprofit':
      return <HeartHandshake size={iconSize} color={color} />;
    case 'business':
      return <Building2 size={iconSize} color={color} />;
    case 'community':
      return <Users size={iconSize} color={color} />;
    default:
      return <User size={iconSize} color={color} />;
  }
}

function getCreatorTypeLabel(type: CreatorType): string {
  const normalized = typeof type === 'string' ? type.toLowerCase() : type;
  switch (normalized) {
    case 'individual':
      return 'Individual';
    case 'creator':
      return 'Creator';
    case 'nonprofit':
      return 'Nonprofit';
    case 'business':
      return 'Business';
    case 'community':
      return 'Community Group';
    default:
      return 'Organizer';
  }
}

function formatPublicationDate(dateStr: Date | string | null | undefined): string {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  // Top Floating Bar
  topFloatingBar: {
    position: 'absolute',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  floatingCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.card,
  },
  topRightActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  // Hero Cover
  heroCoverWrapper: {
    width: '100%',
    height: 250,
    backgroundColor: theme.colors.surface,
  },
  heroCoverImage: {
    width: '100%',
    height: '100%',
  },
  heroCoverFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Editorial Header
  editorialHeader: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.base,
  },
  statusAndCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  categoryLabel: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  campaignTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 27,
    lineHeight: 35,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  campaignSummary: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.base,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.base,
  },
  creatorMetaCol: {
    flex: 1,
  },
  creatorNameText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  creatorSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  creatorTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  creatorTypeText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.caption.fontSize,
    color: theme.colors.textSecondary,
  },
  metaBullet: {
    marginHorizontal: 6,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  publishDateText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.caption.fontSize,
    color: theme.colors.textSecondary,
  },
  editorialDivider: {
    height: 1,
    backgroundColor: theme.colors.line,
    marginBottom: theme.spacing.base,
  },
  // Sources Section
  sourcesSection: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  sourcesHeader: {
    marginBottom: theme.spacing.md,
  },
  sourcesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sourcesTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: theme.typography.styles.h3.fontSize,
    color: theme.colors.textPrimary,
  },
  sourcesDisclaimer: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.caption.fontSize,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  sourcesList: {
    marginTop: theme.spacing.xs,
  },
  noSourcesText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.small.fontSize,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  // Accordions Section
  accordionsSection: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  accordionSpacing: {
    marginBottom: 2,
  },
  accordionInner: {
    gap: theme.spacing.md,
  },
  nonDonationNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.surfaceRaised,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  nonDonationNoticeText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  boldText: {
    fontFamily: theme.typography.fonts.uiBold,
    color: theme.colors.textPrimary,
  },
  accordionBodyText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.textSecondary,
  },
  fundsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  fundsGridCard: {
    flex: 1,
    backgroundColor: theme.colors.surfaceRaised,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fundsCardLabel: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  fundsCardValue: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 18,
    color: theme.colors.textPrimary,
  },
  allocationBox: {
    backgroundColor: theme.colors.surfaceRaised,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  allocationTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  channelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  channelName: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  channelPct: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.lime,
  },
  termsBox: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    paddingTop: theme.spacing.sm,
  },
  termsHeading: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  termsText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  detailRow: {
    marginBottom: theme.spacing.xs,
  },
  detailLabel: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  detailValue: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  privacyNoteBox: {
    backgroundColor: theme.colors.surfaceRaised,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    marginTop: 4,
  },
  privacyNoteText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.textSecondary,
  },
  reviewStepsList: {
    gap: 10,
    marginVertical: 4,
  },
  reviewStepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  reviewStepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.tintedPillBg,
    color: theme.colors.lime,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 12,
  },
  reviewStepContent: {
    flex: 1,
  },
  reviewStepTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  reviewStepDesc: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  honestStandardBox: {
    backgroundColor: theme.colors.surfaceRaised,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.lime,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  honestStandardText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  backersSummaryCount: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  publicBackersList: {
    marginTop: theme.spacing.sm,
    gap: 8,
  },
  publicBackerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  publicBackerInfo: {
    flex: 1,
  },
  publicBackerName: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  publicBackerDate: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  publicBackerAmount: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.lime,
  },
  allPrivateNotice: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 6,
  },
  // Feedback Section
  feedbackSection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  feedbackCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.surfaceRaised,
    padding: theme.spacing.lg,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.xs,
  },
  feedbackTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: theme.typography.styles.h3.fontSize,
    color: theme.colors.textPrimary,
  },
  feedbackIntro: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  feedbackForm: {
    marginTop: 4,
  },
  questionContainer: {
    marginBottom: theme.spacing.md,
  },
  questionText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionBtnSelected: {
    backgroundColor: theme.colors.tintedPillBg,
    borderColor: '#234F02',
  },
  optionBtnText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  optionBtnTextSelected: {
    color: theme.colors.lime,
    fontFamily: theme.typography.fonts.uiSemiBold,
  },
  feedbackSuccessBox: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    gap: 6,
  },
  feedbackSuccessTitle: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginTop: 4,
  },
  feedbackSuccessText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  // Sticky Bottom Funding Panel
  stickyFundingPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  panelTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  panelAmountsCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  panelRaisedText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 18,
    color: theme.colors.textPrimary,
  },
  panelGoalText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  panelMetaCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  panelPercentText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.lime,
  },
  panelDaysText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  panelProgressBar: {
    marginBottom: theme.spacing.sm,
  },
  panelReachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
    paddingVertical: 2,
  },
  panelReachText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.textSecondary,
    flex: 1,
    marginRight: 6,
  },
  panelButtonContainer: {
    width: '100%',
  },
  panelFullWidthBtn: {
    height: 52,
    borderRadius: theme.radius.pill,
  },
  // Sheet Styles
  sheetBody: {
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  sheetSummaryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  sheetStatBox: {
    flex: 1,
    backgroundColor: theme.colors.surfaceRaised,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  sheetStatVal: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  sheetStatLbl: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  sheetReachMathCard: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: 8,
  },
  sheetReachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sheetReachTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  mathRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  mathLabel: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  mathValue: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  sheetDisclaimerText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.textSecondary,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 6,
  },
  // Skeleton Layout
  skeletonContainer: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  skeletonBody: {
    padding: theme.spacing.lg,
  },
  skeletonMargin: {
    marginBottom: theme.spacing.sm,
  },
  skeletonCreatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  skeletonDivider: {
    height: 1,
    backgroundColor: theme.colors.line,
    marginVertical: theme.spacing.md,
  },
});
