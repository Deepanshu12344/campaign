import { describe, it, expect } from 'vitest';
import {
  createStoryBlock,
  moveBlockUp,
  moveBlockDown,
  duplicateBlock,
  deleteBlock,
  restoreBlock,
  validateSourceUrl,
  applyMarkdownFormat,
  getStepErrors,
  StoryBlock,
  AiDraftStoryInputSchema,
  AiDraftStoryResponseSchema,
} from '../index';

describe('Story Blocks & Pure Functions', () => {
  it('creates default story blocks for all supported types', () => {
    const heading = createStoryBlock('heading');
    expect(heading.type).toBe('heading');
    if (heading.type === 'heading') {
      expect(heading.level).toBe(2);
    }
    expect(heading.id).toBeDefined();

    const p = createStoryBlock('paragraph');
    expect(p.type).toBe('paragraph');
    if (p.type === 'paragraph') {
      expect(p.text).toBe('');
    }

    const img = createStoryBlock('image', { url: 'https://example.com/pic.jpg', caption: 'Test' });
    expect(img.type).toBe('image');
    if (img.type === 'image') {
      expect(img.url).toBe('https://example.com/pic.jpg');
      expect(img.caption).toBe('Test');
    }

    const stat = createStoryBlock('stat', { value: '94%', label: 'Efficiency' });
    expect(stat.type).toBe('stat');
    if (stat.type === 'stat') {
      expect(stat.value).toBe('94%');
    }

    const quote = createStoryBlock('quote', { text: 'Inspirational quote', attribution: 'Author' });
    expect(quote.type).toBe('quote');

    const actions = createStoryBlock('actions', { items: ['Share', 'Read'] });
    expect(actions.type).toBe('actions');
    if (actions.type === 'actions') {
      expect(actions.items).toEqual(['Share', 'Read']);
    }
  });

  it('handles reordering with moveBlockUp and moveBlockDown including boundary cases', () => {
    const b1 = createStoryBlock('heading', { text: 'Block 1' });
    const b2 = createStoryBlock('paragraph', { text: 'Block 2' });
    const b3 = createStoryBlock('stat', { value: '10', label: 'Block 3' });
    const blocks: StoryBlock[] = [b1, b2, b3];

    // Move first block up should do nothing
    const upFirst = moveBlockUp(blocks, 0);
    expect(upFirst).toEqual(blocks);

    // Move second block up swaps with first
    const upSecond = moveBlockUp(blocks, 1);
    expect(upSecond[0]!.id).toBe(b2.id);
    expect(upSecond[1]!.id).toBe(b1.id);
    expect(upSecond[2]!.id).toBe(b3.id);

    // Move last block down should do nothing
    const downLast = moveBlockDown(blocks, 2);
    expect(downLast).toEqual(blocks);

    // Move first block down swaps with second
    const downFirst = moveBlockDown(blocks, 0);
    expect(downFirst[0]!.id).toBe(b2.id);
    expect(downFirst[1]!.id).toBe(b1.id);
  });

  it('duplicates a block creating a new unique ID without mutating original', () => {
    const b1 = createStoryBlock('paragraph', { text: 'Original content' });
    const blocks: StoryBlock[] = [b1];

    const duplicated = duplicateBlock(blocks, 0);
    expect(duplicated.length).toBe(2);
    expect(duplicated[0]!.id).toBe(b1.id);
    const clone = duplicated[1];
    if (clone && clone.type === 'paragraph') {
      expect(clone.text).toBe('Original content');
    }
    expect(blocks.length).toBe(1); // immutability check
  });

  it('deletes a block and allows restoring it via restoreBlock (undo functionality)', () => {
    const b1 = createStoryBlock('heading', { text: 'H1' });
    const b2 = createStoryBlock('paragraph', { text: 'P1' });
    const b3 = createStoryBlock('quote', { text: 'Q1' });
    const blocks: StoryBlock[] = [b1, b2, b3];

    const { blocks: remaining, deletedBlock, deletedIndex } = deleteBlock(blocks, 1);
    expect(remaining.length).toBe(2);
    expect(remaining[0]!.id).toBe(b1.id);
    expect(remaining[1]!.id).toBe(b3.id);
    expect(deletedBlock.id).toBe(b2.id);
    expect(deletedIndex).toBe(1);

    // Undo / restore
    const restored = restoreBlock(remaining, deletedBlock, deletedIndex);
    expect(restored.length).toBe(3);
    expect(restored[0]!.id).toBe(b1.id);
    expect(restored[1]!.id).toBe(b2.id);
    expect(restored[2]!.id).toBe(b3.id);
  });

  it('validates source URLs requiring http/https and valid domain syntax', () => {
    expect(validateSourceUrl('https://example.com/report.pdf')).toBe(true);
    expect(validateSourceUrl('http://subdomain.gov.uk/data')).toBe(true);
    expect(validateSourceUrl('https://city.gov')).toBe(true);

    expect(validateSourceUrl('ftp://example.com')).toBe(false);
    expect(validateSourceUrl('javascript:alert(1)')).toBe(false);
    expect(validateSourceUrl('not-a-url')).toBe(false);
    expect(validateSourceUrl('')).toBe(false);
    expect(validateSourceUrl('http://')).toBe(false);
  });

  it('applies markdown formatting to selections or inserts placeholders', () => {
    // Bold with selection
    const res1 = applyMarkdownFormat('Hello world today', { start: 6, end: 11 }, 'bold');
    expect(res1.text).toBe('Hello **world** today');

    // Bold without selection
    const res2 = applyMarkdownFormat('Hello ', { start: 6, end: 6 }, 'bold');
    expect(res2.text).toBe('Hello **bold text**');

    // Italic with selection
    const res3 = applyMarkdownFormat('Important message', { start: 0, end: 9 }, 'italic');
    expect(res3.text).toBe('*Important* message');

    // Link with selection and url
    const res4 = applyMarkdownFormat(
      'Read our report now',
      { start: 9, end: 15 },
      'link',
      'https://epa.gov'
    );
    expect(res4.text).toBe('Read our [report](https://epa.gov) now');

    // Bullet without selection
    const res5 = applyMarkdownFormat('', { start: 0, end: 0 }, 'bullet');
    expect(res5.text).toBe('- ');

    // Bullet with selection across multiple lines
    const res6 = applyMarkdownFormat('First point\nSecond point', { start: 0, end: 24 }, 'bullet');
    expect(res6.text).toBe('- First point\n- Second point');
  });

  it('validates Step 2 Story constraints in getStepErrors', () => {
    // Empty draft
    const emptyErrors = getStepErrors({}, 'story');
    expect(emptyErrors).toContain('Story must contain at least one heading block');
    expect(emptyErrors).toContain('Story must contain at least 300 characters of written content (currently 0)');
    expect(emptyErrors).toContain('At least one verified source is required');

    // Has heading but short text and no sources
    const shortStoryDraft = {
      story: [
        { type: 'heading', level: 2, text: 'Clean Air Everywhere' },
        { type: 'paragraph', text: 'Too short text' },
      ],
      sources: [],
    };
    const errors2 = getStepErrors(shortStoryDraft, 'story');
    expect(errors2).not.toContain('Story must contain at least one heading block');
    expect(errors2.some((e) => e.includes('at least 300 characters'))).toBe(true);
    expect(errors2).toContain('At least one verified source is required');

    // Complete valid draft (heading + >300 chars of story + 1 valid source)
    const longText = 'A'.repeat(300);
    const validDraft = {
      story: [
        { type: 'heading', level: 2, text: 'An Urgency for Our Neighborhoods' },
        { type: 'paragraph', text: longText },
      ],
      sources: [
        { title: 'State Environmental Quality Study 2025', url: 'https://state.gov/study.pdf' },
      ],
    };
    expect(getStepErrors(validDraft, 'story')).toEqual([]);
  });

  it('validates AiDraftStoryInputSchema and AiDraftStoryResponseSchema', () => {
    const input1 = AiDraftStoryInputSchema.safeParse({
      mode: 'full_story',
      title: 'City Heat Islands',
      summary: 'Planting trees to cool down asphalt streets.',
      category: 'Environment',
    });
    expect(input1.success).toBe(true);

    const input2 = AiDraftStoryInputSchema.safeParse({
      mode: 'improve_paragraph',
      paragraphText: 'We need more trees because hot roads are bad for people.',
    });
    expect(input2.success).toBe(true);

    const response = AiDraftStoryResponseSchema.safeParse({
      mode: 'full_story',
      headline: 'Rooftop Gardens Can Cool Our Neighborhoods',
      intro: 'A community-driven campaign to convert barren tar rooftops into lush micro-habitats.',
      blocks: [
        { type: 'heading', level: 2, text: 'The Urban Heat Dilemma' },
        { type: 'paragraph', text: 'Urban centers retain heat exponentially faster than surrounding rural environments.' },
      ],
      suggestedActions: ['Check your local urban canopy score', 'Share this campaign'],
      suggestedSourceTypes: ['Municipal temperature satellite surveys', 'Public health heat illness admissions'],
      demo: true,
    });
    expect(response.success).toBe(true);
  });
});
