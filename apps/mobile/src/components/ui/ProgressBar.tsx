import React, { useEffect } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { theme } from '../../theme';

export interface ProgressBarProps extends ViewProps {
  /** Value between 0 and 1 (or 0 to 100 if percentMode is true) */
  progress?: number;
  /** Percentage value between 0 and 100 */
  value?: number;
  percentMode?: boolean;
  size?: 'sm' | 'md' | 'lg';
  height?: number;
  color?: string;
}

export function ProgressBar({
  progress,
  value,
  percentMode = false,
  size = 'md',
  height,
  color,
  style,
  ...rest
}: ProgressBarProps) {
  const resolvedHeight =
    height !== undefined
      ? height
      : size === 'sm'
        ? 4
        : size === 'lg'
          ? 12
          : 8;

  const rawVal = value !== undefined ? value : (progress ?? 0);
  const isPercent = value !== undefined || percentMode || rawVal > 1;

  // Normalize progress to 0-100%
  const normalizedProgress = isPercent
    ? Math.min(Math.max(rawVal, 0), 100)
    : Math.min(Math.max(rawVal * 100, 0), 100);

  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    animatedWidth.value = withTiming(normalizedProgress, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [normalizedProgress, animatedWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }));

  const fillColor =
    color || (normalizedProgress >= 100 ? theme.colors.success : theme.colors.primary600);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: normalizedProgress }}
      style={[styles.track, { height: resolvedHeight, borderRadius: resolvedHeight / 2 }, style]}
      {...rest}
    >
      <Animated.View
        style={[
          styles.fill,
          { height: resolvedHeight, borderRadius: resolvedHeight / 2, backgroundColor: fillColor },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: theme.colors.line,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
