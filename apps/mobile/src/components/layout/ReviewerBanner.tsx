import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { ShieldAlert } from 'lucide-react-native';
import { theme } from '../../theme';

export function ReviewerBanner() {
  return (
    <View
      style={styles.banner}
      accessibilityRole="text"
      accessibilityLabel="Internal reviewer demo banner"
    >
      <ShieldAlert size={14} color={theme.colors.lime} style={styles.icon} />
      <Text style={styles.text}>Internal - reviewer demo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: theme.colors.surfaceRaised,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.textPrimary,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
});

