import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Mic,
  MicOff,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Lightbulb,
  CheckCircle2,
  Volume2,
} from 'lucide-react-native';
import { theme } from '../../theme';
import { SharedHeader } from '../../components/layout/SharedHeader';
import { Card, Button, useToast } from '../../components/ui';
import { useCreateDraft, useAiDraftBasics } from '../../api';
import { useDraftStore } from '../../store/draftStore';
import { useAuthStore } from '../../store/authStore';
import { useRequireAuth } from '../../auth/requireAuth';

const SAMPLE_PROMPTS = [
  {
    title: 'River Water Restoration',
    category: 'Environment',
    text: 'We tested the municipal river and found heavy industrial runoff. We need to fund digital ads reaching 50,000 residents across the county to demand immediate enforcement by the environmental council.',
  },
  {
    title: 'Historic Theater Preservation',
    category: 'Arts & Culture',
    text: 'Our 95-year-old downtown theater is facing demolition for a parking garage. We want to run targeted video ads across social feeds to gather 10,000 public signatures for historic landmark status.',
  },
  {
    title: 'Free Youth Robotics Workshop',
    category: 'Education',
    text: 'Our local makerspace is hosting 10 weeks of free weekend STEM and coding classes for underserved middle schoolers. We want to promote this opportunity to parents throughout the school district.',
  },
];

export default function VoiceIntakeScreen() {
  const router = useRouter();
  const toast = useToast();
  const isReducedMotion = useReducedMotion();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { requireAuth } = useRequireAuth();

  const createDraftMutation = useCreateDraft();
  const aiDraftBasicsMutation = useAiDraftBasics();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isStructuring, setIsStructuring] = useState(false);

  // Reanimated recording pulse
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isRecording) {
      if (!isReducedMotion) {
        pulseScale.value = withRepeat(
          withSequence(
            withTiming(1.25, { duration: 700, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        );
        pulseOpacity.value = withRepeat(
          withSequence(
            withTiming(0.2, { duration: 700, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.7, { duration: 700, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        );
      }

      timer = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
      pulseOpacity.value = withTiming(0.6, { duration: 200 });
      if (timer) clearInterval(timer);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording, isReducedMotion, pulseScale, pulseOpacity]);

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const handleToggleRecord = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (!isRecording) {
      setIsRecording(true);
      if (!transcript) {
        setTranscript('Our community initiative aims to amplify this vital public interest message...');
      }
    } else {
      setIsRecording(false);
    }
  };

  const handleSelectSample = (sample: typeof SAMPLE_PROMPTS[number]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsRecording(false);
    setTranscript(sample.text);
    toast.info(`Loaded sample: ${sample.title}`);
  };

  const handleClearTranscript = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setTranscript('');
    setRecordingSeconds(0);
    setIsRecording(false);
  };

  const executeStructuring = async () => {
    if (!transcript.trim()) {
      toast.error('Please speak or type your campaign thoughts first.');
      return;
    }

    setIsStructuring(true);
    try {
      // 1. Create real database draft
      const newDraft = await createDraftMutation.mutateAsync();

      // 2. Call AI structuring engine
      const aiResult = await aiDraftBasicsMutation.mutateAsync({
        notes: transcript.trim(),
        topic: transcript.trim().slice(0, 80),
      });

      // 3. Seed draft into Zustand store and trigger immediate save
      useDraftStore.getState().setActiveDraft(newDraft.id, newDraft);
      useDraftStore.getState().updateDraftFields(
        {
          title: aiResult.title || transcript.slice(0, 60),
          summary: aiResult.summary || transcript.slice(0, 180),
          category: aiResult.category || 'Community',
        },
        { draftId: newDraft.id }
      );
      await useDraftStore.getState().saveDraftNow(newDraft.id);

      toast.success('Campaign initialized from your voice notes!');
      router.replace(`/create/${newDraft.id}/basics` as Href);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to structure voice notes';
      toast.error(msg);
    } finally {
      setIsStructuring(false);
    }
  };

  const handleStructureIntoCampaign = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (!isAuthenticated) {
      requireAuth({
        reason: 'Sign in to structure your voice notes into a saved campaign draft.',
        returnTo: '/create/voice',
        onAuthenticated: () => executeStructuring(),
      });
      return;
    }
    executeStructuring();
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <SharedHeader
          title="Voice Intake & Structuring"
          subtitle="Speak Your Campaign Idea"
          fallbackRoute="/(tabs)/create"
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. Voice Record Visualizer */}
          <View style={styles.visualizerCard}>
            <View style={styles.micCircleWrapper}>
              {isRecording && (
                <Animated.View style={[styles.pulseRing, animatedPulseStyle]} />
              )}
              <Pressable
                onPress={handleToggleRecord}
                accessibilityRole="button"
                accessibilityLabel={isRecording ? 'Stop recording voice' : 'Start speaking campaign idea'}
                accessibilityState={{ selected: isRecording }}
                style={({ pressed }) => [
                  styles.micButton,
                  isRecording && styles.micButtonRecording,
                  pressed && styles.micButtonPressed,
                ]}
              >
                {isRecording ? (
                  <MicOff size={36} color={theme.colors.lime} />
                ) : (
                  <Mic size={36} color={theme.colors.onLime} />
                )}
              </Pressable>
            </View>

            <View style={styles.statusBlock}>
              <Text style={styles.statusHeading}>
                {isRecording ? 'Listening to your thoughts...' : 'Tap the microphone to speak'}
              </Text>
              <Text style={styles.statusSubtitle}>
                {isRecording
                  ? `Recording in progress · ${formatTimer(recordingSeconds)}`
                  : 'Describe the problem, why it matters, and who needs to hear it.'}
              </Text>
            </View>

            {isRecording && (
              <View style={styles.waveformRow}>
                {[12, 28, 44, 20, 36, 16, 32, 24].map((h, i) => (
                  <View
                    key={i}
                    style={[
                      styles.waveBar,
                      { height: h + (recordingSeconds % 2 === 0 ? 6 : -4) },
                    ]}
                  />
                ))}
              </View>
            )}
          </View>

          {/* 2. Sample In-App Prompts */}
          <View style={styles.sampleSection}>
            <View style={styles.sampleHeader}>
              <Lightbulb size={16} color={theme.colors.lime} />
              <Text style={styles.sampleTitle}>Or try a sample inspiration:</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sampleChipsRow}
            >
              {SAMPLE_PROMPTS.map((prompt, i) => (
                <Pressable
                  key={i}
                  onPress={() => handleSelectSample(prompt)}
                  accessibilityRole="button"
                  accessibilityLabel={`Load sample idea: ${prompt.title}`}
                  style={({ pressed }) => [
                    styles.sampleChip,
                    pressed && styles.sampleChipPressed,
                  ]}
                >
                  <Text style={styles.sampleChipCategory}>{prompt.category}</Text>
                  <Text style={styles.sampleChipText}>{prompt.title}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* 3. Live Transcript & Editor */}
          <Card style={styles.transcriptCard}>
            <View style={styles.transcriptHeader}>
              <View style={styles.transcriptTitleCol}>
                <View style={styles.transcriptTitleRow}>
                  <Volume2 size={16} color={theme.colors.textPrimary} />
                  <Text style={styles.transcriptTitle}>Spoken Notes & Narrative</Text>
                </View>
                <Text style={styles.transcriptHint}>
                  Edit or type directly below before structuring.
                </Text>
              </View>

              {transcript.length > 0 && (
                <Pressable
                  onPress={handleClearTranscript}
                  accessibilityRole="button"
                  accessibilityLabel="Clear spoken notes"
                  hitSlop={8}
                  style={styles.clearBtn}
                >
                  <RotateCcw size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.clearBtnText}>Clear</Text>
                </Pressable>
              )}
            </View>

            <TextInput
              style={styles.transcriptInput}
              value={transcript}
              onChangeText={setTranscript}
              placeholder="Your transcribed thoughts will appear here as you speak, or you can type directly..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Spoken notes transcript"
            />

            <View style={styles.transcriptFooter}>
              <Text style={styles.charCountText}>
                {transcript.length} characters
              </Text>
              {transcript.trim().length >= 20 && (
                <View style={styles.readyBadge}>
                  <CheckCircle2 size={13} color={theme.colors.lime} />
                  <Text style={styles.readyBadgeText}>Ready to structure</Text>
                </View>
              )}
            </View>
          </Card>

          {/* 4. Primary Structuring Action */}
          <View style={styles.actionContainer}>
            <Button
              title="Structure into Campaign Draft"
              variant="primary"
              size="lg"
              fullWidth
              loading={isStructuring || createDraftMutation.isPending || aiDraftBasicsMutation.isPending}
              disabled={transcript.trim().length < 15 || isStructuring}
              iconLeft={<Sparkles size={18} color={theme.colors.onLime} />}
              iconRight={<ArrowRight size={18} color={theme.colors.onLime} />}
              onPress={handleStructureIntoCampaign}
            />

            <Text style={styles.explanationText}>
              The AI structuring engine synthesizes your notes into an editorial title, summary,
              and category. You remain in complete control and will review every step.
            </Text>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.base,
    gap: theme.spacing.base,
    paddingBottom: 48,
  },
  visualizerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  micCircleWrapper: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: theme.spacing.md,
  },
  pulseRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.tintedPillBg,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  micButtonRecording: {
    backgroundColor: theme.colors.tintedPillBg,
    borderWidth: 2,
    borderColor: theme.colors.lime,
  },
  micButtonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  statusBlock: {
    alignItems: 'center',
    textAlign: 'center',
  },
  statusHeading: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 18,
    color: theme.colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  statusSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.md,
    height: 50,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.lime,
  },
  sampleSection: {
    gap: theme.spacing.xs,
  },
  sampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: 2,
  },
  sampleTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  sampleChipsRow: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  sampleChip: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    maxWidth: 240,
  },
  sampleChipPressed: {
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.lime,
  },
  sampleChipCategory: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 10,
    color: theme.colors.lime,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  sampleChipText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  transcriptCard: {
    padding: theme.spacing.base,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  transcriptTitleCol: {
    flex: 1,
  },
  transcriptTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transcriptTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  transcriptHint: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
  },
  clearBtnText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  transcriptInput: {
    minHeight: 120,
    maxHeight: 220,
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.radius.input,
    padding: theme.spacing.md,
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 15,
    color: theme.colors.textPrimary,
    lineHeight: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  transcriptFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
  },
  charCountText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readyBadgeText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.lime,
  },
  actionContainer: {
    gap: theme.spacing.sm,
  },
  explanationText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: theme.spacing.md,
  },
});
