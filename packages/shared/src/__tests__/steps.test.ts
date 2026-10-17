import { describe, it, expect } from 'vitest';
import {
  getStepErrors,
  getAllStepErrors,
  isStepComplete,
  DraftUpdateInput,
} from '../index';

describe('Step Completeness Model (getStepErrors)', () => {
  describe('Step 1: Basics', () => {
    it('returns errors when basics fields are missing or empty', () => {
      const errors = getStepErrors({}, 'basics');
      expect(errors).toContain('Title is required');
      expect(errors).toContain('Category is required');
      expect(errors).toContain('Creator name is required');
      expect(errors).toContain('Creator type is required');
      expect(errors).toContain('Summary is required');
      expect(isStepComplete({}, 'basics')).toBe(false);
    });

    it('enforces character limits on title and summary', () => {
      const longTitle = 'A'.repeat(61);
      const longSummary = 'B'.repeat(161);
      const errors = getStepErrors(
        {
          title: longTitle,
          category: 'Environment',
          creatorName: 'Jane Doe',
          creatorType: 'individual',
          summary: longSummary,
        },
        'basics'
      );
      expect(errors).toContain('Title cannot exceed 60 characters');
      expect(errors).toContain('Summary cannot exceed 160 characters');
    });

    it('succeeds and marks complete when basics are valid', () => {
      const validBasics: Partial<DraftUpdateInput> = {
        title: 'Clean Rivers for Future Generations',
        category: 'Environment',
        creatorName: 'Jane Doe',
        creatorType: 'individual',
        summary: 'A community initiative to restore local waterways and eliminate microplastics.',
      };
      const errors = getStepErrors(validBasics, 'basics');
      expect(errors).toHaveLength(0);
      expect(isStepComplete(validBasics, 'basics')).toBe(true);
      expect(isStepComplete(validBasics, 1)).toBe(true);
    });
  });

  describe('Step 2: Story', () => {
    it('returns errors when story has no heading, under 300 chars, or no sources', () => {
      const draft = {
        story: [{ type: 'paragraph', text: 'Short story' }],
        sources: [],
      };
      const errors = getStepErrors(draft, 'story');
      expect(errors).toContain('Story must contain at least one heading block');
      expect(errors.some((e) => e.includes('at least 300 characters'))).toBe(true);
      expect(errors).toContain('At least one verified source is required');
      expect(isStepComplete(draft, 2)).toBe(false);
    });

    it('succeeds when story contains heading, 300+ chars, and valid sources', () => {
      const draft = {
        story: [
          { type: 'heading', level: 2, text: 'The Crisis Facing Urban Watersheds' },
          {
            type: 'paragraph',
            text:
              'Over the past decade, urban watershed runoff has carried millions of pounds of untreated contaminants into local rivers. Community monitoring stations have recorded unprecedented concentrations of heavy metals and microplastic particles that threaten indigenous aquatic ecosystems, migratory bird populations, and municipal drinking water reserves across seven adjoining counties.',
          },
        ],
        sources: [
          {
            title: 'EPA Watershed Assessment Report 2025',
            url: 'https://epa.gov/reports/watershed-2025',
            publisher: 'U.S. EPA',
          },
        ],
      };
      const errors = getStepErrors(draft, 'story');
      expect(errors).toHaveLength(0);
      expect(isStepComplete(draft, 'story')).toBe(true);
      expect(isStepComplete(draft, 2)).toBe(true);
    });
  });

  describe('Step 3: Visuals', () => {
    it('returns errors when coverUrl or adCreative fields are missing', () => {
      const errors = getStepErrors({}, 'visuals');
      expect(errors).toContain('A valid cover image URL is required');
      expect(errors).toContain('Ad creative settings are required');
      expect(isStepComplete({}, 3)).toBe(false);
    });

    it('validates ad creative limits and cta', () => {
      const draft = {
        coverUrl: 'https://images.unsplash.com/photo-cover',
        adCreative: {
          images: ['https://images.unsplash.com/photo-ad1'],
          headline: 'A'.repeat(45),
          description: 'B'.repeat(95),
          cta: 'Learn More',
        },
      };
      const errors = getStepErrors(draft, 'visuals');
      expect(errors).toContain('Ad headline cannot exceed 40 characters');
      expect(errors).toContain('Ad description cannot exceed 90 characters');
    });

    it('succeeds when visuals and ad creative are valid', () => {
      const draft = {
        coverUrl: 'https://images.unsplash.com/photo-cover',
        adCreative: {
          images: ['https://images.unsplash.com/photo-ad1'],
          headline: 'Restore Clean Water Now',
          description: 'Help fund targeted community ad alerts to protect local drinking supplies.',
          cta: 'Learn More',
        },
      };
      const errors = getStepErrors(draft, 'visuals');
      expect(errors).toHaveLength(0);
      expect(isStepComplete(draft, 3)).toBe(true);
    });
  });

  describe('Step 4: Reach', () => {
    it('returns errors when locations or channels are missing', () => {
      const errors = getStepErrors({}, 'reach');
      expect(errors).toContain('Reach settings are required');
      expect(isStepComplete({}, 4)).toBe(false);
    });

    it('validates budget allocation sum and duration bounds', () => {
      const draft = {
        reach: {
          locations: ['Austin, TX'],
          channels: ['Meta', 'YouTube'],
          budgetAllocation: { Meta: 60, YouTube: 20 }, // 80% != 100%
          durationDays: 120, // > 90
        },
      };
      const errors = getStepErrors(draft, 'reach');
      expect(errors.some((e) => e.includes('must total 100%'))).toBe(true);
      expect(errors).toContain('Campaign duration must be between 1 and 90 days');
    });

    it('succeeds when reach settings are valid', () => {
      const draft = {
        reach: {
          locations: ['Austin, TX'],
          channels: ['Meta', 'YouTube'],
          budgetAllocation: { Meta: 60, YouTube: 40 },
          durationDays: 30,
        },
      };
      const errors = getStepErrors(draft, 'reach');
      expect(errors).toHaveLength(0);
      expect(isStepComplete(draft, 4)).toBe(true);
    });
  });

  describe('Step 5: Submit', () => {
    it('requires fundingGoalCents between $500 and $50,000 and rules acceptance', () => {
      const errors = getStepErrors({ fundingGoalCents: 10000 }, 'submit'); // $100 < $500
      expect(errors).toContain('Funding goal must be between $500 and $50,000');
      expect(errors).toContain('You must review and accept the platform rules before submitting');
      expect(isStepComplete({}, 5)).toBe(false);
    });

    it('succeeds when fundingGoalCents and acceptedRules are valid', () => {
      const draft = {
        fundingGoalCents: 250000, // $2,500
        acceptedRules: true,
      };
      const errors = getStepErrors(draft, 'submit');
      expect(errors).toHaveLength(0);
      expect(isStepComplete(draft, 5)).toBe(true);
    });
  });

  describe('getAllStepErrors', () => {
    it('returns structured map across all 5 steps', () => {
      const allErrors = getAllStepErrors({});
      expect(allErrors).toHaveProperty('basics');
      expect(allErrors).toHaveProperty('story');
      expect(allErrors).toHaveProperty('visuals');
      expect(allErrors).toHaveProperty('reach');
      expect(allErrors).toHaveProperty('submit');
      expect(allErrors.basics.length).toBeGreaterThan(0);
      expect(allErrors.submit.length).toBeGreaterThan(0);
    });
  });
});
