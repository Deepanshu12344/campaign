import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Sparkles,
  Send,
  AlertCircle,
  CheckCircle,
} from 'lucide-react-native';
import { CATEGORIES, CAMPAIGN_STATUSES } from '@campaigns/shared';
import { theme } from '../../theme';
import {
  Button,
  Card,
  ProgressBar,
  StatusPill,
  CategoryChip,
  Skeleton,
  EmptyState,
  ErrorState,
  useToast,
  Accordion,
  InfoTip,
  Sheet,
  Segmented,
  TextField,
  TextArea,
  Avatar,
  Stat,
  Timeline,
  StepIndicator,
  StickyActionBar,
  SourceItem,
  ReachEstimateBadge,
  DemoDataBadge,
} from '../../components/ui';
import { CampaignCard } from '../../components/campaign/CampaignCard';
import { MOCK_CAMPAIGNS } from '../../mocks/campaigns';

export default function ComponentsShowcaseScreen() {
  const router = useRouter();
  const toast = useToast();

  // Interactive States
  const [selectedCategory, setSelectedCategory] = useState<string>('Health');
  const [segmentedIndex, setSegmentedIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [inputVal, setInputVal] = useState('Clean Water for Everyone');
  const [errorInputVal, setErrorInputVal] = useState('Invalid headline');
  const [textAreaVal, setTextAreaVal] = useState(
    'We are amplifying awareness around lead water lines and civil testing transparency.'
  );

  const statuses = CAMPAIGN_STATUSES;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Stack.Screen
        options={{
          title: 'Design System',
          headerShown: false,
        }}
      />

      <View style={styles.header}>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => router.back()}
          iconLeft={<ArrowLeft size={18} color={theme.colors.ink800} />}
          accessibilityLabel="Go back"
        />
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Design System Gallery</Text>
          <Text style={styles.headerSubtitle}>
            Tokens, UI Components & States
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION: Theme & Typography */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Typography & Tokens</Text>
          <Card>
            <Text style={styles.h1}>Heading 1 (Newsreader Bold 30)</Text>
            <Text style={styles.h2}>Heading 2 (Newsreader SemiBold 24)</Text>
            <Text style={styles.h3}>Heading 3 (Newsreader SemiBold 20)</Text>
            <Text style={styles.bodyText}>
              Body text (Plus Jakarta Sans Regular 15 / 22). Clean high-contrast
              editorial layout matching the Campaigns guidelines.
            </Text>
            <Text style={styles.captionText}>
              Caption (Plus Jakarta Sans Medium 13 / 18) for secondary metrics.
            </Text>
          </Card>
        </View>

        {/* SECTION: Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Buttons</Text>
          <Text style={styles.sectionDesc}>
            Primary, secondary, ghost, danger with loading & disabled states.
          </Text>
          <Card style={styles.columnGap}>
            <View style={styles.rowWrap}>
              <Button title="Primary (lg)" size="lg" variant="primary" />
              <Button title="Primary (md)" size="md" variant="primary" />
              <Button title="Primary (sm)" size="sm" variant="primary" />
            </View>

            <View style={styles.rowWrap}>
              <Button title="Secondary" variant="secondary" />
              <Button title="Ghost" variant="ghost" />
              <Button title="Danger" variant="danger" />
            </View>

            <View style={styles.rowWrap}>
              <Button
                title="With Left Icon"
                variant="primary"
                iconLeft={<Sparkles size={16} color="#FFFFFF" />}
              />
              <Button
                title="With Right Icon"
                variant="secondary"
                iconRight={<Send size={16} color={theme.colors.ink800} />}
              />
            </View>

            <View style={styles.rowWrap}>
              <Button title="Loading State" variant="primary" loading />
              <Button title="Disabled State" variant="primary" disabled />
            </View>
          </Card>
        </View>

        {/* SECTION: Status Pills */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Status Pills (13 Lifecycle States)</Text>
          <Text style={styles.sectionDesc}>
            Dedicated icon + label for every state. Never color-only.
          </Text>
          <Card>
            <View style={styles.pillsGrid}>
              {statuses.map((s) => (
                <StatusPill key={s} status={s} />
              ))}
            </View>
          </Card>
        </View>

        {/* SECTION: Category Chips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Category Chips (10 Categories)</Text>
          <Text style={styles.sectionDesc}>
            Tappable filter chips with category icons and optional count badges.
          </Text>
          <Card>
            <View style={styles.chipsGrid}>
              {CATEGORIES.map((cat, idx) => (
                <CategoryChip
                  key={cat}
                  category={cat}
                  selected={selectedCategory === cat}
                  count={idx + 3}
                  onPress={() => setSelectedCategory(cat)}
                />
              ))}
            </View>
          </Card>
        </View>

        {/* SECTION: Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Badges & Disclaimers</Text>
          <Card style={styles.columnGap}>
            <Text style={styles.groupLabel}>Reach Estimate Badge:</Text>
            <ReachEstimateBadge low={45000} high={98000} showSubtitle />
            <ReachEstimateBadge low={120000} high={250000} size="sm" />

            <Text style={[styles.groupLabel, { marginTop: theme.spacing.sm }]}>
              Demo Data Disclaimers:
            </Text>
            <View style={styles.rowWrap}>
              <DemoDataBadge size="sm" />
              <DemoDataBadge size="md" />
            </View>
          </Card>
        </View>

        {/* SECTION: Progress Bars */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Progress Bars</Text>
          <Text style={styles.sectionDesc}>
            Animated fill on mount. Turns emerald green at 100%+.
          </Text>
          <Card style={styles.columnGap}>
            <View>
              <Text style={styles.captionText}>0% Funded (sm)</Text>
              <ProgressBar value={0} size="sm" />
            </View>
            <View>
              <Text style={styles.captionText}>42% Funded (md)</Text>
              <ProgressBar value={42} size="md" />
            </View>
            <View>
              <Text style={styles.captionText}>75% Funded (lg)</Text>
              <ProgressBar value={75} size="lg" />
            </View>
            <View>
              <Text style={styles.captionText}>100% Funded (Completed Success)</Text>
              <ProgressBar value={100} size="md" />
            </View>
          </Card>
        </View>

        {/* SECTION: Form Fields */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Form Fields</Text>
          <Card style={styles.columnGap}>
            <TextField
              label="Campaign Title"
              required
              value={inputVal}
              onChangeText={setInputVal}
              placeholder="e.g. Clean Drinking Water in Jackson"
              helperText="A clear title helps supporters understand the core message."
            />

            <TextField
              label="Headline with Validation Error"
              value={errorInputVal}
              onChangeText={setErrorInputVal}
              error="Headline must not contain exaggerated or unverified claims."
            />

            <TextField
              label="Disabled Field"
              value="Fixed system identifier"
              disabled
              helperText="Cannot be changed after submission."
            />

            <TextArea
              label="Campaign Summary"
              required
              value={textAreaVal}
              onChangeText={setTextAreaVal}
              maxLength={160}
              placeholder="Summarize the core message..."
              helperText="Displayed prominently on the campaign feed card."
            />
          </Card>
        </View>

        {/* SECTION: Segmented Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Segmented Control</Text>
          <Card>
            <Segmented
              options={['All Campaigns', 'Active', 'Funded', 'Completed']}
              selectedIndex={segmentedIndex}
              onChange={setSegmentedIndex}
            />
            <Text style={[styles.captionText, { marginTop: theme.spacing.sm }]}>
              Selected tab: {['All Campaigns', 'Active', 'Funded', 'Completed'][segmentedIndex]}
            </Text>
          </Card>
        </View>

        {/* SECTION: Avatars & Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Avatars & Stats</Text>
          <Card style={styles.columnGap}>
            <Text style={styles.groupLabel}>Avatars (Initials & Images):</Text>
            <View style={styles.rowWrap}>
              <Avatar name="Elena Rostova" size="sm" />
              <Avatar name="Jackson Coalition" size="md" />
              <Avatar
                name="Dr. Marcus Vance"
                size="lg"
                uri="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
              />
              <Avatar name="Clean Water" size="xl" />
            </View>

            <Text style={[styles.groupLabel, { marginTop: theme.spacing.sm }]}>
              Key Statistics:
            </Text>
            <View style={styles.rowWrap}>
              <Stat
                value="$1,125"
                label="Total Raised"
                source="Audited Stripe escrow ledger"
              />
              <Stat
                value="136k"
                label="Target Audience"
                source="Meta Graph CPM formula"
              />
            </View>
          </Card>
        </View>

        {/* SECTION: InfoTips & Sheets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. InfoTips & Bottom Sheet</Text>
          <Text style={styles.sectionDesc}>
            Built-in presets explaining reach, fees, and review principles.
          </Text>
          <Card style={styles.columnGap}>
            <View style={styles.infoTipRow}>
              <Text style={styles.bodyText}>Estimated Reach Info:</Text>
              <InfoTip term="estimatedReach" />
            </View>
            <View style={styles.infoTipRow}>
              <Text style={styles.bodyText}>Platform Fee (10%):</Text>
              <InfoTip term="platformFee" />
            </View>
            <View style={styles.infoTipRow}>
              <Text style={styles.bodyText}>Use of Funds ("Not a Donation"):</Text>
              <InfoTip term="useOfFunds" />
            </View>
            <View style={styles.infoTipRow}>
              <Text style={styles.bodyText}>Review & Fact-checking:</Text>
              <InfoTip term="reviewProcess" />
            </View>
            <View style={styles.infoTipRow}>
              <Text style={styles.bodyText}>CPM & Impressions:</Text>
              <InfoTip term="cpmAndImpressions" />
            </View>

            <Button
              title="Open Custom Bottom Sheet"
              variant="secondary"
              onPress={() => setSheetOpen(true)}
              style={{ marginTop: theme.spacing.sm }}
            />
          </Card>
        </View>

        {/* SECTION: Accordions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Accordions</Text>
          <Accordion title="Where do the funds actually go?" defaultOpen>
            <Text style={styles.accordionBody}>
              90% of contributions strictly fund external digital ad inventory
              (social feeds, display banners, search amplification) to spread
              the campaign message. 10% covers fact-checking and platform hosting.
            </Text>
          </Accordion>
          <Accordion title="Is this tax-deductible?">
            <Text style={styles.accordionBody}>
              No. Contributions are commercial payments for message distribution
              services, not 501(c)(3) charitable donations.
            </Text>
          </Accordion>
          <Accordion title="Can I sponsor anonymously?">
            <Text style={styles.accordionBody}>
              Yes. By default, your name is kept private on the public backer
              roll. You may choose to display your name or handle in checkout.
            </Text>
          </Accordion>
        </View>

        {/* SECTION: Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Timeline</Text>
          <Card>
            <Timeline
              items={[
                {
                  id: '1',
                  title: 'Campaign Submitted',
                  description: 'Draft submitted by creator for editorial verification.',
                  date: 'Oct 12, 2026',
                  status: 'completed',
                },
                {
                  id: '2',
                  title: 'Editorial & Source Verification',
                  description: 'All 3 citations verified against public records.',
                  date: 'Oct 13, 2026',
                  status: 'completed',
                },
                {
                  id: '3',
                  title: 'Public Funding Period',
                  description: 'Crowd-funding ad budget towards $1,500 goal.',
                  date: 'Current',
                  status: 'current',
                },
                {
                  id: '4',
                  title: 'Ad Distribution Launch',
                  description: 'Targeted reach across selected regions begins.',
                  date: 'Scheduled',
                  status: 'upcoming',
                },
              ]}
            />
          </Card>
        </View>

        {/* SECTION: Step Indicator */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. Step Indicator (5-Step Creation)</Text>
          <Text style={styles.sectionDesc}>
            1 Basics → 2 Story → 3 Visuals → 4 Reach → 5 Submit (tap to jump)
          </Text>
          <Card>
            <StepIndicator
              currentStep={currentStep}
              onStepPress={(step) => setCurrentStep(step)}
            />
            <View style={styles.stepControls}>
              <Button
                title="Previous"
                size="sm"
                variant="secondary"
                disabled={currentStep <= 1}
                onPress={() => setCurrentStep((s) => Math.max(1, s - 1))}
              />
              <Button
                title="Next Step"
                size="sm"
                variant="primary"
                disabled={currentStep >= 5}
                onPress={() => setCurrentStep((s) => Math.min(5, s + 1))}
              />
            </View>
          </Card>
        </View>

        {/* SECTION: SourceItem */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>14. Source Item</Text>
          <Text style={styles.sectionDesc}>
            Transparent citations with external link and verification badge.
          </Text>
          <SourceItem
            title="Jackson Water Crisis Lead & Copper Rule Compliance Report"
            url="https://www.epa.gov/ms/jackson-water-crisis-updates"
            publisher="US Environmental Protection Agency"
            verified
          />
          <View style={{ height: theme.spacing.sm }} />
          <SourceItem
            title="Community Water Center: Central Valley Well Testing Data"
            url="https://www.communitywatercenter.org/data"
            publisher="Community Water Center"
            verified
          />
        </View>

        {/* SECTION: Feedback States & Toasts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>15. Interactive Toasts & Feedback</Text>
          <Card style={styles.columnGap}>
            <View style={styles.rowWrap}>
              <Button
                title="Success Toast"
                variant="primary"
                size="sm"
                iconLeft={<CheckCircle size={14} color="#FFFFFF" />}
                onPress={() =>
                  toast.success(
                    'Contribution recorded! $50 added to the ad distribution pool.'
                  )
                }
              />
              <Button
                title="Info Toast"
                variant="secondary"
                size="sm"
                onPress={() =>
                  toast.info('Ad targeting updated: Jackson metro area selected.')
                }
              />
              <Button
                title="Warning Toast"
                variant="secondary"
                size="sm"
                onPress={() =>
                  toast.warning('Goal deadline approaching: 48 hours left.')
                }
              />
              <Button
                title="Error Toast"
                variant="danger"
                size="sm"
                iconLeft={<AlertCircle size={14} color="#FFFFFF" />}
                onPress={() =>
                  toast.error('Payment failed: Card expired or network error.')
                }
              />
            </View>
          </Card>
        </View>

        {/* SECTION: Empty & Error States */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>16. Empty & Error States</Text>
          <Card style={styles.columnGap}>
            <EmptyState
              title="No campaigns found"
              description="Try adjusting your category filter or search keywords to discover active causes."
              buttonTitle="Reset Filters"
              onPress={() => setSelectedCategory('Health')}
            />
            <View style={styles.divider} />
            <ErrorState
              title="Connection Error"
              message="Failed to fetch latest ad distribution metrics from the server."
              onRetry={() => toast.info('Retrying connection...')}
            />
          </Card>
        </View>

        {/* SECTION: Skeletons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>17. Shimmer Skeletons</Text>
          <Card style={styles.columnGap}>
            <View style={styles.rowWrap}>
              <Skeleton width={50} height={50} radius={25} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width="80%" height={16} />
                <Skeleton width="50%" height={12} />
              </View>
            </View>
            <Skeleton width="100%" height={120} radius={theme.radius.md} />
          </Card>
        </View>

        {/* SECTION: Campaign Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>18. Campaign Cards</Text>
          <Text style={styles.sectionDesc}>
            All 4 card variants: Featured, Default, Compact, and Skeleton.
          </Text>

          {/* Featured Variant */}
          <Text style={styles.cardVariantLabel}>Variant: Featured (Hero)</Text>
          <CampaignCard
            campaign={MOCK_CAMPAIGNS[0]}
            variant="featured"
            onPress={() => toast.info(`Opened: ${MOCK_CAMPAIGNS[0].title}`)}
            onBackPress={() =>
              toast.success(`Backing: ${MOCK_CAMPAIGNS[0].title}`)
            }
          />

          {/* Default Variant */}
          <Text style={[styles.cardVariantLabel, { marginTop: theme.spacing.lg }]}>
            Variant: Default (Feed)
          </Text>
          <CampaignCard
            campaign={MOCK_CAMPAIGNS[1]}
            variant="default"
            onPress={() => toast.info(`Opened: ${MOCK_CAMPAIGNS[1].title}`)}
            onBackPress={() =>
              toast.success(`Backing: ${MOCK_CAMPAIGNS[1].title}`)
            }
          />

          {/* Compact Variant */}
          <Text style={[styles.cardVariantLabel, { marginTop: theme.spacing.lg }]}>
            Variant: Compact (Horizontal)
          </Text>
          <CampaignCard
            campaign={MOCK_CAMPAIGNS[2]}
            variant="compact"
            onPress={() => toast.info(`Opened: ${MOCK_CAMPAIGNS[2].title}`)}
          />

          {/* Skeleton Variant */}
          <Text style={[styles.cardVariantLabel, { marginTop: theme.spacing.lg }]}>
            Variant: Skeleton Placeholder
          </Text>
          <CampaignCard variant="skeleton" />
        </View>

        {/* Bottom spacing for sticky action bar */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* SECTION: Sticky Action Bar */}
      <StickyActionBar
        primaryAction={{
          title: 'Simulate Contribution',
          onPress: () =>
            toast.success('Simulated pledge of $25! Thank you for spreading the word.'),
        }}
        priceSummary={{
          label: 'Total Ad Impact',
          amount: '$25.00',
        }}
      />

      {/* Bottom Sheet Modal */}
      <Sheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Interactive Bottom Sheet"
      >
        <View style={{ gap: theme.spacing.md, paddingVertical: theme.spacing.sm }}>
          <Text style={styles.bodyText}>
            This bottom sheet includes touch-dismiss, drag handle, backdrop blur,
            and keyboard safe area padding.
          </Text>
          <Button
            title="Close Sheet"
            variant="secondary"
            fullWidth
            onPress={() => setSheetOpen(false)}
          />
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
    backgroundColor: theme.colors.surface,
  },
  headerTitleWrap: {
    marginLeft: theme.spacing.sm,
  },
  headerTitle: {
    fontFamily: theme.typography.fonts.serifSemiBold,
    fontSize: 20,
    color: theme.colors.ink900,
  },
  headerSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.ink500,
  },
  scrollContent: {
    padding: theme.spacing.base,
    gap: theme.spacing.xl,
  },
  section: {
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    fontFamily: theme.typography.fonts.serifSemiBold,
    fontSize: 18,
    color: theme.colors.ink900,
  },
  sectionDesc: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.ink600,
    marginBottom: theme.spacing.xxs,
  },
  columnGap: {
    gap: theme.spacing.md,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  h1: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: theme.typography.styles.h1.fontSize,
    lineHeight: theme.typography.styles.h1.lineHeight,
    color: theme.colors.ink900,
    marginBottom: 6,
  },
  h2: {
    fontFamily: theme.typography.fonts.serifSemiBold,
    fontSize: theme.typography.styles.h2.fontSize,
    lineHeight: theme.typography.styles.h2.lineHeight,
    color: theme.colors.ink900,
    marginBottom: 6,
  },
  h3: {
    fontFamily: theme.typography.fonts.serifSemiBold,
    fontSize: theme.typography.styles.h3.fontSize,
    lineHeight: theme.typography.styles.h3.lineHeight,
    color: theme.colors.ink900,
    marginBottom: 6,
  },
  bodyText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.body.fontSize,
    lineHeight: theme.typography.styles.body.lineHeight,
    color: theme.colors.ink700,
  },
  captionText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: theme.typography.styles.caption.fontSize,
    lineHeight: theme.typography.styles.caption.lineHeight,
    color: theme.colors.ink500,
  },
  pillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  groupLabel: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.ink800,
  },
  infoTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xxs,
  },
  accordionBody: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.ink700,
  },
  stepControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.base,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.line,
    marginVertical: theme.spacing.xs,
  },
  cardVariantLabel: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.primary700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
});
