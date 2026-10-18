import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  MapPin,
  Target,
  DollarSign,
  CheckSquare,
  Square,
  X,
  History,
  Lock,
  Megaphone,
  Radio,
} from 'lucide-react-native';
import { theme } from '../../../theme';
import { SharedHeader } from '../../../components/layout/SharedHeader';
import { ReviewerBanner } from '../../../components/layout/ReviewerBanner';
import { ScreenState } from '../../../components/layout/ScreenState';
import {
  Card,
  Button,
  StatusPill,
  CategoryChip,
  TextArea,
  SourceItem,
} from '../../../components/ui';
import { StoryRenderer } from '../../../components/story/StoryRenderer';
import { useToast } from '../../../components/ui/Toast';
import { useAuthStore } from '../../../store/authStore';
import { useCampaign } from '../../../api/hooks/useCampaigns';
import {
  useAdminQueue,
  useAdminDecision,
  useAdminAudit,
} from '../../../api/hooks/useAdmin';
import { ReviewChecklist, isChecklistComplete } from '../../../utils/adminHelpers';
import { CampaignStatus, Category, StoryBlock, Source } from '@campaigns/shared';

export default function ReviewInspectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { user, isAuthenticated, isHydrated, signIn, isLoading: authLoading } = useAuthStore();

  const campaignId = Array.isArray(id) ? id[0] : id || '';

  // Data queries
  const { data: campaign, isLoading, isError, error, refetch } = useCampaign(campaignId);
  const queueQuery = useAdminQueue();
  const auditQuery = useAdminAudit(campaignId);
  const decisionMutation = useAdminDecision();

  const queueItem = (queueQuery.data || []).find((q) => q.id === campaignId);
  const isRevision = queueItem?.reviewType === 'PENDING_REVISION';

  // 4-item reviewer checklist
  const [checklist, setChecklist] = useState<ReviewChecklist>({
    contentChecked: false,
    sourcesChecked: false,
    creativeChecked: false,
    targetingChecked: false,
  });

  // Decision Modals
  const [activeModal, setActiveModal] = useState<'APPROVE' | 'CHANGES_REQUESTED' | 'REJECT' | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [notesError, setNotesError] = useState<string | null>(null);

  const isAdmin = isAuthenticated && user?.role === 'ADMIN';
  const canApprove = isChecklistComplete(checklist);

  const toggleCheck = (key: keyof ReviewChecklist) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleOpenDecisionModal = (type: 'APPROVE' | 'CHANGES_REQUESTED' | 'REJECT') => {
    setActiveModal(type);
    setDecisionNotes('');
    setNotesError(null);
  };

  const handleSubmitDecision = async () => {
    if (!activeModal) return;

    // Validate required notes for Changes Requested and Reject
    if (activeModal === 'CHANGES_REQUESTED' && !decisionNotes.trim()) {
      setNotesError('Notes for the creator explaining requested changes are required.');
      return;
    }
    if (activeModal === 'REJECT' && !decisionNotes.trim()) {
      setNotesError('A specific reason for rejection must be documented for compliance.');
      return;
    }

    try {
      await decisionMutation.mutateAsync({
        id: campaignId,
        input: {
          decision: activeModal,
          notes: decisionNotes.trim(),
        },
      });

      const messageMap = {
        APPROVE: 'Campaign approved! Open for public community funding.',
        CHANGES_REQUESTED: 'Changes requested. Returned to creator for revision.',
        REJECT: 'Campaign submission rejected.',
      };

      toast.success(messageMap[activeModal]);
      setActiveModal(null);
      router.replace('/demo/control');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to record review decision';
      toast.error(message);
    }
  };

  // Auth Gate: Not Hydrated
  if (!isHydrated) {
    return (
      <View style={styles.container}>
        <ReviewerBanner />
        <SharedHeader title="Campaign Inspection" fallbackRoute="/demo/control" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.lime} />
        </View>
      </View>
    );
  }

  // Auth Gate: Not Admin
  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <ReviewerBanner />
        <SharedHeader title="Campaign Inspection" fallbackRoute="/demo/control" />
        <View style={styles.centerContainer}>
          <Card style={styles.gateCard}>
            <Lock size={36} color={theme.colors.textSecondary} />
            <Text style={styles.gateTitle}>Reviewer Console Not Available</Text>
            <Text style={styles.gateBody}>
              This inspection screen requires ADMIN privileges. Sign in with the reviewer demo credentials.
            </Text>
            <Button
              title="Sign In as Admin (admin@demo.com)"
              variant="primary"
              size="md"
              fullWidth
              loading={authLoading}
              iconLeft={<ShieldCheck size={18} color={theme.colors.onLime} />}
              onPress={async () => {
                await signIn({ email: 'admin@demo.com', password: 'password123' });
                refetch();
              }}
            />
            <Button
              title="Return to Demo Control"
              variant="ghost"
              size="md"
              fullWidth
              onPress={() => router.replace('/demo/control')}
            />
          </Card>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ReviewerBanner />
      <SharedHeader title="Campaign Inspection" fallbackRoute="/demo/control" />

      <ScreenState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
      >
        {campaign && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header & Meta Summary Card */}
            <Card style={styles.card}>
              <View style={styles.headerRow}>
                <View style={styles.tagsRow}>
                  <CategoryChip category={campaign.category as Category} />
                  <View
                    style={[
                      styles.reviewTypeBadge,
                      isRevision ? styles.revisionBadge : styles.submissionBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.reviewTypeText,
                        isRevision ? styles.revisionText : styles.submissionText,
                      ]}
                    >
                      {isRevision ? 'Pending Revision' : 'New Submission'}
                    </Text>
                  </View>
                </View>
                <StatusPill status={campaign.status as CampaignStatus} />
              </View>

              <Text style={styles.campaignTitle}>{campaign.title}</Text>
              <Text style={styles.campaignSummary}>{campaign.summary}</Text>

              <View style={styles.metaBox}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Creator:</Text>
                  <Text style={styles.metaValue}>
                    {campaign.creatorName} ({campaign.creatorType})
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Submitted:</Text>
                  <Text style={styles.metaValue}>
                    {campaign.submittedAt
                      ? new Date(campaign.submittedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Recently'}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Campaign Visuals: Cover & Ad Visuals */}
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Cover & Ad Visuals</Text>
              <Text style={styles.sectionSubtitle}>
                Creator-provided imagery for explore feed, campaign hero, and advertising placements
              </Text>

              {campaign.coverUrl ? (
                <View style={styles.coverPreviewContainer}>
                  <Image
                    source={{ uri: campaign.coverUrl }}
                    style={styles.coverPreviewImage}
                    contentFit="cover"
                  />
                  <Text style={styles.imageCaption}>Hero Cover Visual</Text>
                </View>
              ) : (
                <View style={styles.noImagePlaceholder}>
                  <Text style={styles.noImageText}>No cover image provided</Text>
                </View>
              )}

              {Boolean(campaign.adCreative?.images?.length) && (
                <View style={styles.adImagesContainer}>
                  <Text style={styles.subSectionTitle}>Ad Creative Images ({campaign.adCreative?.images?.length})</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.adImagesScroll}>
                    {campaign.adCreative?.images?.map((imgUrl: string, idx: number) => (
                      <View key={idx} style={styles.adImageWrapper}>
                        <Image source={{ uri: imgUrl }} style={styles.adImage} contentFit="cover" />
                        <Text style={styles.adImageLabel}>Ad Slot #{idx + 1}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </Card>

            {/* Ad Copy & Creative Specification */}
            <Card style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <Megaphone size={18} color={theme.colors.lime} />
                <Text style={styles.sectionTitle}>Ad Copy & Creative Spec</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Copy and call-to-action presented to audience in sponsored placements
              </Text>

              <View style={styles.adCopyCard}>
                <View style={styles.adCopyItem}>
                  <Text style={styles.adCopyLabel}>Headline:</Text>
                  <Text style={styles.adCopyText}>
                    {campaign.adCreative?.headline || 'No ad headline specified'}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.adCopyItem}>
                  <Text style={styles.adCopyLabel}>Description:</Text>
                  <Text style={styles.adCopyText}>
                    {campaign.adCreative?.description || 'No ad description specified'}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.adCopyItem}>
                  <Text style={styles.adCopyLabel}>Call to Action:</Text>
                  <View style={styles.ctaPill}>
                    <Text style={styles.ctaText}>
                      {campaign.adCreative?.cta || 'Learn More'}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>

            {/* Story & Narrative */}
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Campaign Story</Text>
              <Text style={styles.sectionSubtitle}>
                Full narrative text, subheadings, and context submitted by creator
              </Text>
              <View style={styles.storyContainer}>
                <StoryRenderer
                  story={(campaign.story as unknown as StoryBlock[]) || []}
                  sources={(campaign.sources as unknown as Source[]) || []}
                  containerPaddingHorizontal={0}
                  showSources={false}
                />
              </View>
            </Card>

            {/* Sources & Citations */}
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Evidence & Verified Sources ({campaign.sources?.length || 0})</Text>
              <Text style={styles.sectionSubtitle}>
                External publisher references cited to substantiate campaign claims
              </Text>
              {campaign.sources && campaign.sources.length > 0 ? (
                <View style={styles.sourcesList}>
                  {campaign.sources.map((src: Source, idx: number) => (
                    <SourceItem
                      key={idx}
                      source={src}
                      verified={true}
                      onPress={async (url) => {
                        try {
                          await WebBrowser.openBrowserAsync(url);
                        } catch {
                          // ignore
                        }
                      }}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.emptySourcesBox}>
                  <Text style={styles.emptySourcesText}>No external citations provided for this campaign.</Text>
                </View>
              )}
            </Card>

            {/* Targeting & Distribution Channels */}
            <Card style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <Target size={18} color={theme.colors.lime} />
                <Text style={styles.sectionTitle}>Audience & Distribution Targeting</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Geographic and interest parameters chosen to reach interested communities
              </Text>

              <View style={styles.targetingBox}>
                <Text style={styles.targetHeading}>Target Locations:</Text>
                <View style={styles.chipsRow}>
                  {campaign.reach?.locations?.map((loc: string, idx: number) => (
                    <View key={idx} style={styles.targetChip}>
                      <MapPin size={12} color={theme.colors.lime} />
                      <Text style={styles.targetChipText}>{loc}</Text>
                    </View>
                  )) || <Text style={styles.emptyText}>Worldwide (No regional restrictions)</Text>}
                </View>

                <View style={styles.divider} />

                <Text style={styles.targetHeading}>Audience Themes & Interests:</Text>
                <View style={styles.chipsRow}>
                  {campaign.reach?.interests?.map((interest: string, idx: number) => (
                    <View key={idx} style={styles.interestChip}>
                      <Text style={styles.interestChipText}>{interest}</Text>
                    </View>
                  )) || <Text style={styles.emptyText}>Broad Audience (No special interests)</Text>}
                </View>

                <View style={styles.divider} />

                <Text style={styles.targetHeading}>Distribution Channels:</Text>
                <View style={styles.chipsRow}>
                  {campaign.reach?.channels?.map((channel: string, idx: number) => (
                    <View key={idx} style={styles.channelChip}>
                      <Radio size={12} color={theme.colors.textSecondary} />
                      <Text style={styles.channelChipText}>{channel}</Text>
                    </View>
                  )) || <Text style={styles.emptyText}>Standard Social & Search Feeds</Text>}
                </View>

                <View style={styles.divider} />

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Age Range:</Text>
                  <Text style={styles.metaValue}>
                    {campaign.reach?.ageRange || '18 - 65+ (Where supported)'}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Budget & Reach Estimates */}
            <Card style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <DollarSign size={18} color={theme.colors.lime} />
                <Text style={styles.sectionTitle}>Funding Goal & Budget Allocation</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Goal was explicitly entered by the creator in Step 5 (never generated or prefilled)
              </Text>

              <View style={styles.budgetGrid}>
                <View style={styles.budgetItem}>
                  <Text style={styles.budgetLabel}>Creator-Set Funding Goal</Text>
                  <Text style={styles.budgetValueLarge}>
                    ${(campaign.fundingGoalCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={styles.budgetItem}>
                  <Text style={styles.budgetLabel}>Estimated Reach at Goal</Text>
                  <Text style={styles.budgetValueLarge}>
                    ~{campaign.estimatedReachLow.toLocaleString()} - {campaign.estimatedReachHigh.toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={styles.allocationBox}>
                <Text style={styles.allocationTitle}>Proposed Use of Funds (Standard Policy):</Text>
                <View style={styles.allocationRow}>
                  <Text style={styles.allocationText}>• 90% Direct Ad Spend</Text>
                  <Text style={styles.allocationAmount}>
                    ${((campaign.fundingGoalCents * 0.9) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={styles.allocationRow}>
                  <Text style={styles.allocationText}>• 10% Platform & Processing Fee</Text>
                  <Text style={styles.allocationAmount}>
                    ${((campaign.fundingGoalCents * 0.1) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={styles.allocationRow}>
                  <Text style={styles.allocationText}>• Campaign Duration</Text>
                  <Text style={styles.allocationAmount}>{campaign.reach?.durationDays || 30} days</Text>
                </View>
              </View>
            </Card>

            {/* 4-Item Reviewer Checklist */}
            <Card style={styles.checklistCard}>
              <View style={styles.checklistHeader}>
                <ShieldCheck size={20} color={theme.colors.lime} />
                <Text style={styles.checklistTitle}>Compliance Verification Checklist</Text>
              </View>
              <Text style={styles.checklistSubtitle}>
                All 4 criteria must be examined and confirmed by the reviewer before approval is permitted.
              </Text>

              <View style={styles.checklistItems}>
                {/* 1. Content */}
                <Pressable
                  onPress={() => toggleCheck('contentChecked')}
                  style={styles.checkRow}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: checklist.contentChecked }}
                >
                  {checklist.contentChecked ? (
                    <CheckSquare size={22} color={theme.colors.lime} />
                  ) : (
                    <Square size={22} color={theme.colors.textSecondary} />
                  )}
                  <View style={styles.checkTextWrapper}>
                    <Text style={styles.checkItemTitle}>1. Editorial & Truthfulness Standards</Text>
                    <Text style={styles.checkItemDescription}>
                      Campaign story and core claims adhere to truthfulness and community guidelines.
                    </Text>
                  </View>
                </Pressable>

                {/* 2. Sources */}
                <Pressable
                  onPress={() => toggleCheck('sourcesChecked')}
                  style={styles.checkRow}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: checklist.sourcesChecked }}
                >
                  {checklist.sourcesChecked ? (
                    <CheckSquare size={22} color={theme.colors.lime} />
                  ) : (
                    <Square size={22} color={theme.colors.textSecondary} />
                  )}
                  <View style={styles.checkTextWrapper}>
                    <Text style={styles.checkItemTitle}>2. External Sources & Evidence</Text>
                    <Text style={styles.checkItemDescription}>
                      External documentation and publisher links are authentic and substantiated.
                    </Text>
                  </View>
                </Pressable>

                {/* 3. Creative */}
                <Pressable
                  onPress={() => toggleCheck('creativeChecked')}
                  style={styles.checkRow}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: checklist.creativeChecked }}
                >
                  {checklist.creativeChecked ? (
                    <CheckSquare size={22} color={theme.colors.lime} />
                  ) : (
                    <Square size={22} color={theme.colors.textSecondary} />
                  )}
                  <View style={styles.checkTextWrapper}>
                    <Text style={styles.checkItemTitle}>3. Ad Visuals & Copy Compliance</Text>
                    <Text style={styles.checkItemDescription}>
                      Ad headline, copy, and visual assets comply with digital advertising policies.
                    </Text>
                  </View>
                </Pressable>

                {/* 4. Targeting */}
                <Pressable
                  onPress={() => toggleCheck('targetingChecked')}
                  style={styles.checkRow}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: checklist.targetingChecked }}
                >
                  {checklist.targetingChecked ? (
                    <CheckSquare size={22} color={theme.colors.lime} />
                  ) : (
                    <Square size={22} color={theme.colors.textSecondary} />
                  )}
                  <View style={styles.checkTextWrapper}>
                    <Text style={styles.checkItemTitle}>4. Audience & Channel Targeting</Text>
                    <Text style={styles.checkItemDescription}>
                      Target regions, interest segments, and advertising channels are appropriate.
                    </Text>
                  </View>
                </Pressable>
              </View>

              {!canApprove && (
                <View style={styles.checklistAlert}>
                  <AlertCircle size={14} color={theme.colors.textPrimary} />
                  <Text style={styles.checklistAlertText}>
                    Approval is disabled until all 4 verification boxes are checked.
                  </Text>
                </View>
              )}
            </Card>

            {/* Reviewer Action Buttons */}
            <Card style={styles.actionCard}>
              <Text style={styles.actionCardTitle}>Reviewer Decision</Text>
              <Text style={styles.actionCardSubtitle}>
                Select an official action to record on this campaign submission
              </Text>

              <View style={styles.actionButtonsList}>
                <Button
                  title={isRevision ? 'Approve Revision' : 'Approve Campaign'}
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={!canApprove}
                  iconLeft={<CheckCircle2 size={18} color={canApprove ? theme.colors.onLime : theme.colors.textSecondary} />}
                  onPress={() => handleOpenDecisionModal('APPROVE')}
                />

                <Button
                  title="Request Changes from Creator"
                  variant="secondary"
                  size="md"
                  fullWidth
                  iconLeft={<Clock size={18} color={theme.colors.lime} />}
                  onPress={() => handleOpenDecisionModal('CHANGES_REQUESTED')}
                />

                <Button
                  title="Reject Submission"
                  variant="danger"
                  size="md"
                  fullWidth
                  iconLeft={<XCircle size={18} color={theme.colors.textPrimary} />}
                  onPress={() => handleOpenDecisionModal('REJECT')}
                />
              </View>
            </Card>

            {/* Audit Trail Section */}
            <Card style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <History size={18} color={theme.colors.lime} />
                <Text style={styles.sectionTitle}>Campaign Audit Log</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Immutable record of reviewer decisions and lifecycle transitions
              </Text>

              {auditQuery.isLoading ? (
                <ActivityIndicator size="small" color={theme.colors.lime} style={{ marginVertical: 12 }} />
              ) : (
                <View style={styles.auditContainer}>
                  <Text style={styles.auditSubHeading}>Prior Review Decisions</Text>
                  {!auditQuery.data?.decisions?.length ? (
                    <Text style={styles.emptyText}>No prior decisions recorded.</Text>
                  ) : (
                    auditQuery.data.decisions.map((d) => (
                      <View key={d.id} style={styles.auditCard}>
                        <View style={styles.auditCardHeader}>
                          <Text style={styles.auditBadge}>{d.decision}</Text>
                          <Text style={styles.auditDate}>
                            {new Date(d.createdAt).toLocaleDateString()} {new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        <Text style={styles.auditReviewer}>Reviewer: {d.reviewerName}</Text>
                        {d.notes && <Text style={styles.auditNotes}>"{d.notes}"</Text>}
                      </View>
                    ))
                  )}

                  <Text style={[styles.auditSubHeading, { marginTop: theme.spacing.base }]}>Lifecycle Events</Text>
                  {!auditQuery.data?.events?.length ? (
                    <Text style={styles.emptyText}>No events recorded.</Text>
                  ) : (
                    auditQuery.data.events.map((e) => (
                      <View key={e.id} style={styles.auditCard}>
                        <View style={styles.auditCardHeader}>
                          <Text style={styles.auditEventBadge}>{e.type}</Text>
                          <Text style={styles.auditDate}>
                            {new Date(e.createdAt).toLocaleDateString()} {new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        {Boolean(e.payload) && (
                          <Text style={styles.auditPayload}>
                            {typeof e.payload === 'object' ? JSON.stringify(e.payload, null, 2) : String(e.payload)}
                          </Text>
                        )}
                      </View>
                    ))
                  )}
                </View>
              )}
            </Card>
          </ScrollView>
        )}
      </ScreenState>

      {/* Decision Modal */}
      <Modal
        visible={Boolean(activeModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeModal === 'APPROVE' && 'Approve Campaign'}
                {activeModal === 'CHANGES_REQUESTED' && 'Request Changes'}
                {activeModal === 'REJECT' && 'Reject Submission'}
              </Text>
              <Pressable
                onPress={() => setActiveModal(null)}
                hitSlop={8}
                style={styles.modalCloseButton}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.modalBody}>
              {activeModal === 'APPROVE' &&
                'Approving transitions the campaign to FUNDING status, making it live on Explore and open for public backer pledges.'}
              {activeModal === 'CHANGES_REQUESTED' &&
                'Returns the campaign to CHANGES_REQUESTED status. The creator will receive your feedback notes and can submit revisions.'}
              {activeModal === 'REJECT' &&
                'Rejection is final and closes this submission. A clear justification must be provided for audit purposes.'}
            </Text>

            <TextArea
              label={
                activeModal === 'APPROVE'
                  ? 'Reviewer Notes (Optional)'
                  : activeModal === 'CHANGES_REQUESTED'
                  ? 'Required Modification Notes *'
                  : 'Required Rejection Reason *'
              }
              placeholder={
                activeModal === 'APPROVE'
                  ? 'e.g., Reviewed and verified by compliance'
                  : activeModal === 'CHANGES_REQUESTED'
                  ? 'Explain what the creator needs to modify before approval...'
                  : 'State the policy or factual discrepancy causing rejection...'
              }
              value={decisionNotes}
              onChangeText={(text) => {
                setDecisionNotes(text);
                if (notesError) setNotesError(null);
              }}
              error={notesError || undefined}
              numberOfLines={4}
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="ghost"
                size="md"
                onPress={() => setActiveModal(null)}
              />
              <Button
                title={
                  activeModal === 'APPROVE'
                    ? 'Confirm Approval'
                    : activeModal === 'CHANGES_REQUESTED'
                    ? 'Submit Request'
                    : 'Confirm Rejection'
                }
                variant={activeModal === 'REJECT' ? 'danger' : 'primary'}
                size="md"
                loading={decisionMutation.isPending}
                onPress={handleSubmitDecision}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: theme.spacing['4xl'],
    gap: theme.spacing.base,
  },
  card: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  reviewTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  reviewTypeText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 11,
  },
  submissionBadge: {
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  submissionText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 11,
    color: theme.colors.textPrimary,
  },
  revisionBadge: {
    backgroundColor: theme.colors.tintedPillBg,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  revisionText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 11,
    color: theme.colors.lime,
  },
  campaignTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 20,
    lineHeight: 26,
    color: theme.colors.textPrimary,
  },
  campaignSummary: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  metaBox: {
    backgroundColor: theme.colors.surfaceRaised,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.input,
    gap: 4,
    marginTop: theme.spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLabel: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  metaValue: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textPrimary,
  },
  sectionTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 17,
    color: theme.colors.textPrimary,
  },
  sectionSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.textSecondary,
  },
  coverPreviewContainer: {
    borderRadius: theme.radius.card,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceRaised,
    marginTop: theme.spacing.xs,
  },
  coverPreviewImage: {
    width: '100%',
    height: 180,
  },
  imageCaption: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
    color: theme.colors.textSecondary,
    padding: 6,
    textAlign: 'center',
    backgroundColor: theme.colors.surface,
  },
  noImagePlaceholder: {
    height: 100,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  adImagesContainer: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  subSectionTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  adImagesScroll: {
    gap: theme.spacing.sm,
    paddingVertical: 4,
  },
  adImageWrapper: {
    borderRadius: theme.radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  adImage: {
    width: 140,
    height: 100,
  },
  adImageLabel: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 10,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 3,
    backgroundColor: theme.colors.surface,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adCopyCard: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.input,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  adCopyItem: {
    gap: 2,
  },
  adCopyLabel: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 11,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  adCopyText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  ctaPill: {
    backgroundColor: theme.colors.lime,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    marginTop: 2,
  },
  ctaText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 12,
    color: theme.colors.onLime,
  },
  storyContainer: {
    marginTop: theme.spacing.xs,
  },
  sourcesList: {
    marginTop: theme.spacing.xs,
  },
  emptySourcesBox: {
    backgroundColor: theme.colors.surfaceRaised,
    padding: theme.spacing.md,
    borderRadius: theme.radius.input,
  },
  emptySourcesText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  targetingBox: {
    backgroundColor: theme.colors.surfaceRaised,
    padding: theme.spacing.md,
    borderRadius: theme.radius.input,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  targetHeading: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    color: theme.colors.textPrimary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  targetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.tintedPillBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  targetChipText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
    color: theme.colors.lime,
  },
  interestChip: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  interestChipText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  channelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  channelChipText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  emptyText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
  budgetGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  budgetItem: {
    flex: 1,
    backgroundColor: theme.colors.surfaceRaised,
    padding: theme.spacing.md,
    borderRadius: theme.radius.input,
    gap: 4,
  },
  budgetLabel: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  budgetValueLarge: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 18,
    color: theme.colors.textPrimary,
  },
  allocationBox: {
    backgroundColor: theme.colors.surfaceRaised,
    padding: theme.spacing.md,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
    marginTop: theme.spacing.xs,
  },
  allocationTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  allocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  allocationText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  allocationAmount: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    color: theme.colors.textPrimary,
  },
  checklistCard: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceRaised,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  checklistTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 17,
    color: theme.colors.textPrimary,
  },
  checklistSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.textSecondary,
  },
  checklistItems: {
    gap: theme.spacing.md,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  checkTextWrapper: {
    flex: 1,
    gap: 2,
  },
  checkItemTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  checkItemDescription: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.textSecondary,
  },
  checklistAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: theme.colors.textPrimary,
    gap: 6,
  },
  checklistAlertText: {
    flex: 1,
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
    color: theme.colors.textPrimary,
  },
  actionCard: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  actionCardTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 17,
    color: theme.colors.textPrimary,
  },
  actionCardSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  actionButtonsList: {
    gap: theme.spacing.sm,
  },
  auditContainer: {
    marginTop: theme.spacing.xs,
  },
  auditSubHeading: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  auditCard: {
    backgroundColor: theme.colors.surfaceRaised,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xs,
    gap: 2,
  },
  auditCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  auditBadge: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 11,
    color: theme.colors.lime,
  },
  auditEventBadge: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 11,
    color: theme.colors.textPrimary,
  },
  auditDate: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  auditReviewer: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  auditNotes: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    fontStyle: 'italic',
    color: theme.colors.textSecondary,
  },
  auditPayload: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
    padding: 4,
    borderRadius: 4,
    marginTop: 2,
  },
  gateCard: {
    width: '100%',
    maxWidth: 420,
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  gateTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 18,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  gateBody: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 18,
    color: theme.colors.textPrimary,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
});
