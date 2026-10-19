import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
} from 'react-native';
import {
  Slot,
  useLocalSearchParams,
  usePathname,
  useRouter,
  Href,
} from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Save,
  CheckCircle2,
  CloudOff,
  RefreshCw,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useDraftStore, SyncStatus } from '../../../store/draftStore';
import { useAuthStore } from '../../../store/authStore';
import { useCampaign } from '../../../api';
import { StepIndicator, Button, useToast, Sheet } from '../../../components/ui';
import { theme } from '../../../theme';

const STEP_PATHS = [
  'basics',
  'story',
  'visuals',
  'reach',
  'submit',
] as const;

export default function CreationLayout() {
  const { draftId, returnTo } = useLocalSearchParams<{ draftId: string; returnTo?: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [exitSheetVisible, setExitSheetVisible] = useState(false);

  // Draft store
  const setActiveDraft = useDraftStore((s) => s.setActiveDraft);
  const saveDraftNow = useDraftStore((s) => s.saveDraftNow);
  const isSubmitting = useDraftStore((s) => s.isSubmitting);
  const syncStatus = useDraftStore((s) => s.syncStatus[draftId as string] || 'idle');

  // Fetch from server to seed or update
  const { data: serverDraft } = useCampaign(draftId as string);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/(tabs)/create' as Href);
    }
  }, [isHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (draftId && isAuthenticated) {
      setActiveDraft(draftId, serverDraft);
    }
  }, [draftId, serverDraft, setActiveDraft, isAuthenticated]);

  // Determine current route mode & step
  const isPreview = pathname.endsWith('/preview');
  const isSubmitted = pathname.endsWith('/submitted');
  const currentStepName = STEP_PATHS.find((step) => pathname.endsWith(`/${step}`)) || 'basics';
  const currentStepIndex = STEP_PATHS.indexOf(currentStepName);

  // Read-only guard: Once submitted (status !== 'DRAFT' && status !== 'CHANGES_REQUESTED'), redirect to submitted screen
  useEffect(() => {
    if (
      serverDraft?.status &&
      serverDraft.status !== 'DRAFT' &&
      serverDraft.status !== 'CHANGES_REQUESTED'
    ) {
      if (!isSubmitted) {
        router.replace(`/create/${draftId}/submitted` as Href);
      }
    }
  }, [serverDraft?.status, isSubmitted, draftId, router]);

  // Navigate between steps
  const handleStepPress = (targetStepNumber: number) => {
    const targetIdx = targetStepNumber - 1;
    if (targetIdx >= 0 && targetIdx < STEP_PATHS.length) {
      const targetStep = STEP_PATHS[targetIdx];
      router.push(`/create/${draftId}/${targetStep}` as Href);
    }
  };

  const handleManualSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const success = await saveDraftNow(draftId as string);
    if (success) {
      toast.success('Draft saved');
    } else {
      toast.warning('Draft saved locally (offline)');
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (isSubmitted) {
      router.replace('/(tabs)/create' as Href);
      return;
    }

    if (returnTo === 'submit') {
      router.push(`/create/${draftId}/submit` as Href);
      return;
    }

    if (isPreview) {
      router.push(`/create/${draftId}/submit` as Href);
      return;
    }

    if (currentStepIndex > 0) {
      const prevStep = STEP_PATHS[currentStepIndex - 1];
      router.push(`/create/${draftId}/${prevStep}` as Href);
      return;
    }

    // On Step 1: prompt before exiting
    setExitSheetVisible(true);
  };

  const handleConfirmExit = async () => {
    setExitSheetVisible(false);
    await saveDraftNow(draftId as string);
    router.replace('/(tabs)/create' as Href);
  };

  return (
    <View style={styles.container}>
      {/* Persistent Creation Top Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerTopRow}>
          {/* Back Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={handleBack}
            style={styles.headerIconButton}
            hitSlop={10}
          >
            <ChevronLeft size={22} color={theme.colors.textPrimary} />
          </Pressable>

          {/* Save Indicator */}
          <View style={styles.headerCenterInfo}>
            <View style={styles.syncIndicatorRow}>
              {renderSyncIndicator(syncStatus)}
            </View>
          </View>

          {/* Action Menu: Save Draft & Exit */}
          <View style={styles.headerActionsRow}>
            {!isSubmitted && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save draft"
                onPress={handleManualSave}
                style={styles.saveDraftIconBtn}
                hitSlop={8}
              >
                <Save size={18} color={theme.colors.lime} />
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Exit"
              onPress={() => setExitSheetVisible(true)}
              style={styles.exitIconBtn}
              hitSlop={8}
            >
              <X size={20} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* 5-Step StepIndicator (visible during 5-step editing & preview) */}
        {!isSubmitted && (
          <StepIndicator
            currentStep={currentStepIndex >= 0 ? currentStepIndex + 1 : 1}
            onStepPress={handleStepPress}
            style={styles.stepIndicatorOverride}
          />
        )}
      </View>

      {/* Main Content Area */}
      <View style={styles.contentArea}>
        <Slot />
      </View>

      {/* Exit Confirmation Sheet */}
      <Sheet
        visible={exitSheetVisible}
        onClose={() => setExitSheetVisible(false)}
        title="Exit Campaign Creation?"
      >
        <View style={styles.exitSheetContent}>
          <Text style={styles.exitSheetText}>
            Your work is safely autosaved. You can resume editing this campaign anytime from the
            Create tab or your Creator Dashboard.
          </Text>

          <View style={styles.exitSheetButtons}>
            <Button
              title="Save & Exit to Create"
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleConfirmExit}
            />
            <Button
              title="Keep Editing"
              variant="ghost"
              size="md"
              fullWidth
              onPress={() => setExitSheetVisible(false)}
            />
          </View>
        </View>
      </Sheet>
    </View>
  );
}

function renderSyncIndicator(status: SyncStatus) {
  switch (status) {
    case 'saving':
      return (
        <View style={styles.syncRow}>
          <RefreshCw size={12} color={theme.colors.lime} />
          <Text style={[styles.syncText, { color: theme.colors.lime }]}>Saving...</Text>
        </View>
      );
    case 'saved':
      return (
        <View style={styles.syncRow}>
          <CheckCircle2 size={12} color={theme.colors.lime} />
          <Text style={[styles.syncText, { color: theme.colors.lime }]}>Saved just now</Text>
        </View>
      );
    case 'offline_pending':
      return (
        <View style={styles.syncRow}>
          <CloudOff size={12} color={theme.colors.textSecondary} />
          <Text style={[styles.syncText, { color: theme.colors.textSecondary }]}>Offline - will sync</Text>
        </View>
      );
    case 'error':
      return (
        <View style={styles.syncRow}>
          <CloudOff size={12} color={theme.colors.textPrimary} />
          <Text style={[styles.syncText, { color: theme.colors.textPrimary }]}>Save failed</Text>
        </View>
      );
    case 'idle':
    default:
      return (
        <View style={styles.syncRow}>
          <CheckCircle2 size={12} color={theme.colors.textSecondary} />
          <Text style={[styles.syncText, { color: theme.colors.textSecondary }]}>Auto-save active</Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  headerContainer: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
    ...theme.shadows.card,
    zIndex: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.base,
    paddingBottom: theme.spacing.xs,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceRaised,
  },
  headerCenterInfo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncIndicatorRow: {
    minHeight: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  syncText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveDraftIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicatorOverride: {
    borderBottomWidth: 0,
    paddingTop: 4,
    paddingBottom: theme.spacing.sm,
  },
  contentArea: {
    flex: 1,
  },
  exitSheetContent: {
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.base,
  },
  exitSheetText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  exitSheetButtons: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
});
