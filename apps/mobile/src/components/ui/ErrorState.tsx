import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import { AlertCircle, RefreshCw } from 'lucide-react-native';
import { Button } from './Button';
import { theme } from '../../theme';

export interface ErrorStateProps extends ViewProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryTitle?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We encountered an error loading this information. Please try again.',
  onRetry,
  retryTitle = 'Try Again',
  style,
  ...rest
}: ErrorStateProps) {
  return (
    <View style={[styles.container, style]} {...rest}>
      <View style={styles.iconCircle}>
        <AlertCircle size={36} color={theme.colors.danger} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Button
          variant="secondary"
          size="md"
          title={retryTitle}
          onPress={onRetry}
          iconLeft={<RefreshCw size={16} color={theme.colors.primary600} />}
          style={styles.retryButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing['3xl'],
    paddingHorizontal: theme.spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.base,
  },
  title: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: theme.typography.styles.h3.fontSize,
    lineHeight: theme.typography.styles.h3.lineHeight,
    color: theme.colors.ink900,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  message: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.small.fontSize,
    lineHeight: theme.typography.styles.small.lineHeight,
    color: theme.colors.ink500,
    textAlign: 'center',
    maxWidth: 280,
  },
  retryButton: {
    marginTop: theme.spacing.base,
  },
});
