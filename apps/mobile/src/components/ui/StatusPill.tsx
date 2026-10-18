import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import {
  FileEdit,
  Clock,
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  Megaphone,
  CheckCheck,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react-native';
import { CampaignStatus, ContributionStatus } from '@campaigns/shared';
import { theme } from '../../theme';

export interface StatusPillProps extends ViewProps {
  status: CampaignStatus | ContributionStatus;
}

export function StatusPill({ status, style, ...rest }: StatusPillProps) {
  const config = getStatusConfig(status);

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: config.bgColor, borderColor: config.borderColor },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${config.label}`}
      {...rest}
    >
      <View style={styles.iconContainer}>{config.icon}</View>
      <Text style={[styles.label, { color: config.textColor }]}>{config.label}</Text>
    </View>
  );
}

function getStatusConfig(status: CampaignStatus | ContributionStatus) {
  const iconSize = 13;

  // 1. Positive States (Dark green tinted pill with lime text and check/dot icon)
  const isPositive =
    status === 'FUNDING' ||
    status === 'PROMOTING' ||
    status === 'COMPLETED' ||
    status === 'SUCCEEDED' ||
    status === 'APPROVED';

  // 2. Negative States (Outlined pill with off-white text and alert icon, no red)
  const isNegative =
    status === 'REJECTED' ||
    status === 'FAILED' ||
    status === 'CANCELLED';

  if (isPositive) {
    let icon = <CheckCircle2 size={iconSize} color={theme.colors.lime} strokeWidth={2} />;
    let label = 'Funding';

    if (status === 'PROMOTING') {
      icon = <Megaphone size={iconSize} color={theme.colors.lime} strokeWidth={2} />;
      label = 'Promoting';
    } else if (status === 'COMPLETED') {
      icon = <CheckCheck size={iconSize} color={theme.colors.lime} strokeWidth={2} />;
      label = 'Completed';
    } else if (status === 'SUCCEEDED') {
      icon = <CheckCircle2 size={iconSize} color={theme.colors.lime} strokeWidth={2} />;
      label = 'Succeeded';
    } else if (status === 'APPROVED') {
      icon = <CheckCircle2 size={iconSize} color={theme.colors.lime} strokeWidth={2} />;
      label = 'Approved';
    } else if (status === 'FUNDING') {
      icon = <CircleDollarSign size={iconSize} color={theme.colors.lime} strokeWidth={2} />;
      label = 'Funding';
    }

    return {
      label,
      icon,
      textColor: theme.colors.lime,
      bgColor: theme.colors.tintedPillBg, // #163300
      borderColor: '#234F02',
    };
  }

  if (isNegative) {
    let label = 'Rejected';
    if (status === 'FAILED') label = 'Failed';
    if (status === 'CANCELLED') label = 'Cancelled';

    return {
      label,
      icon: <AlertCircle size={iconSize} color={theme.colors.textPrimary} strokeWidth={2} />,
      textColor: theme.colors.textPrimary,
      bgColor: theme.colors.surface,
      borderColor: theme.colors.surfaceRaised,
    };
  }

  // 3. Waiting States (Neutral grey pill with off-white text and clock or pencil icon)
  let icon = <Clock size={iconSize} color={theme.colors.textSecondary} strokeWidth={2} />;
  let label = 'Under Review';

  if (status === 'DRAFT') {
    icon = <FileEdit size={iconSize} color={theme.colors.textSecondary} strokeWidth={2} />;
    label = 'Draft';
  } else if (status === 'CHANGES_REQUESTED') {
    icon = <AlertCircle size={iconSize} color={theme.colors.textSecondary} strokeWidth={2} />;
    label = 'Changes Requested';
  } else if (status === 'FUNDING_CLOSED') {
    icon = <Clock size={iconSize} color={theme.colors.textSecondary} strokeWidth={2} />;
    label = 'Funding Closed';
  } else if (status === 'DISTRIBUTION_PREP') {
    icon = <SlidersHorizontal size={iconSize} color={theme.colors.textSecondary} strokeWidth={2} />;
    label = 'Distribution Prep';
  } else if (status === 'REFUND_PENDING') {
    icon = <RotateCcw size={iconSize} color={theme.colors.textSecondary} strokeWidth={2} />;
    label = 'Refund Pending';
  } else if (status === 'REFUNDED') {
    icon = <RotateCcw size={iconSize} color={theme.colors.textSecondary} strokeWidth={2} />;
    label = 'Refunded';
  } else if (status === 'PENDING') {
    icon = <Clock size={iconSize} color={theme.colors.textSecondary} strokeWidth={2} />;
    label = 'Pending';
  }

  return {
    label,
    icon,
    textColor: theme.colors.textPrimary,
    bgColor: theme.colors.surface,
    borderColor: theme.colors.line,
  };
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  iconContainer: {
    marginRight: 6,
  },
  label: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    lineHeight: 16,
  },
});
