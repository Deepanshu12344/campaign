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
  showIcon?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function CategoryChip({
  category,
  label,
  selected = false,
  count,
  showIcon = true,
  onPress,
  style,
  ...rest
}: CategoryChipProps) {
  const handlePress = (e: GestureResponderEvent) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.(e);
  };

  const icon = showIcon ? getCategoryIcon(category, selected) : null;

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
      {showIcon && <View style={styles.iconContainer}>{icon}</View>}
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
          <Check size={12} color={theme.colors.onLime} strokeWidth={2.5} />
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
  const color = selected ? theme.colors.onLime : theme.colors.textSecondary;

  switch (category) {
    case 'All':
      return <Layers size={size} color={color} strokeWidth={2} />;
    case 'Environment':
      return <Leaf size={size} color={color} strokeWidth={2} />;
    case 'Health':
      return <HeartPulse size={size} color={color} strokeWidth={2} />;
    case 'Science':
      return <FlaskConical size={size} color={color} strokeWidth={2} />;
    case 'Education':
      return <GraduationCap size={size} color={color} strokeWidth={2} />;
    case 'Public Policy':
      return <Landmark size={size} color={color} strokeWidth={2} />;
    case 'Economic Policy':
      return <TrendingUp size={size} color={color} strokeWidth={2} />;
    case 'Community':
      return <Users size={size} color={color} strokeWidth={2} />;
    case 'Arts & Culture':
      return <Palette size={size} color={color} strokeWidth={2} />;
    case 'Business':
      return <Briefcase size={size} color={color} strokeWidth={2} />;
    case 'Other':
    default:
      return <Sparkles size={size} color={color} strokeWidth={2} />;
  }
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: theme.radii.pill,
    minHeight: 36,
    borderWidth: 1,
  },
  unselectedChip: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
  },
  selectedChip: {
    backgroundColor: theme.colors.lime,
    borderColor: theme.colors.lime,
  },
  iconContainer: {
    marginRight: 6,
  },
  label: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  unselectedLabel: {
    color: theme.colors.textPrimary,
  },
  selectedLabel: {
    color: theme.colors.onLime,
    fontFamily: theme.typography.fonts.uiBold,
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.radii.pill,
  },
  unselectedCountBadge: {
    backgroundColor: theme.colors.surfaceRaised,
  },
  selectedCountBadge: {
    backgroundColor: theme.colors.onLime,
  },
  countText: {
    fontSize: 11,
    fontFamily: theme.typography.fonts.uiSemiBold,
  },
  unselectedCountText: {
    color: theme.colors.textSecondary,
  },
  selectedCountText: {
    color: theme.colors.lime,
  },
  selectedCheckWrap: {
    marginLeft: 4,
  },
});
