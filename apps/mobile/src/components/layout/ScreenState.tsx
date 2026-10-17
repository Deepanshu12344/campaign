import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import { theme } from '../../theme';

export interface ScreenStateProps {
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  error?: Error | { message?: string } | string | null;
  onRetry?: () => void;
  skeleton?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  emptyIcon?: React.ReactNode;
  errorTitle?: string;
  errorMessage?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ScreenState({
  isLoading,
  isError,
  isEmpty,
  error,
  onRetry,
  skeleton,
  emptyTitle = 'No items found',
  emptyDescription = 'There is currently no information available in this section.',
  emptyActionLabel,
  onEmptyAction,
  emptyIcon,
  errorTitle = 'Unable to load content',
  errorMessage,
  children,
  style,
}: ScreenStateProps) {
  if (isLoading) {
    if (skeleton) {
      return <View style={[styles.container, style]}>{skeleton}</View>;
    }
    return (
      <View style={[styles.container, styles.skeletonList, style]}>
        <View style={styles.skeletonCard}>
          <Skeleton height={180} borderRadius={theme.radius.card} style={styles.skeletonSpacing} />
          <Skeleton height={24} width="80%" style={styles.skeletonSpacing} />
          <Skeleton height={16} width="60%" style={styles.skeletonSpacing} />
          <Skeleton height={12} width="100%" />
        </View>
        <View style={styles.skeletonCard}>
          <Skeleton height={180} borderRadius={theme.radius.card} style={styles.skeletonSpacing} />
          <Skeleton height={24} width="70%" style={styles.skeletonSpacing} />
          <Skeleton height={16} width="50%" />
        </View>
      </View>
    );
  }

  if (isError) {
    const resolvedErrorMsg =
      errorMessage ||
      (typeof error === 'string'
        ? error
        : error && 'message' in error && typeof error.message === 'string'
        ? error.message
        : 'An unexpected error occurred while loading this screen.');

    return (
      <View style={[styles.container, styles.centered, style]}>
        <ErrorState
          title={errorTitle}
          message={resolvedErrorMsg}
          onRetry={onRetry}
          retryTitle="Try Again"
        />
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View style={[styles.container, styles.centered, style]}>
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          actionTitle={emptyActionLabel}
          onAction={onEmptyAction}
          icon={emptyIcon}
        />
      </View>
    );
  }

  return <View style={[styles.container, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  skeletonList: {
    padding: theme.spacing.base,
    gap: theme.spacing.base,
  },
  skeletonCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  skeletonSpacing: {
    marginBottom: theme.spacing.sm,
  },
});
