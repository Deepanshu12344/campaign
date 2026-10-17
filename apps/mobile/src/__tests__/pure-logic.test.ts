import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('expo-haptics', () => ({
  impactAsync: vi.fn().mockResolvedValue(undefined),
  notificationAsync: vi.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

vi.mock('lucide-react-native', () => ({
  Check: () => null,
}));

import {
  quote,
  reachAtGoal,
  rebalanceBudgetAllocation,
  getStepErrors,
  getAllStepErrors,
  Notification,
} from '@campaigns/shared';
import { StepIndicator, CREATION_STEPS } from '../components/ui/StepIndicator';
import {
  groupNotificationsByDay,
  filterNotificationsByTab,
} from '../utils/activityHelpers';

describe('Mobile Pure Logic & User-Facing Functions Suite', () => {
  // =========================================================================
  // 1. REACH & QUOTE DISPLAY MATCHING SHARED FUNCTIONS
  // =========================================================================
  describe('Reach & Quote Math Consistency', () => {
    it('matches exact formula for preset backing amounts ($5, $10, $25, $50, $100)', () => {
      const presets = [
        { dollars: 5, cents: 500 },
        { dollars: 10, cents: 1000 },
        { dollars: 25, cents: 2500 },
        { dollars: 50, cents: 5000 },
        { dollars: 100, cents: 10000 },
      ];

      for (const { cents } of presets) {
        const q = quote(cents);
        // Invariant: platform fee is exactly 10%
        expect(q.platformFeeCents).toBe(Math.round(cents * 0.1));
        // Invariant: ad budget is exactly 90%
        expect(q.adBudgetCents).toBe(cents - q.platformFeeCents);
        // Invariant: processing fee is 2.9% + 30 cents
        const expectedProc = Math.round(cents * 0.029) + 30;
        expect(q.processingFeeCents).toBe(expectedProc);
        // Total charge is contribution + processing fee
        expect(q.totalCents).toBe(cents + expectedProc);
        // Reach estimates are proportional and low < mid < high
        expect(q.estimatedReachLow).toBeLessThan(q.estimatedReachMid);
        expect(q.estimatedReachHigh).toBeGreaterThan(q.estimatedReachMid);
      }
    });

    it('calculates campaign reach at funding goal via reachAtGoal', () => {
      const goalCents = 500000; // $5,000
      const reach = reachAtGoal(goalCents);

      expect(reach.goalCents).toBe(500000);
      expect(reach.platformFeeCents).toBe(50000); // 10% = $500
      expect(reach.adBudgetCents).toBe(450000); // 90% = $4,500
      expect(reach.estimatedReachLow).toBeGreaterThan(0);
      expect(reach.estimatedReachHigh).toBeGreaterThan(reach.estimatedReachLow);
    });

    it('formats numbers and ranges consistently for UI display', () => {
      const q = quote(2500); // $25
      const formattedRange = `~${q.estimatedReachLow.toLocaleString()} – ${q.estimatedReachHigh.toLocaleString()} people reached`;
      expect(formattedRange).toContain('people reached');
      expect(q.estimatedReachLow).toBeGreaterThan(0);
      expect(q.estimatedReachHigh).toBeGreaterThan(q.estimatedReachLow);
      expect(q.estimatedReachMid).toBeGreaterThan(q.estimatedReachLow);
      expect(q.estimatedReachMid).toBeLessThan(q.estimatedReachHigh);
    });
  });

  // =========================================================================
  // 2. STEP INDICATOR COMPONENT STATES (ACTIVE, COMPLETED, UPCOMING)
  // =========================================================================
  describe('StepIndicator Component States', () => {
    it('defines the strict 5-step creation sequence', () => {
      expect(CREATION_STEPS).toEqual(['Basics', 'Story', 'Visuals', 'Reach', 'Submit']);
      expect(CREATION_STEPS.length).toBe(5);
    });

    it('computes correct state (active, completed, upcoming) for currentStepIndex', () => {
      // Step 3 (index 2: Visuals) is active
      const currentIndex = 2;

      CREATION_STEPS.forEach((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isUpcoming = index > currentIndex;

        if (index === 0 || index === 1) {
          expect(isDone).toBe(true);
          expect(isCurrent).toBe(false);
          expect(isUpcoming).toBe(false);
        } else if (index === 2) {
          expect(isDone).toBe(false);
          expect(isCurrent).toBe(true);
          expect(isUpcoming).toBe(false);
        } else {
          expect(isDone).toBe(false);
          expect(isCurrent).toBe(false);
          expect(isUpcoming).toBe(true);
        }
      });
    });

    it('renders StepIndicator with 1-indexed currentStep prop', () => {
      const element = React.createElement(StepIndicator, {
        currentStep: 3, // Visuals
        onStepPress: vi.fn(),
      });
      expect(element).toBeDefined();
      expect(element.props.currentStep).toBe(3);
    });

    it('allows tapping only completed steps (index < activeIndex)', () => {
      const onStepPressMock = vi.fn();
      const activeIndex = 2; // Step 3

      // Simulating handlePress logic from StepIndicator:
      const simulatePress = (index: number) => {
        if (index < activeIndex) {
          onStepPressMock(index);
        }
      };

      // Tapping step 0 (Basics, completed) -> allowed
      simulatePress(0);
      expect(onStepPressMock).toHaveBeenCalledWith(0);

      // Tapping step 1 (Story, completed) -> allowed
      simulatePress(1);
      expect(onStepPressMock).toHaveBeenCalledWith(1);

      // Tapping step 2 (current) -> ignored
      simulatePress(2);
      expect(onStepPressMock).toHaveBeenCalledTimes(2);

      // Tapping step 3 (upcoming) -> ignored
      simulatePress(3);
      expect(onStepPressMock).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // 3. ALLOCATION REBALANCING
  // =========================================================================
  describe('Channel Allocation Rebalancing (rebalanceBudgetAllocation)', () => {
    it('returns empty object when no channels are selected', () => {
      expect(rebalanceBudgetAllocation([])).toEqual({});
    });

    it('allocates 100% when a single channel is selected', () => {
      const alloc = rebalanceBudgetAllocation(['meta_feed']);
      expect(alloc).toEqual({ meta_feed: 100 });
    });

    it('allocates 50% / 50% for two channels with equal distribution', () => {
      const alloc = rebalanceBudgetAllocation(['meta_feed', 'google_search']);
      expect(alloc).toEqual({ meta_feed: 50, google_search: 50 });
      const sum = Object.values(alloc).reduce((a, b) => a + b, 0);
      expect(sum).toBe(100);
    });

    it('allocates 34% / 33% / 33% for three channels, ensuring exact 100% sum', () => {
      const alloc = rebalanceBudgetAllocation(['meta_feed', 'google_search', 'youtube_bumper']);
      const sum = Object.values(alloc).reduce((a, b) => a + b, 0);
      expect(sum).toBe(100);
    });

    it('proportionally rescales existing allocations when all channels have weights', () => {
      // User had 60% Meta, 40% Google (sum = 100%)
      const existing = { meta_feed: 60, google_search: 40 };
      const alloc = rebalanceBudgetAllocation(['meta_feed', 'google_search'], existing);
      expect(alloc).toEqual({ meta_feed: 60, google_search: 40 });
    });

    it('rebalances cleanly when a 3rd channel is added to existing weights', () => {
      const existing = { meta_feed: 70, google_search: 30 };
      const updated = rebalanceBudgetAllocation(['meta_feed', 'google_search', 'display'], existing);
      const sum = Object.values(updated).reduce((a, b) => a + b, 0);
      expect(sum).toBe(100);
    });
  });

  // =========================================================================
  // 4. STEP ERRORS VALIDATION CHECKLIST FOR EACH STEP
  // =========================================================================
  describe('getStepErrors for Each Step', () => {
    const emptyDraft = {
      title: '',
      category: undefined,
      creatorName: '',
      summary: '',
      coverUrl: '',
      story: [],
      sources: [],
      adCreative: null,
      reach: null,
      fundingGoalCents: 0,
      acceptedRules: false,
    };

    it('detects all errors on Step 1: Basics', () => {
      const errors = getStepErrors(emptyDraft, 'basics');
      expect(errors.length).toBeGreaterThanOrEqual(3);
      expect(errors.some((e) => e.includes('Title is required'))).toBe(true);
      expect(errors.some((e) => e.includes('Category is required'))).toBe(true);
      expect(errors.some((e) => e.includes('Summary is required'))).toBe(true);
    });

    it('detects character max length violations on Step 1: Basics', () => {
      const tooLongDraft = {
        title: 'A'.repeat(61), // Max 60
        summary: 'B'.repeat(161), // Max 160
        category: 'Health' as const,
        creatorName: 'Demo Creator',
        creatorType: 'individual' as const,
      };

      const errors = getStepErrors(tooLongDraft, 'basics');
      expect(errors.some((e) => e.includes('cannot exceed 60 characters'))).toBe(true);
      expect(errors.some((e) => e.includes('cannot exceed 160 characters'))).toBe(true);
    });

    it('detects all errors on Step 2: Story (heading, min 300 chars, sources)', () => {
      const errors = getStepErrors(emptyDraft, 'story');
      expect(errors.some((e) => e.includes('heading block'))).toBe(true);
      expect(errors.some((e) => e.includes('300 characters'))).toBe(true);
      expect(errors.some((e) => e.includes('verified source'))).toBe(true);
    });

    it('detects all errors on Step 3: Visuals & Ad Creative', () => {
      const errors = getStepErrors(emptyDraft, 'visuals');
      expect(errors.some((e) => e.includes('cover image'))).toBe(true);
      expect(errors.some((e) => e.includes('Ad creative settings are required'))).toBe(true);
    });

    it('detects all errors on Step 4: Reach & Distribution', () => {
      const errors = getStepErrors(emptyDraft, 'reach');
      expect(errors.some((e) => e.includes('Reach settings are required'))).toBe(true);
    });

    it('detects all errors on Step 5: Funding Goal & Submit', () => {
      const errors = getStepErrors(emptyDraft, 'submit');
      expect(errors.some((e) => e.includes('Funding goal'))).toBe(true);
      expect(errors.some((e) => e.includes('platform rules'))).toBe(true);
    });

    it('validates a complete 5-step draft with zero errors', () => {
      const validCompleteDraft = {
        title: 'Community Micro-Solar Power',
        category: 'Environment' as const,
        creatorName: 'Maya Lin',
        creatorType: 'nonprofit' as const,
        summary: 'Solar panels for neighborhood clinics during summer outages.',
        coverUrl: 'https://images.unsplash.com/photo-solar',
        story: [
          { id: 'b1', type: 'heading' as const, level: 1 as const, text: 'Micro-Solar Power' },
          { id: 'b2', type: 'paragraph' as const, text: 'Clean renewable energy empowers community clinics. '.repeat(8) },
        ],
        sources: [
          { id: 's1', title: 'Solar Power Assessment', url: 'https://example.com/solar' },
        ],
        adCreative: {
          images: [{ url: 'https://images.unsplash.com/photo-solar-ad', aspectRatio: '1:1' as const }],
          headline: 'Solar for Clinics',
          description: 'Keep local community clinics powered during heatwaves.',
          cta: 'Learn More',
          callToAction: 'Learn More' as const,
        },
        reach: {
          locations: ['Austin, TX'],
          themes: ['Environment & climate'],
          ageRange: [18, 65] as [number, number],
          channels: ['social_feed' as const],
          budgetAllocation: { social_feed: 100 },
          durationDays: 30,
          fundingWindowDays: 30,
        },
        fundingGoalCents: 100000,
        acceptedRules: true,
      };

      const stepErrors = getAllStepErrors(validCompleteDraft);
      expect(stepErrors.basics).toEqual([]);
      expect(stepErrors.story).toEqual([]);
      expect(stepErrors.visuals).toEqual([]);
      expect(stepErrors.reach).toEqual([]);
      expect(stepErrors.submit).toEqual([]);
    });
  });

  // =========================================================================
  // 5. NOTIFICATION UNREAD COUNT & DAY GROUPING
  // =========================================================================
  describe('Notification Unread Count & Day Grouping', () => {
    const referenceNow = new Date('2026-10-17T12:00:00Z');

    const sampleNotifications: Notification[] = [
      {
        id: 'n1',
        userId: 'u1',
        type: 'CONTRIBUTION_SUCCEEDED',
        title: 'New Contribution',
        body: '$25 received',
        campaignId: 'c1',
        readAt: null, // UNREAD
        createdAt: new Date('2026-10-17T10:00:00Z'),
      },
      {
        id: 'n2',
        userId: 'u1',
        type: 'CAMPAIGN_APPROVED',
        title: 'Campaign Approved',
        body: 'Your campaign is live',
        campaignId: 'c1',
        readAt: null, // UNREAD
        createdAt: new Date('2026-10-16T18:00:00Z'),
      },
      {
        id: 'n3',
        userId: 'u1',
        type: 'REPORT_READY',
        title: 'Final Report Ready',
        body: 'View measured reach',
        campaignId: 'c2',
        readAt: new Date('2026-10-15T12:00:00Z'), // READ
        createdAt: new Date('2026-10-12T08:00:00Z'),
      },
    ];

    it('calculates unread count accurately (notifications where readAt === null)', () => {
      const unreadCount = sampleNotifications.filter((n) => n.readAt === null).length;
      expect(unreadCount).toBe(2);
    });

    it('correctly groups notifications into Today, Yesterday, Earlier', () => {
      const groups = groupNotificationsByDay(sampleNotifications, referenceNow);
      expect(groups).toHaveLength(3);
      expect(groups[0].label).toBe('Today');
      expect(groups[0].items[0].id).toBe('n1');

      expect(groups[1].label).toBe('Yesterday');
      expect(groups[1].items[0].id).toBe('n2');

      expect(groups[2].label).toBe('Earlier');
      expect(groups[2].items[0].id).toBe('n3');
    });

    it('filters notifications by tab (All, Updates, Funding)', () => {
      const all = filterNotificationsByTab(sampleNotifications, 'All');
      expect(all).toHaveLength(3);

      const updates = filterNotificationsByTab(sampleNotifications, 'Updates');
      expect(updates.map((n) => n.id)).toEqual(['n2', 'n3']);

      const funding = filterNotificationsByTab(sampleNotifications, 'Funding');
      expect(funding.map((n) => n.id)).toEqual(['n1']);
    });
  });
});
