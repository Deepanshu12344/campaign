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
      <ShieldAlert size={14} color="#92400E" style={styles.icon} />
      <Text style={styles.text}>Internal - reviewer demo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: theme.colors.warningBg,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
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
    color: '#92400E',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
});
