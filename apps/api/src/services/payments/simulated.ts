export interface PaymentSimulationResult {
  status: 'SUCCEEDED' | 'FAILED' | 'PENDING';
  cardBrand: string;
  cardLast4: string;
  failureReason?: string;
  failureMessage?: string;
  isVerificationPending?: boolean;
}

/**
 * Normalizes card number string by stripping spaces and hyphens.
 */
export function normalizeCardNumber(cardNumber: string): string {
  return cardNumber.replace(/[\s-]/g, '');
}

/**
 * Detects card brand based on card number prefix.
 */
export function detectCardBrand(digits: string): string {
  if (digits.startsWith('4')) return 'Visa';
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (/^6(?:011|5)/.test(digits)) return 'Discover';
  return 'Visa';
}

/**
 * Simulates card payment processing using designated magic cards.
 *
 * Magic Cards:
 * - 4242 4242 4242 4242: SUCCEEDED
 * - 4000 0000 0000 0002: FAILED (Card Declined)
 * - 4000 0000 0000 9995: FAILED (Insufficient Funds)
 * - 4000 0000 0000 3220: PENDING (Bank Verification Required, auto-resolves after 15s)
 */
export function simulateCardPayment(cardNumber: string): PaymentSimulationResult {
  const digits = normalizeCardNumber(cardNumber);
  const cardBrand = detectCardBrand(digits);
  const cardLast4 = digits.slice(-4) || '4242';

  if (digits === '4000000000000002') {
    return {
      status: 'FAILED',
      cardBrand,
      cardLast4: '0002',
      failureReason: 'CARD_DECLINED',
      failureMessage: 'Your card was declined by the issuing bank.',
    };
  }

  if (digits === '4000000000009995') {
    return {
      status: 'FAILED',
      cardBrand,
      cardLast4: '9995',
      failureReason: 'INSUFFICIENT_FUNDS',
      failureMessage: 'Your card has insufficient funds to complete this transaction.',
    };
  }

  if (digits === '4000000000003220') {
    return {
      status: 'PENDING',
      cardBrand,
      cardLast4: '3220',
      failureReason: 'BANK_VERIFICATION_REQUIRED',
      failureMessage: 'Additional verification required by your bank. Completing authentication...',
      isVerificationPending: true,
    };
  }

  // Standard success card (4242... or any standard test card)
  return {
    status: 'SUCCEEDED',
    cardBrand,
    cardLast4,
  };
}
