import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBackingStore } from '../store/backingStore';
import { quote } from '@campaigns/shared';
import {
  recordGuestReceiptToken,
  getGuestTokenForContribution,
  getGuestReceiptTokens,
  clearGuestReceiptTokens,
} from '../api/tokens';

// Mock expo-secure-store
vi.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: vi.fn(async (key: string) => store.get(key) || null),
    setItemAsync: vi.fn(async (key: string, val: string) => {
      store.set(key, val);
    }),
    deleteItemAsync: vi.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

describe('Backing Flow Architecture & Store Tests', () => {
  beforeEach(async () => {
    useBackingStore.getState().reset();
    await clearGuestReceiptTokens();
  });

  describe('useBackingStore state preservation', () => {
    it('initializes default state for a campaign', () => {
      const store = useBackingStore.getState();
      store.initForCampaign('campaign-alpha');

      const state = useBackingStore.getState();
      expect(state.campaignId).toBe('campaign-alpha');
      expect(state.amountDollars).toBe('25');
      expect(state.amountCents).toBe(2500);
      expect(state.isAnonymous).toBe(true);
    });

    it('preserves user entered amount when re-navigating to the same campaign', () => {
      const store = useBackingStore.getState();
      store.initForCampaign('campaign-alpha');
      store.setAmountDollars('150');

      expect(useBackingStore.getState().amountCents).toBe(15000);

      // Re-navigating to same campaign must not reset amount
      store.initForCampaign('campaign-alpha');
      expect(useBackingStore.getState().amountDollars).toBe('150');
      expect(useBackingStore.getState().amountCents).toBe(15000);
    });

    it('resets amount when switching to a different campaign', () => {
      const store = useBackingStore.getState();
      store.initForCampaign('campaign-alpha');
      store.setAmountDollars('100');

      // Switch to campaign-beta
      store.initForCampaign('campaign-beta');
      expect(useBackingStore.getState().campaignId).toBe('campaign-beta');
      expect(useBackingStore.getState().amountDollars).toBe('25');
      expect(useBackingStore.getState().amountCents).toBe(2500);
    });

    it('updates privacy and guest email without modifying amount', () => {
      const store = useBackingStore.getState();
      store.initForCampaign('campaign-alpha');
      store.setAmountDollars('50');

      store.setPrivacy(false, 'Sarah Connor');
      store.setGuestEmail('sarah@example.com');

      const state = useBackingStore.getState();
      expect(state.isAnonymous).toBe(false);
      expect(state.publicName).toBe('Sarah Connor');
      expect(state.guestEmail).toBe('sarah@example.com');
      expect(state.amountCents).toBe(5000);
    });

    it('never contains payment card credentials in the store', () => {
      const state = useBackingStore.getState() as unknown as Record<string, unknown>;
      expect(state.cardNumber).toBeUndefined();
      expect(state.cardholderName).toBeUndefined();
      expect(state.cvc).toBeUndefined();
      expect(state.expiry).toBeUndefined();
    });
  });

  describe('Quote & Fee Transparency Math', () => {
    it('calculates exact 90% ad budget and 10% platform fee for $25 contribution', () => {
      const q = quote(2500);
      expect(q.amountCents).toBe(2500);
      expect(q.platformFeeCents).toBe(250); // 10%
      expect(q.adBudgetCents).toBe(2250); // 90%
      expect(q.processingFeeCents).toBe(103); // 2.9% of 2500 (= 72.5 -> 73) + 30 = 103 cents
      expect(q.totalCents).toBe(2603);
      expect(q.estimatedReachMid).toBeGreaterThan(0);
      expect(q.estimatedReachLow).toBeLessThan(q.estimatedReachMid);
      expect(q.estimatedReachHigh).toBeGreaterThan(q.estimatedReachMid);
    });

    it('calculates fee breakdown for $100 contribution', () => {
      const q = quote(10000);
      expect(q.amountCents).toBe(10000);
      expect(q.platformFeeCents).toBe(1000); // $10.00
      expect(q.adBudgetCents).toBe(9000); // $90.00
      expect(q.processingFeeCents).toBe(320); // 2.9% of 10000 = 290 + 30 = 320 cents ($3.20)
      expect(q.totalCents).toBe(10320);
    });

    it('returns zero quote for zero or negative amount', () => {
      const q = quote(0);
      expect(q.amountCents).toBe(0);
      expect(q.totalCents).toBe(0);
      expect(q.estimatedReachMid).toBe(0);
    });
  });

  describe('Guest Receipt Tokens & Device Keychain Persistence', () => {
    it('records and retrieves guest receipt token for a contribution', async () => {
      const contributionId = 'c-1234-abcd';
      const token = 'guest-tok-xyz-987';

      await recordGuestReceiptToken(contributionId, token);

      const retrieved = await getGuestTokenForContribution(contributionId);
      expect(retrieved).toBe(token);

      const allTokens = await getGuestReceiptTokens();
      expect(allTokens).toContain(token);
    });

    it('returns null for unknown contribution token lookup', async () => {
      const retrieved = await getGuestTokenForContribution('non-existent');
      expect(retrieved).toBeNull();
    });
  });
});
