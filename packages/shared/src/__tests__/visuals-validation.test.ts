import { describe, it, expect } from 'vitest';
import {
  validateImageFile,
  deriveAdHeadlineFromTitle,
  getStepErrors,
  CTA_PRESETS,
  AiAdCopyInputSchema,
  AiAdCopyResponseSchema,
} from '../index';

describe('Step 3 (Visuals) Validation & Utilities', () => {
  describe('validateImageFile', () => {
    it('accepts valid JPEG, PNG, and WebP images within 5MB', () => {
      const validJpg = validateImageFile({
        name: 'hero.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 2 * 1024 * 1024,
        width: 1920,
        height: 1080,
      });
      expect(validJpg.isValid).toBe(true);
      expect(validJpg.error).toBeUndefined();
      expect(validJpg.warning).toBeUndefined();

      const validPng = validateImageFile({
        name: 'graphic.png',
        mimeType: 'image/png',
        sizeBytes: 4.5 * 1024 * 1024,
        width: 1200,
        height: 1200,
      });
      expect(validPng.isValid).toBe(true);
      expect(validPng.error).toBeUndefined();

      const validWebp = validateImageFile({
        name: 'ad.webp',
        mimeType: 'image/webp',
        sizeBytes: 1 * 1024 * 1024,
        width: 1080,
        height: 1350,
      });
      expect(validWebp.isValid).toBe(true);
      expect(validWebp.error).toBeUndefined();
    });

    it('rejects unsupported file formats such as PDF or GIF with clear plain-language error', () => {
      const pdf = validateImageFile({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 100 * 1024,
      });
      expect(pdf.isValid).toBe(false);
      expect(pdf.error).toContain('Only JPEG, PNG, or WebP images are supported');

      const gif = validateImageFile({
        name: 'animation.gif',
        mimeType: 'image/gif',
        sizeBytes: 500 * 1024,
      });
      expect(gif.isValid).toBe(false);
      expect(gif.error).toContain('Only JPEG, PNG, or WebP images are supported');
    });

    it('rejects files exceeding the 5MB size limit', () => {
      const oversized = validateImageFile({
        name: 'large-photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 6 * 1024 * 1024, // 6MB
      });
      expect(oversized.isValid).toBe(false);
      expect(oversized.error).toContain('exceeds the 5MB limit');
    });

    it('warns (without blocking) when image resolution is below 1080px on the short side', () => {
      const lowRes = validateImageFile({
        name: 'lowres.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 200 * 1024,
        width: 800,
        height: 600, // short side = 600 < 1080
      });
      expect(lowRes.isValid).toBe(true);
      expect(lowRes.warning).toBeDefined();
      expect(lowRes.warning).toContain('below 1080px on the short side');

      const highRes = validateImageFile({
        name: 'highres.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024 * 1024,
        width: 1080,
        height: 1920, // short side = 1080 >= 1080
      });
      expect(highRes.isValid).toBe(true);
      expect(highRes.warning).toBeUndefined();
    });
  });

  describe('deriveAdHeadlineFromTitle', () => {
    it('returns empty string when title is undefined or empty', () => {
      expect(deriveAdHeadlineFromTitle()).toBe('');
      expect(deriveAdHeadlineFromTitle('')).toBe('');
      expect(deriveAdHeadlineFromTitle('   ')).toBe('');
    });

    it('uses the full title when <= 40 characters', () => {
      const title = 'Protect Clean Drinking Water';
      expect(deriveAdHeadlineFromTitle(title)).toBe(title);
    });

    it('cleanly truncates titles exceeding 40 characters', () => {
      const title = 'Help Fund Independent Air Quality Sensors in East Valley Communities';
      const result = deriveAdHeadlineFromTitle(title);
      expect(result.length).toBeLessThanOrEqual(40);
      expect(result).toBe('Help Fund Independent Air Quality Sensor');
    });
  });

  describe('CTA presets', () => {
    it('contains the 5 standard allowed CTAs', () => {
      expect(CTA_PRESETS).toEqual([
        'Learn more',
        'Read the story',
        'Watch now',
        'Sign up',
        'Get involved',
      ]);
    });
  });

  describe('Step 3 Validation via getStepErrors', () => {
    const validVisualsDraft = {
      coverUrl: 'https://images.unsplash.com/photo-cover',
      adCreative: {
        images: ['https://images.unsplash.com/photo-ad1'],
        headline: 'Protect Clean Water',
        description: 'Join neighbors in funding air and water testing across the valley.',
        cta: 'Learn more',
      },
    };

    it('passes when cover image and all required ad creative fields are present', () => {
      const errors = getStepErrors(validVisualsDraft, 'visuals');
      expect(errors).toHaveLength(0);
    });

    it('blocks when coverUrl is missing or invalid', () => {
      const draft = {
        ...validVisualsDraft,
        coverUrl: '',
      };
      const errors = getStepErrors(draft, 'visuals');
      expect(errors).toContain('A valid cover image URL is required');
    });

    it('blocks when adCreative images are empty', () => {
      const draft = {
        ...validVisualsDraft,
        adCreative: {
          ...validVisualsDraft.adCreative,
          images: [],
        },
      };
      const errors = getStepErrors(draft, 'visuals');
      expect(errors).toContain('At least one ad creative image is required');
    });

    it('blocks when ad headline is missing or exceeds 40 characters', () => {
      const missingHeadline = {
        ...validVisualsDraft,
        adCreative: {
          ...validVisualsDraft.adCreative,
          headline: '',
        },
      };
      expect(getStepErrors(missingHeadline, 'visuals')).toContain('Ad headline is required');

      const longHeadline = {
        ...validVisualsDraft,
        adCreative: {
          ...validVisualsDraft.adCreative,
          headline: 'A'.repeat(41),
        },
      };
      expect(getStepErrors(longHeadline, 'visuals')).toContain('Ad headline cannot exceed 40 characters');
    });

    it('blocks when ad description is missing or exceeds 90 characters', () => {
      const missingDesc = {
        ...validVisualsDraft,
        adCreative: {
          ...validVisualsDraft.adCreative,
          description: '',
        },
      };
      expect(getStepErrors(missingDesc, 'visuals')).toContain('Ad description is required');

      const longDesc = {
        ...validVisualsDraft,
        adCreative: {
          ...validVisualsDraft.adCreative,
          description: 'B'.repeat(91),
        },
      };
      expect(getStepErrors(longDesc, 'visuals')).toContain('Ad description cannot exceed 90 characters');
    });

    it('blocks when CTA is missing', () => {
      const missingCta = {
        ...validVisualsDraft,
        adCreative: {
          ...validVisualsDraft.adCreative,
          cta: '',
        },
      };
      expect(getStepErrors(missingCta, 'visuals')).toContain('Call-to-action (CTA) is required');
    });
  });

  describe('AiAdCopy Schemas', () => {
    it('validates a correct AiAdCopyResponse', () => {
      const validResponse = {
        headlines: [
          'Protect Local Waterways',
          'Clean Water for Our Valley',
          'Every Neighborhood Deserves Clean Air',
        ],
        descriptions: [
          'Help fund community water testing to identify contaminants before they spread.',
          'Support independent environmental sensors in high-risk residential corridors.',
          'Join over 400 local backers spreading vital clean water information today.',
        ],
        suggestedCta: 'Learn more' as const,
        creativeFeedback: [
          'Ensure high contrast between ad text and background elements.',
          'Close-up photography performs 25% better in mobile feeds than distant landscape shots.',
        ],
        demo: true,
      };

      const parsed = AiAdCopyResponseSchema.safeParse(validResponse);
      expect(parsed.success).toBe(true);
    });

    it('rejects an AiAdCopyResponse with fewer than 3 headlines', () => {
      const invalidResponse = {
        headlines: ['Protect Local Waterways'],
        descriptions: ['A', 'B', 'C'],
        suggestedCta: 'Learn more',
        demo: true,
      };
      const parsed = AiAdCopyResponseSchema.safeParse(invalidResponse);
      expect(parsed.success).toBe(false);
    });

    it('validates AiAdCopyInputSchema', () => {
      const input = {
        title: 'Clean Water Initiative',
        summary: 'Raising funds to install water testing sensors in local neighborhoods.',
        category: 'Environment' as const,
        includeFeedback: true,
      };
      const parsed = AiAdCopyInputSchema.safeParse(input);
      expect(parsed.success).toBe(true);
    });
  });
});
