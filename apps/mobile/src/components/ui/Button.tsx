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
import { ArrowRight } from 'lucide-react-native';
import { theme } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'tinted' | 'white';
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
  numberOfLines?: number;
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
  numberOfLines,
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
    tinted: styles.variantTinted,
    white: styles.variantWhite,
    ghost: styles.variantGhost,
    danger: styles.variantDanger,
  }[variant];

  const variantTextStyle = {
    primary: styles.textPrimary,
    secondary: styles.textSecondary,
    tinted: styles.textTinted,
    white: styles.textWhite,
    ghost: styles.textGhost,
    danger: styles.textDanger,
  }[variant];

  const isInteractiveDisabled = disabled || loading;

  const disabledTextStyle = isInteractiveDisabled
    ? variant === 'primary'
      ? styles.textDisabledPrimary
      : styles.textDisabled
    : null;

  const content =
    typeof children === 'string' || (!children && resolvedTitle) ? (
      <Text
        numberOfLines={numberOfLines ?? 1}
        ellipsizeMode="tail"
        style={[
          styles.baseText,
          sizeTextStyle,
          variantTextStyle,
          disabledTextStyle,
          textStyle,
        ]}
      >
        {typeof children === 'string' ? children : resolvedTitle}
      </Text>
    ) : (
      children
    );

  const spinnerColor =
    variant === 'primary'
      ? theme.colors.onLime
      : variant === 'white'
        ? theme.colors.black
        : variant === 'tinted'
          ? theme.colors.lime
          : variant === 'danger'
            ? theme.colors.textPrimary
            : theme.colors.textPrimary;

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
        <ActivityIndicator size="small" color={spinnerColor} />
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

export interface IconButtonProps extends Omit<PressableProps, 'style'> {
  icon: React.ReactNode;
  size?: number;
  variant?: 'surface' | 'lime' | 'ghost';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
}

export function IconButton({
  icon,
  size = 44,
  variant = 'surface',
  style,
  onPress,
  disabled,
  accessibilityLabel,
  ...rest
}: IconButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withTiming(theme.motion.pressScale, {
        duration: theme.motion.durationShort,
      });
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withTiming(1, {
        duration: theme.motion.durationShort,
      });
    }
  };

  const handlePress = (e: GestureResponderEvent) => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.(e);
  };

  const bgStyle =
    variant === 'lime'
      ? styles.iconButtonLime
      : variant === 'ghost'
        ? styles.iconButtonGhost
        : styles.iconButtonSurface;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.iconButtonBase,
        { width: size, height: size, borderRadius: size / 2 },
        bgStyle,
        disabled && styles.buttonDisabled,
        animatedStyle,
        style,
      ]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      {...rest}
    >
      {icon}
    </AnimatedPressable>
  );
}

export interface ArrowButtonProps extends Omit<PressableProps, 'style'> {
  size?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function ArrowButton({
  size = 44,
  style,
  accessibilityLabel = 'Next',
  ...rest
}: ArrowButtonProps) {
  return (
    <IconButton
      size={size}
      variant="lime"
      icon={<ArrowRight size={20} color={theme.colors.onLime} strokeWidth={2.5} />}
      accessibilityLabel={accessibilityLabel}
      style={style}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: theme.radii.pill,
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
  // Sizes (52dp, 44dp, 36dp)
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
    backgroundColor: theme.colors.lime,
  },
  variantSecondary: {
    backgroundColor: theme.colors.darkPillBg,
    borderWidth: 1,
    borderColor: theme.colors.darkPillBorder,
  },
  variantTinted: {
    backgroundColor: theme.colors.tintedPillBg,
    borderWidth: 1,
    borderColor: '#234F02',
  },
  variantWhite: {
    backgroundColor: theme.colors.white,
  },
  variantGhost: {
    backgroundColor: 'transparent',
  },
  variantDanger: {
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    fontSize: 16,
    lineHeight: 22,
  },
  textMd: {
    fontSize: 15,
    lineHeight: 20,
  },
  textSm: {
    fontSize: 13,
    lineHeight: 18,
  },
  textPrimary: {
    color: theme.colors.onLime,
    fontFamily: theme.typography.fonts.uiBold,
  },
  textSecondary: {
    color: theme.colors.textPrimary,
  },
  textTinted: {
    color: theme.colors.tintedPillText,
    fontFamily: theme.typography.fonts.uiSemiBold,
  },
  textWhite: {
    color: theme.colors.black,
    fontFamily: theme.typography.fonts.uiBold,
  },
  textGhost: {
    color: theme.colors.textPrimary,
  },
  textDanger: {
    color: theme.colors.textPrimary,
  },
  textDisabledPrimary: {
    color: theme.colors.onLime,
    fontFamily: theme.typography.fonts.uiBold,
  },
  textDisabled: {
    color: theme.colors.textMuted,
  },
  // Circular Icon Buttons
  iconButtonBase: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonSurface: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  iconButtonLime: {
    backgroundColor: theme.colors.lime,
  },
  iconButtonGhost: {
    backgroundColor: 'transparent',
  },
});
