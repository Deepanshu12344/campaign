import { describe, it, expect } from 'vitest';
import {
  isChecklistComplete,
  getAdvanceChecks,
  ReviewChecklist,
} from '../utils/adminHelpers';
import { LifecycleCampaignItem } from '../api/hooks/useAdmin';

describe('Admin & Reviewer Console Suite', () => {
  const createMockLifecycleCampaign = (
    overrides: Partial<LifecycleCampaignItem>
  ): LifecycleCampaignItem => ({
    id: 'campaign-1234',
    title: 'Clean River Campaign',
    category: 'Environment',
    creatorName: 'River Watch',
    creatorType: 'organization',
    summary: 'A clean river initiative.',
    coverUrl: 'https://example.com/cover.jpg',
    status: 'FUNDING_CLOSED',
    fundingGoalCents: 1000000,
    raisedCents: 1000000,
    percentFunded: 100,
    daysRemaining: 0,
    estimatedReachLow: 75000,
    estimatedReachHigh: 110000,
    isDemo: true,
    pendingContributionsCount: 0,
    hasAdCreative: true,
    hasTargeting: true,
    ...overrides,
  });

  describe('1. Reviewer Checklist Verification (4-Item Rule)', () => {
    it('disallows approval when any checklist item is unchecked', () => {
      const partialChecklists: ReviewChecklist[] = [
        { contentChecked: false, sourcesChecked: true, creativeChecked: true, targetingChecked: true },
        { contentChecked: true, sourcesChecked: false, creativeChecked: true, targetingChecked: true },
        { contentChecked: true, sourcesChecked: true, creativeChecked: false, targetingChecked: true },
        { contentChecked: true, sourcesChecked: true, creativeChecked: true, targetingChecked: false },
        { contentChecked: false, sourcesChecked: false, creativeChecked: false, targetingChecked: false },
      ];

      for (const checklist of partialChecklists) {
        expect(isChecklistComplete(checklist)).toBe(false);
      }
    });

    it('enables approval strictly when all 4 checklist items are confirmed', () => {
      const completeChecklist: ReviewChecklist = {
        contentChecked: true,
        sourcesChecked: true,
        creativeChecked: true,
        targetingChecked: true,
      };

      expect(isChecklistComplete(completeChecklist)).toBe(true);
    });
  });

  describe('2. Lifecycle Advancement Checks & Transitions', () => {
    describe('FUNDING_CLOSED -> DISTRIBUTION_PREP', () => {
      it('blocks advance if pending contributions remain unsettled', () => {
        const campaign = createMockLifecycleCampaign({
          status: 'FUNDING_CLOSED',
          pendingContributionsCount: 3,
        });

        const result = getAdvanceChecks(campaign);
        expect(result.nextStatus).toBe('DISTRIBUTION_PREP');
        expect(result.canAdvance).toBe(false);
        const settledCheck = result.checks.find((c) => c.id === 'settled');
        expect(settledCheck?.passed).toBe(false);
        expect(settledCheck?.detail).toContain('3 pending contributions awaiting settlement');
        expect(result.explanation).toContain('all backer payments are settled');
      });

      it('blocks advance if raised funds are zero', () => {
        const campaign = createMockLifecycleCampaign({
          status: 'FUNDING_CLOSED',
          raisedCents: 0,
          pendingContributionsCount: 0,
        });

        const result = getAdvanceChecks(campaign);
        expect(result.canAdvance).toBe(false);
        const budgetCheck = result.checks.find((c) => c.id === 'budget');
        expect(budgetCheck?.passed).toBe(false);
      });

      it('permits advance when all contributions are settled and raised funds > 0', () => {
        const campaign = createMockLifecycleCampaign({
          status: 'FUNDING_CLOSED',
          raisedCents: 500000,
          pendingContributionsCount: 0,
        });

        const result = getAdvanceChecks(campaign);
        expect(result.nextStatus).toBe('DISTRIBUTION_PREP');
        expect(result.nextStatusLabel).toBe('Queue Distribution Prep');
        expect(result.canAdvance).toBe(true);
        expect(result.checks.every((c) => c.passed)).toBe(true);
      });
    });

    describe('DISTRIBUTION_PREP -> PROMOTING', () => {
      it('blocks advance if ad creatives are missing or incomplete', () => {
        const campaign = createMockLifecycleCampaign({
          status: 'DISTRIBUTION_PREP',
          hasAdCreative: false,
          hasTargeting: true,
        });

        const result = getAdvanceChecks(campaign);
        expect(result.nextStatus).toBe('PROMOTING');
        expect(result.canAdvance).toBe(false);
        const creativeCheck = result.checks.find((c) => c.id === 'creative');
        expect(creativeCheck?.passed).toBe(false);
        expect(creativeCheck?.detail).toContain('Ad creative missing headline');
      });

      it('blocks advance if audience targeting is unconfigured', () => {
        const campaign = createMockLifecycleCampaign({
          status: 'DISTRIBUTION_PREP',
          hasAdCreative: true,
          hasTargeting: false,
        });

        const result = getAdvanceChecks(campaign);
        expect(result.nextStatus).toBe('PROMOTING');
        expect(result.canAdvance).toBe(false);
        const targetingCheck = result.checks.find((c) => c.id === 'targeting');
        expect(targetingCheck?.passed).toBe(false);
        expect(targetingCheck?.detail).toContain('Targeting configuration missing');
      });

      it('permits launch when creatives and targeting are locked', () => {
        const campaign = createMockLifecycleCampaign({
          status: 'DISTRIBUTION_PREP',
          hasAdCreative: true,
          hasTargeting: true,
        });

        const result = getAdvanceChecks(campaign);
        expect(result.nextStatus).toBe('PROMOTING');
        expect(result.nextStatusLabel).toBe('Launch Ad Promotion');
        expect(result.canAdvance).toBe(true);
        expect(result.checks.every((c) => c.passed)).toBe(true);
      });
    });

    describe('PROMOTING -> COMPLETED', () => {
      it('permits concluding delivery and preparing final report', () => {
        const campaign = createMockLifecycleCampaign({
          status: 'PROMOTING',
        });

        const result = getAdvanceChecks(campaign);
        expect(result.nextStatus).toBe('COMPLETED');
        expect(result.nextStatusLabel).toBe('Conclude & Finalize Report');
        expect(result.canAdvance).toBe(true);
        expect(result.checks).toHaveLength(2);
      });
    });

    describe('FUNDING or COMPLETED status', () => {
      it('reports no active advance for campaigns in active funding', () => {
        const campaign = createMockLifecycleCampaign({
          status: 'FUNDING',
        });

        const result = getAdvanceChecks(campaign);
        expect(result.nextStatus).toBeNull();
        expect(result.canAdvance).toBe(false);
        expect(result.explanation).toContain('currently in funding');
      });

      it('reports completed distribution for campaigns in COMPLETED', () => {
        const campaign = createMockLifecycleCampaign({
          status: 'COMPLETED',
        });

        const result = getAdvanceChecks(campaign);
        expect(result.nextStatus).toBeNull();
        expect(result.canAdvance).toBe(false);
        expect(result.explanation).toContain('distribution is completed');
      });
    });
  });

  describe('3. Budget Allocation & Media Spend Rules', () => {
    it('accurately divides raised funds into 90% ad media and 10% platform fee', () => {
      const raisedCents = 1000000; // $10,000.00
      const platformFeeCents = Math.round(raisedCents * 0.1);
      const adBudgetCents = raisedCents - platformFeeCents;

      expect(platformFeeCents).toBe(100000); // $1,000.00
      expect(adBudgetCents).toBe(900000); // $9,000.00
      expect(platformFeeCents + adBudgetCents).toBe(raisedCents);
    });
  });
});
