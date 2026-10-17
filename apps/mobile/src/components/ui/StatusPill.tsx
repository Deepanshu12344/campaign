import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import {
  FileEdit,
  Clock,
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  Lock,
  SlidersHorizontal,
  Megaphone,
  CheckCheck,
  XCircle,
  Ban,
  RotateCcw,
  AlertTriangle,
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

  switch (status) {
    case 'DRAFT':
      return {
        label: 'Draft',
        icon: <FileEdit size={iconSize} color={theme.colors.ink500} />,
        textColor: theme.colors.ink700,
        bgColor: theme.colors.line,
        borderColor: theme.colors.line,
      };
    case 'SUBMITTED':
      return {
        label: 'Under Review',
        icon: <Clock size={iconSize} color={theme.colors.warning} />,
        textColor: theme.colors.warning,
        bgColor: theme.colors.warningBg,
        borderColor: theme.colors.amber200,
      };
    case 'CHANGES_REQUESTED':
      return {
        label: 'Changes Requested',
        icon: <AlertCircle size={iconSize} color={theme.colors.warning} />,
        textColor: theme.colors.warning,
        bgColor: theme.colors.warningBg,
        borderColor: theme.colors.amber200,
      };
    case 'APPROVED':
      return {
        label: 'Approved',
        icon: <CheckCircle2 size={iconSize} color={theme.colors.info} />,
        textColor: theme.colors.info,
        bgColor: theme.colors.infoBg,
        borderColor: theme.colors.sky200,
      };
    case 'FUNDING':
      return {
        label: 'Funding',
        icon: <CircleDollarSign size={iconSize} color={theme.colors.primary600} />,
        textColor: theme.colors.primary600,
        bgColor: theme.colors.primary50,
        borderColor: theme.colors.primary200,
      };
    case 'FUNDING_CLOSED':
      return {
        label: 'Funding Closed',
        icon: <Lock size={iconSize} color={theme.colors.ink500} />,
        textColor: theme.colors.ink700,
        bgColor: theme.colors.line,
        borderColor: theme.colors.line,
      };
    case 'DISTRIBUTION_PREP':
      return {
        label: 'Distribution Prep',
        icon: <SlidersHorizontal size={iconSize} color={theme.colors.info} />,
        textColor: theme.colors.info,
        bgColor: theme.colors.infoBg,
        borderColor: theme.colors.sky200,
      };
    case 'PROMOTING':
      return {
        label: 'Promoting',
        icon: <Megaphone size={iconSize} color={theme.colors.success} />,
        textColor: theme.colors.success,
        bgColor: theme.colors.successBg,
        borderColor: theme.colors.emerald100,
      };
    case 'COMPLETED':
      return {
        label: 'Completed',
        icon: <CheckCheck size={iconSize} color={theme.colors.success} />,
        textColor: theme.colors.success,
        bgColor: theme.colors.successBg,
        borderColor: theme.colors.emerald100,
      };
    case 'REJECTED':
      return {
        label: 'Rejected',
        icon: <XCircle size={iconSize} color={theme.colors.danger} />,
        textColor: theme.colors.danger,
        bgColor: theme.colors.dangerBg,
        borderColor: theme.colors.red200,
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        icon: <Ban size={iconSize} color={theme.colors.danger} />,
        textColor: theme.colors.danger,
        bgColor: theme.colors.dangerBg,
        borderColor: theme.colors.red200,
      };
    case 'REFUND_PENDING':
      return {
        label: 'Refund Pending',
        icon: <RotateCcw size={iconSize} color={theme.colors.warning} />,
        textColor: theme.colors.warning,
        bgColor: theme.colors.warningBg,
        borderColor: theme.colors.amber200,
      };
    case 'FAILED':
      return {
        label: 'Failed',
        icon: <AlertTriangle size={iconSize} color={theme.colors.danger} />,
        textColor: theme.colors.danger,
        bgColor: theme.colors.dangerBg,
        borderColor: theme.colors.red200,
      };
    case 'SUCCEEDED':
      return {
        label: 'Succeeded',
        icon: <CheckCircle2 size={iconSize} color={theme.colors.success} />,
        textColor: theme.colors.success,
        bgColor: theme.colors.successBg,
        borderColor: theme.colors.emerald100,
      };
    case 'PENDING':
      return {
        label: 'Pending',
        icon: <Clock size={iconSize} color={theme.colors.warning} />,
        textColor: theme.colors.warning,
        bgColor: theme.colors.warningBg,
        borderColor: theme.colors.amber200,
      };
    case 'REFUNDED':
      return {
        label: 'Refunded',
        icon: <RotateCcw size={iconSize} color={theme.colors.ink500} />,
        textColor: theme.colors.ink700,
        bgColor: theme.colors.line,
        borderColor: theme.colors.line,
      };
  }
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  iconContainer: {
    marginRight: 5,
  },
  label: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: theme.typography.styles.caption.fontSize,
    lineHeight: theme.typography.styles.caption.lineHeight,
  },
});
