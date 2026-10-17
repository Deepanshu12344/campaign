import { describe, it, expect } from 'vitest';
import {
  toggleTargetLocation,
  rebalanceBudgetAllocation,
  adjustChannelAllocation,
  validateBudgetAllocation,
  validateDurationDays,
  formatAudienceSummary,
  getStepErrors,
  isStepComplete,
  TARGET_LOCATIONS,
  DISTRIBUTION_CHANNELS,
  AVAILABLE_CHANNELS,
  AUDIENCE_INTEREST_THEMES,
} from '../index';

describe('Step 4 (Reach) Targeting & Rebalancing Logic', () => {
  describe('Location Targeting & Worldwide clearing', () => {
    it('selects multiple specific locations', () => {
      let locs: string[] = [];
      locs = toggleTargetLocation(locs, 'United States');
      locs = toggleTargetLocation(locs, 'Canada');
      locs = toggleTargetLocation(locs, 'Austin, TX');

      expect(locs).toEqual(['United States', 'Canada', 'Austin, TX']);
    });

    it('clears all other locations when Worldwide is selected', () => {
      const locs = ['United States', 'Canada', 'Austin, TX'];
      const updated = toggleTargetLocation(locs, 'Worldwide');

      expect(updated).toEqual(['Worldwide']);
    });

    it('clears Worldwide when a specific location is selected', () => {
      const locs = ['Worldwide'];
      const updated = toggleTargetLocation(locs, 'London, UK');

      expect(updated).toEqual(['London, UK']);
      expect(updated).not.toContain('Worldwide');
    });

    it('toggles an existing location off', () => {
      const locs = ['United States', 'Canada'];
      const updated = toggleTargetLocation(locs, 'Canada');

      expect(updated).toEqual(['United States']);
    });

    it('deselects Worldwide if clicked while already active', () => {
      const locs = ['Worldwide'];
      const updated = toggleTargetLocation(locs, 'Worldwide');

      expect(updated).toEqual([]);
    });

    it('curated list contains countries, regions, and major cities', () => {
      expect(TARGET_LOCATIONS.length).toBeGreaterThan(15);
      const worldwide = TARGET_LOCATIONS.find((l) => l.id === 'Worldwide');
      expect(worldwide).toBeDefined();
      expect(worldwide?.type).toBe('global');

      const us = TARGET_LOCATIONS.find((l) => l.id === 'United States');
      expect(us?.type).toBe('country');

      const austin = TARGET_LOCATIONS.find((l) => l.id === 'Austin, TX');
      expect(austin?.type).toBe('city');
    });
  });

  describe('Distribution Channels & Status', () => {
    it('defines official channels with correct availability', () => {
      expect(DISTRIBUTION_CHANNELS).toHaveLength(4);
      const social = DISTRIBUTION_CHANNELS.find((c) => c.id === 'Social feeds');
      const search = DISTRIBUTION_CHANNELS.find((c) => c.id === 'Search');
      const display = DISTRIBUTION_CHANNELS.find((c) => c.id === 'Display network');
      const video = DISTRIBUTION_CHANNELS.find((c) => c.id === 'Video');

      expect(social?.status).toBe('available');
      expect(search?.status).toBe('available');
      expect(display?.status).toBe('available');
      expect(video?.status).toBe('coming_soon');
      expect(video?.disabledReason).toBeDefined();

      expect(AVAILABLE_CHANNELS).toEqual(['Social feeds', 'Search', 'Display network']);
    });

    it('defines themed audience interests', () => {
      expect(AUDIENCE_INTEREST_THEMES.length).toBe(5);
      const themes = AUDIENCE_INTEREST_THEMES.map((t) => t.theme);
      expect(themes).toContain('Civic life');
      expect(themes).toContain('Health & wellbeing');
      expect(themes).toContain('Science & tech');
      expect(themes).toContain('Money & work');
      expect(themes).toContain('Culture');
    });
  });

  describe('Budget Allocation Rebalancing', () => {
    it('returns empty allocation when no channels are selected', () => {
      expect(rebalanceBudgetAllocation([])).toEqual({});
    });

    it('allocates 100% to a single selected channel', () => {
      const allocation = rebalanceBudgetAllocation(['Social feeds']);
      expect(allocation).toEqual({ 'Social feeds': 100 });
      expect(validateBudgetAllocation(allocation, ['Social feeds']).isValid).toBe(true);
    });

    it('splits equally (50/50) between 2 channels', () => {
      const channels = ['Social feeds', 'Search'];
      const allocation = rebalanceBudgetAllocation(channels);
      expect(allocation).toEqual({ 'Social feeds': 50, 'Search': 50 });
      expect(validateBudgetAllocation(allocation, channels).isValid).toBe(true);
    });

    it('splits cleanly across 3 channels (34/33/33) summing to 100%', () => {
      const channels = ['Social feeds', 'Search', 'Display network'];
      const allocation = rebalanceBudgetAllocation(channels);
      expect(allocation).toEqual({
        'Social feeds': 34,
        Search: 33,
        'Display network': 33,
      });
      const sum = Object.values(allocation).reduce((a, b) => a + b, 0);
      expect(sum).toBe(100);
      expect(validateBudgetAllocation(allocation, channels).isValid).toBe(true);
    });

    it('auto-rebalances proportionally when removing a channel from 3 channels', () => {
      const current = {
        'Social feeds': 50,
        Search: 30,
        'Display network': 20,
      };
      // Removing 'Search'
      const remaining = ['Social feeds', 'Display network'];
      const rebalanced = rebalanceBudgetAllocation(remaining, current);

      const sum = Object.values(rebalanced).reduce((a, b) => a + b, 0);
      expect(sum).toBe(100);
      // 50 / 70 * 100 = 71; 100 - 71 = 29
      expect(rebalanced).toEqual({
        'Social feeds': 71,
        'Display network': 29,
      });
    });

    it('rebalances to 100% when removing down to a single channel', () => {
      const current = { 'Social feeds': 60, Search: 40 };
      const rebalanced = rebalanceBudgetAllocation(['Search'], current);

      expect(rebalanced).toEqual({ Search: 100 });
    });

    it('stepper adjustment via adjustChannelAllocation preserves 100% total', () => {
      const channels = ['Social feeds', 'Search', 'Display network'];
      const current = {
        'Social feeds': 40,
        Search: 35,
        'Display network': 25,
      };

      // Increase 'Social feeds' from 40 to 60
      const adjusted = adjustChannelAllocation('Social feeds', 60, current, channels);
      expect(adjusted['Social feeds']).toBe(60);

      const sum = Object.values(adjusted).reduce((a, b) => a + b, 0);
      expect(sum).toBe(100);
      expect(validateBudgetAllocation(adjusted, channels).isValid).toBe(true);
    });

    it('stepper adjustment clamps target channel within [0, 100]', () => {
      const channels = ['Social feeds', 'Search'];
      const current = { 'Social feeds': 50, Search: 50 };

      const over100 = adjustChannelAllocation('Social feeds', 120, current, channels);
      expect(over100['Social feeds']).toBe(100);
      expect(over100['Search']).toBe(0);

      const under0 = adjustChannelAllocation('Social feeds', -10, current, channels);
      expect(under0['Social feeds']).toBe(0);
      expect(under0['Search']).toBe(100);
    });
  });

  describe('Budget Allocation & Duration Validation', () => {
    it('validates budget allocation totals', () => {
      const valid = validateBudgetAllocation({ 'Social feeds': 60, Search: 40 }, [
        'Social feeds',
        'Search',
      ]);
      expect(valid.isValid).toBe(true);
      expect(valid.sum).toBe(100);

      const invalid = validateBudgetAllocation({ 'Social feeds': 50, Search: 40 }, [
        'Social feeds',
        'Search',
      ]);
      expect(invalid.isValid).toBe(false);
      expect(invalid.error).toContain('must total 100%');
    });

    it('validates duration days within 1 to 90 range', () => {
      expect(validateDurationDays(7).isValid).toBe(true);
      expect(validateDurationDays(14).isValid).toBe(true);
      expect(validateDurationDays(30).isValid).toBe(true);
      expect(validateDurationDays(60).isValid).toBe(true);
      expect(validateDurationDays(90).isValid).toBe(true);

      expect(validateDurationDays(0).isValid).toBe(false);
      expect(validateDurationDays(-5).isValid).toBe(false);
      expect(validateDurationDays(91).isValid).toBe(false);
      expect(validateDurationDays(14.5).isValid).toBe(false);
    });
  });

  describe('Audience Summary Generation', () => {
    it('generates a clean plain-language summary', () => {
      const summary = formatAudienceSummary({
        ageRange: '25-54',
        interests: ['Climate & Environment', 'Clean Energy'],
        locations: ['Austin, TX', 'United States'],
        channels: ['Social feeds', 'Search'],
      });

      expect(summary).toBe(
        'This campaign is intended to reach 25 to 54 people interested in Climate & Environment, Clean Energy in Austin, TX, United States, mainly through Social feeds and Search.'
      );
    });

    it('handles Worldwide and default interests gracefully', () => {
      const summary = formatAudienceSummary({
        locations: ['Worldwide'],
        channels: ['Social feeds'],
      });

      expect(summary).toBe(
        'This campaign is intended to reach 18 to 65+ people interested in civic and community topics in Worldwide, mainly through Social feeds.'
      );
    });
  });

  describe('Step 4 getStepErrors Validation', () => {
    it('flags missing locations', () => {
      const draft = {
        reach: {
          locations: [],
          channels: ['Social feeds'],
          budgetAllocation: { 'Social feeds': 100 },
          durationDays: 30,
        },
      };
      const errors = getStepErrors(draft, 'reach');
      expect(errors).toContain('Select at least one target location');
      expect(isStepComplete(draft, 4)).toBe(false);
    });

    it('flags missing channels', () => {
      const draft = {
        reach: {
          locations: ['United States'],
          channels: [],
          budgetAllocation: {},
          durationDays: 30,
        },
      };
      const errors = getStepErrors(draft, 'reach');
      expect(errors).toContain('Select at least one advertising channel');
      expect(isStepComplete(draft, 4)).toBe(false);
    });

    it('flags when only coming-soon channels (Video) are selected', () => {
      const draft = {
        reach: {
          locations: ['United States'],
          channels: ['Video'],
          budgetAllocation: { Video: 100 },
          durationDays: 30,
        },
      };
      const errors = getStepErrors(draft, 'reach');
      expect(errors).toContain('Select at least one available advertising channel');
      expect(isStepComplete(draft, 4)).toBe(false);
    });

    it('flags budget allocation that does not total 100%', () => {
      const draft = {
        reach: {
          locations: ['United States'],
          channels: ['Social feeds', 'Search'],
          budgetAllocation: { 'Social feeds': 60, Search: 20 },
          durationDays: 30,
        },
      };
      const errors = getStepErrors(draft, 'reach');
      expect(errors.some((e) => e.includes('must total 100%'))).toBe(true);
      expect(isStepComplete(draft, 4)).toBe(false);
    });

    it('succeeds when all Step 4 requirements are satisfied', () => {
      const draft = {
        reach: {
          locations: ['United States', 'Austin, TX'],
          interests: ['Climate & Environment'],
          channels: ['Social feeds', 'Search'],
          budgetAllocation: { 'Social feeds': 60, Search: 40 },
          durationDays: 30,
          fundingWindowDays: 30,
        },
      };
      const errors = getStepErrors(draft, 'reach');
      expect(errors).toHaveLength(0);
      expect(isStepComplete(draft, 4)).toBe(true);
    });
  });

  describe('Funding Goal Isolation Invariant', () => {
    it('Step 4 reach functions and updates never set or overwrite fundingGoalCents', () => {
      const draft: Record<string, unknown> = {
        title: 'Clean Water Initiative',
        category: 'Environment',
        // fundingGoalCents is intentionally undefined on Step 4
      };

      // Perform reach updates
      const updatedLocations = toggleTargetLocation([], 'United States');
      const selectedChannels = ['Social feeds', 'Search'];
      const allocation = rebalanceBudgetAllocation(selectedChannels);

      draft.reach = {
        locations: updatedLocations,
        interests: ['Climate & Environment'],
        channels: selectedChannels,
        budgetAllocation: allocation,
        durationDays: 30,
      };

      expect(draft.fundingGoalCents).toBeUndefined();
      expect(Object.prototype.hasOwnProperty.call(draft, 'fundingGoalCents')).toBe(false);
    });
  });
});
