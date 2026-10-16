import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import { theme } from '../../theme';

export interface StatProps extends ViewProps {
  value: string | number;
  label: string;
  source?: string;
  highlight?: boolean;
}

export function Stat({
  value,
  label,
  source,
  highlight = false,
  style,
  ...rest
}: StatProps) {
  return (
    <View style={[styles.container, style]} {...rest}>
      <Text
        style={[
          styles.valueText,
          highlight && styles.highlightText,
        ]}
      >
        {value}
      </Text>
      <Text style={styles.labelText}>{label}</Text>
      {source && <Text style={styles.sourceText}>Source: {source}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.sm,
  },
  valueText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 28,
    lineHeight: 34,
    color: theme.colors.ink900,
  },
  highlightText: {
    color: theme.colors.primary600,
  },
  labelText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: theme.typography.styles.small.fontSize,
    lineHeight: theme.typography.styles.small.lineHeight,
    color: theme.colors.ink500,
    marginTop: 2,
  },
  sourceText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.caption.fontSize,
    lineHeight: theme.typography.styles.caption.lineHeight,
    color: theme.colors.ink500,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
