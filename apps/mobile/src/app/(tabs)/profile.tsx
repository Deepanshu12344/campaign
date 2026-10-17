import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import {
  Heart,
  Bookmark,
  Receipt,
  Settings,
  Bell,
  LayoutDashboard,
  HelpCircle,
  ChevronRight,
  Sliders,
  LogIn,
  UserPlus,
  Compass,
  Sparkles,
  ShieldCheck,
} from 'lucide-react-native';
import { theme } from '../../theme';
import { SharedHeader } from '../../components/layout/SharedHeader';
import { Card, Button, Avatar, Sheet } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { useMyCampaigns } from '../../api/hooks/useCreator';
import { useMyContributions } from '../../api/hooks/useContributions';
import { useSavedCampaigns } from '../../api/hooks/useInteractions';

interface HelpTopic {
  id: string;
  title: string;
  description: string;
  content: string;
}

const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'how-it-works',
    title: 'How Campaigns Works',
    description: 'Ad distribution, not donations',
    content:
      'Campaigns is a crowdfunding platform that turns public support directly into paid digital advertising. Every dollar contributed (minus a transparent platform and payment fee) buys ad impressions on social feeds, search engines, and media sites to spread awareness on important causes. Backers do not make tax-deductible charitable donations; they fund targeted ad distribution.',
  },
  {
    id: 'faqs',
    title: 'Frequently Asked Questions',
    description: 'Funding goals, refunds, and delivery',
    content:
      'Q: Can I back a campaign without an account?\nA: Yes! Guest checkout is fully supported. You receive a cryptographic guest receipt token stored safely on your device.\n\nQ: What happens if a campaign does not reach its goal?\nA: In this prototype demonstration, if a funding deadline expires before the goal is met, pledges are marked for refund.\n\nQ: How is reach estimated?\nA: Estimated reach is modeled based on historical CPM (cost per thousand impressions) benchmarks. Measured reach is only calculated and displayed after ads actually run.',
  },
  {
    id: 'guidelines',
    title: 'Community & Advertising Guidelines',
    description: 'Editorial standards and fact-checking',
    content:
      'All campaigns undergo human and automated editorial review before any ads are delivered. Claims of fact must cite verifiable public sources. Hate speech, misleading medical claims, deceptive financial schemes, and malicious content are strictly prohibited.',
  },
  {
    id: 'terms',
    title: 'Terms of Service',
    description: 'Rights, responsibilities, and ad contracts',
    content:
      'By creating or backing a campaign, you agree that campaign media assets and ad copy become public creative distributed under digital advertising network policies. Creators retain moral rights to their stories.',
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    description: 'Private backer names by default',
    content:
      'Your privacy is protected by design. Backer names and billing details are kept strictly private by default and are never visible to the public or ad viewers. We never sell your personal contact information to third-party data brokers.',
  },
  {
    id: 'about',
    title: 'About Campaigns',
    description: 'Empowering civic and social impact',
    content:
      'Campaigns was founded to democratize advertising power. We believe that causes with passionate grassroots supporters should have the same high-visibility reach as corporate advertisers.',
  },
  {
    id: 'partners',
    title: 'Advertising & Verification Partners',
    description: 'Ad networks and transparency bodies',
    content:
      'Our ad distribution infrastructure connects to major ad networks, programmatic display exchanges, and independent media transparency registries to verify real audience delivery and impression reports.',
  },
  {
    id: 'contact',
    title: 'Contact Support',
    description: 'Get help or report a campaign',
    content:
      'Have questions, feedback, or need help with a pledge? Reach our community operations team at support@campaigns.demo or through in-app feedback channels.',
  },
];

export default function ProfileTabScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  // Queries for live counts
  const { data: myCampaigns } = useMyCampaigns();
  const { data: contributions } = useMyContributions();
  const { data: savedCampaigns } = useSavedCampaigns();

  const createdCount = myCampaigns?.length ?? 0;
  const backedCount = contributions?.length ?? 0;
  const savedCount = savedCampaigns?.length ?? 0;

  // Help Sheet state
  const [showHelpSheet, setShowHelpSheet] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);

  // Easter egg: 7 taps on version within 3.5 seconds opens demo/control
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);

  const handleVersionTap = () => {
    const now = Date.now();
    if (now - lastTapTimeRef.current < 3500) {
      tapCountRef.current += 1;
    } else {
      tapCountRef.current = 1;
    }
    lastTapTimeRef.current = now;

    if (tapCountRef.current >= 7) {
      tapCountRef.current = 0;
      router.push('/demo/control');
    }
  };

  return (
    <View style={styles.container}>
      <SharedHeader title="Profile" showBack={false} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isAuthenticated && user ? (
          /* Authenticated Header Card */
          <Card style={styles.headerCard}>
            <View style={styles.userInfoRow}>
              <Avatar
                name={user.name}
                imageUrl={user.avatarUrl || undefined}
                size="lg"
              />
              <View style={styles.userTextMeta}>
                <Text style={styles.userName} numberOfLines={1}>
                  {user.name}
                </Text>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {user.email}
                </Text>

                {/* Dynamic Role Chips */}
                <View style={styles.roleChipsRow}>
                  {/* Audience chip: always active */}
                  <View style={styles.roleChip}>
                    <Compass size={11} color={theme.colors.ink700} />
                    <Text style={styles.roleChipText}>Audience</Text>
                  </View>

                  {/* Creator chip: if created any campaigns */}
                  {createdCount > 0 && (
                    <View style={[styles.roleChip, styles.creatorChip]}>
                      <Sparkles size={11} color={theme.colors.primary700} />
                      <Text style={[styles.roleChipText, styles.creatorChipText]}>Creator</Text>
                    </View>
                  )}

                  {/* Backer chip: if backed any campaigns */}
                  {backedCount > 0 && (
                    <View style={[styles.roleChip, styles.backerChip]}>
                      <ShieldCheck size={11} color={theme.colors.emerald700} />
                      <Text style={[styles.roleChipText, styles.backerChipText]}>Backer</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Quick Metrics Bar */}
            <View style={styles.metricsBar}>
              <Pressable
                style={styles.metricItem}
                onPress={() => router.push('/creator/dashboard')}
              >
                <Text style={styles.metricValue}>{createdCount}</Text>
                <Text style={styles.metricLabel}>Created</Text>
              </Pressable>
              <View style={styles.metricDivider} />
              <Pressable
                style={styles.metricItem}
                onPress={() => router.push('/profile/backed')}
              >
                <Text style={styles.metricValue}>{backedCount}</Text>
                <Text style={styles.metricLabel}>Backed</Text>
              </Pressable>
              <View style={styles.metricDivider} />
              <Pressable
                style={styles.metricItem}
                onPress={() => router.push('/profile/saved')}
              >
                <Text style={styles.metricValue}>{savedCount}</Text>
                <Text style={styles.metricLabel}>Saved</Text>
              </Pressable>
            </View>
          </Card>
        ) : (
          /* Signed-Out Prompt Card */
          <Card style={styles.guestCard}>
            <View style={styles.guestIconCircle}>
              <Compass size={32} color={theme.colors.primary600} />
            </View>
            <Text style={styles.guestTitle}>Welcome to Campaigns</Text>
            <Text style={styles.guestSubtitle}>
              Browsing causes and backing advertising distribution never require an account. Sign in
              to create new campaigns, track saved favorites, or manage settings across devices.
            </Text>
            <View style={styles.guestButtonsRow}>
              <Button
                label="Sign In"
                variant="primary"
                size="md"
                icon={<LogIn size={16} color={theme.colors.white} />}
                onPress={() => router.push('/auth/sign-in')}
                style={styles.guestBtn}
              />
              <Button
                label="Sign Up"
                variant="secondary"
                size="md"
                icon={<UserPlus size={16} color={theme.colors.ink800} />}
                onPress={() => router.push('/auth/sign-up')}
                style={styles.guestBtn}
              />
            </View>
          </Card>
        )}

        {/* Section Navigation Menu */}
        <Card style={styles.menuCard}>
          <Text style={styles.menuSectionTitle}>Campaign Management</Text>

          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
            onPress={() => router.push('/creator/dashboard')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconCircle, { backgroundColor: theme.colors.primary50 }]}>
                <LayoutDashboard size={18} color={theme.colors.primary700} />
              </View>
              <Text style={styles.menuLabel}>Creator Dashboard</Text>
            </View>
            <View style={styles.menuRight}>
              {createdCount > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{createdCount}</Text>
                </View>
              )}
              <ChevronRight size={18} color={theme.colors.ink400} />
            </View>
          </Pressable>

          <View style={styles.menuDivider} />

          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
            onPress={() => router.push('/profile/backed')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconCircle, { backgroundColor: theme.colors.rose50 }]}>
                <Heart size={18} color={theme.colors.rose600} />
              </View>
              <Text style={styles.menuLabel}>Backed Campaigns</Text>
            </View>
            <View style={styles.menuRight}>
              {backedCount > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{backedCount}</Text>
                </View>
              )}
              <ChevronRight size={18} color={theme.colors.ink400} />
            </View>
          </Pressable>

          <View style={styles.menuDivider} />

          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
            onPress={() => router.push('/profile/saved')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconCircle, { backgroundColor: theme.colors.amber50 }]}>
                <Bookmark size={18} color={theme.colors.amber600} />
              </View>
              <Text style={styles.menuLabel}>Saved Campaigns</Text>
            </View>
            <View style={styles.menuRight}>
              {savedCount > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{savedCount}</Text>
                </View>
              )}
              <ChevronRight size={18} color={theme.colors.ink400} />
            </View>
          </Pressable>

          <View style={styles.menuDivider} />

          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
            onPress={() => router.push('/profile/payments')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconCircle, { backgroundColor: theme.colors.emerald50 }]}>
                <Receipt size={18} color={theme.colors.emerald700} />
              </View>
              <Text style={styles.menuLabel}>Payment History & Receipts</Text>
            </View>
            <View style={styles.menuRight}>
              <ChevronRight size={18} color={theme.colors.ink400} />
            </View>
          </Pressable>
        </Card>

        {/* Preferences & Settings */}
        <Card style={styles.menuCard}>
          <Text style={styles.menuSectionTitle}>Preferences & Account</Text>

          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
            onPress={() => router.push('/profile/notifications-settings')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconCircle, { backgroundColor: theme.colors.primary50 }]}>
                <Bell size={18} color={theme.colors.primary700} />
              </View>
              <Text style={styles.menuLabel}>Notification Preferences</Text>
            </View>
            <View style={styles.menuRight}>
              <ChevronRight size={18} color={theme.colors.ink400} />
            </View>
          </Pressable>

          <View style={styles.menuDivider} />

          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
            onPress={() => router.push('/profile/settings')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconCircle, { backgroundColor: theme.colors.bgMuted }]}>
                <Settings size={18} color={theme.colors.ink700} />
              </View>
              <Text style={styles.menuLabel}>Account Settings</Text>
            </View>
            <View style={styles.menuRight}>
              <ChevronRight size={18} color={theme.colors.ink400} />
            </View>
          </Pressable>
        </Card>

        {/* Support & Legal (Always accessible, even signed out) */}
        <Card style={styles.menuCard}>
          <Text style={styles.menuSectionTitle}>Information & Support</Text>

          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
            onPress={() => {
              setSelectedTopic(null);
              setShowHelpSheet(true);
            }}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconCircle, { backgroundColor: theme.colors.primary50 }]}>
                <HelpCircle size={18} color={theme.colors.primary700} />
              </View>
              <View>
                <Text style={styles.menuLabel}>Help & Support</Text>
                <Text style={styles.menuSubLabel}>FAQs, Terms, Privacy, Guidelines & About</Text>
              </View>
            </View>
            <View style={styles.menuRight}>
              <ChevronRight size={18} color={theme.colors.ink400} />
            </View>
          </Pressable>

          {/* Admin shortcut if applicable */}
          {user?.role === 'ADMIN' && (
            <>
              <View style={styles.menuDivider} />
              <Pressable
                style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
                onPress={() => router.push('/demo/control')}
              >
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIconCircle, { backgroundColor: theme.colors.amber50 }]}>
                    <Sliders size={18} color={theme.colors.amber700} />
                  </View>
                  <Text style={styles.menuLabel}>Reviewer Control Panel</Text>
                </View>
                <View style={styles.menuRight}>
                  <ChevronRight size={18} color={theme.colors.ink400} />
                </View>
              </Pressable>
            </>
          )}
        </Card>

        {/* Version Footer with 7-tap gesture */}
        <Pressable
          style={styles.versionContainer}
          onPress={handleVersionTap}
          hitSlop={12}
        >
          <Text style={styles.versionText}>Campaigns v1.0.0-demo (build 42)</Text>
          <Text style={styles.versionSubtext}>Public Cause Advertising Network</Text>
        </Pressable>
      </ScrollView>

      {/* Help & Support Sheet */}
      <Sheet
        visible={showHelpSheet}
        onClose={() => {
          setShowHelpSheet(false);
          setSelectedTopic(null);
        }}
        title={selectedTopic ? selectedTopic.title : 'Help & Support'}
      >
        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          {selectedTopic ? (
            <View style={styles.topicDetailBox}>
              <Text style={styles.topicDetailDescription}>{selectedTopic.description}</Text>
              <Text style={styles.topicDetailContent}>{selectedTopic.content}</Text>
              <View style={styles.topicButtonsRow}>
                <Button
                  title="Open Full Page"
                  variant="primary"
                  size="sm"
                  onPress={() => {
                    setShowHelpSheet(false);
                    const slugMap: Record<string, string> = {
                      guidelines: 'community-guidelines',
                      faq: 'faqs',
                    };
                    const target = slugMap[selectedTopic.id] || selectedTopic.id;
                    router.push(`/info/${target}` as Href);
                  }}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Back to topics"
                  variant="secondary"
                  size="sm"
                  onPress={() => setSelectedTopic(null)}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          ) : (
            <View style={styles.topicsList}>
              {HELP_TOPICS.map((topic) => (
                <Pressable
                  key={topic.id}
                  style={({ pressed }) => [styles.topicItem, pressed && styles.topicItemPressed]}
                  onPress={() => setSelectedTopic(topic)}
                >
                  <View style={styles.topicTextContainer}>
                    <Text style={styles.topicItemTitle}>{topic.title}</Text>
                    <Text style={styles.topicItemDesc}>{topic.description}</Text>
                  </View>
                  <ChevronRight size={16} color={theme.colors.ink400} />
                </Pressable>
              ))}

              <View style={styles.fullHelpCenterBox}>
                <Button
                  title="Open Help & Support Center"
                  variant="secondary"
                  size="md"
                  fullWidth
                  onPress={() => {
                    setShowHelpSheet(false);
                    router.push('/info/help' as Href);
                  }}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgMuted,
  },
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: theme.spacing['4xl'],
    gap: theme.spacing.base,
  },
  headerCard: {
    padding: theme.spacing.base,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.base,
  },
  userTextMeta: {
    flex: 1,
  },
  userName: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: theme.typography.styles.h3.fontSize,
    lineHeight: theme.typography.styles.h3.lineHeight,
    color: theme.colors.ink900,
  },
  userEmail: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.ink500,
    marginTop: 1,
  },
  roleChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: theme.spacing.xs,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.bgMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  roleChipText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
    color: theme.colors.ink700,
  },
  creatorChip: {
    backgroundColor: theme.colors.primary50,
    borderColor: theme.colors.primary200,
  },
  creatorChipText: {
    color: theme.colors.primary700,
    fontFamily: theme.typography.fonts.uiSemiBold,
  },
  backerChip: {
    backgroundColor: theme.colors.emerald50,
    borderColor: theme.colors.emerald200,
  },
  backerChipText: {
    color: theme.colors.emerald700,
    fontFamily: theme.typography.fonts.uiSemiBold,
  },
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: theme.spacing.base,
    paddingTop: theme.spacing.base,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 18,
    color: theme.colors.ink900,
  },
  metricLabel: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.ink500,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.line,
  },
  guestCard: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  guestIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  guestTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: theme.typography.styles.h3.fontSize,
    color: theme.colors.ink900,
    textAlign: 'center',
    marginBottom: 4,
  },
  guestSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.bodySm.fontSize,
    color: theme.colors.ink600,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.base,
  },
  guestButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    width: '100%',
  },
  guestBtn: {
    flex: 1,
  },
  menuCard: {
    padding: theme.spacing.sm,
  },
  menuSectionTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    color: theme.colors.ink400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.md,
  },
  menuRowPressed: {
    backgroundColor: theme.colors.bgMuted,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 15,
    color: theme.colors.ink900,
  },
  menuSubLabel: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.ink500,
    marginTop: 1,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    backgroundColor: theme.colors.bgMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  countBadgeText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    color: theme.colors.ink700,
  },
  menuDivider: {
    height: 1,
    backgroundColor: theme.colors.line,
    marginLeft: 48,
    marginRight: theme.spacing.sm,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.base,
  },
  versionText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.ink400,
  },
  versionSubtext: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    color: theme.colors.ink400,
    marginTop: 2,
  },
  sheetScroll: {
    maxHeight: 460,
  },
  topicsList: {
    gap: 2,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  topicItemPressed: {
    backgroundColor: theme.colors.bgMuted,
  },
  topicTextContainer: {
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  topicItemTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 15,
    color: theme.colors.ink900,
  },
  topicItemDesc: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.ink500,
    marginTop: 2,
  },
  topicDetailBox: {
    paddingVertical: theme.spacing.sm,
  },
  topicDetailDescription: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 14,
    color: theme.colors.primary700,
    marginBottom: theme.spacing.sm,
  },
  topicDetailContent: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.ink800,
  },
  topicButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.base,
  },
  fullHelpCenterBox: {
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    marginTop: theme.spacing.sm,
  },
});
