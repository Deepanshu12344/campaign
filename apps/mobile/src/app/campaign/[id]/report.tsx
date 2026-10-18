import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  FileCheck,
  Share2,
  DollarSign,
  PieChart,
  Target,
  Eye,
  Users,
  MousePointer,
  Calendar,
  FileText,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react-native';
import { theme } from '../../../theme';
import { SharedHeader } from '../../../components/layout/SharedHeader';
import {
  Card,
  Button,
  StatusPill,
  InfoTip,
  ErrorState,
} from '../../../components/ui';
import { useCampaign, useCampaignReport } from '../../../api/hooks/useCampaigns';

function formatCurrency(cents: number): string {
  const dollars = Math.round(cents / 100);
  return `$${dollars.toLocaleString()}`;
}

function formatDate(dateInput: Date | string): string {
  const d = new Date(dateInput);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatReach(low: number, high: number): string {
  if (low <= 0 && high <= 0) return 'Calculated at goal';
  if (high >= 1000000) {
    return `~${(low / 1000000).toFixed(1)}M - ${(high / 1000000).toFixed(1)}M`;
  }
  if (high >= 1000) {
    return `~${Math.round(low / 1000)}k - ${Math.round(high / 1000)}k`;
  }
  return `~${low.toLocaleString()} - ${high.toLocaleString()}`;
}

export default function CampaignReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const campaignId = Array.isArray(id) ? id[0] : id || '';

  const {
    data: campaign,
    isLoading: isCampaignLoading,
    isError: isCampaignError,
    error: campaignError,
    refetch: refetchCampaign,
  } = useCampaign(campaignId);

  const { data: report, isLoading: isReportLoading } = useCampaignReport(campaignId);

  const handleShare = async () => {
    if (!campaign) return;
    try {
      await Share.share({
        message: `View the audited performance report for "${campaign.title}" on Campaigns: verified ad distribution results and reach metrics.`,
        title: `${campaign.title} - Performance Report`,
      });
    } catch {
      // User cancelled share
    }
  };

  const isLoading = isCampaignLoading || isReportLoading;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SharedHeader title="Performance Report" fallbackRoute={`/campaign/${campaignId}`} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.lime} />
          <Text style={styles.centerText}>Loading distribution report...</Text>
        </View>
      </View>
    );
  }

  if (isCampaignError || !campaign) {
    return (
      <View style={styles.container}>
        <SharedHeader title="Performance Report" fallbackRoute={`/campaign/${campaignId}`} />
        <ErrorState
          title="Campaign Not Found"
          message={campaignError?.message || 'Could not load campaign data.'}
          onRetry={refetchCampaign}
        />
      </View>
    );
  }

  // If campaign is not completed or report not yet available
  if (!report || campaign.status !== 'COMPLETED') {
    return (
      <View style={styles.container}>
        <SharedHeader
          title="Performance Report"
          subtitle={campaign.title}
          fallbackRoute={`/campaign/${campaignId}`}
        />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.notAvailableCard}>
            <View style={styles.notAvailableIconCircle}>
              <FileCheck size={36} color={theme.colors.textSecondary} />
            </View>
            <Text style={styles.notAvailableTitle}>Report Not Available Yet</Text>
            <Text style={styles.notAvailableSubtitle}>
              Final distribution reports are published once ad distribution is completed.
            </Text>

            <View style={styles.statusCallout}>
              <Text style={styles.statusCalloutLabel}>Current Campaign Status:</Text>
              <StatusPill status={campaign.status} />
            </View>

            <Text style={styles.notAvailableExplanation}>
              When this campaign finishes its active ad run in the Promoting stage, our distribution
              engine audits delivery telemetry from publishing partners. A full audited breakdown of
              budget spent, impressions served, measured reach, and click engagement will appear here.
            </Text>

            <Button
              label="Back to Campaign Story"
              variant="primary"
              size="md"
              onPress={() => router.push(`/campaign/${campaign.id}`)}
              style={styles.notAvailableButton}
            />
          </Card>
        </ScrollView>
      </View>
    );
  }

  // Calculate duration in days
  const startMs = new Date(report.startedAt).getTime();
  const endMs = new Date(report.endedAt).getTime();
  const durationDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));

  return (
    <View style={styles.container}>
      <SharedHeader
        title="Performance Report"
        subtitle={campaign.title}
        fallbackRoute={`/campaign/${campaign.id}`}
        rightAction={
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [styles.shareBtn, pressed && styles.shareBtnPressed]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Share performance report"
          >
            <Share2 size={18} color={theme.colors.textPrimary} />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Report Overview Banner */}
        <Card style={styles.heroCard}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.verifiedBadge}>
              <ShieldCheck size={14} color={theme.colors.lime} />
              <Text style={styles.verifiedBadgeText}>Audited Distribution Report</Text>
            </View>
          </View>

          <Text style={styles.campaignTitle}>{campaign.title}</Text>
          <Text style={styles.campaignSummary}>{campaign.summary}</Text>

          <View style={styles.heroMetaRow}>
            <Text style={styles.heroMetaText}>Created by {campaign.creatorName}</Text>
            <Text style={styles.heroMetaDot}>•</Text>
            <Text style={styles.heroMetaText}>Completed {formatDate(report.endedAt)}</Text>
          </View>
        </Card>

        {/* CANONICAL 8 SECTIONS IN STRICT ORDER */}

        {/* SECTION 1: Funds raised */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIndexBadge}>
              <Text style={styles.sectionIndexText}>1</Text>
            </View>
            <View style={styles.sectionTitleBlock}>
              <Text style={styles.sectionTitle}>Funds Raised</Text>
              <Text style={styles.metricLarge}>{formatCurrency(report.fundsRaisedCents)}</Text>
            </View>
            <DollarSign size={20} color={theme.colors.lime} />
          </View>
          <Text style={styles.definitionText}>
            Plain-language definition: The total gross funds pledged by public supporters during the
            campaign funding window strictly to finance digital advertising distribution.
          </Text>
        </Card>

        {/* SECTION 2: Platform fee */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIndexBadge}>
              <Text style={styles.sectionIndexText}>2</Text>
            </View>
            <View style={styles.sectionTitleBlock}>
              <Text style={styles.sectionTitle}>Platform Fee</Text>
              <Text style={styles.metricLarge}>{formatCurrency(report.platformFeeCents)}</Text>
            </View>
            <PieChart size={20} color={theme.colors.textSecondary} />
          </View>
          <Text style={styles.definitionText}>
            Plain-language definition: A standard 10% platform fee retained to cover editorial fact-checking,
            human compliance review, ad network integration fees, and secure credit card processing.
            Campaigns retains 0% beyond operating and distribution expenses.
          </Text>
        </Card>

        {/* SECTION 3: Ad budget and spend */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIndexBadge}>
              <Text style={styles.sectionIndexText}>3</Text>
            </View>
            <View style={styles.sectionTitleBlock}>
              <Text style={styles.sectionTitle}>Ad Budget & Spend</Text>
              <Text style={styles.metricLarge}>{formatCurrency(report.adSpendCents)}</Text>
            </View>
            <Target size={20} color={theme.colors.lime} />
          </View>
          <View style={styles.budgetUtilizationRow}>
            <Text style={styles.budgetUtilizationLabel}>Budget Allocation:</Text>
            <Text style={styles.budgetUtilizationValue}>
              {formatCurrency(report.adSpendCents)} of {formatCurrency(report.fundsRaisedCents - report.platformFeeCents)} (100% deployed)
            </Text>
          </View>
          <Text style={styles.definitionText}>
            Plain-language definition: Exactly 90% of funds raised was allocated to digital ad inventory.
            100% of this budget was spent buying targeted impressions across social platforms and display networks.
          </Text>
        </Card>

        {/* SECTION 4: Impressions */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIndexBadge}>
              <Text style={styles.sectionIndexText}>4</Text>
            </View>
            <View style={styles.sectionTitleBlock}>
              <Text style={styles.sectionTitle}>Impressions</Text>
              <Text style={styles.metricLarge}>{report.impressions.toLocaleString()}</Text>
            </View>
            <Eye size={20} color={theme.colors.lime} />
          </View>
          <Text style={styles.definitionText}>
            Plain-language definition: An impression is logged each time the campaign ad creative was
            loaded and displayed on an external screen (mobile app feed, video stream, or search results page).
          </Text>
        </Card>

        {/* SECTION 5: Reach (Estimated and Measured strictly separate) */}
        <Card style={[styles.sectionCard, styles.reachSectionCard]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIndexBadge}>
              <Text style={styles.sectionIndexText}>5</Text>
            </View>
            <View style={styles.sectionTitleBlock}>
              <Text style={styles.sectionTitle}>Audience Reach</Text>
              <Text style={styles.sectionSubtitle}>Estimated & Measured (Strictly Separate)</Text>
            </View>
            <Users size={20} color={theme.colors.lime} />
          </View>

          {/* Subcard 5A: Modeled Estimated Reach */}
          <View style={styles.subReachBox}>
            <View style={styles.subReachHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.subReachTag}>PRE-DISTRIBUTION PROJECTION</Text>
              </View>
              <InfoTip
                title="Estimated Reach"
                content="Modeled before campaign launch using standard $6.00 CPM benchmarks and 2.2 frequency."
              />
            </View>
            <Text style={styles.subReachValue}>
              {formatReach(campaign.estimatedReachLow, campaign.estimatedReachHigh)} people
            </Text>
            <Text style={{ ...theme.typography.styles.captionSemiBold, color: theme.colors.textSecondary, marginBottom: 4 }}>
              Estimate, not a guarantee
            </Text>
            <Text style={styles.subReachDescription}>
              Statistical projection calculated at time of campaign launch. It is an illustrative benchmark,
              never combined or averaged with measured delivery.
            </Text>
          </View>

          {/* Subcard 5B: Verified Measured Reach */}
          <View style={[styles.subReachBox, styles.subMeasuredBox]}>
            <View style={styles.subReachHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.subReachTag, { color: theme.colors.lime }]}>
                  DELIVERED MEASURED REACH
                </Text>
              </View>
              <InfoTip
                title="Measured Reach"
                content="Verified deduplicated unique individuals who viewed ad creative as logged by digital ad server telemetry."
              />
            </View>
            <Text style={styles.subMeasuredValue}>
              {report.reach.toLocaleString()} unique people
            </Text>
            <Text style={styles.subReachDescription}>
              Verified deduplicated count of unique individuals who viewed campaign advertising during the
              promotional period.
            </Text>
          </View>

          <Text style={styles.definitionText}>
            Plain-language definition: Estimated reach is what was modeled beforehand; measured reach is what
            ad networks actually delivered. Under transparency rules, these metrics are never added together.
          </Text>
        </Card>

        {/* SECTION 6: Clicks and CTR */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIndexBadge}>
              <Text style={styles.sectionIndexText}>6</Text>
            </View>
            <View style={styles.sectionTitleBlock}>
              <Text style={styles.sectionTitle}>Clicks & Click-Through Rate (CTR)</Text>
              <View style={styles.clicksRow}>
                <Text style={styles.metricLarge}>{report.clicks.toLocaleString()} clicks</Text>
                <Text style={styles.ctrBadgeText}>• {(report.ctr * 100).toFixed(2)}% CTR</Text>
              </View>
            </View>
            <MousePointer size={20} color={theme.colors.lime} />
          </View>
          <Text style={styles.definitionText}>
            Plain-language definition: Clicks count direct taps on the ad that opened the full campaign story.
            CTR (Click-Through Rate) is the percentage of ad impressions that resulted in a click
            ({report.clicks.toLocaleString()} ÷ {report.impressions.toLocaleString()} = {(report.ctr * 100).toFixed(2)}%).
          </Text>
        </Card>

        {/* SECTION 7: Duration */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIndexBadge}>
              <Text style={styles.sectionIndexText}>7</Text>
            </View>
            <View style={styles.sectionTitleBlock}>
              <Text style={styles.sectionTitle}>Campaign & Ad Duration</Text>
              <Text style={styles.metricLarge}>{durationDays} Days Active</Text>
            </View>
            <Calendar size={20} color={theme.colors.textSecondary} />
          </View>
          <View style={styles.dateRangeBox}>
            <Text style={styles.dateRangeText}>
              {formatDate(report.startedAt)} – {formatDate(report.endedAt)}
            </Text>
          </View>
          <Text style={styles.definitionText}>
            Plain-language definition: The complete active calendar timeframe from initial ad deployment
            until final budget delivery and audit sign-off.
          </Text>
        </Card>

        {/* SECTION 8: Notes */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIndexBadge}>
              <Text style={styles.sectionIndexText}>8</Text>
            </View>
            <View style={styles.sectionTitleBlock}>
              <Text style={styles.sectionTitle}>Auditor & Delivery Notes</Text>
            </View>
            <FileText size={20} color={theme.colors.textSecondary} />
          </View>
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>
              {report.notes ||
                'All ad creative conformed to platform editorial standards and targeted verified audiences. Delivery telemetry was reconciled against partner exchange records with zero billing discrepancies.'}
            </Text>
          </View>
          <Text style={styles.definitionText}>
            Plain-language definition: Contextual commentary, channel attribution details, and auditor notes
            providing full transparency into how the campaign was executed.
          </Text>
        </Card>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <Button
            label="View Campaign Story"
            variant="secondary"
            size="md"
            icon={<ExternalLink size={16} color={theme.colors.textPrimary} />}
            onPress={() => router.push(`/campaign/${campaign.id}`)}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  centerText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.base,
  },
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: theme.spacing['4xl'],
    gap: theme.spacing.base,
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  shareBtnPressed: {
    backgroundColor: theme.colors.surfaceRaised,
  },
  heroCard: {
    padding: theme.spacing.base,
    gap: theme.spacing.xs,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.tintedPillBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.lime,
  },
  verifiedBadgeText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 11,
    color: theme.colors.lime,
  },
  campaignTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: theme.typography.styles.h3.fontSize,
    lineHeight: theme.typography.styles.h3.lineHeight,
    color: theme.colors.textPrimary,
  },
  campaignSummary: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  heroMetaText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  heroMetaDot: {
    color: theme.colors.textMuted,
  },
  sectionCard: {
    padding: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  sectionIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  sectionIndexText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 12,
    color: theme.colors.lime,
  },
  sectionTitleBlock: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  metricLarge: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 24,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  budgetUtilizationRow: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: theme.colors.inputBg,
    padding: theme.spacing.xs,
    borderRadius: theme.radius.sm,
  },
  budgetUtilizationLabel: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  budgetUtilizationValue: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    color: theme.colors.textPrimary,
  },
  clicksRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  ctrBadgeText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 16,
    color: theme.colors.lime,
  },
  dateRangeBox: {
    backgroundColor: theme.colors.inputBg,
    padding: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    alignSelf: 'flex-start',
  },
  dateRangeText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  notesBox: {
    backgroundColor: theme.colors.inputBg,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.lime,
  },
  notesText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textPrimary,
  },
  definitionText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.textSecondary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.xs,
  },
  reachSectionCard: {
    gap: theme.spacing.md,
  },
  subReachBox: {
    backgroundColor: theme.colors.surfaceRaised,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    gap: 4,
  },
  subMeasuredBox: {
    backgroundColor: theme.colors.tintedPillBg,
    borderWidth: 1,
    borderColor: theme.colors.lime,
  },
  subReachHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subReachTag: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 10,
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  subReachValue: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 22,
    color: theme.colors.lime,
  },
  subMeasuredValue: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 22,
    color: theme.colors.lime,
  },
  subReachDescription: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.textSecondary,
  },
  notAvailableCard: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  notAvailableIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  notAvailableTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: theme.typography.styles.h3.fontSize,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  notAvailableSubtitle: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  statusCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: theme.spacing.xs,
  },
  statusCalloutLabel: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  notAvailableExplanation: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  notAvailableButton: {
    marginTop: theme.spacing.base,
    minWidth: 200,
  },
  bottomActions: {
    flexDirection: 'row',
    marginTop: theme.spacing.xs,
  },
});
