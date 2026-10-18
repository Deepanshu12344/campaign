import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Bell,
  Mail,
  Smartphone,
  ShieldCheck,
  TrendingUp,
  Receipt,
  MessageSquare,
  FileText,
  Lock,
  Clock,
} from 'lucide-react-native';
import { theme } from '../../theme';
import { SharedHeader } from '../../components/layout/SharedHeader';
import { Card, useToast, Button } from '../../components/ui';
import { useCurrentUser } from '../../api/hooks/useAuth';
import { useNotificationPrefs } from '../../api/hooks/useActivity';
import { NotificationPrefs } from '@campaigns/shared';

const DEFAULT_PREFS: NotificationPrefs = {
  campaignStatus: true,
  fundingMilestones: true,
  contributions: true,
  campaignUpdates: true,
  securityAlerts: true,
  emailNotifications: true,
};

interface PreferenceRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: boolean;
  onValueChange?: (val: boolean) => void;
  disabled?: boolean;
  badgeLabel?: string;
  badgeType?: 'lock' | 'soon' | 'active';
}

function PreferenceRow({
  icon,
  title,
  description,
  value,
  onValueChange,
  disabled = false,
  badgeLabel,
  badgeType,
}: PreferenceRowProps) {
  return (
    <View style={[styles.rowContainer, disabled && styles.rowDisabled]}>
      <View style={styles.rowIconWrapper}>{icon}</View>

      <View style={styles.rowContent}>
        <View style={styles.rowTitleRow}>
          <Text style={styles.rowTitle}>{title}</Text>
          {badgeLabel && (
            <View
              style={[
                styles.badge,
                badgeType === 'lock' && styles.badgeLock,
                badgeType === 'soon' && styles.badgeSoon,
                badgeType === 'active' && styles.badgeActive,
              ]}
            >
              {badgeType === 'lock' && <Lock size={10} color={theme.colors.textSecondary} style={{ marginRight: 3 }} />}
              <Text
                style={[
                  styles.badgeText,
                  badgeType === 'lock' && styles.badgeTextLock,
                  badgeType === 'soon' && styles.badgeTextSoon,
                  badgeType === 'active' && styles.badgeTextActive,
                ]}
              >
                {badgeLabel}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.rowDesc}>{description}</Text>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.colors.border, true: theme.colors.lime }}
        thumbColor={Platform.OS === 'android' ? (value ? theme.colors.onLime : theme.colors.textSecondary) : undefined}
      />
    </View>
  );
}

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { data: userProfile } = useCurrentUser();
  const prefsMutation = useNotificationPrefs();

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);

  // Sync state when userProfile arrives
  useEffect(() => {
    if (userProfile?.notificationPrefs) {
      const serverPrefs = userProfile.notificationPrefs as unknown as Partial<NotificationPrefs>;
      setPrefs({
        campaignStatus: serverPrefs.campaignStatus ?? DEFAULT_PREFS.campaignStatus,
        fundingMilestones: serverPrefs.fundingMilestones ?? DEFAULT_PREFS.fundingMilestones,
        contributions: serverPrefs.contributions ?? DEFAULT_PREFS.contributions,
        campaignUpdates: serverPrefs.campaignUpdates ?? DEFAULT_PREFS.campaignUpdates,
        securityAlerts: true, // Always locked ON
        emailNotifications: serverPrefs.emailNotifications ?? DEFAULT_PREFS.emailNotifications,
      });
    }
  }, [userProfile]);

  const handleToggle = (key: keyof NotificationPrefs, newValue: boolean) => {
    if (key === 'securityAlerts') return; // Cannot toggle security alerts

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const prevPrefs = { ...prefs };

    // Optimistic update
    setPrefs((current) => ({
      ...current,
      [key]: newValue,
    }));

    prefsMutation.mutate(
      { [key]: newValue },
      {
        onSuccess: () => {
          toast.success('Notification preferences updated');
        },
        onError: (err) => {
          // Revert optimistic update
          setPrefs(prevPrefs);
          toast.error(err.message || 'Unable to update preferences. Reverted.');
        },
      }
    );
  };

  return (
    <View style={styles.container}>
      <SharedHeader
        title="Notification Preferences"
        subtitle="Delivery Channels & Alert Types"
        showBack={true}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <View style={styles.introBox}>
            <Text style={styles.introTitle}>Real-time Alert Preferences</Text>
            <Text style={styles.introSubtitle}>
              Changes autosave immediately to your account profile. Adjust notification channels to stay
              informed on causes you create, back, and follow.
            </Text>
          </View>

          {/* Section 1: Alert Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Alert Categories</Text>

            <PreferenceRow
              icon={<FileText size={20} color={theme.colors.lime} />}
              title="Campaign Status"
              description="Reviewer decisions, revision requests, approvals, and distribution launch confirmations."
              value={prefs.campaignStatus}
              onValueChange={(val) => handleToggle('campaignStatus', val)}
            />

            <View style={styles.separator} />

            <PreferenceRow
              icon={<TrendingUp size={20} color={theme.colors.lime} />}
              title="Funding Milestones"
              description="Reach progress updates when campaigns hit 25%, 50%, 75%, 100%, and approaching deadlines."
              value={prefs.fundingMilestones}
              onValueChange={(val) => handleToggle('fundingMilestones', val)}
            />

            <View style={styles.separator} />

            <PreferenceRow
              icon={<Receipt size={20} color={theme.colors.lime} />}
              title="Contributions & Receipts"
              description="Payment confirmation receipts, distribution allocations, and refund notifications."
              value={prefs.contributions}
              onValueChange={(val) => handleToggle('contributions', val)}
            />

            <View style={styles.separator} />

            <PreferenceRow
              icon={<MessageSquare size={20} color={theme.colors.lime} />}
              title="Campaign Updates"
              description="Field reports, investigative updates, and post-campaign ad performance reports."
              value={prefs.campaignUpdates}
              onValueChange={(val) => handleToggle('campaignUpdates', val)}
            />

            <View style={styles.separator} />

            <PreferenceRow
              icon={<ShieldCheck size={20} color={theme.colors.textSecondary} />}
              title="Security Alerts"
              description="Password changes, suspicious login attempts, and account permission modifications."
              value={true}
              disabled={true}
              badgeLabel="Required"
              badgeType="lock"
            />
          </View>

          {/* Section 2: Delivery Channels */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Delivery Channels</Text>

            <PreferenceRow
              icon={<Bell size={20} color={theme.colors.lime} />}
              title="In-App Feed"
              description="Real-time notifications in your Activity tab with day grouping and badges."
              value={true}
              disabled={true}
              badgeLabel="Always Active"
              badgeType="active"
            />

            <View style={styles.separator} />

            <PreferenceRow
              icon={<Mail size={20} color={theme.colors.lime} />}
              title="Email Notifications"
              description="Send email alerts for important milestones, review audits, and receipts."
              value={prefs.emailNotifications ?? true}
              onValueChange={(val) => handleToggle('emailNotifications', val)}
            />

            <View style={styles.separator} />

            <PreferenceRow
              icon={<Smartphone size={20} color={theme.colors.textSecondary} />}
              title="Push Notifications"
              description="Browser and device push notifications will be supported in the next release. No dead toggles."
              value={false}
              disabled={true}
              badgeLabel="Coming Soon"
              badgeType="soon"
            />
          </View>

          {/* Bottom Actions */}
          <View style={styles.footerActions}>
            <Button
              title="View Activity Feed"
              variant="secondary"
              size="md"
              fullWidth
              iconLeft={<Clock size={18} color={theme.colors.lime} />}
              onPress={() => router.push('/(tabs)/activity')}
            />
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollContent: {
    padding: theme.spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  card: {
    width: '100%',
    maxWidth: 580,
    padding: theme.spacing.xl,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  routePill: {
    backgroundColor: theme.colors.surfaceRaised,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  routeText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: theme.typography.styles.caption.fontSize,
    color: theme.colors.textSecondary,
  },
  introBox: {
    marginBottom: theme.spacing.xl,
  },
  introTitle: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 20,
    lineHeight: 26,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  introSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
  },
  section: {
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.base,
  },
  sectionHeader: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 14,
    lineHeight: 18,
    color: theme.colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: theme.spacing.md,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  rowDisabled: {
    opacity: 0.85,
  },
  rowIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
  },
  rowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: 2,
  },
  rowTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    lineHeight: 18,
    color: theme.colors.textPrimary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  badgeLock: {
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  badgeSoon: {
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  badgeActive: {
    backgroundColor: theme.colors.tintedPillBg,
    borderWidth: 1,
    borderColor: theme.colors.lime,
  },
  badgeText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 10,
    lineHeight: 12,
  },
  badgeTextLock: {
    color: theme.colors.textSecondary,
  },
  badgeTextSoon: {
    color: theme.colors.textSecondary,
  },
  badgeTextActive: {
    color: theme.colors.lime,
  },
  rowDesc: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
  },
  footerActions: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
});
