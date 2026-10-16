import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme';

export interface AccordionProps extends ViewProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function Accordion({
  title,
  icon,
  defaultOpen = false,
  children,
  style,
  ...rest
}: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const rotation = useSharedValue(defaultOpen ? 180 : 0);

  const toggleOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const next = !open;
    setOpen(next);
    rotation.value = withTiming(next ? 180 : 0, {
      duration: theme.motion.durationShort,
    });
  };

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={[styles.container, style]} {...rest}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}, accordion`}
        onPress={toggleOpen}
        style={styles.header}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={styles.titleRow}>
          {icon && <View style={styles.iconMargin}>{icon}</View>}
          <Text style={styles.titleText}>{title}</Text>
        </View>
        <Animated.View style={chevronAnimatedStyle}>
          <ChevronDown size={20} color={theme.colors.ink500} />
        </Animated.View>
      </Pressable>

      {open && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.base,
    paddingHorizontal: theme.spacing.base,
    minHeight: theme.touchTargets.minTouchSize,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  iconMargin: {
    marginRight: theme.spacing.sm,
  },
  titleText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: theme.typography.styles.h3.fontSize,
    lineHeight: theme.typography.styles.h3.lineHeight,
    color: theme.colors.ink900,
  },
  content: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: theme.spacing.base,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
  },
});
