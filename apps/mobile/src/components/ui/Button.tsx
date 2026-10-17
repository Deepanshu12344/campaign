import React from 'react';
import {
  StyleSheet,
  Text,
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  TextStyle,
  View,
  GestureResponderEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'lg' | 'md' | 'sm';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  title?: string;
  label?: string;
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  title,
  label,
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconLeft,
  iconRight,
  style,
  textStyle,
  onPress,
  ...rest
}: ButtonProps) {
  const resolvedTitle = title ?? label;
  const resolvedIconLeft = iconLeft ?? icon;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled && !loading) {
      scale.value = withTiming(theme.motion.pressScale, {
        duration: theme.motion.durationShort,
      });
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      scale.value = withTiming(1, {
        duration: theme.motion.durationShort,
      });
    }
  };

  const handlePress = (e: GestureResponderEvent) => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.(e);
  };

  const sizeStyle = {
    lg: styles.sizeLg,
    md: styles.sizeMd,
    sm: styles.sizeSm,
  }[size];

  const sizeTextStyle = {
    lg: styles.textLg,
    md: styles.textMd,
    sm: styles.textSm,
  }[size];

  const variantStyle = {
    primary: styles.variantPrimary,
    secondary: styles.variantSecondary,
    ghost: styles.variantGhost,
    danger: styles.variantDanger,
  }[variant];

  const variantTextStyle = {
    primary: styles.textPrimary,
    secondary: styles.textSecondary,
    ghost: styles.textGhost,
    danger: styles.textDanger,
  }[variant];

  const isInteractiveDisabled = disabled || loading;

  const content = children || (
    <Text
      style={[
        styles.baseText,
        sizeTextStyle,
        variantTextStyle,
        isInteractiveDisabled && styles.textDisabled,
        textStyle,
      ]}
    >
      {resolvedTitle}
    </Text>
  );

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isInteractiveDisabled, busy: loading }}
      disabled={isInteractiveDisabled}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.baseButton,
        sizeStyle,
        variantStyle,
        fullWidth && styles.fullWidth,
        isInteractiveDisabled && styles.buttonDisabled,
        animatedStyle,
        style,
      ]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : theme.colors.primary600}
        />
      ) : (
        <View style={styles.innerRow}>
          {resolvedIconLeft && <View style={styles.iconMargin}>{resolvedIconLeft}</View>}
          {content}
          {iconRight && <View style={styles.iconMargin}>{iconRight}</View>}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: theme.radius.input,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: theme.touchTargets.minTouchSize,
  },
  fullWidth: {
    width: '100%',
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconMargin: {
    marginHorizontal: theme.spacing.xs,
  },
  // Sizes
  sizeLg: {
    height: theme.touchTargets.buttonHeightLg,
    paddingHorizontal: theme.spacing.xl,
  },
  sizeMd: {
    height: theme.touchTargets.buttonHeightMd,
    paddingHorizontal: theme.spacing.base,
  },
  sizeSm: {
    height: theme.touchTargets.buttonHeightSm,
    paddingHorizontal: theme.spacing.md,
  },
  // Variants
  variantPrimary: {
    backgroundColor: theme.colors.primary600,
  },
  variantSecondary: {
    backgroundColor: theme.colors.primary50,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  variantGhost: {
    backgroundColor: 'transparent',
  },
  variantDanger: {
    backgroundColor: theme.colors.danger,
  },
  // Disabled state
  buttonDisabled: {
    opacity: 0.5,
  },
  // Text Styles
  baseText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    textAlign: 'center',
  },
  textLg: {
    fontSize: theme.typography.styles.body.fontSize,
    lineHeight: theme.typography.styles.body.lineHeight,
  },
  textMd: {
    fontSize: theme.typography.styles.small.fontSize,
    lineHeight: theme.typography.styles.small.lineHeight,
  },
  textSm: {
    fontSize: theme.typography.styles.caption.fontSize,
    lineHeight: theme.typography.styles.caption.lineHeight,
  },
  textPrimary: {
    color: '#FFFFFF',
  },
  textSecondary: {
    color: theme.colors.primary600,
  },
  textGhost: {
    color: theme.colors.ink700,
  },
  textDanger: {
    color: '#FFFFFF',
  },
  textDisabled: {
    color: theme.colors.ink500,
  },
});
