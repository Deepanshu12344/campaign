import React from 'react';
import { StyleSheet, View, Text, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, ButtonVariant } from './Button';
import { theme } from '../../theme';

export interface StickyActionBarAction {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
}

export interface StickyActionBarProps extends ViewProps {
  primaryTitle?: string;
  onPrimaryPress?: () => void;
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
  primaryAction?: StickyActionBarAction;
  secondaryTitle?: string;
  onSecondaryPress?: () => void;
  secondaryVariant?: ButtonVariant;
  secondaryAction?: StickyActionBarAction;
  priceSummary?: {
    label: string;
    amount: string;
  };
  children?: React.ReactNode;
}

export function StickyActionBar({
  primaryTitle,
  onPrimaryPress,
  primaryLoading = false,
  primaryDisabled = false,
  primaryAction,
  secondaryTitle,
  onSecondaryPress,
  secondaryVariant = 'secondary',
  secondaryAction,
  priceSummary,
  children,
  style,
  ...rest
}: StickyActionBarProps) {
  const insets = useSafeAreaInsets();

  const resolvedPrimaryTitle = primaryAction?.title ?? primaryTitle;
  const resolvedPrimaryPress = primaryAction?.onPress ?? onPrimaryPress;
  const resolvedPrimaryLoading = primaryAction?.loading ?? primaryLoading;
  const resolvedPrimaryDisabled = primaryAction?.disabled ?? primaryDisabled;

  const resolvedSecondaryTitle = secondaryAction?.title ?? secondaryTitle;
  const resolvedSecondaryPress = secondaryAction?.onPress ?? onSecondaryPress;
  const resolvedSecondaryVariant = secondaryAction?.variant ?? secondaryVariant;

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 12) },
        style,
      ]}
      {...rest}
    >
      {priceSummary && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{priceSummary.label}</Text>
          <Text style={styles.summaryAmount}>{priceSummary.amount}</Text>
        </View>
      )}

      {children ? (
        children
      ) : (
        <View style={styles.buttonsRow}>
          {resolvedSecondaryTitle && resolvedSecondaryPress && (
            <Button
              variant={resolvedSecondaryVariant}
              size="lg"
              title={resolvedSecondaryTitle}
              onPress={resolvedSecondaryPress}
              style={styles.secondaryButton}
            />
          )}
          {resolvedPrimaryTitle && resolvedPrimaryPress && (
            <Button
              variant="primary"
              size="lg"
              title={resolvedPrimaryTitle}
              onPress={resolvedPrimaryPress}
              loading={resolvedPrimaryLoading}
              disabled={resolvedPrimaryDisabled}
              style={styles.primaryButton}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    paddingTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    ...theme.shadows.elevated,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: theme.spacing.sm,
  },
  summaryLabel: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: theme.typography.styles.small.fontSize,
    color: theme.colors.ink500,
  },
  summaryAmount: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 20,
    lineHeight: 26,
    color: theme.colors.ink900,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  secondaryButton: {
    flex: 1,
  },
  primaryButton: {
    flex: 2,
  },
});
