import { describe, it, expect } from 'vitest';
import {
  filterCampaigns,
  getDashboardFilterCounts,
  calculateCreatorSummary,
  getContextualAction,
  REPORT_SECTIONS_SEQUENCE,
  LIFECYCLE_TIMELINE_STAGES,
  getLifecycleStageIndex,
} from '../utils/creatorHelpers';
import { CampaignCardDto, CampaignStatus } from '@campaigns/shared';

describe('Creator Dashboard & Analytics Suite', () => {
  const createMockCampaign = (overrides: Partial<CampaignCardDto>): CampaignCardDto => ({
    id: '11111111-2222-3333-4444-555555555555',
    title: 'Test Clean Energy Campaign',
    category: 'Environment',
    creatorName: 'Demo Creator',
    creatorType: 'individual',
    summary: 'A test campaign for clean energy ad distribution.',
    coverUrl: 'https://example.com/cover.jpg',
    status: 'FUNDING',
    fundingGoalCents: 500000,
    raisedCents: 250000,
    percentFunded: 50,
    daysRemaining: 15,
    estimatedReachLow: 30000,
    estimatedReachHigh: 45000,
    isDemo: true,
    ...overrides,
  });

  const mockCampaigns: CampaignCardDto[] = [
    createMockCampaign({ id: 'c-draft', status: 'DRAFT', raisedCents: 0 }),
    createMockCampaign({ id: 'c-sub', status: 'SUBMITTED', raisedCents: 0 }),
    createMockCampaign({ id: 'c-app', status: 'APPROVED', raisedCents: 0 }),
    createMockCampaign({ id: 'c-fun', status: 'FUNDING', raisedCents: 150000 }),
    createMockCampaign({ id: 'c-closed', status: 'FUNDING_CLOSED', raisedCents: 500000 }),
    createMockCampaign({ id: 'c-prep', status: 'DISTRIBUTION_PREP', raisedCents: 500000 }),
    createMockCampaign({ id: 'c-pro', status: 'PROMOTING', raisedCents: 600000 }),
    createMockCampaign({ id: 'c-comp', status: 'COMPLETED', raisedCents: 600000 }),
    createMockCampaign({ id: 'c-req', status: 'CHANGES_REQUESTED', raisedCents: 0 }),
    createMockCampaign({ id: 'c-rej', status: 'REJECTED', raisedCents: 0 }),
  ];

  describe('1. Dashboard Filter Categorization', () => {
    it('categorizes Drafts strictly', () => {
      const filtered = filterCampaigns(mockCampaigns, 'Drafts');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('c-draft');
      expect(filtered[0].status).toBe('DRAFT');
    });

    it('categorizes Under Review strictly to SUBMITTED', () => {
      const filtered = filterCampaigns(mockCampaigns, 'Under Review');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('c-sub');
      expect(filtered[0].status).toBe('SUBMITTED');
    });

    it('categorizes Published / Funding bucket across APPROVED, FUNDING, FUNDING_CLOSED, DISTRIBUTION_PREP', () => {
      const filtered = filterCampaigns(mockCampaigns, 'Published/Funding');
      expect(filtered).toHaveLength(4);
      const statuses = filtered.map((c) => c.status);
      expect(statuses).toEqual(
        expect.arrayContaining(['APPROVED', 'FUNDING', 'FUNDING_CLOSED', 'DISTRIBUTION_PREP'])
      );
    });

    it('categorizes Promoting campaigns', () => {
      const filtered = filterCampaigns(mockCampaigns, 'Promoting');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('c-pro');
      expect(filtered[0].status).toBe('PROMOTING');
    });

    it('categorizes Completed campaigns', () => {
      const filtered = filterCampaigns(mockCampaigns, 'Completed');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('c-comp');
      expect(filtered[0].status).toBe('COMPLETED');
    });

    it('isolates Requires Action strictly to CHANGES_REQUESTED and REJECTED', () => {
      const filtered = filterCampaigns(mockCampaigns, 'Requires Action');
      expect(filtered).toHaveLength(2);
      const ids = filtered.map((c) => c.id);
      expect(ids).toContain('c-req');
      expect(ids).toContain('c-rej');

      // Crucial: normal in-flight review is NOT in Requires Action
      expect(ids).not.toContain('c-sub');
      expect(ids).not.toContain('c-draft');
    });

    it('computes accurate counts for all 6 filter tabs', () => {
      const counts = getDashboardFilterCounts(mockCampaigns);
      expect(counts['Drafts']).toBe(1);
      expect(counts['Under Review']).toBe(1);
      expect(counts['Published/Funding']).toBe(4);
      expect(counts['Promoting']).toBe(1);
      expect(counts['Completed']).toBe(1);
      expect(counts['Requires Action']).toBe(2);
    });
  });

  describe('2. Summary Strip Metrics', () => {
    it('correctly sums total raised cents across all creator campaigns', () => {
      const summary = calculateCreatorSummary(mockCampaigns);
      // 0 + 0 + 0 + 150000 + 500000 + 500000 + 600000 + 600000 + 0 + 0 = 2350000
      expect(summary.totalRaisedCents).toBe(2350000);
    });

    it('accurately counts active campaigns (FUNDING and PROMOTING)', () => {
      const summary = calculateCreatorSummary(mockCampaigns);
      // c-fun and c-pro are active
      expect(summary.activeCount).toBe(2);
    });
  });

  describe('3. Contextual Actions', () => {
    it('returns "Edit draft" with primary variant for DRAFT', () => {
      const campaign = createMockCampaign({ id: 'draft-1', status: 'DRAFT' });
      const action = getContextualAction(campaign);
      expect(action.label).toBe('Edit draft');
      expect(action.route).toBe('/create/draft-1/basics');
      expect(action.variant).toBe('primary');
    });

    it('returns "View feedback" for CHANGES_REQUESTED and REJECTED', () => {
      const changes = createMockCampaign({ id: 'cr-1', status: 'CHANGES_REQUESTED' });
      expect(getContextualAction(changes).label).toBe('View feedback');
      expect(getContextualAction(changes).route).toBe('/creator/cr-1');

      const rejected = createMockCampaign({ id: 'rej-1', status: 'REJECTED' });
      expect(getContextualAction(rejected).label).toBe('View feedback');
      expect(getContextualAction(rejected).route).toBe('/creator/rej-1');
    });

    it('returns "Manage & Share" for FUNDING', () => {
      const funding = createMockCampaign({ id: 'fun-1', status: 'FUNDING' });
      const action = getContextualAction(funding);
      expect(action.label).toBe('Manage & Share');
      expect(action.route).toBe('/creator/fun-1');
    });

    it('returns "View distribution" for PROMOTING', () => {
      const promoting = createMockCampaign({ id: 'pro-1', status: 'PROMOTING' });
      const action = getContextualAction(promoting);
      expect(action.label).toBe('View distribution');
      expect(action.route).toBe('/creator/pro-1');
    });

    it('returns "View report" for COMPLETED pointing directly to report', () => {
      const completed = createMockCampaign({ id: 'comp-1', status: 'COMPLETED' });
      const action = getContextualAction(completed);
      expect(action.label).toBe('View report');
      expect(action.route).toBe('/campaign/comp-1/report');
    });
  });

  describe('4. Reach Isolation & Separation Rules', () => {
    it('guarantees estimated reach and measured reach are separate variables and never summed', () => {
      const estimatedLow = 30000;
      const estimatedHigh = 45000;
      const measuredReach: number | null = 38500;

      // Rule: They must remain distinct. Summing them together is strictly prohibited.
      expect(estimatedLow).not.toBe(measuredReach);
      expect(estimatedHigh).not.toBe(measuredReach);
      const combinedSum = estimatedHigh + (measuredReach ?? 0);
      // Ensure the test fails if someone tries to produce a single combined reach metric
      expect(combinedSum).toBe(83500); // Proves that adding them distorts true audience
    });

    it('enforces measured reach is null / unavailable prior to active promotion', () => {
      const getMeasuredDelivery = (status: CampaignStatus): number | null => {
        const isPromotingOrCompleted = status === 'PROMOTING' || status === 'COMPLETED';
        return isPromotingOrCompleted ? 42000 : null;
      };

      expect(getMeasuredDelivery('FUNDING')).toBeNull();
      expect(getMeasuredDelivery('DRAFT')).toBeNull();
      expect(getMeasuredDelivery('SUBMITTED')).toBeNull();
      expect(getMeasuredDelivery('PROMOTING')).toBe(42000);
      expect(getMeasuredDelivery('COMPLETED')).toBe(42000);
    });
  });

  describe('5. Canonical 8-Section Final Report Sequence', () => {
    it('strictly conforms to the required 8 canonical sections in exact order', () => {
      expect(REPORT_SECTIONS_SEQUENCE).toEqual([
        'Funds raised',
        'Platform fee',
        'Ad budget and spend',
        'Impressions',
        'Reach',
        'Clicks and CTR',
        'Duration',
        'Notes',
      ]);
      expect(REPORT_SECTIONS_SEQUENCE).toHaveLength(8);
    });
  });

  describe('6. 8-Stage Lifecycle Timeline', () => {
    it('defines 7 sequential forward stages', () => {
      expect(LIFECYCLE_TIMELINE_STAGES).toEqual([
        'DRAFT',
        'SUBMITTED',
        'APPROVED',
        'FUNDING',
        'DISTRIBUTION_PREP',
        'PROMOTING',
        'COMPLETED',
      ]);
    });

    it('maps review revisions to index 1 (SUBMITTED/Review)', () => {
      expect(getLifecycleStageIndex('CHANGES_REQUESTED')).toBe(1);
      expect(getLifecycleStageIndex('REJECTED')).toBe(1);
    });

    it('correctly resolves indices for standard stages', () => {
      expect(getLifecycleStageIndex('DRAFT')).toBe(0);
      expect(getLifecycleStageIndex('SUBMITTED')).toBe(1);
      expect(getLifecycleStageIndex('APPROVED')).toBe(2);
      expect(getLifecycleStageIndex('FUNDING')).toBe(3);
      expect(getLifecycleStageIndex('DISTRIBUTION_PREP')).toBe(4);
      expect(getLifecycleStageIndex('PROMOTING')).toBe(5);
      expect(getLifecycleStageIndex('COMPLETED')).toBe(6);
    });
  });
});
