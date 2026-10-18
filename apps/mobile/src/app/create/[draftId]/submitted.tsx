import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import {
  CheckCircle2,
  LayoutDashboard,
  PlusCircle,
  Share2,
  Info,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Card, Button, Timeline, TimelineItem } from '../../../components/ui';
import { theme } from '../../../theme';

const TIMELINE_STAGES: TimelineItem[] = [
  {
    id: 'stage-1',
    title: '1. Submitted',
    description: 'Campaign story, verified citations, and targeting received.',
    status: 'completed',
    date: 'Just now',
  },
  {
    id: 'stage-2',
    title: '2. In Review',
    description:
      'Editorial audit of claims, source URLs, ad creatives, and audience settings. Usually takes 1–2 business days.',
    status: 'current',
    date: 'In progress',
  },
  {
    id: 'stage-3',
    title: '3. Approved or Changes Requested',
    description:
      "You will receive an in-app notice and email if adjustments are required or once your campaign is approved.",
    status: 'upcoming',
  },
  {
    id: 'stage-4',
    title: '4. Available for Funding',
    description: 'Campaign goes live for community discovery and bookmarking.',
    status: 'upcoming',
  },
  {
    id: 'stage-5',
    title: '5. Funding',
    description:
      'Community members pool contributions to fund the advertising distribution budget.',
    status: 'upcoming',
  },
  {
    id: 'stage-6',
    title: '6. Distribution Preparation',
    description:
      'Crucial step: Reaching the funding goal does NOT immediately start ads. Ad accounts, pixel tracking, and channel creatives are configured and platform-approved first.',
    status: 'upcoming',
  },
  {
    id: 'stage-7',
    title: '7. Promoting',
    description:
      'Targeted ads actively run across social feeds, search, video, and display channels.',
    status: 'upcoming',
  },
  {
    id: 'stage-8',
    title: '8. Completed',
    description:
      'Ad distribution concludes. Transparent metrics, total impressions, and reach reports are published.',
    status: 'upcoming',
  },
];

export default function CreateSubmittedScreen() {
  const router = useRouter();

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  const handleDashboard = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.replace('/creator/dashboard' as Href);
  };

  const handleCreateAnother = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.replace('/(tabs)/create' as Href);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Animated Success Hero Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.heroSection}>
        <View style={styles.successIconCircle}>
          <CheckCircle2 size={44} color={theme.colors.success} strokeWidth={2.5} />
        </View>

        <Text style={styles.heroTitle}>Submitted for Review</Text>
        <Text style={styles.heroSubtitle}>
          Your campaign has entered the verification queue. Our editorial and trust team will
          audit your claims and creative assets before publishing for funding.
        </Text>
      </Animated.View>

      {/* 8-Stage Status Timeline Card */}
      <Animated.View entering={FadeInUp.delay(150).duration(450)} style={styles.cardWrapper}>
        <Card style={styles.timelineCard}>
          <View style={styles.timelineHeader}>
            <Text style={styles.timelineHeading}>Campaign Lifecycle Timeline</Text>
            <Text style={styles.timelineSubheading}>
              Track your campaign through all 8 stages from review to completed ad promotion.
            </Text>
          </View>

          <Timeline items={TIMELINE_STAGES} style={styles.timelineComponent} />

          {/* Explicit callout about distribution preparation */}
          <View style={styles.distributionNoteBox}>
            <Info size={18} color={theme.colors.lime} style={{ marginTop: 2 }} />
            <Text style={styles.distributionNoteText}>
              <Text style={styles.distributionNoteBold}>Why is there a Distribution Preparation stage?</Text>{' '}
              Unlike classic donations, reaching a campaign's financial goal does not finish the work. Ad budget must be deployed into live ad networks with strict compliance verification, image sizing, and targeting setup before advertising starts.
            </Text>
          </View>
        </Card>
      </Animated.View>

      {/* Action Buttons */}
      <Animated.View entering={FadeInUp.delay(300).duration(450)} style={styles.actionsContainer}>
        <Button
          title="View in Creator Dashboard"
          variant="primary"
          size="lg"
          fullWidth
          iconLeft={<LayoutDashboard size={18} color={theme.colors.onLime} />}
          onPress={handleDashboard}
        />

        <View style={styles.shareWrapper}>
          <Button
            title="Share Campaign"
            variant="secondary"
            size="md"
            fullWidth
            disabled={true}
            iconLeft={<Share2 size={16} color={theme.colors.textSecondary} />}
            onPress={() => {}}
          />
          <Text style={styles.shareDisabledNote}>
            Public sharing link will become available once the campaign is approved and published.
          </Text>
        </View>

        <Button
          title="Create Another Campaign"
          variant="ghost"
          size="md"
          fullWidth
          iconLeft={<PlusCircle size={16} color={theme.colors.textSecondary} />}
          onPress={handleCreateAnother}
        />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    padding: theme.spacing.base,
    paddingTop: theme.spacing.lg,
    paddingBottom: 60,
    gap: theme.spacing.lg,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    gap: 8,
  },
  successIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: theme.colors.tintedPillBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: theme.colors.lime,
  },
  heroTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 26,
    lineHeight: 32,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 440,
  },
  cardWrapper: {
    width: '100%',
  },
  timelineCard: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  timelineHeader: {
    gap: 4,
  },
  timelineHeading: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  timelineSubheading: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  timelineComponent: {
    paddingVertical: theme.spacing.xs,
  },
  distributionNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.surfaceRaised,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.line,
    marginTop: 4,
  },
  distributionNoteText: {
    flex: 1,
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  distributionNoteBold: {
    fontFamily: theme.typography.fonts.uiBold,
    color: theme.colors.textPrimary,
  },
  actionsContainer: {
    width: '100%',
    gap: theme.spacing.md,
  },
  shareWrapper: {
    gap: 4,
  },
  shareDisabledNote: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
});
