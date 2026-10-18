import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter, Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ShieldCheck,
  CreditCard,
  Lock,
  XCircle,
} from 'lucide-react-native';
import {
  useCampaign,
  useQuote,
  usePay,
  useContribution,
} from '../../../api';
import { useAuthStore } from '../../../store/authStore';
import { useBackingStore } from '../../../store/backingStore';
import { SharedHeader } from '../../../components/layout/SharedHeader';
import {
  Card,
  Skeleton,
  ErrorState,
  Button,
} from '../../../components/ui';
import { StickyActionBar } from '../../../components/ui/StickyActionBar';
import { theme } from '../../../theme';

const CHECKOUT_STEPS = ['Detail', 'Amount', 'Review', 'Payment', 'Confirmation'];

interface TestCardChip {
  label: string;
  number: string;
  type: 'success' | 'declined' | 'insufficient' | 'pending';
}

const TEST_CARDS: TestCardChip[] = [
  { label: 'Success', number: '4242 4242 4242 4242', type: 'success' },
  { label: 'Card declined', number: '4000 0000 0000 0002', type: 'declined' },
  { label: 'Insufficient funds', number: '4000 0000 0000 9995', type: 'insufficient' },
  { label: 'Needs bank verification', number: '4000 0000 0000 3220', type: 'pending' },
];

export default function BackPayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);

  const {
    data: campaign,
    isLoading: isCampaignLoading,
    isError: isCampaignError,
    error: campaignError,
  } = useCampaign(id as string);

  const {
    amountCents,
    publicName,
    contributionId,
    guestReceiptToken,
  } = useBackingStore();

  // If contributionId is missing, redirect back to review
  useEffect(() => {
    if (!contributionId && campaign) {
      router.replace(`/back/${id}/review` as Href);
    }
  }, [contributionId, campaign, id, router]);

  const { data: quoteData } = useQuote(campaign?.id, amountCents);
  const payMutation = usePay();

  // Ephemeral Form State (never stored to disk or zustand)
  const [cardholderName, setCardholderName] = useState(
    publicName || user?.name || 'Jane Doe'
  );
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('123');

  // Payment outcome states
  const [paymentError, setPaymentError] = useState<{
    reason: string;
    message: string;
  } | null>(null);

  const [isPendingVerification, setIsPendingVerification] = useState(false);

  // Poll contribution if pending verification
  const { data: polledContribution } = useContribution(
    isPendingVerification ? (contributionId ?? undefined) : undefined,
    {
      guestReceiptToken,
      refetchInterval: isPendingVerification ? 2500 : false,
    }
  );

  // Auto-resolve pending when poll transitions to SUCCEEDED
  useEffect(() => {
    if (isPendingVerification && polledContribution) {
      if (polledContribution.status === 'SUCCEEDED') {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        router.replace(
          `/back/${id}/result?status=succeeded&contributionId=${contributionId}` as Href
        );
      } else if (polledContribution.status === 'FAILED') {
        setIsPendingVerification(false);
        setPaymentError({
          reason: 'VERIFICATION_FAILED',
          message: 'Bank verification was declined. Please try another card.',
        });
      }
    }
  }, [isPendingVerification, polledContribution, id, contributionId, router]);

  // Format Card Number (XXXX XXXX XXXX XXXX)
  const handleCardNumberChange = (text: string) => {
    setPaymentError(null);
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 16);
    const parts: string[] = [];
    for (let i = 0; i < cleaned.length; i += 4) {
      parts.push(cleaned.slice(i, i + 4));
    }
    setCardNumber(parts.join(' '));
  };

  // Format Expiry (MM/YY)
  const handleExpiryChange = (text: string) => {
    setPaymentError(null);
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
    if (cleaned.length >= 3) {
      setExpiry(`${cleaned.slice(0, 2)}/${cleaned.slice(2)}`);
    } else {
      setExpiry(cleaned);
    }
  };

  // Format CVC
  const handleCvcChange = (text: string) => {
    setPaymentError(null);
    setCvc(text.replace(/[^0-9]/g, '').slice(0, 4));
  };

  // Select Magic Test Card Chip
  const handleSelectTestCard = (testCard: TestCardChip) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setPaymentError(null);
    setCardNumber(testCard.number);
    setExpiry('12/28');
    setCvc('123');
  };

  // Form Validation
  const rawDigits = cardNumber.replace(/\s+/g, '');
  const [expMonth, expYear] = expiry.split('/');
  const isMonthValid = expMonth && /^(0[1-9]|1[0-2])$/.test(expMonth);
  const isYearValid = expYear && /^\d{2,4}$/.test(expYear);
  const isCvcValid = cvc.length >= 3 && cvc.length <= 4;
  const isCardValid = rawDigits.length >= 12 && rawDigits.length <= 19;
  const isFormValid =
    isCardValid &&
    Boolean(isMonthValid) &&
    Boolean(isYearValid) &&
    isCvcValid &&
    cardholderName.trim().length > 0;

  const handlePay = async () => {
    if (!contributionId || !isFormValid) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setPaymentError(null);

    try {
      const response = await payMutation.mutateAsync({
        id: contributionId,
        data: {
          cardNumber: rawDigits,
          expMonth: expMonth!,
          expYear: expYear!,
          cvc,
          cardholderName: cardholderName.trim(),
        },
        guestReceiptToken,
      });

      if (response.status === 'SUCCEEDED') {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        router.replace(
          `/back/${id}/result?status=succeeded&contributionId=${contributionId}` as Href
        );
      } else if (response.status === 'PENDING') {
        setIsPendingVerification(true);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      } else if (response.status === 'FAILED') {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        setPaymentError({
          reason: response.failureReason || 'CARD_FAILED',
          message:
            response.message ||
            'Your card was declined. Please verify your information or try another card.',
        });
      }
    } catch (err: unknown) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      const message = err instanceof Error ? err.message : 'Payment processing failed. Please try again.';
      setPaymentError({
        reason: 'PAYMENT_ERROR',
        message,
      });
    }
  };

  if (isCampaignLoading) {
    return (
      <View style={styles.container}>
        <SharedHeader
          title="Simulated Payment"
          subtitle="Step 4 of 5"
          fallbackRoute={`/back/${id}/review`}
          stepConfig={{
            currentStep: 4,
            totalSteps: 5,
            labels: CHECKOUT_STEPS,
          }}
        />
        <View style={styles.skeletonContent}>
          <Skeleton height={80} borderRadius={16} />
          <View style={{ height: theme.spacing.lg }} />
          <Skeleton height={200} borderRadius={16} />
        </View>
      </View>
    );
  }

  if (isCampaignError || !campaign) {
    return (
      <View style={styles.container}>
        <SharedHeader
          title="Payment"
          fallbackRoute={`/campaign/${id}`}
        />
        <ErrorState
          title="Campaign unavailable"
          message={campaignError?.message || 'Unable to retrieve campaign.'}
        />
      </View>
    );
  }

  const totalDisplay = quoteData
    ? `$${(quoteData.totalCents / 100).toFixed(2)}`
    : `$${(amountCents / 100).toFixed(2)}`;

  return (
    <View style={styles.container}>
      <SharedHeader
        title="Simulated Payment"
        subtitle="Step 4 of 5"
        fallbackRoute={`/back/${id}/review`}
        stepConfig={{
          currentStep: 4,
          totalSteps: 5,
          labels: CHECKOUT_STEPS,
        }}
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        {/* Prominent Simulated Checkout Banner */}
        <View style={styles.simulatedBanner}>
          <ShieldCheck size={22} color={theme.colors.lime} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <View style={styles.bannerTitleRow}>
              <Text style={styles.simulatedBannerTitle}>Simulated Checkout</Text>
            </View>
            <Text style={styles.simulatedBannerBody}>
              No real money is charged. This prototype tests the flow and demonstrates how ad distribution is funded without placing real financial transactions.
            </Text>
          </View>
        </View>

        {/* Pending Verification Notice */}
        {isPendingVerification && (
          <Card style={styles.pendingCard}>
            <View style={styles.pendingHeaderRow}>
              <ActivityIndicator size="small" color={theme.colors.lime} />
              <Text style={styles.pendingTitle}>Bank Verification in Progress</Text>
            </View>
            <Text style={styles.pendingDesc}>
              Simulating 3D Secure / Bank verification. In this prototype, transactions automatically resolve within ~15 seconds.
            </Text>
            <View style={styles.pendingActionsRow}>
              <Button
                title="View Confirmation Status"
                variant="primary"
                size="sm"
                onPress={() =>
                  router.replace(
                    `/back/${id}/result?status=pending&contributionId=${contributionId}` as Href
                  )
                }
              />
            </View>
          </Card>
        )}

        {/* Payment Error Banner */}
        {paymentError && (
          <View style={styles.errorBanner}>
            <XCircle size={22} color={theme.colors.textPrimary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorBannerTitle}>Payment Failed</Text>
              <Text style={styles.errorBannerBody}>{paymentError.message}</Text>
              <Text style={styles.errorBannerHint}>
                Tip: Tap the "Success" test card below to test a successful contribution.
              </Text>
            </View>
          </View>
        )}

        {/* Quick Test Cards Selector */}
        <View style={styles.testCardsSection}>
          <Text style={styles.testCardsLabel}>Magic Test Cards (Tap to prefill)</Text>
          <View style={styles.testCardsRow}>
            {TEST_CARDS.map((tc) => {
              const isSelected = cardNumber.replace(/\s+/g, '') === tc.number.replace(/\s+/g, '');
              return (
                <Pressable
                  key={tc.type}
                  onPress={() => handleSelectTestCard(tc)}
                  style={({ pressed }) => [
                    styles.testCardChip,
                    isSelected && styles.testCardChipSelected,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text
                    style={[
                      styles.testCardChipText,
                      isSelected && styles.testCardChipTextSelected,
                    ]}
                  >
                    {tc.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Payment Form Card */}
        <Card style={styles.formCard}>
          <View style={styles.formHeaderRow}>
            <CreditCard size={20} color={theme.colors.textPrimary} />
            <Text style={styles.formTitle}>Card Details</Text>
            <View style={styles.secureBadge}>
              <Lock size={12} color={theme.colors.textSecondary} />
              <Text style={styles.secureText}>Simulated</Text>
            </View>
          </View>

          {/* Cardholder Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Name on Card</Text>
            <TextInput
              style={styles.textInput}
              value={cardholderName}
              onChangeText={setCardholderName}
              placeholder="e.g. Jane Doe"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          {/* Card Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Card Number</Text>
            <TextInput
              style={[styles.textInput, paymentError && styles.textInputError]}
              value={cardNumber}
              onChangeText={handleCardNumberChange}
              placeholder="4242 4242 4242 4242"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="number-pad"
              maxLength={19}
            />
          </View>

          {/* Expiry and CVC Row */}
          <View style={styles.dualInputsRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Expires (MM/YY)</Text>
              <TextInput
                style={styles.textInput}
                value={expiry}
                onChangeText={handleExpiryChange}
                placeholder="MM/YY"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="number-pad"
                maxLength={5}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>CVC / CVV</Text>
              <TextInput
                style={styles.textInput}
                value={cvc}
                onChangeText={handleCvcChange}
                placeholder="123"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
              />
            </View>
          </View>
        </Card>

        {/* Security and Transparency Footnote */}
        <View style={styles.securityFootnote}>
          <Lock size={14} color={theme.colors.textSecondary} />
          <Text style={styles.securityFootnoteText}>
            Card details are processed in memory and are never persisted to disk or device storage.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <StickyActionBar
        primaryTitle={isPendingVerification ? 'Verifying...' : `Pay ${totalDisplay}`}
        onPrimaryPress={handlePay}
        primaryDisabled={!isFormValid || payMutation.isPending || isPendingVerification}
        primaryLoading={payMutation.isPending}
        secondaryTitle="Back to Review"
        onSecondaryPress={() => router.push(`/back/${campaign.id}/review` as Href)}
        priceSummary={{
          label: 'Total',
          amount: totalDisplay,
        }}
      />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  keyboardAvoid: {
    flex: 1,
  },
  skeletonContent: {
    padding: theme.spacing.base,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: theme.spacing['4xl'],
  },
  simulatedBanner: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.line,
    borderWidth: 1.5,
    borderRadius: theme.radius.card,
    padding: theme.spacing.base,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.base,
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  simulatedBannerTitle: {
    ...theme.typography.styles.smallMedium,
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  simulatedBannerBody: {
    ...theme.typography.styles.small,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  pendingCard: {
    padding: theme.spacing.base,
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.line,
    borderWidth: 1.5,
    borderRadius: theme.radius.card,
    marginBottom: theme.spacing.base,
  },
  pendingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  pendingTitle: {
    ...theme.typography.styles.smallMedium,
    color: theme.colors.lime,
  },
  pendingDesc: {
    ...theme.typography.styles.small,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  pendingActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.line,
    borderWidth: 1.5,
    borderRadius: theme.radius.card,
    padding: theme.spacing.base,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.base,
  },
  errorBannerTitle: {
    ...theme.typography.styles.smallMedium,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  errorBannerBody: {
    ...theme.typography.styles.small,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 6,
  },
  errorBannerHint: {
    ...theme.typography.styles.caption,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  testCardsSection: {
    marginBottom: theme.spacing.base,
  },
  testCardsLabel: {
    ...theme.typography.styles.captionSemiBold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  testCardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  testCardChip: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surfaceRaised,
  },
  testCardChipSelected: {
    borderColor: theme.colors.lime,
    backgroundColor: theme.colors.tintedPillBg,
  },
  testCardChipText: {
    ...theme.typography.styles.small,
    color: theme.colors.textSecondary,
  },
  testCardChipTextSelected: {
    color: theme.colors.lime,
    fontFamily: theme.typography.fonts.uiBold,
  },
  formCard: {
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
    marginBottom: theme.spacing.base,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.base,
  },
  formTitle: {
    ...theme.typography.styles.h3,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surfaceRaised,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
  },
  secureText: {
    ...theme.typography.styles.caption,
    color: theme.colors.textSecondary,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    ...theme.typography.styles.captionSemiBold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  textInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.radius.input,
    backgroundColor: theme.colors.inputBg,
    paddingHorizontal: theme.spacing.md,
    ...theme.typography.styles.body,
    color: theme.colors.textPrimary,
  },
  textInputError: {
    borderColor: theme.colors.textPrimary,
    backgroundColor: theme.colors.inputBg,
  },
  dualInputsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  securityFootnote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.base,
  },
  securityFootnoteText: {
    flex: 1,
    ...theme.typography.styles.small,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
});
