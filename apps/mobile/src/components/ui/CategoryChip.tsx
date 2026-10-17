import React from 'react';
import {
  StyleSheet,
  Text,
  Pressable,
  PressableProps,
  View,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import {
  Leaf,
  HeartPulse,
  FlaskConical,
  GraduationCap,
  Landmark,
  TrendingUp,
  Users,
  Palette,
  Briefcase,
  Sparkles,
  Layers,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Category } from '@campaigns/shared';
import { theme } from '../../theme';

export interface CategoryChipProps extends Omit<PressableProps, 'style'> {
  category: Category | 'All';
  label?: string;
  selected?: boolean;
  count?: number;
  style?: StyleProp<ViewStyle>;
}

export function CategoryChip({
  category,
  label,
  selected = false,
  count,
  onPress,
  style,
  ...rest
}: CategoryChipProps) {
  const handlePress = (e: GestureResponderEvent) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.(e);
  };

  const icon = getCategoryIcon(category, selected);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Category: ${label ?? category}${count !== undefined ? `, ${count} campaigns` : ''}`}
      onPress={handlePress}
      style={[
        styles.chip,
        selected ? styles.selectedChip : styles.unselectedChip,
        style,
      ]}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      {...rest}
    >
      <View style={styles.iconContainer}>{icon}</View>
      <Text
        style={[
          styles.label,
          selected ? styles.selectedLabel : styles.unselectedLabel,
        ]}
      >
        {label ?? category}
      </Text>
      {selected && (
        <View style={styles.selectedCheckWrap}>
          <Check size={12} color={theme.colors.primary600} strokeWidth={2.5} />
        </View>
      )}
      {count !== undefined && (
        <View
          style={[
            styles.countBadge,
            selected ? styles.selectedCountBadge : styles.unselectedCountBadge,
          ]}
        >
          <Text
            style={[
              styles.countText,
              selected ? styles.selectedCountText : styles.unselectedCountText,
            ]}
          >
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function getCategoryIcon(category: Category | 'All', selected = false, size = 16) {
  const color = selected ? theme.colors.primary600 : theme.colors.ink500;

  switch (category) {
    case 'All':
      return <Layers size={size} color={color} />;
    case 'Environment':
      return <Leaf size={size} color={color} />;
    case 'Health':
      return <HeartPulse size={size} color={color} />;
    case 'Science':
      return <FlaskConical size={size} color={color} />;
    case 'Education':
      return <GraduationCap size={size} color={color} />;
    case 'Public Policy':
      return <Landmark size={size} color={color} />;
    case 'Economic Policy':
      return <TrendingUp size={size} color={color} />;
    case 'Community':
      return <Users size={size} color={color} />;
    case 'Arts & Culture':
      return <Palette size={size} color={color} />;
    case 'Business':
      return <Briefcase size={size} color={color} />;
    case 'Other':
    default:
      return <Sparkles size={size} color={color} />;
  }
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    minHeight: 38,
    borderWidth: 1,
  },
  unselectedChip: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
  },
  selectedChip: {
    backgroundColor: theme.colors.primary50,
    borderColor: theme.colors.primary600,
  },
  iconContainer: {
    marginRight: 6,
  },
  label: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: theme.typography.styles.small.fontSize,
    lineHeight: theme.typography.styles.small.lineHeight,
  },
  unselectedLabel: {
    color: theme.colors.ink700,
  },
  selectedLabel: {
    color: theme.colors.primary600,
    fontFamily: theme.typography.fonts.uiSemiBold,
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.radius.pill,
  },
  unselectedCountBadge: {
    backgroundColor: theme.colors.line,
  },
  selectedCountBadge: {
    backgroundColor: theme.colors.primary600,
  },
  countText: {
    fontSize: 11,
    fontFamily: theme.typography.fonts.uiSemiBold,
  },
  unselectedCountText: {
    color: theme.colors.ink700,
  },
  selectedCountText: {
    color: '#FFFFFF',
  },
  selectedCheckWrap: {
    marginLeft: 4,
  },
});
