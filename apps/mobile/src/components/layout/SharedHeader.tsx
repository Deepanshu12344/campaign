import React from 'react';
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { theme } from '../../theme';
import { StepIndicator } from '../ui/StepIndicator';

export interface SharedHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  fallbackRoute?: string;
  rightAction?: React.ReactNode;
  stepConfig?: {
    currentStep: number;
    totalSteps?: number;
    labels?: string[];
  };
  transparent?: boolean;
}

export function SharedHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  fallbackRoute = '/(tabs)',
  rightAction,
  stepConfig,
  transparent = false,
}: SharedHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute as Href);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 12 : 0) },
        transparent ? styles.transparentContainer : styles.surfaceContainer,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.leftContainer}>
          {showBack ? (
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={22} color={theme.colors.ink900} />
            </Pressable>
          ) : (
            <View style={styles.spacer} />
          )}
        </View>

        <View style={styles.centerContainer}>
          {title && (
            <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
              {title}
            </Text>
          )}
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1} ellipsizeMode="tail">
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.rightContainer}>
          {rightAction || <View style={styles.spacer} />}
        </View>
      </View>

      {stepConfig && (
        <View style={styles.stepIndicatorWrapper}>
          <StepIndicator currentStep={stepConfig.currentStep} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    zIndex: 10,
  },
  surfaceContainer: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  transparentContainer: {
    backgroundColor: 'transparent',
  },
  headerRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.base,
  },
  leftContainer: {
    width: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -theme.spacing.xs,
  },
  backButtonPressed: {
    backgroundColor: theme.colors.bgMuted,
    transform: [{ scale: 0.96 }],
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  title: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: theme.typography.styles.h3.fontSize,
    lineHeight: theme.typography.styles.h3.lineHeight,
    color: theme.colors.ink900,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.caption.fontSize,
    lineHeight: theme.typography.styles.caption.lineHeight,
    color: theme.colors.ink500,
    textAlign: 'center',
    marginTop: -2,
  },
  rightContainer: {
    width: 48,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  spacer: {
    width: 48,
    height: 48,
  },
  stepIndicatorWrapper: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
});
