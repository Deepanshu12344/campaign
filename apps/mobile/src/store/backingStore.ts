import { create } from 'zustand';

export interface BackingStoreState {
  campaignId: string | null;
  amountDollars: string;
  amountCents: number;
  isAnonymous: boolean;
  publicName: string;
  guestEmail: string;
  contributionId: string | null;
  guestReceiptToken: string | null;
  previousRaisedCents: number;
  previousPercentFunded: number;

  // Actions
  initForCampaign: (campaignId: string, initialCents?: number) => void;
  setAmountDollars: (dollars: string) => void;
  setAmountCents: (cents: number) => void;
  setPrivacy: (isAnonymous: boolean, publicName?: string) => void;
  setGuestEmail: (email: string) => void;
  setContribution: (contributionId: string, guestToken: string | null) => void;
  setPreviousProgress: (raisedCents: number, percentFunded: number) => void;
  reset: () => void;
}

export const useBackingStore = create<BackingStoreState>((set) => ({
  campaignId: null,
  amountDollars: '25',
  amountCents: 2500,
  isAnonymous: true,
  publicName: '',
  guestEmail: '',
  contributionId: null,
  guestReceiptToken: null,
  previousRaisedCents: 0,
  previousPercentFunded: 0,

  initForCampaign: (campaignId: string, initialCents = 2500) => {
    set((state) => {
      // If returning to the same campaign, keep existing entered amount
      if (state.campaignId === campaignId && state.amountCents > 0) {
        return { campaignId };
      }
      return {
        campaignId,
        amountDollars: initialCents > 0 ? String(Math.round(initialCents / 100)) : '25',
        amountCents: initialCents > 0 ? initialCents : 2500,
        contributionId: null,
        guestReceiptToken: null,
      };
    });
  },

  setAmountDollars: (dollars: string) => {
    const cleanStr = dollars.replace(/[^0-9]/g, '');
    const numeric = parseInt(cleanStr, 10);
    const cents = isNaN(numeric) ? 0 : numeric * 100;
    set({
      amountDollars: cleanStr,
      amountCents: cents,
    });
  },

  setAmountCents: (cents: number) => {
    set({
      amountDollars: cents > 0 ? String(Math.round(cents / 100)) : '',
      amountCents: cents,
    });
  },

  setPrivacy: (isAnonymous: boolean, publicName = '') => {
    set({ isAnonymous, publicName });
  },

  setGuestEmail: (email: string) => {
    set({ guestEmail: email });
  },

  setContribution: (contributionId: string, guestToken: string | null) => {
    set({ contributionId, guestReceiptToken: guestToken });
  },

  setPreviousProgress: (raisedCents: number, percentFunded: number) => {
    set({ previousRaisedCents: raisedCents, previousPercentFunded: percentFunded });
  },

  reset: () => {
    set({
      campaignId: null,
      amountDollars: '25',
      amountCents: 2500,
      isAnonymous: true,
      publicName: '',
      guestEmail: '',
      contributionId: null,
      guestReceiptToken: null,
      previousRaisedCents: 0,
      previousPercentFunded: 0,
    });
  },
}));
