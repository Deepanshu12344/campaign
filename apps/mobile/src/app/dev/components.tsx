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
  Upload,
} from 'lucide-react-native';
import { CATEGORIES, CAMPAIGN_STATUSES } from '@campaigns/shared';
import { theme } from '../../theme';
import {
  Button,
  IconButton,
  ArrowButton,
  Card,
  ProgressBar,
  StatusPill,
  CategoryChip,
  useToast,
  Accordion,
  Segmented,
  TextField,
  TextArea,
  Avatar,
  Stat,
  StepIndicator,
  StickyActionBar,
  SourceItem,
  ReachEstimateBadge,
} from '../../components/ui';
import { CampaignCard } from '../../components/campaign/CampaignCard';
import { MOCK_CAMPAIGNS } from '../../mocks/campaigns';

export default function ComponentsShowcaseScreen() {
  const router = useRouter();
  const toast = useToast();

  // Interactive States
  const [selectedCategory, setSelectedCategory] = useState<string>('Health');
  const [segmentedIndex, setSegmentedIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(2);
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
        <IconButton
          icon={<ArrowLeft size={20} color={theme.colors.textPrimary} strokeWidth={2} />}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        />
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>DESIGN SYSTEM</Text>
          <Text style={styles.headerSubtitle}>
            Dark Green-Black & Brand Lime Tokens
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION: Display & Typography */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Typography & Display Headlines</Text>
          <Card>
            <Text style={styles.displayHero}>SPREAD THE WORD</Text>
            <Text style={styles.displayCard}>REAL AUDIENCE REACH</Text>
            <View style={{ height: 8 }} />
            <Text style={styles.screenTitle}>Screen Title (Inter SemiBold 34)</Text>
            <Text style={styles.h1}>Heading 1 (Inter SemiBold 26)</Text>
            <Text style={styles.h2}>Heading 2 (Inter SemiBold 20)</Text>
            <Text style={styles.bodyStory}>
              Body Story (Inter Regular 17 / 27). High-legibility editorial text
              rendering off-white on dark slate surface.
            </Text>
            <Text style={styles.bodyText}>
              UI Body (Inter Regular 15 / 22). Clean crisp interface copy.
            </Text>
            <Text style={styles.captionText}>
              Caption (Inter Medium 12 / 16) for metadata and timestamps.
            </Text>
          </Card>
        </View>

        {/* SECTION: Pill Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Pill Buttons (All Variants)</Text>
          <Text style={styles.sectionDesc}>
            Lime primary, dark surface secondary, dark green tinted, white, ghost, and danger.
          </Text>
          <Card style={styles.columnGap}>
            <View style={styles.rowWrap}>
              <Button title="Primary Lime (lg)" size="lg" variant="primary" />
              <Button title="Primary (md)" size="md" variant="primary" />
              <Button title="Primary (sm)" size="sm" variant="primary" />
            </View>

            <View style={styles.rowWrap}>
              <Button title="Secondary Dark" variant="secondary" />
              <Button
                title="Upload"
                variant="tinted"
                iconLeft={<Upload size={16} color={theme.colors.lime} strokeWidth={2} />}
              />
              <Button title="Continue as guest" variant="white" />
            </View>

            <View style={styles.rowWrap}>
              <Button title="Ghost" variant="ghost" />
              <Button title="Danger" variant="danger" />
              <Button title="Loading" variant="primary" loading />
              <Button title="Disabled" variant="primary" disabled />
            </View>

            <View style={styles.rowWrap}>
              <Text style={styles.groupLabel}>Circular Action Buttons:</Text>
              <IconButton
                icon={<ArrowLeft size={20} color={theme.colors.textPrimary} strokeWidth={2} />}
                accessibilityLabel="Back"
              />
              <ArrowButton accessibilityLabel="Next slide" />
            </View>
          </Card>
        </View>

        {/* SECTION: Cards & Surfaces */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Cards & Surfaces (24dp Radius)</Text>
          <Text style={styles.sectionDesc}>
            Surface, dashed action card, and promo deep olive container.
          </Text>

          <Card variant="surface" style={{ marginBottom: 12 }}>
            <Text style={styles.cardHeader}>Standard Surface Card (#2A2D29)</Text>
            <Text style={styles.bodyText}>
              24dp radius container with subtle 1dp border (#262924) and 20dp padding.
            </Text>
          </Card>

          <Card variant="dashed" style={{ marginBottom: 12 }}>
            <Text style={styles.cardHeader}>Dashed Action Card (Upload / Create)</Text>
            <Text style={styles.bodyText}>
              Dashed border with transparent surface for secondary actions.
            </Text>
          </Card>

          <Card variant="promo">
            <Text style={[styles.cardHeader, { color: theme.colors.lime }]}>
              Promo Olive Card (#122606)
            </Text>
            <Text style={styles.bodyText}>
              Deep forest undertone used for highlights, campaigns, or notifications.
            </Text>
          </Card>
        </View>

        {/* SECTION: Status Pills */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Status Pills (13 Lifecycle States)</Text>
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
          <Text style={styles.sectionTitle}>5. Category Filter Chips (10 Categories)</Text>
          <Text style={styles.sectionDesc}>
            Selected chips turn brand lime (#9FE870) with dark green text (#163300).
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
          <Text style={styles.sectionTitle}>6. Badges & Invariant Disclaimers</Text>
          <Card style={styles.columnGap}>
            <Text style={styles.groupLabel}>Reach Estimate Badge:</Text>
            <ReachEstimateBadge low={45000} high={98000} showSubtitle />
            <ReachEstimateBadge low={120000} high={250000} size="sm" />
          </Card>
        </View>

        {/* SECTION: Progress Bars & Segmented Steps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Lime Progress & 5-Segment Indicator</Text>
          <Card style={styles.columnGap}>
            <View>
              <Text style={styles.captionText}>Funding Progress: 68%</Text>
              <ProgressBar value={68} size="md" />
            </View>

            <View style={{ marginTop: 8 }}>
              <Text style={styles.groupLabel}>5-Segment Creation Flow Indicator:</Text>
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
            </View>
          </Card>
        </View>

        {/* SECTION: Inset Form Fields */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Inset Form Fields (#1B1E19)</Text>
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
              label="Disabled Inset Field"
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
          <Text style={styles.sectionTitle}>9. Segmented Control</Text>
          <Card>
            <Segmented
              options={['All Campaigns', 'Active', 'Funded', 'Completed']}
              selectedIndex={segmentedIndex}
              onChange={setSegmentedIndex}
            />
          </Card>
        </View>

        {/* SECTION: Avatars & Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Avatars & Stats</Text>
          <Card style={styles.columnGap}>
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

        {/* SECTION: Accordions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Accordions & Required Disclosures</Text>
          <Accordion title="Where do the funds actually go?" defaultOpen>
            <Text style={styles.accordionBody}>
              NOT a donation. 90% of contributions strictly fund external digital ad inventory
              to spread the campaign message. 10% covers platform operation and verification.
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

        {/* SECTION: SourceItem */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Public Sources</Text>
          <SourceItem
            title="Jackson Water Crisis Lead & Copper Rule Compliance Report"
            url="https://www.epa.gov/ms/jackson-water-crisis-updates"
            publisher="US Environmental Protection Agency"
            verified
          />
        </View>

        {/* SECTION: Campaign Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. Campaign Cards</Text>

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

      {/* Sticky Action Bar */}
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
    backgroundColor: theme.colors.bg,
  },
  headerTitleWrap: {
    marginLeft: theme.spacing.md,
  },
  headerTitle: {
    fontFamily: theme.typography.fonts.display,
    fontSize: 18,
    letterSpacing: -0.3,
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  scrollContent: {
    padding: theme.spacing.base,
    gap: theme.spacing.xl,
  },
  section: {
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 18,
    color: theme.colors.textPrimary,
  },
  sectionDesc: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.textSecondary,
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
  displayHero: {
    fontFamily: theme.typography.fonts.display,
    fontSize: 32,
    lineHeight: 34,
    color: theme.colors.lime,
    marginBottom: 4,
  },
  displayCard: {
    fontFamily: theme.typography.fonts.display,
    fontSize: 22,
    lineHeight: 24,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  screenTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 24,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  h1: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 20,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  h2: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 17,
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  bodyStory: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 17,
    lineHeight: 27,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  bodyText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textPrimary,
  },
  captionText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.textSecondary,
  },
  cardHeader: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginBottom: 4,
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
    color: theme.colors.textPrimary,
  },
  accordionBody: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  stepControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.base,
  },
  cardVariantLabel: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    color: theme.colors.lime,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
});
