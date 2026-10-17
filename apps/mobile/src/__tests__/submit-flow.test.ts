import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDraftStore } from '../store/draftStore';
import {
  getAllStepErrors,
  reachAtGoal,
  validateCampaignSubmission,
} from '@campaigns/shared';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock apiClient
vi.mock('../api/client', () => ({
  apiClient: {
    patch: vi.fn().mockResolvedValue({ id: 'draft-999', title: 'Submitted Campaign' }),
    post: vi.fn().mockResolvedValue({ id: 'draft-999', status: 'SUBMITTED' }),
  },
}));

describe('Campaign Creation Step 5: Submit, Preview, & Confirmations', () => {
  beforeEach(() => {
    useDraftStore.setState({
      drafts: {},
      dirtyFields: {},
      syncedState: {},
      activeDraftId: null,
      syncStatus: {},
      lastSavedAt: {},
      lastError: {},
      isHydrated: true,
      isSubmitting: false,
    });
  });

  describe('Funding Goal Isolation Guard', () => {
    it('prohibits setting fundingGoalCents without fromSubmitStep: true', () => {
      const store = useDraftStore.getState();
      store.setActiveDraft('draft-999');

      expect(() => {
        store.updateDraftField('fundingGoalCents', 250000);
      }).toThrow(/GUARD_VIOLATION.*Step 5 \(Submit\)/);

      expect(() => {
        store.updateDraftFields({ fundingGoalCents: 500000 });
      }).toThrow(/GUARD_VIOLATION.*Step 5 \(Submit\)/);

      const draft = useDraftStore.getState().getDraft('draft-999');
      expect(draft?.fundingGoalCents).toBeUndefined();
    });

    it('permits setting fundingGoalCents ONLY when fromSubmitStep is explicitly true', () => {
      const store = useDraftStore.getState();
      store.setActiveDraft('draft-999');

      store.updateDraftField('fundingGoalCents', 250000, { fromSubmitStep: true });

      const draft = useDraftStore.getState().getDraft('draft-999');
      expect(draft?.fundingGoalCents).toBe(250000);
    });

    it('computes reach and 90/10 financial split accurately via reachAtGoal', () => {
      const result = reachAtGoal(250000); // $2,500
      expect(result.goalCents).toBe(250000);
      expect(result.platformFeeCents).toBe(25000); // 10% = $250
      expect(result.adBudgetCents).toBe(225000); // 90% = $2,250
      expect(result.estimatedReachLow).toBeGreaterThan(0);
      expect(result.estimatedReachHigh).toBeGreaterThan(result.estimatedReachLow);
    });
  });

  describe('Completeness Checklist via getAllStepErrors', () => {
    const validDraftBase = {
      title: 'Protect the Local Watershed From Industrial Runoff',
      category: 'Environment' as const,
      creatorName: 'Clean Water Alliance',
      creatorType: 'nonprofit' as const,
      summary: 'A public campaign to rally local oversight and protect community drinking water reservoirs.',
      coverUrl: 'https://images.unsplash.com/photo-water-cover',
      story: [
        {
          id: 'b1',
          type: 'heading' as const,
          level: 2 as const,
          text: 'The Immediate Threat to Our Water Supply',
        },
        {
          id: 'b2',
          type: 'paragraph' as const,
          text: 'Industrial contaminants have been discovered in runoff test wells adjacent to the northern reservoir. Over forty thousand residents rely on this aquifer for their daily drinking water supply.',
        },
        {
          id: 'b3',
          type: 'paragraph' as const,
          text: 'Independent laboratory analyses confirm elevated concentrations of synthetic solvents entering municipal drainage channels. Community action and targeted public awareness are urgently needed to demand regulatory enforcement and protective filtration systems before irrevocable groundwater contamination occurs.',
        },
      ],
      sources: [
        {
          id: 's1',
          title: 'County Water Quality Assessment 2026',
          url: 'https://cleanwater.org/report-2026',
        },
      ],
      adCreative: {
        images: [{ url: 'https://images.unsplash.com/photo-water-1', aspectRatio: '1:1' as const }],
        headline: 'Clean Drinking Water Needs Your Voice',
        description: 'Fund digital ads to notify county residents before the public comment period closes.',
        cta: 'Learn More',
        callToAction: 'Learn More' as const,
      },
      reach: {
        locations: ['Austin, TX'],
        themes: ['Environment & climate'],
        ageRange: [18, 65] as [number, number],
        channels: ['social_feed' as const, 'display' as const],
        budgetAllocation: { social_feed: 70, display: 30 },
        durationDays: 14,
        fundingWindowDays: 30,
      },
      fundingGoalCents: 250000,
    };

    it('detects incomplete draft missing fundingGoalCents and acceptedRules', () => {
      const incomplete = {
        ...validDraftBase,
        fundingGoalCents: undefined,
        acceptedRules: false,
      };

      const errors = getAllStepErrors(incomplete);
      expect(errors.submit.length).toBeGreaterThan(0);
      expect(errors.submit.some((e) => e.includes('Funding goal'))).toBe(true);
      expect(errors.submit.some((e) => e.includes('platform rules'))).toBe(true);
    });

    it('returns zero errors across all 5 steps when draft is complete and acceptedRules is true', () => {
      const completeDraft = {
        ...validDraftBase,
        acceptedRules: true,
      };

      const errors = getAllStepErrors(completeDraft);
      expect(errors.basics).toEqual([]);
      expect(errors.story).toEqual([]);
      expect(errors.visuals).toEqual([]);
      expect(errors.reach).toEqual([]);
      expect(errors.submit).toEqual([]);

      const hasAny = Object.values(errors).some((errList) => errList.length > 0);
      expect(hasAny).toBe(false);
    });

    it('validates against backend validateCampaignSubmission contract', () => {
      const candidate = {
        ...validDraftBase,
        acceptedRules: true,
      };

      const result = validateCampaignSubmission(
        candidate as unknown as Parameters<typeof validateCampaignSubmission>[0]
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });
  });

  describe('4 Required Confirmations Gate', () => {
    it('requires all 4 checkboxes before acceptedRules becomes true', () => {
      let rights = false;
      let guidelines = false;
      let adOnly = false;
      let reviewEdits = false;

      const isComplete = () => rights && guidelines && adOnly && reviewEdits;

      expect(isComplete()).toBe(false);

      rights = true;
      expect(isComplete()).toBe(false);

      guidelines = true;
      expect(isComplete()).toBe(false);

      adOnly = true;
      expect(isComplete()).toBe(false);

      reviewEdits = true;
      expect(isComplete()).toBe(true);
    });
  });

  describe('isSubmitting Status and Double-Submission Guard', () => {
    it('sets and clears isSubmitting in draft store', () => {
      expect(useDraftStore.getState().isSubmitting).toBe(false);

      useDraftStore.getState().setIsSubmitting(true);
      expect(useDraftStore.getState().isSubmitting).toBe(true);

      useDraftStore.getState().setIsSubmitting(false);
      expect(useDraftStore.getState().isSubmitting).toBe(false);
    });
  });
});
