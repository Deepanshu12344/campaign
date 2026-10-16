import React from 'react';
import { StyleSheet, Text, View, Pressable, ViewProps } from 'react-native';
import { Check } from 'lucide-react-native';
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
}

export function StepIndicator({
  currentStepIndex,
  currentStep,
  onStepPress,
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

  const handlePress = (index: number) => {
    // Only allow tapping steps that are already completed
    if (index < activeIndex && onStepPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onStepPress(isOneIndexed ? index + 1 : index);
    }
  };

  return (
    <View style={[styles.container, style]} {...rest}>
      <View style={styles.stepsRow}>
        {CREATION_STEPS.map((step, index) => {
          const isDone = index < activeIndex;
          const isCurrent = index === activeIndex;
          const isTappable = isDone && Boolean(onStepPress);

          return (
            <React.Fragment key={step}>
              {/* Connector line between steps */}
              {index > 0 && (
                <View
                  style={[
                    styles.connector,
                    index <= activeIndex
                      ? styles.connectorActive
                      : styles.connectorInactive,
                  ]}
                />
              )}

              {/* Step circle & label */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Step ${index + 1}: ${step}, ${
                  isDone ? 'completed' : isCurrent ? 'current' : 'upcoming'
                }`}
                disabled={!isTappable}
                onPress={() => handlePress(index)}
                style={styles.stepItem}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <View
                  style={[
                    styles.circle,
                    isDone && styles.circleDone,
                    isCurrent && styles.circleCurrent,
                    !isDone && !isCurrent && styles.circleUpcoming,
                  ]}
                >
                  {isDone ? (
                    <Check size={12} color="#FFFFFF" strokeWidth={3} />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        isCurrent && styles.stepNumberCurrent,
                      ]}
                    >
                      {index + 1}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    isCurrent && styles.stepLabelCurrent,
                    isDone && styles.stepLabelDone,
                  ]}
                  numberOfLines={1}
                >
                  {step}
                </Text>
              </Pressable>
            </React.Fragment>
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
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connector: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
    marginBottom: 16, // Align with circles
  },
  connectorActive: {
    backgroundColor: theme.colors.primary600,
  },
  connectorInactive: {
    backgroundColor: theme.colors.line,
  },
  stepItem: {
    alignItems: 'center',
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  circleDone: {
    backgroundColor: theme.colors.primary600,
  },
  circleCurrent: {
    backgroundColor: theme.colors.primary600,
    borderWidth: 2,
    borderColor: theme.colors.primary50,
  },
  circleUpcoming: {
    backgroundColor: theme.colors.line,
  },
  stepNumber: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 11,
    color: theme.colors.ink500,
  },
  stepNumberCurrent: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
    lineHeight: 14,
    color: theme.colors.ink500,
  },
  stepLabelCurrent: {
    fontFamily: theme.typography.fonts.uiBold,
    color: theme.colors.primary600,
  },
  stepLabelDone: {
    color: theme.colors.ink700,
  },
});
