import React from 'react';
import { StyleSheet, Text, View, Pressable, ViewProps } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme';

export const CREATION_STEPS = [
  'Basics',
  'Story',
  'Visuals',
  'Reach',
  'Submit',
] as const;

export type CreationStep = (typeof CREATION_STEPS)[number];

export interface StepIndicatorProps extends ViewProps {
  currentStepIndex?: number; // 0 to 4
  currentStep?: number; // 1 to 5
  onStepPress?: (step: number) => void;
  showStepName?: boolean;
}

export function StepIndicator({
  currentStepIndex,
  currentStep,
  onStepPress,
  showStepName = true,
  style,
  ...rest
}: StepIndicatorProps) {
  const isOneIndexed = currentStep !== undefined && currentStepIndex === undefined;
  const activeIndex =
    currentStepIndex !== undefined
      ? currentStepIndex
      : currentStep !== undefined
        ? currentStep - 1
        : 0;

  const currentStepName = CREATION_STEPS[activeIndex] ?? 'Step';

  const handlePress = (index: number) => {
    // Only allow tapping steps that are already completed
    if (index < activeIndex && onStepPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onStepPress(isOneIndexed ? index + 1 : index);
    }
  };

  return (
    <View style={[styles.container, style]} {...rest}>
      {/* Step Label Header */}
      {showStepName && (
        <View style={styles.headerRow}>
          <Text style={styles.stepCounterText}>
            STEP {activeIndex + 1} OF {CREATION_STEPS.length}
          </Text>
          <Text style={styles.stepTitleText}>{currentStepName}</Text>
        </View>
      )}

      {/* 5-Segment Progress Bar */}
      <View style={styles.segmentsRow}>
        {CREATION_STEPS.map((step, index) => {
          const isDone = index < activeIndex;
          const isCurrent = index === activeIndex;
          const isTappable = isDone && Boolean(onStepPress);

          return (
            <Pressable
              key={step}
              accessibilityRole="button"
              accessibilityLabel={`Step ${index + 1} of ${CREATION_STEPS.length}: ${step}, ${
                isDone ? 'completed' : isCurrent ? 'current' : 'upcoming'
              }`}
              disabled={!isTappable}
              onPress={() => handlePress(index)}
              style={styles.segmentTouch}
              hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }}
            >
              <View
                style={[
                  styles.segmentBar,
                  (isDone || isCurrent) ? styles.segmentActive : styles.segmentInactive,
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
    backgroundColor: theme.colors.bg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  stepCounterText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 12,
    letterSpacing: 0.8,
    color: theme.colors.lime,
  },
  stepTitleText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  segmentsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  segmentTouch: {
    flex: 1,
    height: 12,
    justifyContent: 'center',
  },
  segmentBar: {
    height: 4,
    borderRadius: 2,
    width: '100%',
  },
  segmentActive: {
    backgroundColor: theme.colors.lime,
  },
  segmentInactive: {
    backgroundColor: theme.colors.surfaceRaised,
  },
});
