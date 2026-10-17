import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Layers,
  CircleDollarSign,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Lock,
  ChevronRight,
  History,
  X,
  Megaphone,
} from 'lucide-react-native';
import { theme } from '../../theme';
import { SharedHeader } from '../../components/layout/SharedHeader';
import { ReviewerBanner } from '../../components/layout/ReviewerBanner';
import { ScreenState } from '../../components/layout/ScreenState';
import {
  Card,
  Button,
  StatusPill,
  ProgressBar,
  Segmented,
  CategoryChip,
  TextArea,
} from '../../components/ui';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api/client';
import {
  useAdminQueue,
  useLifecycleCampaigns,
  useAdminAdvance,
  useSimulateFundGoal,
  useSimulateReport,
  useResetDemo,
  useAdminAudit,
  LifecycleCampaignItem,
  AdminQueueItem,
} from '../../api/hooks/useAdmin';
import { getAdvanceChecks } from '../../utils/adminHelpers';
import { CampaignStatus, Category } from '@campaigns/shared';

const STATUS_FILTERS = ['ALL', 'FUNDING', 'FUNDING_CLOSED', 'DISTRIBUTION_PREP', 'PROMOTING', 'COMPLETED'];

export default function DemoControlScreen() {
  const router = useRouter();
  const toast = useToast();
  const { user, isAuthenticated, isHydrated, signIn, isLoading: authLoading } = useAuthStore();

  const [activeTab, setActiveTab] = useState(0);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [advanceModalCampaign, setAdvanceModalCampaign] = useState<LifecycleCampaignItem | null>(null);
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [reportModalCampaign, setReportModalCampaign] = useState<LifecycleCampaignItem | null>(null);
  const [isResetConfirmVisible, setIsResetConfirmVisible] = useState(false);

  // Queries & Mutations
  const queueQuery = useAdminQueue();
  const lifecycleQuery = useLifecycleCampaigns();
  const advanceMutation = useAdminAdvance();
  const simulateFundGoalMutation = useSimulateFundGoal();
  const simulateReportMutation = useSimulateReport();
  const resetDemoMutation = useResetDemo();
  const auditQuery = useAdminAudit(selectedAuditId || '');

  const isAdmin = isAuthenticated && user?.role === 'ADMIN';

  // Fast demo admin sign-in helper
  const handleAdminSignIn = async () => {
    try {
      await signIn({ email: 'admin@demo.com', password: 'password123' });
      toast.success('Signed in as Reviewer Admin (admin@demo.com)');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      toast.error(message);
    }
  };

  // Reset Demo Database handler
  const handleResetDemo = async () => {
    try {
      await resetDemoMutation.mutateAsync();
      setIsResetConfirmVisible(false);
      toast.success('Demo database reset to initial seed fixtures');
      queueQuery.refetch();
      lifecycleQuery.refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reset demo database';
      toast.error(message);
    }
  };

  // Simulate Funding to Goal
  const handleSimulateFundGoal = async (campaign: LifecycleCampaignItem) => {
    try {
      await simulateFundGoalMutation.mutateAsync({ id: campaign.id });
      toast.success(`Simulated goal reached for "${campaign.title}". Status moved to FUNDING_CLOSED.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to simulate goal';
      toast.error(message);
    }
  };

  // Advance Campaign
  const handleConfirmAdvance = async () => {
    if (!advanceModalCampaign) return;
    try {
      await advanceMutation.mutateAsync({
        id: advanceModalCampaign.id,
        input: { notes: advanceNotes || undefined },
      });
      toast.success(`Advanced campaign "${advanceModalCampaign.title}" successfully.`);
      setAdvanceModalCampaign(null);
      setAdvanceNotes('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to advance campaign';
      toast.error(message);
    }
  };

  // Simulate Delivery Report
  const handleSimulateReport = async (campaign: LifecycleCampaignItem) => {
    try {
      await simulateReportMutation.mutateAsync({
        id: campaign.id,
        input: {
          reachType: 'MEASURED',
        },
      });
      setReportModalCampaign(null);
      toast.success(`Simulated performance report generated for "${campaign.title}".`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to simulate delivery report';
      toast.error(message);
    }
  };

  // Render Gate: Not Hydrated
  if (!isHydrated) {
    return (
      <View style={styles.container}>
        <ReviewerBanner />
        <SharedHeader title="Reviewer Console" fallbackRoute="/(tabs)/profile" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary600} />
        </View>
      </View>
    );
  }

  // Render Gate: Not Admin
  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <ReviewerBanner />
        <SharedHeader title="Reviewer Console" fallbackRoute="/(tabs)/profile" />
        <ScrollView contentContainerStyle={styles.gateContent}>
          <Card style={styles.gateCard}>
            <View style={styles.gateIconBox}>
              <Lock size={36} color={theme.colors.ink600} />
            </View>
            <Text style={styles.gateTitle}>Reviewer Console Not Available</Text>
            <Text style={styles.gateBody}>
              This administrative console is restricted to internal reviewers and compliance moderators.
              The backend API strictly enforces the ADMIN role.
            </Text>
            <View style={styles.gateCallout}>
              <Text style={styles.gateCalloutText}>
                To test the review workflow and lifecycle simulator, sign in with the pre-seeded reviewer
                demo account below.
              </Text>
            </View>

            <View style={styles.gateActions}>
              <Button
                title="Sign In as Admin (admin@demo.com)"
                variant="primary"
                size="lg"
                fullWidth
                loading={authLoading}
                iconLeft={<ShieldCheck size={18} color="#FFFFFF" />}
                onPress={handleAdminSignIn}
              />
              <Button
                title="Return to Profile"
                variant="ghost"
                size="md"
                fullWidth
                onPress={() => router.replace('/(tabs)/profile')}
              />
            </View>

            <View style={styles.gateMeta}>
              <Text style={styles.metaLabel}>API Base URL: {apiClient.getBaseUrl()}</Text>
              <Text style={styles.metaLabel}>Current User: {user ? `${user.email} (${user.role})` : 'Anonymous'}</Text>
            </View>
          </Card>
        </ScrollView>
      </View>
    );
  }

  const queueCount = queueQuery.data?.length || 0;
  const tabTitles = [
    queueCount > 0 ? `Review Queue (${queueCount})` : 'Review Queue',
    'Lifecycle Controls',
    'Demo Utilities',
  ];

  const filteredLifecycle = (lifecycleQuery.data || []).filter((item) => {
    if (statusFilter === 'ALL') return true;
    return item.status === statusFilter;
  });

  return (
    <View style={styles.container}>
      <ReviewerBanner />
      <SharedHeader title="Reviewer Console" fallbackRoute="/(tabs)/profile" />

      {/* System Status Info Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusPillItem}>
          <Text style={styles.statusPillLabel}>API:</Text>
          <Text style={styles.statusPillValue} numberOfLines={1}>
            {apiClient.getBaseUrl().replace('http://', '')}
          </Text>
        </View>
        <View style={styles.statusPillItem}>
          <Text style={styles.statusPillLabel}>Admin:</Text>
          <Text style={styles.statusPillValue}>{user?.email}</Text>
        </View>
        <View style={styles.statusPillItem}>
          <Text style={styles.statusPillLabel}>Build:</Text>
          <Text style={styles.statusPillValue}>1.0.0-demo (42)</Text>
        </View>
      </View>

      {/* Segmented Control */}
      <View style={styles.tabsWrapper}>
        <Segmented
          options={tabTitles}
          selectedIndex={activeTab}
          onChange={(index) => setActiveTab(index)}
        />
      </View>

      {/* Tab 0: Review Queue */}
      {activeTab === 0 && (
        <ScreenState
          isLoading={queueQuery.isLoading}
          isError={queueQuery.isError}
          error={queueQuery.error}
          onRetry={() => queueQuery.refetch()}
          isEmpty={queueCount === 0}
          emptyTitle="Nothing waiting for review"
          emptyDescription="All submitted campaigns and revisions have been evaluated. Newly submitted campaigns from creators will appear here."
          emptyActionLabel="Refresh Queue"
          onEmptyAction={() => queueQuery.refetch()}
        >
          <ScrollView contentContainerStyle={styles.scrollList} showsVerticalScrollIndicator={false}>
            <View style={styles.listHeaderRow}>
              <Text style={styles.listSectionTitle}>Pending Submissions ({queueCount})</Text>
              <Pressable
                onPress={() => queueQuery.refetch()}
                style={styles.refreshIconButton}
                accessibilityRole="button"
                accessibilityLabel="Refresh review queue"
              >
                <RefreshCw size={16} color={theme.colors.ink600} />
              </Pressable>
            </View>

            {(queueQuery.data || []).map((item: AdminQueueItem) => {
              const isRevision = item.reviewType === 'PENDING_REVISION';
              const submittedDate = item.submittedAt
                ? new Date(item.submittedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Recently';

              return (
                <Card key={item.id} style={styles.queueCard}>
                  <View style={styles.queueCardHeader}>
                    <View style={styles.tagsRow}>
                      <CategoryChip category={item.category as Category} />
                      <View
                        style={[
                          styles.reviewTypeBadge,
                          isRevision ? styles.revisionBadge : styles.submissionBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.reviewTypeText,
                            isRevision ? styles.revisionText : styles.submissionText,
                          ]}
                        >
                          {isRevision ? 'Pending Revision' : 'New Submission'}
                        </Text>
                      </View>
                    </View>
                    <StatusPill status={item.status as CampaignStatus} />
                  </View>

                  <Text style={styles.queueTitle}>{item.title}</Text>

                  {item.summary && (
                    <Text style={styles.queueSummary} numberOfLines={2}>
                      {item.summary}
                    </Text>
                  )}

                  <View style={styles.metaRow}>
                    <Text style={styles.queueMetaText}>
                      Creator: <Text style={styles.metaBold}>{item.creatorName}</Text>
                    </Text>
                    <Text style={styles.queueMetaDot}>•</Text>
                    <Text style={styles.queueMetaText}>Submitted {submittedDate}</Text>
                  </View>

                  <View style={styles.queueGoalRow}>
                    <Text style={styles.queueGoalLabel}>Proposed Goal:</Text>
                    <Text style={styles.queueGoalValue}>
                      ${(item.fundingGoalCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Text>
                  </View>

                  <View style={styles.queueActions}>
                    <Button
                      title="Inspect & Review"
                      variant="primary"
                      size="md"
                      fullWidth
                      iconRight={<ChevronRight size={18} color="#FFFFFF" />}
                      onPress={() =>
                        router.push(`/demo/review/${item.id}` as Href)
                      }
                    />
                  </View>
                </Card>
              );
            })}
          </ScrollView>
        </ScreenState>
      )}

      {/* Tab 1: Lifecycle Controls */}
      {activeTab === 1 && (
        <ScreenState
          isLoading={lifecycleQuery.isLoading}
          isError={lifecycleQuery.isError}
          error={lifecycleQuery.error}
          onRetry={() => lifecycleQuery.refetch()}
          isEmpty={filteredLifecycle.length === 0}
          emptyTitle="No campaigns in lifecycle"
          emptyDescription="There are currently no campaigns matching the selected filter."
          emptyActionLabel="Show All Campaigns"
          onEmptyAction={() => setStatusFilter('ALL')}
        >
          <ScrollView contentContainerStyle={styles.scrollList} showsVerticalScrollIndicator={false}>
            {/* Explanatory Policy Callout */}
            <View style={styles.policyNoticeBox}>
              <ShieldAlert size={18} color="#92400E" style={styles.policyNoticeIcon} />
              <View style={styles.policyNoticeTextContainer}>
                <Text style={styles.policyNoticeTitle}>
                  Funding completion does not automatically start advertising.
                </Text>
                <Text style={styles.policyNoticeBody}>
                  Campaigns advance deliberately through post-funding stages: payment settlement, creative verification,
                  network delivery, and verified reach reporting.
                </Text>
              </View>
            </View>

            {/* Status Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersContainer}
            >
              {STATUS_FILTERS.map((filter) => {
                const isSelected = statusFilter === filter;
                return (
                  <Pressable
                    key={filter}
                    onPress={() => setStatusFilter(filter)}
                    style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter by ${filter}`}
                  >
                    <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
                      {filter.replace('_', ' ')}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {filteredLifecycle.map((campaign) => {
              const advanceCheck = getAdvanceChecks(campaign);
              const isFunding = campaign.status === 'FUNDING';
              const canSimulateReport = campaign.status === 'PROMOTING' || campaign.status === 'COMPLETED';

              return (
                <Card key={campaign.id} style={styles.lifecycleCard}>
                  <View style={styles.lifecycleHeader}>
                    <View style={styles.tagsRow}>
                      <CategoryChip category={campaign.category as Category} />
                      <StatusPill status={campaign.status as CampaignStatus} />
                    </View>
                    <Pressable
                      onPress={() => setSelectedAuditId(campaign.id)}
                      style={styles.auditLogLink}
                      hitSlop={8}
                    >
                      <History size={14} color={theme.colors.primary600} />
                      <Text style={styles.auditLogLinkText}>Audit Log</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.lifecycleTitle}>{campaign.title}</Text>
                  <Text style={styles.lifecycleCreator}>Creator: {campaign.creatorName}</Text>

                  {/* Funding Progress Bar */}
                  <View style={styles.fundingProgressContainer}>
                    <View style={styles.fundingProgressLabels}>
                      <Text style={styles.fundingAmountRaised}>
                        ${(campaign.raisedCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Text>
                      <Text style={styles.fundingAmountGoal}>
                        of ${(campaign.fundingGoalCents / 100).toLocaleString()} goal (
                        {Math.round(campaign.percentFunded)}%)
                      </Text>
                    </View>
                    <ProgressBar progress={campaign.percentFunded} style={styles.progressBar} />
                  </View>

                  {/* FUNDING Helper */}
                  {isFunding && (
                    <View style={styles.fundingSimulationBox}>
                      <View style={styles.simulationHeader}>
                        <CircleDollarSign size={16} color={theme.colors.primary600} />
                        <Text style={styles.simulationTitle}>Campaign Active in Community Funding</Text>
                      </View>
                      <Text style={styles.simulationText}>
                        Simulate full funding to test transition to post-funding distribution prep.
                      </Text>
                      <Button
                        title="Simulate Funding to Goal"
                        variant="secondary"
                        size="md"
                        fullWidth
                        loading={simulateFundGoalMutation.isPending}
                        iconLeft={<CircleDollarSign size={16} color={theme.colors.primary600} />}
                        onPress={() => handleSimulateFundGoal(campaign)}
                      />
                    </View>
                  )}

                  {/* Prerequisite Checks & Advance Controls */}
                  {advanceCheck.nextStatus && (
                    <View style={styles.checksContainer}>
                      <Text style={styles.checksTitle}>
                        Prerequisites to {advanceCheck.nextStatusLabel}:
                      </Text>
                      <View style={styles.checksList}>
                        {advanceCheck.checks.map((chk) => (
                          <View key={chk.id} style={styles.checkItem}>
                            {chk.passed ? (
                              <CheckCircle2 size={16} color={theme.colors.emerald600} style={styles.checkIcon} />
                            ) : (
                              <XCircle size={16} color={theme.colors.danger} style={styles.checkIcon} />
                            )}
                            <View style={styles.checkTextCol}>
                              <Text style={[styles.checkLabel, !chk.passed && styles.checkLabelFailed]}>
                                {chk.label}
                              </Text>
                              {chk.detail && (
                                <Text style={styles.checkDetail}>{chk.detail}</Text>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>

                      {advanceCheck.explanation && (
                        <Text style={styles.checksExplanation}>{advanceCheck.explanation}</Text>
                      )}

                      <Button
                        title={advanceCheck.nextStatusLabel ?? 'Advance'}
                        variant={advanceCheck.canAdvance ? 'primary' : 'secondary'}
                        size="md"
                        fullWidth
                        disabled={!advanceCheck.canAdvance}
                        iconRight={<ChevronRight size={16} color={advanceCheck.canAdvance ? '#FFFFFF' : theme.colors.ink400} />}
                        onPress={() => setAdvanceModalCampaign(campaign)}
                        style={styles.advanceButton}
                      />
                    </View>
                  )}

                  {/* PROMOTING / COMPLETED Helper */}
                  {canSimulateReport && (
                    <View style={styles.reportSimulationBox}>
                      <View style={styles.simulationHeader}>
                        <Megaphone size={16} color={theme.colors.emerald600} />
                        <Text style={styles.simulationTitle}>Live Delivery Telemetry</Text>
                      </View>
                      <Text style={styles.simulationText}>
                        Generate simulated ad network delivery metrics (impressions, clicks, spend, and measured reach).
                      </Text>
                      <Button
                        title="Simulate Delivery Report"
                        variant="secondary"
                        size="md"
                        fullWidth
                        loading={simulateReportMutation.isPending}
                        iconLeft={<Sparkles size={16} color={theme.colors.primary600} />}
                        onPress={() => setReportModalCampaign(campaign)}
                      />
                    </View>
                  )}
                </Card>
              );
            })}
          </ScrollView>
        </ScreenState>
      )}

      {/* Tab 2: Demo Utilities */}
      {activeTab === 2 && (
        <ScrollView contentContainerStyle={styles.scrollList} showsVerticalScrollIndicator={false}>
          {/* Reset Demo Card */}
          <Card style={styles.dangerCard}>
            <View style={styles.dangerHeader}>
              <View style={styles.dangerIconBox}>
                <RefreshCw size={24} color={theme.colors.danger} />
              </View>
              <View style={styles.dangerHeaderText}>
                <Text style={styles.dangerTitle}>Reset Demo Database</Text>
                <Text style={styles.dangerSubtitle}>
                  Restore database to initial seed fixtures
                </Text>
              </View>
            </View>

            <Text style={styles.dangerBody}>
              Re-runs the Prisma database seeder script. This erases all newly created campaigns, draft
              modifications, mock contributions, and generated reports, restoring the three pristine seed campaigns
              (Solar Microgrids, Youth Journalism, River Cleanup).
            </Text>

            <Button
              title="Reset Demo Data"
              variant="danger"
              size="lg"
              fullWidth
              loading={resetDemoMutation.isPending}
              iconLeft={<RefreshCw size={18} color="#FFFFFF" />}
              onPress={() => setIsResetConfirmVisible(true)}
            />
          </Card>

          {/* System Diagnostics */}
          <Card style={styles.sysCard}>
            <Text style={styles.sysTitle}>Environment & Diagnostics</Text>
            <View style={styles.sysRow}>
              <Text style={styles.sysKey}>API Base URL</Text>
              <Text style={styles.sysValue}>{apiClient.getBaseUrl()}</Text>
            </View>
            <View style={styles.sysDivider} />
            <View style={styles.sysRow}>
              <Text style={styles.sysKey}>Authenticated Account</Text>
              <Text style={styles.sysValue}>{user?.email || 'None'}</Text>
            </View>
            <View style={styles.sysDivider} />
            <View style={styles.sysRow}>
              <Text style={styles.sysKey}>Role Authorization</Text>
              <Text style={styles.sysValue}>{user?.role || 'None'}</Text>
            </View>
            <View style={styles.sysDivider} />
            <View style={styles.sysRow}>
              <Text style={styles.sysKey}>App Version</Text>
              <Text style={styles.sysValue}>1.0.0-demo (build 42)</Text>
            </View>
            <View style={styles.sysDivider} />
            <View style={styles.sysRow}>
              <Text style={styles.sysKey}>Database Runner</Text>
              <Text style={styles.sysValue}>PostgreSQL (localhost:5432)</Text>
            </View>
          </Card>

          {/* Quick Shortcuts */}
          <Card style={styles.sysCard}>
            <Text style={styles.sysTitle}>Demo Navigation Shortcuts</Text>
            <View style={styles.shortcutsList}>
              <Button
                title="Open Component Showcase"
                variant="secondary"
                size="md"
                fullWidth
                iconLeft={<Sparkles size={18} color={theme.colors.primary600} />}
                onPress={() => router.push('/dev/components')}
              />
              <Button
                title="Open Creator Dashboard"
                variant="secondary"
                size="md"
                fullWidth
                iconLeft={<Layers size={18} color={theme.colors.primary600} />}
                onPress={() => router.push('/creator/dashboard')}
              />
              <Button
                title="Browse Explore Campaigns"
                variant="secondary"
                size="md"
                fullWidth
                iconLeft={<ExternalLink size={18} color={theme.colors.primary600} />}
                onPress={() => router.push('/(tabs)/explore')}
              />
            </View>
          </Card>
        </ScrollView>
      )}

      {/* Advance Confirmation Modal */}
      <Modal
        visible={Boolean(advanceModalCampaign)}
        transparent
        animationType="fade"
        onRequestClose={() => setAdvanceModalCampaign(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Lifecycle Advance</Text>
              <Pressable
                onPress={() => setAdvanceModalCampaign(null)}
                hitSlop={8}
                style={styles.modalCloseButton}
              >
                <X size={20} color={theme.colors.ink700} />
              </Pressable>
            </View>

            {advanceModalCampaign && (
              <>
                <Text style={styles.modalBody}>
                  You are about to advance{' '}
                  <Text style={styles.metaBold}>"{advanceModalCampaign.title}"</Text> from{' '}
                  <Text style={styles.metaBold}>{advanceModalCampaign.status}</Text> to{' '}
                  <Text style={styles.metaBold}>
                    {getAdvanceChecks(advanceModalCampaign).nextStatus}
                  </Text>
                  . All prerequisite checks have been verified.
                </Text>

                <TextArea
                  label="Advance Audit Notes (Optional)"
                  placeholder="e.g., Creative reviewed and approved on media network"
                  value={advanceNotes}
                  onChangeText={setAdvanceNotes}
                  numberOfLines={3}
                />

                <View style={styles.modalActions}>
                  <Button
                    title="Cancel"
                    variant="ghost"
                    size="md"
                    onPress={() => setAdvanceModalCampaign(null)}
                  />
                  <Button
                    title="Confirm Advance"
                    variant="primary"
                    size="md"
                    loading={advanceMutation.isPending}
                    onPress={handleConfirmAdvance}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Report Simulation Modal */}
      <Modal
        visible={Boolean(reportModalCampaign)}
        transparent
        animationType="fade"
        onRequestClose={() => setReportModalCampaign(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Simulate Ad Delivery Report</Text>
              <Pressable
                onPress={() => setReportModalCampaign(null)}
                hitSlop={8}
                style={styles.modalCloseButton}
              >
                <X size={20} color={theme.colors.ink700} />
              </Pressable>
            </View>

            {reportModalCampaign && (
              <>
                <Text style={styles.modalBody}>
                  Generate delivery metrics for{' '}
                  <Text style={styles.metaBold}>"{reportModalCampaign.title}"</Text>.
                  Estimated reach and measured reach remain strictly separated in compliance reporting.
                </Text>

                <View style={styles.reportMetricsPreview}>
                  <Text style={styles.previewLine}>• Budget Spent: 90% of funds raised</Text>
                  <Text style={styles.previewLine}>• Reach Type: MEASURED</Text>
                  <Text style={styles.previewLine}>• Verified backer performance report will be generated</Text>
                </View>

                <View style={styles.modalActions}>
                  <Button
                    title="Cancel"
                    variant="ghost"
                    size="md"
                    onPress={() => setReportModalCampaign(null)}
                  />
                  <Button
                    title="Generate Report"
                    variant="primary"
                    size="md"
                    loading={simulateReportMutation.isPending}
                    onPress={() => handleSimulateReport(reportModalCampaign)}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Reset Confirmation Modal */}
      <Modal
        visible={isResetConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsResetConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.danger }]}>
                Confirm Demo Reset
              </Text>
              <Pressable
                onPress={() => setIsResetConfirmVisible(false)}
                hitSlop={8}
                style={styles.modalCloseButton}
              >
                <X size={20} color={theme.colors.ink700} />
              </Pressable>
            </View>

            <Text style={styles.modalBody}>
              Are you sure you want to reset the demo database? This will completely wipe all draft
              edits, test campaigns, and mock contributions.
            </Text>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="ghost"
                size="md"
                onPress={() => setIsResetConfirmVisible(false)}
              />
              <Button
                title="Reset Database"
                variant="danger"
                size="md"
                loading={resetDemoMutation.isPending}
                onPress={handleResetDemo}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Audit Trail Modal */}
      <Modal
        visible={Boolean(selectedAuditId)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedAuditId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.auditModalContent]}>
            <View style={styles.modalHeader}>
              <View style={styles.auditModalTitleRow}>
                <History size={20} color={theme.colors.primary600} />
                <Text style={styles.modalTitle}>Campaign Audit Log</Text>
              </View>
              <Pressable
                onPress={() => setSelectedAuditId(null)}
                hitSlop={8}
                style={styles.modalCloseButton}
              >
                <X size={20} color={theme.colors.ink700} />
              </Pressable>
            </View>

            <ScrollView style={styles.auditScroll} showsVerticalScrollIndicator={false}>
              {auditQuery.isLoading ? (
                <View style={styles.auditLoading}>
                  <ActivityIndicator size="small" color={theme.colors.primary600} />
                  <Text style={styles.auditLoadingText}>Loading audit trail...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.auditSectionHeading}>Review Decisions</Text>
                  {auditQuery.data?.decisions?.length === 0 ? (
                    <Text style={styles.auditEmptyText}>No review decisions recorded.</Text>
                  ) : (
                    auditQuery.data?.decisions.map((d) => (
                      <View key={d.id} style={styles.auditItem}>
                        <View style={styles.auditItemHeader}>
                          <Text style={styles.auditDecisionBadge}>{d.decision}</Text>
                          <Text style={styles.auditDate}>
                            {new Date(d.createdAt).toLocaleDateString()} {new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        <Text style={styles.auditReviewer}>By: {d.reviewerName}</Text>
                        {d.notes ? <Text style={styles.auditNotes}>"{d.notes}"</Text> : null}
                      </View>
                    ))
                  )}

                  <Text style={[styles.auditSectionHeading, { marginTop: theme.spacing.lg }]}>
                    Lifecycle & Campaign Events
                  </Text>
                  {auditQuery.data?.events?.length === 0 ? (
                    <Text style={styles.auditEmptyText}>No lifecycle events recorded.</Text>
                  ) : (
                    auditQuery.data?.events.map((e) => (
                      <View key={e.id} style={styles.auditItem}>
                        <View style={styles.auditItemHeader}>
                          <Text style={styles.auditEventBadge}>{e.type}</Text>
                          <Text style={styles.auditDate}>
                            {new Date(e.createdAt).toLocaleDateString()} {new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        {Boolean(e.payload) && (
                          <Text style={styles.auditPayload}>
                            {typeof e.payload === 'object' ? JSON.stringify(e.payload, null, 2) : String(e.payload)}
                          </Text>
                        )}
                      </View>
                    ))
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  statusBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  statusPillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bgMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  statusPillLabel: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 10,
    color: theme.colors.ink500,
    marginRight: 4,
  },
  statusPillValue: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 10,
    color: theme.colors.ink900,
    maxWidth: 150,
  },
  tabsWrapper: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  scrollList: {
    padding: theme.spacing.base,
    paddingBottom: theme.spacing['3xl'],
    gap: theme.spacing.base,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  listSectionTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 18,
    color: theme.colors.ink900,
  },
  refreshIconButton: {
    padding: theme.spacing.xs,
  },
  queueCard: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  queueCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  reviewTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  reviewTypeText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 11,
  },
  submissionBadge: {
    backgroundColor: theme.colors.warningBg,
    borderColor: '#FDE68A',
    borderWidth: 1,
  },
  submissionText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 11,
    color: '#92400E',
  },
  revisionBadge: {
    backgroundColor: '#F3E8FF',
    borderColor: '#E9D5FF',
    borderWidth: 1,
  },
  revisionText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 11,
    color: '#6B21A8',
  },
  queueTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 17,
    lineHeight: 22,
    color: theme.colors.ink900,
  },
  queueSummary: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.ink700,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  queueMetaText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.ink600,
  },
  metaBold: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    color: theme.colors.ink900,
  },
  queueMetaDot: {
    color: theme.colors.ink400,
  },
  queueGoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bgMuted,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.input,
    gap: 6,
  },
  queueGoalLabel: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.ink600,
  },
  queueGoalValue: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 13,
    color: theme.colors.primary700,
  },
  queueActions: {
    marginTop: theme.spacing.xs,
  },
  policyNoticeBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.warningBg,
    padding: theme.spacing.md,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: theme.spacing.sm,
  },
  policyNoticeIcon: {
    marginTop: 2,
  },
  policyNoticeTextContainer: {
    flex: 1,
  },
  policyNoticeTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: '#92400E',
    marginBottom: 2,
  },
  policyNoticeBody: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 16,
    color: '#78350F',
  },
  filtersContainer: {
    gap: theme.spacing.xs,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  filterChipSelected: {
    backgroundColor: theme.colors.primary600,
    borderColor: theme.colors.primary600,
  },
  filterChipText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.ink700,
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
    fontFamily: theme.typography.fonts.uiBold,
  },
  lifecycleCard: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  lifecycleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  auditLogLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary50,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  auditLogLinkText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 11,
    color: theme.colors.primary700,
  },
  lifecycleTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 17,
    lineHeight: 22,
    color: theme.colors.ink900,
  },
  lifecycleCreator: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.ink600,
  },
  fundingProgressContainer: {
    gap: 6,
    marginTop: 2,
  },
  fundingProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  fundingAmountRaised: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 14,
    color: theme.colors.ink900,
  },
  fundingAmountGoal: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.ink600,
  },
  progressBar: {
    height: 6,
  },
  fundingSimulationBox: {
    backgroundColor: theme.colors.primary50,
    padding: theme.spacing.md,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  simulationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  simulationTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.primary800,
  },
  simulationText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.primary700,
    marginBottom: 4,
  },
  checksContainer: {
    backgroundColor: theme.colors.bgMuted,
    padding: theme.spacing.md,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: theme.colors.line,
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  checksTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    color: theme.colors.ink900,
    marginBottom: 4,
  },
  checksList: {
    gap: 8,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkIcon: {
    marginTop: 2,
  },
  checkTextCol: {
    flex: 1,
  },
  checkLabel: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    color: theme.colors.ink900,
  },
  checkLabelFailed: {
    color: theme.colors.danger,
  },
  checkDetail: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    color: theme.colors.ink600,
    marginTop: 1,
  },
  checksExplanation: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    color: theme.colors.ink500,
    fontStyle: 'italic',
    marginTop: 4,
  },
  advanceButton: {
    marginTop: theme.spacing.sm,
  },
  reportSimulationBox: {
    backgroundColor: theme.colors.emerald50,
    padding: theme.spacing.md,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  dangerCard: {
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  dangerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerHeaderText: {
    flex: 1,
  },
  dangerTitle: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 16,
    color: theme.colors.danger,
  },
  dangerSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.ink600,
  },
  dangerBody: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.ink700,
  },
  sysCard: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  sysTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 16,
    color: theme.colors.ink900,
    marginBottom: theme.spacing.xs,
  },
  sysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sysKey: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.ink600,
  },
  sysValue: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.ink900,
  },
  sysDivider: {
    height: 1,
    backgroundColor: theme.colors.line,
  },
  shortcutsList: {
    gap: theme.spacing.sm,
  },
  gateContent: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  gateCard: {
    width: '100%',
    maxWidth: 440,
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  gateIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 20,
    color: theme.colors.ink900,
    textAlign: 'center',
  },
  gateBody: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.ink700,
    textAlign: 'center',
  },
  gateCallout: {
    backgroundColor: theme.colors.warningBg,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  gateCalloutText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 16,
    color: '#92400E',
    textAlign: 'center',
  },
  gateActions: {
    width: '100%',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  gateMeta: {
    marginTop: theme.spacing.base,
    alignItems: 'center',
    gap: 4,
  },
  metaLabel: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    color: theme.colors.ink500,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.line,
    gap: theme.spacing.md,
  },
  auditModalContent: {
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  auditModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  modalTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 18,
    color: theme.colors.ink900,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.ink700,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  reportMetricsPreview: {
    backgroundColor: theme.colors.bgMuted,
    padding: theme.spacing.md,
    borderRadius: theme.radius.input,
    gap: 4,
  },
  previewLine: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.ink700,
  },
  auditScroll: {
    maxHeight: 400,
  },
  auditLoading: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  auditLoadingText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.ink600,
  },
  auditSectionHeading: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 15,
    color: theme.colors.ink900,
    marginBottom: theme.spacing.sm,
  },
  auditEmptyText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.ink500,
    fontStyle: 'italic',
    marginBottom: theme.spacing.sm,
  },
  auditItem: {
    backgroundColor: theme.colors.bgMuted,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: theme.colors.line,
    marginBottom: theme.spacing.xs,
    gap: 2,
  },
  auditItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  auditDecisionBadge: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 11,
    color: theme.colors.primary700,
  },
  auditEventBadge: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 11,
    color: theme.colors.ink900,
  },
  auditDate: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 10,
    color: theme.colors.ink500,
  },
  auditReviewer: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
    color: theme.colors.ink700,
  },
  auditNotes: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    fontStyle: 'italic',
    color: theme.colors.ink600,
  },
  auditPayload: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: theme.colors.ink700,
    backgroundColor: theme.colors.surface,
    padding: 4,
    borderRadius: 4,
    marginTop: 2,
  },
});
