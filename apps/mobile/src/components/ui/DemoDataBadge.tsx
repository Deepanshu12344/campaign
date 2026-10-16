import React from 'react';
import { StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native';
import { theme } from '../../theme';

export interface DemoDataBadgeProps {
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

export function DemoDataBadge({ size = 'sm', style }: DemoDataBadgeProps) {
  const isMd = size === 'md';

  return (
    <View
      style={[styles.badge, isMd ? styles.badgeMd : styles.badgeSm, style]}
      accessibilityRole="text"
      accessibilityLabel="Prototype disclaimer: Demo data"
    >
      <View style={styles.dot} />
      <Text style={[styles.text, isMd ? styles.textMd : styles.textSm]}>
        Demo data
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bgMuted,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.full,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingVertical: 2,
    paddingHorizontal: theme.spacing.xs,
  },
  badgeMd: {
    paddingVertical: theme.spacing.xxs,
    paddingHorizontal: theme.spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.amber500,
    marginRight: theme.spacing.xxs,
  },
  text: {
    fontFamily: theme.typography.fonts.uiMedium,
    color: theme.colors.ink600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textSm: {
    fontSize: 10,
    lineHeight: 12,
  },
  textMd: {
    fontSize: 11,
    lineHeight: 14,
  },
});
