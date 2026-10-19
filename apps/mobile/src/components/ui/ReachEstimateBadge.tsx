import React from 'react';
import { StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native';
import { Users } from 'lucide-react-native';
import { theme } from '../../theme';
import { InfoTip } from './InfoTip';

export interface ReachEstimateBadgeProps {
  low: number;
  high: number;
  showInfoTip?: boolean;
  showSubtitle?: boolean;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

export function ReachEstimateBadge({
  low,
  high,
  showInfoTip = true,
  showSubtitle = false,
  size = 'md',
  style,
}: ReachEstimateBadgeProps) {
  const isSm = size === 'sm';
  const formattedLow = low >= 1000 ? `${(low / 1000).toFixed(low % 1000 === 0 ? 0 : 1)}k` : low.toLocaleString();
  const formattedHigh = high >= 1000 ? `${(high / 1000).toFixed(high % 1000 === 0 ? 0 : 1)}k` : high.toLocaleString();
  const reachText = `~${formattedLow}–${formattedHigh} people reached`;

  return (
    <View style={[styles.container, style]}>
      <View
        style={[styles.badge, isSm ? styles.badgeSm : styles.badgeMd]}
        accessibilityRole="summary"
        accessibilityLabel={`Estimated audience reach: ${reachText}`}
      >
        <Users
          size={isSm ? 12 : 14}
          color={theme.colors.lime}
          style={styles.icon}
        />
        <Text
          style={[styles.text, isSm ? styles.textSm : styles.textMd]}
          numberOfLines={1}
        >
          {reachText}
        </Text>
        {showInfoTip && (
          <View style={styles.infoTipWrap}>
            <InfoTip
              term="estimatedReach"
              size={isSm ? 14 : 16}
              color={theme.colors.lime}
            />
          </View>
        )}
      </View>
      {showSubtitle && (
        <Text style={styles.subtitle}>Estimate · not a guarantee</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    maxWidth: '100%',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.tintedPillBg,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.lime,
    maxWidth: '100%',
    flexShrink: 1,
  },
  badgeMd: {
    paddingVertical: theme.spacing.xxs,
    paddingHorizontal: theme.spacing.sm,
  },
  badgeSm: {
    paddingVertical: 2,
    paddingHorizontal: theme.spacing.xs,
  },
  icon: {
    marginRight: theme.spacing.xxs,
    flexShrink: 0,
  },
  text: {
    fontFamily: theme.typography.fonts.uiMedium,
    color: theme.colors.lime,
    flexShrink: 1,
  },
  textMd: {
    fontSize: theme.typography.styles.caption.fontSize,
    lineHeight: theme.typography.styles.caption.lineHeight,
  },
  textSm: {
    fontSize: 11,
    lineHeight: 14,
  },
  infoTipWrap: {
    marginLeft: theme.spacing.xxs,
    flexShrink: 0,
  },
  subtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    lineHeight: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xxs,
  },
});
