import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter, Href } from 'expo-router';
import {
  Receipt,
  Calendar,
  CreditCard,
  ShieldCheck,
} from 'lucide-react-native';
import { quote } from '@campaigns/shared';
import { useReceipt } from '../../../api';
import { SharedHeader } from '../../../components/layout/SharedHeader';
import {
  Card,
  StatusPill,
  Button,
  Skeleton,
  ErrorState,
  DemoDataBadge,
} from '../../../components/ui';
import { theme } from '../../../theme';

export default function PaymentReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    data: receipt,
    isLoading,
    isError,
    error,
    refetch,
  } = useReceipt(id as string);

  const quoteBreakdown = useMemo(() => {
    if (!receipt) return null;
    return quote(receipt.amountCents);
  }, [receipt]);

  const handleShare = async () => {
    if (!receipt) return;
    try {
      const summary = `CAMPAIGNS OFFICIAL RECEIPT\nReceipt No: ${receipt.receiptNo}\nCampaign: ${receipt.campaignTitle}\nDate: ${new Date(receipt.createdAt).toLocaleDateString()}\nStatus: ${receipt.status}\n\nITEMIZATION\nAd Media Budget: $${((quoteBreakdown?.adBudgetCents ?? 0) / 100).toFixed(2)}\nPlatform Fee (10%): $${((quoteBreakdown?.platformFeeCents ?? 0) / 100).toFixed(2)}\nProcessing Fee: $${(receipt.feeCents / 100).toFixed(2)}\nTOTAL: $${(receipt.totalCents / 100).toFixed(2)}\nPayment: ${receipt.cardBrand || 'Card'} ending in ${receipt.cardLast4 || '4242'}\n\n100% of net contribution funds digital ad distribution. NOT a donation to creator.`;

      await Share.share({
        message: summary,
        title: `Receipt ${receipt.receiptNo}`,
      });
    } catch {
      // Share cancelled
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SharedHeader
          title="Official Receipt"
          fallbackRoute="/profile/payments"
        />
        <View style={styles.skeletonContainer}>
          <Skeleton height={120} borderRadius={16} />
          <View style={{ height: theme.spacing.base }} />
          <Skeleton height={200} borderRadius={16} />
          <View style={{ height: theme.spacing.base }} />
          <Skeleton height={140} borderRadius={16} />
        </View>
      </View>
    );
  }

  if (isError || !receipt) {
    return (
      <View style={styles.container}>
        <SharedHeader
          title="Receipt"
          fallbackRoute="/profile/payments"
        />
        <ErrorState
          title="Receipt Not Found"
          message={error?.message || 'Could not find the requested contribution receipt.'}
          onRetry={refetch}
        />
      </View>
    );
  }

  const formattedDate = new Date(receipt.createdAt).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.container}>
      <SharedHeader
        title="Official Receipt"
        subtitle={`Receipt #${receipt.receiptNo}`}
        fallbackRoute="/profile/payments"
        rightAction={
          <Button
            title="Share"
            variant="ghost"
            size="sm"
            onPress={handleShare}
          />
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status and Header Card */}
        <Card style={styles.headerCard}>
          <View style={styles.receiptTopRow}>
            <View style={styles.receiptIconWrapper}>
              <Receipt size={24} color={theme.colors.primary700} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.receiptNumberText}>{receipt.receiptNo}</Text>
              <View style={styles.dateRow}>
                <Calendar size={13} color={theme.colors.ink500} />
                <Text style={styles.dateText}>{formattedDate}</Text>
              </View>
            </View>
            <StatusPill status={receipt.status} />
          </View>

          <View style={styles.divider} />

          {/* Linked Campaign */}
          <View style={styles.campaignRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.metaLabel}>Funded Campaign</Text>
              <Text style={styles.campaignTitle} numberOfLines={2}>
                {receipt.campaignTitle}
              </Text>
            </View>
            <Button
              title="View"
              variant="secondary"
              size="sm"
              onPress={() => router.push(`/campaign/${receipt.campaignId}` as Href)}
            />
          </View>
        </Card>

        {/* Itemized Cost Breakdown Card */}
        <Card style={styles.sectionCard}>
          <Text style={styles.cardHeaderTitle}>Itemized Cost Breakdown</Text>
          <Text style={styles.cardSubText}>
            Transparent allocation of funds dedicated strictly to spreading this campaign.
          </Text>

          <View style={styles.breakdownRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.breakdownItemTitle}>Ad Distribution Budget</Text>
              <Text style={styles.breakdownItemDesc}>90% allocated directly to ad platforms</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              ${((quoteBreakdown?.adBudgetCents ?? (receipt.amountCents * 0.9)) / 100).toFixed(2)}
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.breakdownItemTitle}>Platform Maintenance Fee</Text>
              <Text style={styles.breakdownItemDesc}>10% fee for operations & verification</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              ${((quoteBreakdown?.platformFeeCents ?? (receipt.amountCents * 0.1)) / 100).toFixed(2)}
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.breakdownItemTitle}>Payment Processing Fee</Text>
              <Text style={styles.breakdownItemDesc}>Payment gateway fee</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              ${(receipt.feeCents / 100).toFixed(2)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Charged</Text>
            <Text style={styles.totalAmount}>
              ${(receipt.totalCents / 100).toFixed(2)}
            </Text>
          </View>
        </Card>

        {/* Payment Method and Backer Attribution */}
        <Card style={styles.sectionCard}>
          <Text style={styles.cardHeaderTitle}>Payment & Attribution</Text>

          <View style={styles.paymentInfoRow}>
            <CreditCard size={18} color={theme.colors.ink600} />
            <Text style={styles.paymentMethodText}>
              {receipt.cardBrand || 'Simulated Card'} •••• {receipt.cardLast4 || '4242'}
            </Text>
            <DemoDataBadge size="sm" />
          </View>

          <View style={styles.divider} />

          <View style={styles.backerRow}>
            <Text style={styles.metaLabel}>Backer Attribution</Text>
            <Text style={styles.backerValue}>
              {receipt.isAnonymous ? 'Anonymous Backer' : receipt.publicName || 'Backer'}
            </Text>
          </View>

          {receipt.guestEmail && (
            <View style={[styles.backerRow, { marginTop: theme.spacing.sm }]}>
              <Text style={styles.metaLabel}>Receipt Email</Text>
              <Text style={styles.backerValue}>{receipt.guestEmail}</Text>
            </View>
          )}
        </Card>

        {/* Non-Donation Legal Disclosure */}
        <View style={styles.legalNoticeBox}>
          <ShieldCheck size={18} color={theme.colors.ink600} style={{ marginTop: 2 }} />
          <Text style={styles.legalNoticeText}>
            <Text style={{ fontWeight: '700' }}>Legal Disclosure:</Text> This contribution strictly funds digital advertising distribution to spread the campaign message. It does not constitute a charitable donation or tax deduction, and no cash is remitted to the campaign creator.
          </Text>
        </View>

        {/* Share Action Button */}
        <Button
          title="Share Receipt Summary"
          variant="secondary"
          size="lg"
          fullWidth
          onPress={handleShare}
          style={{ marginBottom: theme.spacing.md }}
        />

        <Button
          title="View All Receipts"
          variant="ghost"
          size="md"
          fullWidth
          onPress={() => router.push('/profile/payments' as Href)}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  skeletonContainer: {
    padding: theme.spacing.base,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: theme.spacing['4xl'],
  },
  headerCard: {
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    marginBottom: theme.spacing.base,
  },
  receiptTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  receiptIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptNumberText: {
    ...theme.typography.styles.h3,
    color: theme.colors.ink900,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  dateText: {
    ...theme.typography.styles.caption,
    color: theme.colors.ink500,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.line,
    marginVertical: theme.spacing.md,
  },
  campaignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  metaLabel: {
    ...theme.typography.styles.caption,
    color: theme.colors.ink500,
    marginBottom: 2,
  },
  campaignTitle: {
    ...theme.typography.styles.bodyMedium,
    color: theme.colors.ink900,
  },
  sectionCard: {
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    marginBottom: theme.spacing.base,
  },
  cardHeaderTitle: {
    ...theme.typography.styles.h3,
    color: theme.colors.ink900,
    marginBottom: 2,
  },
  cardSubText: {
    ...theme.typography.styles.small,
    color: theme.colors.ink600,
    marginBottom: theme.spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: theme.spacing.xs,
  },
  breakdownItemTitle: {
    ...theme.typography.styles.bodyMedium,
    color: theme.colors.ink900,
  },
  breakdownItemDesc: {
    ...theme.typography.styles.caption,
    color: theme.colors.ink500,
    marginTop: 1,
  },
  breakdownAmount: {
    ...theme.typography.styles.bodyMedium,
    color: theme.colors.ink900,
    fontFamily: theme.typography.fonts.uiSemiBold,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    ...theme.typography.styles.h3,
    color: theme.colors.ink900,
    fontFamily: theme.typography.fonts.uiBold,
  },
  totalAmount: {
    ...theme.typography.styles.h2,
    color: theme.colors.primary700,
    fontFamily: theme.typography.fonts.uiBold,
  },
  paymentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  paymentMethodText: {
    ...theme.typography.styles.bodyMedium,
    color: theme.colors.ink800,
    flex: 1,
  },
  backerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backerValue: {
    ...theme.typography.styles.bodyMedium,
    color: theme.colors.ink900,
    fontFamily: theme.typography.fonts.uiSemiBold,
  },
  legalNoticeBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.bgMuted,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.base,
  },
  legalNoticeText: {
    flex: 1,
    ...theme.typography.styles.small,
    color: theme.colors.ink600,
    lineHeight: 18,
  },
});
