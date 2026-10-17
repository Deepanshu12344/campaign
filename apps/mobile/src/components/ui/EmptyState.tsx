import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import { FolderOpen } from 'lucide-react-native';
import { Button } from './Button';
import { theme } from '../../theme';

export interface EmptyStateProps extends ViewProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionTitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  buttonTitle?: string;
  onPress?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionTitle,
  actionLabel,
  onAction,
  buttonTitle,
  onPress,
  style,
  ...rest
}: EmptyStateProps) {
  const resolvedTitle = actionTitle ?? actionLabel ?? buttonTitle;
  const resolvedAction = onAction ?? onPress;

  return (
    <View style={[styles.container, style]} {...rest}>
      <View style={styles.iconCircle}>
        {icon || <FolderOpen size={36} color={theme.colors.ink500} />}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {resolvedTitle && resolvedAction && (
        <Button
          variant="secondary"
          size="md"
          title={resolvedTitle}
          onPress={resolvedAction}
          style={styles.actionButton}
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
    backgroundColor: theme.colors.primary50,
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
  description: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.small.fontSize,
    lineHeight: theme.typography.styles.small.lineHeight,
    color: theme.colors.ink500,
    textAlign: 'center',
    maxWidth: 280,
  },
  actionButton: {
    marginTop: theme.spacing.base,
  },
});
