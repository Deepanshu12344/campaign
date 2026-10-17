import { describe, it, expect } from 'vitest';
import {
  AiDraftBasicsInputSchema,
  AiDraftBasicsResponseSchema,
  getStepErrors,
  Category,
} from '../index';

describe('AI Draft Basics Schemas & Step 1 Validation', () => {
  it('validates AiDraftBasicsInputSchema with partial and empty payloads', () => {
    const emptyResult = AiDraftBasicsInputSchema.safeParse({});
    expect(emptyResult.success).toBe(true);

    const fullResult = AiDraftBasicsInputSchema.safeParse({
      topic: 'Clean energy in urban neighborhoods',
      currentTitle: 'Clean Energy',
      currentSummary: 'Solar rooftops for everyone',
      currentCategory: 'Environment',
      currentCreatorName: 'Solar Action',
      currentCreatorType: 'nonprofit',
    });
    expect(fullResult.success).toBe(true);
  });

  it('validates AiDraftBasicsResponseSchema constraints strictly', () => {
    const valid = AiDraftBasicsResponseSchema.safeParse({
      title: 'Solar Power for Clean Cities',
      summary: 'Bringing community-funded solar to urban rooftops to reduce emissions.',
      category: 'Environment',
      creatorDescription: 'Clean Energy Coalition',
      demo: true,
    });
    expect(valid.success).toBe(true);

    // Title over 60 chars must fail
    const invalidTitle = AiDraftBasicsResponseSchema.safeParse({
      title: 'A'.repeat(61),
      summary: 'Valid summary text.',
      category: 'Environment',
      creatorDescription: 'Creator',
      demo: false,
    });
    expect(invalidTitle.success).toBe(false);

    // Summary over 160 chars must fail
    const invalidSummary = AiDraftBasicsResponseSchema.safeParse({
      title: 'Valid Title',
      summary: 'B'.repeat(161),
      category: 'Environment',
      creatorDescription: 'Creator',
      demo: false,
    });
    expect(invalidSummary.success).toBe(false);

    // Invalid category must fail
    const invalidCategory = AiDraftBasicsResponseSchema.safeParse({
      title: 'Valid Title',
      summary: 'Valid Summary',
      category: 'NonExistentCategory' as unknown as Category,
      creatorDescription: 'Creator',
      demo: false,
    });
    expect(invalidCategory.success).toBe(false);
  });

  it('verifies Step 1 title and summary length validations in getStepErrors', () => {
    // Missing title and summary
    const emptyDraft = {};
    const errors = getStepErrors(emptyDraft, 'basics');
    expect(errors).toContain('Title is required');
    expect(errors).toContain('Category is required');
    expect(errors).toContain('Creator name is required');
    expect(errors).toContain('Creator type is required');
    expect(errors).toContain('Summary is required');

    // Title > 60 chars
    const longTitleDraft = {
      title: 'This campaign title exceeds the strict sixty character limit for sure',
      category: 'Health',
      creatorName: 'Dr. Jane',
      creatorType: 'individual',
      summary: 'Valid summary within 160 chars.',
    };
    const longTitleErrors = getStepErrors(longTitleDraft, 'basics');
    expect(longTitleErrors).toContain('Title cannot exceed 60 characters');

    // Summary > 160 chars
    const longSummaryDraft = {
      title: 'Valid Title Under 60',
      category: 'Health',
      creatorName: 'Dr. Jane',
      creatorType: 'individual',
      summary: 'X'.repeat(161),
    };
    const longSummaryErrors = getStepErrors(longSummaryDraft, 'basics');
    expect(longSummaryErrors).toContain('Summary cannot exceed 160 characters');

    // Valid draft has 0 errors
    const validDraft = {
      title: 'Valid Title Under 60',
      category: 'Health',
      creatorName: 'Dr. Jane',
      creatorType: 'individual',
      summary: 'Valid summary within 160 chars.',
    };
    expect(getStepErrors(validDraft, 'basics')).toEqual([]);
  });
});
