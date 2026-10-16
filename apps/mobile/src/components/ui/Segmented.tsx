import React from 'react';
import { StyleSheet, Text, View, Pressable, ViewProps } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme';

export interface SegmentedProps extends ViewProps {
  options: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

export function Segmented({
  options,
  selectedIndex,
  onChange,
  style,
  ...rest
}: SegmentedProps) {
  const handleSelect = (index: number) => {
    if (index === selectedIndex) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onChange(index);
  };

  return (
    <View style={[styles.container, style]} {...rest}>
      {options.map((option, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Pressable
            key={option}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option}
            onPress={() => handleSelect(index)}
            style={[
              styles.segment,
              isSelected && styles.selectedSegment,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                isSelected ? styles.selectedText : styles.unselectedText,
              ]}
              numberOfLines={1}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.line,
    borderRadius: theme.radius.input,
    padding: 3,
    alignItems: 'center',
  },
  segment: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.input - 2,
    minHeight: 36,
  },
  selectedSegment: {
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  segmentText: {
    fontSize: theme.typography.styles.small.fontSize,
    lineHeight: theme.typography.styles.small.lineHeight,
    fontFamily: theme.typography.fonts.uiMedium,
  },
  selectedText: {
    color: theme.colors.ink900,
    fontFamily: theme.typography.fonts.uiSemiBold,
  },
  unselectedText: {
    color: theme.colors.ink500,
  },
});
