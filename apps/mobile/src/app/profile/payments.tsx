import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import {
  Receipt,
  Calendar,
  ChevronRight,
  UserPlus,
  Check,
  Clock,
  AlertCircle,
  X,
  RotateCcw,
} from 'lucide-react-native';
import {
  useMyContributions,
  useClaimContributions,
  getGuestTokenMap,
  getGuestReceiptTokens,
} from '../../api';
import { useAuthStore } from '../../store/authStore';
import { SharedHeader } from '../../components/layout/SharedHeader';
import {
  Card,
  Button,
  Skeleton,
  EmptyState,
  useToast,
} from '../../components/ui';
import { theme } from '../../theme';

export default function PaymentsHistoryScreen() {
  const router = useRouter();
  const toast = useToast();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const {
    data: myContributions,
    isLoading,
    isRefetching,
    refetch,
  } = useMyContributions();

  const [guestTokens, setGuestTokens] = useState<string[]>([]);
  const [guestMap, setGuestMap] = useState<Record<string, string>>({});
  const claimMutation = useClaimContributions();

  useEffect(() => {
    getGuestReceiptTokens().then(setGuestTokens);
    getGuestTokenMap().then(setGuestMap);
  }, []);

  const handleClaimGuestTokens = async () => {
    if (guestTokens.length === 0) return;
    try {
      const res = await claimMutation.mutateAsync({ tokens: guestTokens });
      toast.success(`Claimed ${res.claimedCount} guest receipts to your account!`);
      refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to claim guest receipts';
      toast.error(message);
    }
  };

  const hasContributions = Boolean(myContributions && myContributions.length > 0);
  const guestContributionIds = Object.keys(guestMap);

  // Group contributions by month
  const groupedByMonth = React.useMemo(() => {
    if (!myContributions) return [];
    const groups = new Map<string, typeof myContributions>();
    for (const item of myContributions) {
      const date = new Date(item.createdAt);
      const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const current = groups.get(monthLabel) || [];
      current.push(item);
      groups.set(monthLabel, current);
    }
    return Array.from(groups.entries()).map(([month, items]) => ({ month, items }));
  }, [myContributions]);

  return (
    <View style={styles.container}>
      <SharedHeader
        title="Payments & Receipts"
        subtitle="Financial Accounting Records"
        fallbackRoute="/(tabs)/profile"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.colors.lime}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Claim Guest Tokens Banner for Authenticated Users */}
        {isAuthenticated && guestTokens.length > 0 && (
          <Card style={styles.claimBanner}>
            <View style={styles.claimHeaderRow}>
              <UserPlus size={20} color={theme.colors.lime} />
              <Text style={styles.claimTitle}>Unclaimed Guest Receipts Found</Text>
            </View>
            <Text style={styles.claimDesc}>
              We found {guestTokens.length} contribution receipt(s) created on this device before signing in. Claim them to sync with your account permanently.
            </Text>
            <Button
              title="Claim Receipts to Account"
              variant="primary"
              size="sm"
              loading={claimMutation.isPending}
              onPress={handleClaimGuestTokens}
              style={{ alignSelf: 'flex-start', marginTop: theme.spacing.sm }}
            />
          </Card>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <View style={styles.skeletonContainer}>
            <Skeleton height={80} borderRadius={12} />
            <View style={{ height: theme.spacing.md }} />
            <Skeleton height={80} borderRadius={12} />
            <View style={{ height: theme.spacing.md }} />
            <Skeleton height={80} borderRadius={12} />
          </View>
        )}

        {/* Authenticated List Grouped by Month */}
        {!isLoading && hasContributions && (
          <View style={styles.listContainer}>
            {groupedByMonth.map(({ month, items }) => (
              <View key={month} style={styles.monthGroup}>
                <View style={styles.monthHeaderRow}>
                  <Text style={styles.monthHeaderText}>{month}</Text>
                  <Text style={styles.monthCountText}>{items.length} receipt{items.length === 1 ? '' : 's'}</Text>
                </View>

                <View style={styles.monthItemsContainer}>
                  {items.map((item) => {
                    const formattedDate = new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });

                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => router.push(`/profile/payments/${item.id}` as Href)}
                        style={({ pressed }) => [
                          styles.receiptCard,
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <View style={styles.receiptTopRow}>
                          <View style={styles.receiptIconWrapper}>
                            <Receipt size={20} color={theme.colors.lime} />
                          </View>
                          <View style={styles.receiptMetaCol}>
                            <Text
                              style={styles.receiptNoText}
                              numberOfLines={1}
                              ellipsizeMode="middle"
                            >
                              {item.receiptNo}
                            </Text>
                            <View style={styles.dateRow}>
                              <Calendar size={12} color={theme.colors.textSecondary} />
                              <Text style={styles.dateText}>{formattedDate}</Text>
                            </View>
                          </View>
                          <PaymentStatusIcon status={item.status} />
                        </View>

                        <Text style={styles.campaignTitle} numberOfLines={1}>
                          {item.campaignTitle}
                        </Text>

                        <View style={styles.receiptBottomRow}>
                          <Text style={styles.amountText}>
                            ${(item.totalCents / 100).toFixed(2)}
                          </Text>
                          <View style={styles.viewDetailsRow}>
                            <Text style={styles.viewDetailsText}>View Itemized</Text>
                            <ChevronRight size={16} color={theme.colors.lime} />
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Guest List when not authenticated */}
        {!isLoading && !isAuthenticated && guestContributionIds.length > 0 && (
          <View style={styles.listContainer}>
            <Text style={styles.guestSectionTitle}>Guest Receipts on this Device</Text>
            {guestContributionIds.map((contribId) => (
              <Pressable
                key={contribId}
                onPress={() => router.push(`/profile/payments/${contribId}` as Href)}
                style={({ pressed }) => [
                  styles.receiptCard,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View style={styles.receiptTopRow}>
                  <View style={styles.receiptIconWrapper}>
                    <Receipt size={20} color={theme.colors.lime} />
                  </View>
                  <View style={styles.receiptMetaCol}>
                    <Text style={styles.receiptNoText}>Contribution Receipt</Text>
                    <Text style={styles.dateText}>Tap to view itemized breakdown</Text>
                  </View>
                  <ChevronRight size={18} color={theme.colors.textSecondary} />
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Empty State */}
        {!isLoading && !hasContributions && guestContributionIds.length === 0 && (
          <EmptyState
            title="No Payment Receipts"
            description="You haven't contributed to any campaigns yet. When you back a campaign to fund ad distribution, your itemized receipts will appear here."
            actionTitle="Explore Campaigns"
            onAction={() => router.push('/(tabs)/explore' as Href)}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: theme.spacing['4xl'],
  },
  skeletonContainer: {
    gap: theme.spacing.md,
  },
  claimBanner: {
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.lime,
    backgroundColor: theme.colors.tintedPillBg,
    marginBottom: theme.spacing.base,
  },
  claimHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  claimTitle: {
    ...theme.typography.styles.smallMedium,
    color: theme.colors.lime,
  },
  claimDesc: {
    ...theme.typography.styles.small,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  listContainer: {
    gap: theme.spacing.md,
  },
  guestSectionTitle: {
    ...theme.typography.styles.smallMedium,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  receiptCard: {
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  receiptTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  receiptIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptMetaCol: {
    flex: 1,
  },
  receiptNoText: {
    ...theme.typography.styles.smallMedium,
    color: theme.colors.textPrimary,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  dateText: {
    ...theme.typography.styles.caption,
    color: theme.colors.textSecondary,
  },
  campaignTitle: {
    ...theme.typography.styles.body,
    color: theme.colors.textSecondary,
    marginVertical: theme.spacing.xs,
  },
  receiptBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  amountText: {
    ...theme.typography.styles.h3,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fonts.uiBold,
  },
  viewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailsText: {
    ...theme.typography.styles.captionSemiBold,
    color: theme.colors.lime,
  },
  monthGroup: {
    marginBottom: theme.spacing.lg,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: theme.spacing.sm,
    paddingHorizontal: 2,
  },
  monthHeaderText: {
    ...theme.typography.styles.h3,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fonts.uiBold,
  },
  monthCountText: {
    ...theme.typography.styles.caption,
    color: theme.colors.textSecondary,
  },
  monthItemsContainer: {
    gap: theme.spacing.sm,
  },
  statusCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function PaymentStatusIcon({ status }: { status: string }) {
  let icon: React.ReactNode;
  let label: string;

  switch (status) {
    case 'SUCCEEDED':
      icon = <Check size={16} color={theme.colors.lime} strokeWidth={2.5} />;
      label = 'Status: Succeeded';
      break;
    case 'PENDING':
      icon = <Clock size={16} color={theme.colors.textSecondary} strokeWidth={2} />;
      label = 'Status: Pending';
      break;
    case 'FAILED':
      icon = <AlertCircle size={16} color={theme.colors.textPrimary} strokeWidth={2} />;
      label = 'Status: Failed';
      break;
    case 'CANCELLED':
      icon = <X size={16} color={theme.colors.textSecondary} strokeWidth={2} />;
      label = 'Status: Cancelled';
      break;
    case 'REFUNDED':
      icon = <RotateCcw size={16} color={theme.colors.textSecondary} strokeWidth={2} />;
      label = 'Status: Refunded';
      break;
    default:
      icon = <Check size={16} color={theme.colors.lime} strokeWidth={2.5} />;
      label = `Status: ${status}`;
      break;
  }

  return (
    <View
      style={styles.statusCircle}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      {icon}
    </View>
  );
}
