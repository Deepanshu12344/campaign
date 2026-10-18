import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import {
  PlusCircle,
  Mic,
  FileEdit,
  Trash2,
  Clock,
  ArrowRight,
  Layers,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme';
import { SharedHeader } from '../../components/layout/SharedHeader';
import {
  Card,
  Button,
  Sheet,
  Skeleton,
  EmptyState,
  useToast,
} from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { useRequireAuth } from '../../auth/requireAuth';
import { useMyCampaigns, useCreateDraft, useDeleteDraft } from '../../api';
import { useDraftStore } from '../../store/draftStore';
import { CampaignCardDto } from '@campaigns/shared';

export default function CreateTabScreen() {
  const router = useRouter();
  const toast = useToast();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { requireAuth } = useRequireAuth();

  const createDraftMutation = useCreateDraft();
  const deleteDraftMutation = useDeleteDraft();
  const removeLocalDraft = useDraftStore((s) => s.removeDraft);

  // Drafts query
  const {
    data: myCampaigns,
    isLoading: isLoadingDrafts,
    refetch: refetchDrafts,
  } = useMyCampaigns(undefined);

  // Filter for drafts and changes requested
  const drafts = (myCampaigns || []).filter(
    (c) => c.status === 'DRAFT' || c.status === 'CHANGES_REQUESTED'
  );

  // Delete draft confirmation modal state
  const [draftToDelete, setDraftToDelete] = useState<CampaignCardDto | null>(null);

  const handleStartManual = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (!isAuthenticated) {
      requireAuth({
        reason: 'Sign in to start creating a campaign and save your progress.',
        returnTo: '/(tabs)/create',
        onAuthenticated: () => executeCreateManual(),
      });
      return;
    }
    executeCreateManual();
  };

  const executeCreateManual = async () => {
    try {
      const newDraft = await createDraftMutation.mutateAsync();
      router.push(`/create/${newDraft.id}/basics` as Href);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to initialize draft';
      toast.error(msg);
    }
  };

  const handleStartVoice = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (!isAuthenticated) {
      requireAuth({
        reason: 'Sign in to speak your campaign idea and generate a draft.',
        returnTo: '/create/voice',
        onAuthenticated: () => {
          router.push('/create/voice' as Href);
        },
      });
      return;
    }
    router.push('/create/voice' as Href);
  };

  const handleResumeDraft = (draftId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(`/create/${draftId}/basics` as Href);
  };

  const handleConfirmDelete = async () => {
    if (!draftToDelete) return;
    try {
      await deleteDraftMutation.mutateAsync(draftToDelete.id);
      removeLocalDraft(draftToDelete.id);
      toast.info('Draft deleted');
      setDraftToDelete(null);
      refetchDrafts();
    } catch {
      toast.error('Unable to delete draft');
    }
  };

  return (
    <View style={styles.container}>
      <SharedHeader title="Create Campaign" showBack={false} showAvatar={true} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Create Manually Option Card */}
        <Card style={styles.optionCard}>
          <View style={styles.optionHeader}>
            <View style={styles.optionIconCircle}>
              <PlusCircle size={22} color={theme.colors.lime} />
            </View>
            <View style={styles.optionTextCol}>
              <Text style={styles.optionTitle}>Create Manually</Text>
              <Text style={styles.optionBadgeText}>5 Guided Steps</Text>
            </View>
          </View>

          <Text style={styles.optionDescription}>
            Follow the guided step-by-step form: Basics, Story, Visuals, Reach, and
            Submit. Review the preview before publishing.
          </Text>

          <Button
            title="Start Step-by-Step"
            variant="primary"
            size="lg"
            fullWidth
            loading={createDraftMutation.isPending}
            onPress={handleStartManual}
            style={styles.optionButton}
          />
        </Card>

        {/* 2. Create with Voice Option Card */}
        <Card style={styles.optionCard}>
          <View style={styles.optionHeader}>
            <View style={styles.optionIconCircle}>
              <Mic size={22} color={theme.colors.lime} />
            </View>
            <View style={styles.optionTextCol}>
              <Text style={styles.optionTitle}>Create with Your Voice</Text>
              <Text style={styles.optionBadgeText}>Voice Intake & AI</Text>
            </View>
          </View>

          <Text style={styles.optionDescription}>
            Describe your idea aloud. The intake engine organizes your thoughts into structured story blocks.
          </Text>

          <Button
            title="Start with Voice"
            variant="secondary"
            size="lg"
            fullWidth
            onPress={handleStartVoice}
            style={styles.optionButton}
          />
        </Card>

        {/* 3. Resume Saved Drafts Section */}
        <View style={styles.draftsSection}>
          <View style={styles.draftsSectionHeader}>
            <View style={styles.draftsTitleRow}>
              <FileEdit size={16} color={theme.colors.textSecondary} />
              <Text style={styles.draftsSectionTitle}>Resume a Saved Draft</Text>
            </View>
            {drafts.length > 0 && (
              <View style={styles.draftCountPill}>
                <Text style={styles.draftCountText}>{drafts.length}</Text>
              </View>
            )}
          </View>

          {isLoadingDrafts ? (
            <View style={styles.loadingDraftsBox}>
              <Skeleton height={90} width="100%" borderRadius={theme.radius.card} style={{ marginBottom: 10 }} />
              <Skeleton height={90} width="100%" borderRadius={theme.radius.card} />
            </View>
          ) : drafts.length > 0 ? (
            <View style={styles.draftsList}>
              {drafts.map((d) => (
                <Card key={d.id} style={styles.draftCard}>
                  <View style={styles.draftCardTop}>
                    <View style={styles.draftMetaCol}>
                      <Text style={styles.draftTitle} numberOfLines={1}>
                        {d.title || 'Untitled campaign'}
                      </Text>
                      <View style={styles.draftSubRow}>
                        <View style={styles.stepProgressPill}>
                          <Text style={styles.stepProgressText}>In Progress</Text>
                        </View>
                        <Text style={styles.bulletSeparator}>•</Text>
                        <Clock size={12} color={theme.colors.textSecondary} style={{ marginRight: 3 }} />
                        <Text style={styles.draftTimeText}>
                          {formatRelativeTime(
                            (d as unknown as { updatedAt?: string | Date; createdAt?: string | Date }).updatedAt ||
                            (d as unknown as { updatedAt?: string | Date; createdAt?: string | Date }).createdAt
                          )}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Delete draft"
                      onPress={() => setDraftToDelete(d)}
                      style={styles.deleteDraftBtn}
                      hitSlop={8}
                    >
                      <Trash2 size={16} color={theme.colors.textSecondary} />
                    </Pressable>
                  </View>

                  <View style={styles.draftCardBottom}>
                    <Button
                      title="Continue"
                      variant="secondary"
                      size="sm"
                      iconRight={<ArrowRight size={14} color={theme.colors.lime} />}
                      onPress={() => handleResumeDraft(d.id)}
                    />
                  </View>
                </Card>
              ))}
            </View>
          ) : (
            <EmptyState
              title="No saved drafts"
              description="Your work-in-progress campaigns will be saved here automatically so you can pick up where you left off."
              icon={<Layers size={32} color={theme.colors.textSecondary} />}
            />
          )}
        </View>
      </ScrollView>

      {/* Delete Draft Confirmation Sheet */}
      <Sheet
        visible={Boolean(draftToDelete)}
        onClose={() => setDraftToDelete(null)}
        title="Delete Draft Campaign?"
      >
        <View style={styles.deleteModalBody}>
          <Text style={styles.deleteModalText}>
            Are you sure you want to delete{' '}
            <Text style={{ fontFamily: theme.typography.fonts.uiBold, color: theme.colors.textPrimary }}>
              "{draftToDelete?.title || 'Untitled campaign'}"
            </Text>
            ? This action cannot be undone.
          </Text>

          <View style={styles.deleteModalActions}>
            <Button
              title="Delete Draft"
              variant="danger"
              size="lg"
              fullWidth
              loading={deleteDraftMutation.isPending}
              onPress={handleConfirmDelete}
            />
            <Button
              title="Cancel"
              variant="ghost"
              size="md"
              fullWidth
              onPress={() => setDraftToDelete(null)}
            />
          </View>
        </View>
      </Sheet>
    </View>
  );
}

function formatRelativeTime(dateStr?: Date | string | null): string {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollContent: {
    padding: theme.spacing.base,
    gap: theme.spacing.base,
    paddingBottom: 40,
  },
  optionCard: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.card,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  optionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextCol: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 17,
    color: theme.colors.textPrimary,
  },
  optionBadgeText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  optionDescription: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.base,
  },
  optionButton: {
    marginTop: 2,
  },
  draftsSection: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  draftsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  draftsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  draftsSectionTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  draftCountPill: {
    backgroundColor: theme.colors.tintedPillBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  draftCountText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 12,
    color: theme.colors.lime,
  },
  loadingDraftsBox: {
    gap: 8,
  },
  draftsList: {
    gap: theme.spacing.sm,
  },
  draftCard: {
    padding: theme.spacing.base,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.card,
  },
  draftCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  draftMetaCol: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  draftTitle: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 15,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  draftSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepProgressPill: {
    backgroundColor: theme.colors.surfaceRaised,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  stepProgressText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  bulletSeparator: {
    marginHorizontal: 6,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  draftTimeText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  deleteDraftBtn: {
    padding: 6,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceRaised,
  },
  draftCardBottom: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    paddingTop: theme.spacing.xs,
  },
  deleteModalBody: {
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.base,
  },
  deleteModalText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  deleteModalActions: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
});
