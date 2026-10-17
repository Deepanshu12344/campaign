import {
  AiDraftBasicsInput,
  AiDraftBasicsResponse,
  AiDraftBasicsResponseSchema,
  AiDraftStoryInput,
  AiDraftStoryResponse,
  AiDraftStoryResponseSchema,
  AiAdCopyInput,
  AiAdCopyResponse,
  AiAdCopyResponseSchema,
  Category,
  CATEGORIES,
  StoryBlock,
  createStoryBlock,
  CtaPreset,
  deriveAdHeadlineFromTitle,
} from '@campaigns/shared';
import { logger } from '../index';

interface DemoTemplate {
  title: string;
  summary: string;
  category: Category;
  creatorDescription: string;
}

const DEMO_TEMPLATES: Record<Category, DemoTemplate> = {
  Environment: {
    title: 'Rooftop Gardens Can Cool Our Cities',
    summary: 'Bringing community-funded green roofs to urban heat islands to lower temperatures and clean our air.',
    category: 'Environment',
    creatorDescription: 'Green Roofs Collective',
  },
  Health: {
    title: 'What 7 Hours of Sleep Really Does',
    summary: 'Science-backed sleep education to help shift workers and parents understand deep rest and recovery.',
    category: 'Health',
    creatorDescription: 'Dr. Meera Iyer',
  },
  'Public Policy': {
    title: 'Why Open Data Makes Better Budgets',
    summary: 'Empowering citizens to track municipal spending and demand public accountability in our local government.',
    category: 'Public Policy',
    creatorDescription: 'Civic Ledger',
  },
  Science: {
    title: 'The Quiet Science of Soil Microbes',
    summary: 'Educating local farmers and gardeners on biological regenerative agriculture techniques.',
    category: 'Science',
    creatorDescription: 'Field Notes Lab',
  },
  Education: {
    title: 'Free After-School Coding for Every Kid',
    summary: 'Providing laptops, mentors, and accessible tech training to underserved neighborhood youth.',
    category: 'Education',
    creatorDescription: 'Lantern Learning',
  },
  'Economic Policy': {
    title: 'Small Shops, Big Shifts: Local Spending',
    summary: 'Measuring the multiplied economic footprint of buying from neighborhood independent merchants.',
    category: 'Economic Policy',
    creatorDescription: 'Main Street Alliance',
  },
  Community: {
    title: 'Block Party for a Safer Street',
    summary: 'Transforming residential corridors into pedestrian-safe community gathering zones with traffic calming.',
    category: 'Community',
    creatorDescription: 'Maple Ave Neighbors',
  },
  'Arts & Culture': {
    title: 'Lost Looms: Saving Handwoven Textiles',
    summary: 'Preserving generational artisanal heritage and supporting independent craft workshops.',
    category: 'Arts & Culture',
    creatorDescription: 'Threadline Studio',
  },
  Business: {
    title: 'Fair Pricing for Independent Bookstores',
    summary: 'Championing fair wholesale terms and level competition for neighborhood community bookshops.',
    category: 'Business',
    creatorDescription: 'Pagewise Books',
  },
  Other: {
    title: 'A Wildcard Idea Worth Spreading',
    summary: 'Amplifying fresh, unexpected community insights that deserve wider public attention.',
    category: 'Other',
    creatorDescription: 'Public Ideas Initiative',
  },
};

export class AiService {
  /**
   * Generates campaign basics suggestions.
   * Uses Gemini when GEMINI_API_KEY is configured with an 8-second timeout,
   * otherwise falls back to deterministic template-based suggestions flagged with demo: true.
   * Strictly avoids logging user text and never exposes keys.
   */
  async generateDraftBasics(input: AiDraftBasicsInput): Promise<AiDraftBasicsResponse> {
    const startTime = Date.now();
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey.trim().length > 0) {
      try {
        const geminiResult = await this.callGeminiApi(apiKey.trim(), input);
        if (geminiResult) {
          logger.info({
            action: 'ai_draft_basics',
            demo: false,
            durationMs: Date.now() - startTime,
          });
          return geminiResult;
        }
      } catch (err: unknown) {
        // Fallback silently on error/timeout without logging user text
        const errMsg = err instanceof Error ? err.message : 'Unknown AI error';
        logger.warn({
          action: 'ai_draft_basics_fallback',
          reason: errMsg,
          durationMs: Date.now() - startTime,
        });
      }
    }

    // Deterministic demo template fallback
    const fallback = this.getDeterministicFallback(input);
    logger.info({
      action: 'ai_draft_basics',
      demo: true,
      durationMs: Date.now() - startTime,
    });
    return fallback;
  }

  private async callGeminiApi(
    apiKey: string,
    input: AiDraftBasicsInput
  ): Promise<AiDraftBasicsResponse | null> {
    const prompt = `You are an editorial campaign strategist for a public interest message amplification platform.
A creator wants to launch a community-funded reach campaign.
Based on their input, generate a refined campaign title (max 60 chars), a short summary (max 160 chars), an appropriate category, and a creator title/description (max 80 chars).

Creator Input:
- Topic: ${input.topic || 'Public interest awareness'}
- Current Title: ${input.currentTitle || 'None'}
- Current Summary: ${input.currentSummary || 'None'}
- Current Category: ${input.currentCategory || 'None'}
- Current Creator Name: ${input.currentCreatorName || 'None'}

Valid Categories: ${CATEGORIES.join(', ')}

Return ONLY a valid JSON object matching this schema without markdown codeblocks or quotes:
{
  "title": "string under 60 characters",
  "summary": "string under 160 characters",
  "category": "one of the valid categories listed above",
  "creatorDescription": "string under 80 characters"
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
      apiKey
    )}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 500,
          responseMimeType: 'application/json',
        },
      }),
      signal: AbortSignal.timeout(8000), // 8-second strict timeout
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText || typeof candidateText !== 'string') {
      return null;
    }

    // Clean JSON markdown fences if present
    const cleanJson = candidateText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleanJson) as Record<string, unknown>;

    const validated = AiDraftBasicsResponseSchema.safeParse({
      title: parsed.title,
      summary: parsed.summary,
      category: parsed.category,
      creatorDescription: parsed.creatorDescription,
      demo: false,
    });

    if (validated.success) {
      return validated.data;
    }

    return null;
  }

  private getDeterministicFallback(input: AiDraftBasicsInput): AiDraftBasicsResponse {
    let category: Category = 'Other';

    if (input.currentCategory && CATEGORIES.includes(input.currentCategory)) {
      category = input.currentCategory;
    } else {
      // Simple heuristic based on text
      const corpus = `${input.topic || ''} ${input.currentTitle || ''} ${input.currentSummary || ''}`.toLowerCase();
      if (corpus.includes('clean') || corpus.includes('green') || corpus.includes('solar') || corpus.includes('water') || corpus.includes('climate') || corpus.includes('garden')) {
        category = 'Environment';
      } else if (corpus.includes('health') || corpus.includes('sleep') || corpus.includes('mental') || corpus.includes('doctor') || corpus.includes('food')) {
        category = 'Health';
      } else if (corpus.includes('school') || corpus.includes('kid') || corpus.includes('code') || corpus.includes('teach') || corpus.includes('learn') || corpus.includes('student')) {
        category = 'Education';
      } else if (corpus.includes('budget') || corpus.includes('vote') || corpus.includes('policy') || corpus.includes('city') || corpus.includes('civic') || corpus.includes('open')) {
        category = 'Public Policy';
      } else if (corpus.includes('street') || corpus.includes('block') || corpus.includes('neighbor') || corpus.includes('park') || corpus.includes('community')) {
        category = 'Community';
      } else if (corpus.includes('science') || corpus.includes('soil') || corpus.includes('space') || corpus.includes('research') || corpus.includes('lab')) {
        category = 'Science';
      } else if (corpus.includes('local') || corpus.includes('spend') || corpus.includes('tax') || corpus.includes('wage') || corpus.includes('economy')) {
        category = 'Economic Policy';
      } else if (corpus.includes('book') || corpus.includes('store') || corpus.includes('business') || corpus.includes('shop')) {
        category = 'Business';
      } else if (corpus.includes('art') || corpus.includes('craft') || corpus.includes('textile') || corpus.includes('music') || corpus.includes('culture')) {
        category = 'Arts & Culture';
      }
    }

    const template = DEMO_TEMPLATES[category] || DEMO_TEMPLATES.Other;

    // Tailor title and summary if user provided partial inputs
    let title = template.title;
    if (input.currentTitle && input.currentTitle.trim().length > 0) {
      const trimmedTitle = input.currentTitle.trim();
      title = trimmedTitle.length <= 60 ? trimmedTitle : trimmedTitle.slice(0, 57) + '...';
    }

    let summary = template.summary;
    if (input.currentSummary && input.currentSummary.trim().length > 0) {
      const trimmedSummary = input.currentSummary.trim();
      summary = trimmedSummary.length <= 160 ? trimmedSummary : trimmedSummary.slice(0, 157) + '...';
    }

    let creatorDescription = template.creatorDescription;
    if (input.currentCreatorName && input.currentCreatorName.trim().length > 0) {
      const trimmedCreator = input.currentCreatorName.trim();
      creatorDescription = trimmedCreator.length <= 80 ? trimmedCreator : trimmedCreator.slice(0, 77) + '...';
    }

    return {
      title,
      summary,
      category,
      creatorDescription,
      demo: true,
    };
  }

  /**
   * Generates campaign story suggestions or improves an existing paragraph.
   * Mode: 'full_story' (headline, intro, blocks, suggested actions, source types)
   * Mode: 'improve_paragraph' (improved paragraph text)
   * Strictly avoids logging user text and never exposes keys.
   */
  async generateDraftStory(input: AiDraftStoryInput): Promise<AiDraftStoryResponse> {
    const startTime = Date.now();
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey.trim().length > 0) {
      try {
        const geminiResult = await this.callGeminiStoryApi(apiKey.trim(), input);
        if (geminiResult) {
          logger.info({
            action: 'ai_draft_story',
            mode: input.mode,
            demo: false,
            durationMs: Date.now() - startTime,
          });
          return geminiResult;
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Unknown AI error';
        logger.warn({
          action: 'ai_draft_story_fallback',
          mode: input.mode,
          reason: errMsg,
          durationMs: Date.now() - startTime,
        });
      }
    }

    // Deterministic demo template fallback
    const fallback = this.getDeterministicStoryFallback(input);
    logger.info({
      action: 'ai_draft_story',
      mode: input.mode,
      demo: true,
      durationMs: Date.now() - startTime,
    });
    return fallback;
  }

  private async callGeminiStoryApi(
    apiKey: string,
    input: AiDraftStoryInput
  ): Promise<AiDraftStoryResponse | null> {
    const isImproveParagraph = input.mode === 'improve_paragraph';

    const prompt = isImproveParagraph
      ? `You are an expert editorial writer. Rewrite and improve the following paragraph for greater clarity, rhythm, conciseness, and impact, preserving all factual meaning and underlying arguments.
Context:
- Campaign Title: ${input.title || 'Untitled Campaign'}
- Campaign Summary: ${input.summary || 'None'}
- Category: ${input.category || 'General'}

Paragraph to improve:
${input.paragraphText || ''}

Return ONLY a valid JSON object matching:
{
  "improvedParagraph": "Polished and refined paragraph text here."
}`
      : `You are an editorial essayist and journalist writing for a community-funded message amplification platform.
Help the creator write an engaging, high-impact editorial story that reads like a published article in a respected publication (like The Atlantic or ProPublica).

Campaign Context:
- Title: ${input.title || 'Public Interest Campaign'}
- Summary: ${input.summary || 'A vital community message'}
- Category: ${input.category || 'Public Policy'}
- Creator Name: ${input.creatorName || 'Community Advocate'}
- Creator Type: ${input.creatorType || 'individual'}
- Author Guidance: ${input.guidance || 'None provided'}

Generate:
1. headline (max 60 characters)
2. intro (standfirst summary, max 160 characters)
3. blocks: array of story blocks:
   - 1 heading block: { "type": "heading", "level": 2, "text": "..." }
   - 2 or 3 paragraph blocks: { "type": "paragraph", "text": "..." } totaling at least 320 characters
   - 1 statistic block: { "type": "stat", "value": "...", "label": "...", "source": "..." }
   - 1 quote block: { "type": "quote", "text": "...", "attribution": "..." }
   - 1 actions block: { "type": "actions", "items": ["action 1", "action 2", "action 3"] }
4. suggestedActions: array of up to 3 short action strings
5. suggestedSourceTypes: array of 2-3 research source types to investigate (e.g. "State Department of Health water testing reports", "Academic longitudinal studies on microplastics").

CRITICAL RULES:
- DO NOT INVENT SPECIFIC CITATION URLS. NEVER output full web URLs for sources. Suggest the research source TYPES to find instead.
- NEVER touch or generate funding goals or financial requests.

Return ONLY a valid JSON object matching this schema without markdown codeblocks or quotes:
{
  "headline": "...",
  "intro": "...",
  "blocks": [
    { "type": "heading", "level": 2, "text": "..." },
    { "type": "paragraph", "text": "..." },
    { "type": "stat", "value": "...", "label": "...", "source": "..." },
    { "type": "paragraph", "text": "..." },
    { "type": "quote", "text": "...", "attribution": "..." },
    { "type": "actions", "items": ["...", "..."] }
  ],
  "suggestedActions": ["...", "..."],
  "suggestedSourceTypes": ["...", "..."]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1400,
            responseMimeType: 'application/json',
          },
        }),
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText || typeof candidateText !== 'string') {
      return null;
    }

    const cleanJson = candidateText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleanJson) as Record<string, unknown>;

    if (isImproveParagraph) {
      const validated = AiDraftStoryResponseSchema.safeParse({
        mode: 'improve_paragraph',
        improvedParagraph:
          typeof parsed.improvedParagraph === 'string' ? parsed.improvedParagraph : undefined,
        demo: false,
      });
      return validated.success ? validated.data : null;
    }

    // Attach block IDs if missing
    const rawBlocks = Array.isArray(parsed.blocks) ? parsed.blocks : [];
    const formattedBlocks = rawBlocks.map((b) => {
      const blockObj = b as Record<string, unknown>;
      const blockType = (blockObj.type as string) || 'paragraph';
      return {
        ...blockObj,
        id:
          typeof blockObj.id === 'string'
            ? blockObj.id
            : createStoryBlock(
                blockType === 'heading' ||
                  blockType === 'paragraph' ||
                  blockType === 'image' ||
                  blockType === 'stat' ||
                  blockType === 'quote' ||
                  blockType === 'actions'
                  ? blockType
                  : 'paragraph'
              ).id,
      };
    });

    const validated = AiDraftStoryResponseSchema.safeParse({
      mode: 'full_story',
      headline: typeof parsed.headline === 'string' ? parsed.headline.slice(0, 60) : undefined,
      intro: typeof parsed.intro === 'string' ? parsed.intro.slice(0, 160) : undefined,
      blocks: formattedBlocks,
      suggestedActions: Array.isArray(parsed.suggestedActions) ? parsed.suggestedActions : undefined,
      suggestedSourceTypes: Array.isArray(parsed.suggestedSourceTypes)
        ? parsed.suggestedSourceTypes
        : undefined,
      demo: false,
    });

    return validated.success ? validated.data : null;
  }

  private getDeterministicStoryFallback(input: AiDraftStoryInput): AiDraftStoryResponse {
    if (input.mode === 'improve_paragraph') {
      return {
        mode: 'improve_paragraph',
        improvedParagraph: this.getDeterministicImprovedParagraph(input.paragraphText),
        demo: true,
      };
    }

    const category =
      input.category && CATEGORIES.includes(input.category)
        ? input.category
        : this.detectCategoryFromText(
            `${input.title || ''} ${input.summary || ''} ${input.guidance || ''}`
          );

    const template = STORY_DEMO_TEMPLATES[category] || STORY_DEMO_TEMPLATES.Other;

    const headline =
      input.title && input.title.trim().length > 0
        ? input.title.trim().length <= 60
          ? input.title.trim()
          : input.title.trim().slice(0, 57) + '...'
        : template.headline;

    const intro =
      input.summary && input.summary.trim().length > 0
        ? input.summary.trim().length <= 160
          ? input.summary.trim()
          : input.summary.trim().slice(0, 157) + '...'
        : template.intro;

    const blocks = template.blocks(input.creatorName);

    return {
      mode: 'full_story',
      headline,
      intro,
      blocks,
      suggestedActions: template.suggestedActions,
      suggestedSourceTypes: template.suggestedSourceTypes,
      demo: true,
    };
  }

  private getDeterministicImprovedParagraph(paragraphText?: string): string {
    const text = paragraphText?.trim() || '';
    if (!text) {
      return 'Every neighborhood deserves access to clear evidence and verified research. When citizens understand the data shaping their environment, communities can mobilize around durable, long-term public improvements.';
    }

    // Capitalize first letter if needed, trim trailing extra spaces
    const firstChar = text.charAt(0).toUpperCase();
    const rest = text.slice(1);
    let enhanced = firstChar + rest;
    if (!/[.!?]$/.test(enhanced)) {
      enhanced += '.';
    }
    return `${enhanced} By focusing public discussion on verified data rather than speculation, communities can coordinate meaningful change.`;
  }

  private detectCategoryFromText(text: string): Category {
    const corpus = text.toLowerCase();
    if (
      corpus.includes('clean') ||
      corpus.includes('green') ||
      corpus.includes('solar') ||
      corpus.includes('water') ||
      corpus.includes('climate') ||
      corpus.includes('garden')
    ) {
      return 'Environment';
    } else if (
      corpus.includes('health') ||
      corpus.includes('sleep') ||
      corpus.includes('mental') ||
      corpus.includes('doctor') ||
      corpus.includes('food')
    ) {
      return 'Health';
    } else if (
      corpus.includes('school') ||
      corpus.includes('kid') ||
      corpus.includes('code') ||
      corpus.includes('teach') ||
      corpus.includes('learn') ||
      corpus.includes('student')
    ) {
      return 'Education';
    } else if (
      corpus.includes('budget') ||
      corpus.includes('vote') ||
      corpus.includes('policy') ||
      corpus.includes('city') ||
      corpus.includes('civic') ||
      corpus.includes('open')
    ) {
      return 'Public Policy';
    } else if (
      corpus.includes('street') ||
      corpus.includes('block') ||
      corpus.includes('neighbor') ||
      corpus.includes('park') ||
      corpus.includes('community')
    ) {
      return 'Community';
    } else if (
      corpus.includes('science') ||
      corpus.includes('soil') ||
      corpus.includes('space') ||
      corpus.includes('research') ||
      corpus.includes('lab')
    ) {
      return 'Science';
    } else if (
      corpus.includes('local') ||
      corpus.includes('spend') ||
      corpus.includes('tax') ||
      corpus.includes('wage') ||
      corpus.includes('economy')
    ) {
      return 'Economic Policy';
    } else if (
      corpus.includes('book') ||
      corpus.includes('store') ||
      corpus.includes('business') ||
      corpus.includes('shop')
    ) {
      return 'Business';
    } else if (
      corpus.includes('art') ||
      corpus.includes('craft') ||
      corpus.includes('textile') ||
      corpus.includes('music') ||
      corpus.includes('culture')
    ) {
      return 'Arts & Culture';
    }
    return 'Other';
  }

  /**
   * Generates ad copy options (3 headlines, 3 descriptions, suggested CTA, creative tips).
   * Backed by Gemini 2.5 Flash when GEMINI_API_KEY is present, with deterministic fallback.
   * Strictly avoids logging user copy and never touches funding goals.
   */
  async generateAdCopy(input: AiAdCopyInput): Promise<AiAdCopyResponse> {
    const startTime = Date.now();
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey.trim().length > 0) {
      try {
        const geminiResult = await this.callGeminiAdCopyApi(apiKey.trim(), input);
        if (geminiResult) {
          logger.info({
            action: 'ai_ad_copy',
            demo: false,
            durationMs: Date.now() - startTime,
          });
          return geminiResult;
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Unknown AI error';
        logger.warn({
          action: 'ai_ad_copy_fallback',
          reason: errMsg,
          durationMs: Date.now() - startTime,
        });
      }
    }

    // Deterministic demo template fallback
    const fallback = this.getDeterministicAdCopyFallback(input);
    logger.info({
      action: 'ai_ad_copy',
      demo: true,
      durationMs: Date.now() - startTime,
    });
    return fallback;
  }

  private async callGeminiAdCopyApi(
    apiKey: string,
    input: AiAdCopyInput
  ): Promise<AiAdCopyResponse | null> {
    const prompt = `You are a digital advertising specialist writing high-performing, compliant ad copy for public interest and civic advocacy campaigns.
Create concise, punchy ad creative variations that respect standard digital advertising constraints.

Campaign Context:
- Title: ${input.title || 'Public Interest Campaign'}
- Summary: ${input.summary || 'A vital community message'}
- Category: ${input.category || 'General'}
- Story Summary: ${input.storySummary || 'None provided'}
- Current Headline: ${input.currentHeadline || 'None'}
- Current Description: ${input.currentDescription || 'None'}
- Images Provided: ${input.hasImages ? 'Yes' : 'No'}

Requirements:
1. Provide exactly 3 headline options. EACH headline must be 40 characters or fewer.
2. Provide exactly 3 description options. EACH description must be 90 characters or fewer.
3. Suggest 1 Call-to-action (CTA) chosen strictly from these 5 allowed options:
   - "Learn more"
   - "Read the story"
   - "Watch now"
   - "Sign up"
   - "Get involved"
4. Provide 3 short creative feedback tips (e.g. contrast, text on image, visual clarity).

CRITICAL RULES:
- Never exceed 40 characters for any headline.
- Never exceed 90 characters for any description.
- Never mention donations or asking for money.
- Never touch or generate funding goals.

Return ONLY a valid JSON object matching this schema without markdown codeblocks or quotes:
{
  "headlines": ["Headline 1", "Headline 2", "Headline 3"],
  "descriptions": ["Description 1", "Description 2", "Description 3"],
  "suggestedCta": "Learn more",
  "creativeFeedback": [
    "Tip 1...",
    "Tip 2...",
    "Tip 3..."
  ]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json',
          },
        }),
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    try {
      const parsed = JSON.parse(rawText);
      const validated = AiAdCopyResponseSchema.safeParse({
        ...parsed,
        demo: false,
      });
      if (validated.success) {
        return validated.data;
      }
      return null;
    } catch {
      return null;
    }
  }

  private getDeterministicAdCopyFallback(input: AiAdCopyInput): AiAdCopyResponse {
    const category = input.category || this.detectCategoryFromText(`${input.title || ''} ${input.summary || ''}`);
    const template = AD_COPY_DEMO_TEMPLATES[category] || AD_COPY_DEMO_TEMPLATES.Other;

    const headlines = [...template.headlines] as [string, string, string];
    if (input.title && input.title.trim().length > 0) {
      const derived = deriveAdHeadlineFromTitle(input.title);
      if (derived && derived !== headlines[0]) {
        headlines[0] = derived;
      }
    }

    return {
      headlines,
      descriptions: [...template.descriptions] as [string, string, string],
      suggestedCta: template.suggestedCta,
      creativeFeedback: [
        'Ensure high contrast between ad typography and background imagery for readability in mobile feeds.',
        'Keep text on the image under 20% surface area so external ad networks do not restrict distribution.',
        'Feature a clear visual focal point (such as a close-up subject or high-impact graphic) to capture attention.',
      ],
      demo: true,
    };
  }
}

interface AdCopyDemoTemplate {
  headlines: [string, string, string];
  descriptions: [string, string, string];
  suggestedCta: CtaPreset;
}

const AD_COPY_DEMO_TEMPLATES: Record<Category, AdCopyDemoTemplate> = {
  Environment: {
    headlines: ['Protect Local Waterways', 'Clean Air for Our Valley', 'Act on Urban Heat Today'],
    descriptions: [
      'Help fund independent testing to keep our community water sources clean and safe.',
      'Support neighborhood air sensors so families know when outdoor air is healthy.',
      'Bring urban green roofs to concrete corridors to cool our neighborhoods.',
    ],
    suggestedCta: 'Learn more',
  },
  Health: {
    headlines: ['What 7 Hours of Sleep Does', 'Prioritize Deep Rest Today', 'Science-Backed Sleep Facts'],
    descriptions: [
      'Discover how quality sleep protects long-term cardiac and cognitive wellness.',
      'Evidence-based sleep guides for shift workers, caregivers, and busy parents.',
      'Learn how 7+ hours of nightly rest restores daily physical performance.',
    ],
    suggestedCta: 'Read the story',
  },
  'Public Policy': {
    headlines: ['Track Municipal Spending', 'Open Data for Better Cities', 'Demand Public Accountability'],
    descriptions: [
      'Empowering residents to inspect city budgets and ensure funds serve community needs.',
      'See where tax dollars go with clear, independent municipal finance reporting.',
      'Join neighbors tracking local public contracts and civic infrastructure plans.',
    ],
    suggestedCta: 'Get involved',
  },
  Science: {
    headlines: ['Soil Microbes & Our Food', 'The Biology Beneath Our Feet', 'Regenerative Science Works'],
    descriptions: [
      'Exploring how living soil biology enhances nutritional density in local crops.',
      'Support independent agricultural research on biological soil revitalization.',
      'Learn why healthy mycorrhizal networks reduce synthetic chemical dependence.',
    ],
    suggestedCta: 'Read the story',
  },
  Education: {
    headlines: ['Free Code Camps for Youth', 'Tech Mentors for Every Kid', 'Unlock Next-Gen Skills'],
    descriptions: [
      'Help provide laptops and mentorship to aspiring young coders in our neighborhoods.',
      'Free after-school computing classes for students in underserved school districts.',
      'Equipping public school students with practical software engineering skills.',
    ],
    suggestedCta: 'Sign up',
  },
  'Economic Policy': {
    headlines: ['Keep Money in Our Community', 'Why Local Spending Matters', 'Support Independent Shops'],
    descriptions: [
      'Every $100 spent at local independent businesses returns $68 to our city.',
      'Measuring the community multiplier effect of choosing neighborhood businesses.',
      'Join the campaign advocating fair commercial rent and local business growth.',
    ],
    suggestedCta: 'Learn more',
  },
  Community: {
    headlines: ['Safer Streets for All Kids', 'Slow Down Traffic Locally', 'A Connected Neighborhood'],
    descriptions: [
      'Organizing traffic-calming solutions and safe sidewalk routes for neighborhood kids.',
      'Bring neighbors together to advocate for protected crosswalks and park lighting.',
      'Community-led action to build safer, more walkable streets for everyone.',
    ],
    suggestedCta: 'Get involved',
  },
  'Arts & Culture': {
    headlines: ['Save Our Heritage Murals', 'Public Art Belongs to All', 'Preserve Historic Stories'],
    descriptions: [
      'Funding restoration of community murals depicting four decades of local history.',
      'Ensure iconic neighborhood cultural spaces remain protected from redevelopment.',
      'Celebrate diverse artistic voices by preserving downtown historic landmarks.',
    ],
    suggestedCta: 'Read the story',
  },
  Business: {
    headlines: ['Independent Bookstores First', 'Fair Competition in Retail', 'Support Main Street Ethics'],
    descriptions: [
      'Advocating for fair wholesale book pricing so neighborhood bookstores survive.',
      'Learn why diverse retail ecosystems provide superior community resilience.',
      'Protect family-owned retail shops from predatory monopolistic distribution.',
    ],
    suggestedCta: 'Learn more',
  },
  Other: {
    headlines: ['Important Messages Travel Far', 'Community-Funded Outreach', 'Spread Verified Knowledge'],
    descriptions: [
      'Pool micro-contributions to amplify verified public messages across digital feeds.',
      'Spread vital civic ideas to new audiences with 100% transparent ad delivery.',
      'Join neighbors in spreading factual, research-backed stories that spark dialogue.',
    ],
    suggestedCta: 'Learn more',
  },
};

interface StoryDemoTemplate {
  headline: string;
  intro: string;
  blocks: (creatorName?: string) => StoryBlock[];
  suggestedActions: string[];
  suggestedSourceTypes: string[];
}

const STORY_DEMO_TEMPLATES: Record<Category, StoryDemoTemplate> = {
  Environment: {
    headline: 'Rooftop Gardens Can Cool Our Cities',
    intro:
      'Converting barren urban rooftops into micro-habitats reduces surface heat and restores natural biodiversity.',
    blocks: (_creator) => [
      createStoryBlock('heading', { level: 2, text: 'The Urban Heat Island Dilemma' }),
      createStoryBlock('paragraph', {
        text: 'During high summer, metropolitan concrete and asphalt absorb solar radiation, creating localized temperature bubbles up to 10 degrees hotter than nearby rural regions. For residents living in high-density corridors, this thermal retention elevates household cooling costs, accelerates smog formation, and poses tangible heat-exhaustion risks for seniors and children.',
      }),
      createStoryBlock('stat', {
        value: '10°F',
        label: 'Average urban heat island temperature differential',
        source: 'Metropolitan Climate Research Alliance',
      }),
      createStoryBlock('paragraph', {
        text: 'Living green roofs provide natural shade, actively remove airborne particulates, and reduce stormwater runoff velocity into municipal sewers. By funding targeted distribution of this research, our campaign empowers neighborhood residents to advocate for rooftop vegetation incentives across municipal planning boards.',
      }),
      createStoryBlock('quote', {
        text: 'A single green roof cools a building; a network of green roofs cools an entire zip code.',
        attribution: 'Dr. Elena Rostova, Urban Ecology Institute',
      }),
      createStoryBlock('actions', {
        items: [
          'Check your local urban canopy score',
          'Attend the municipal planning commission hearing',
          'Share this campaign with your neighborhood council',
        ],
      }),
    ],
    suggestedActions: [
      'Check your local urban canopy score',
      'Attend the municipal planning commission hearing',
      'Share this campaign with your neighborhood council',
    ],
    suggestedSourceTypes: [
      'Municipal satellite thermal imaging records',
      'Peer-reviewed urban forestry journal studies',
      'City stormwater management utility filings',
    ],
  },
  Health: {
    headline: 'What 7 Hours of Sleep Really Does',
    intro:
      'Science-backed sleep education to help shift workers and parents understand deep rest and recovery.',
    blocks: () => [
      createStoryBlock('heading', { level: 2, text: 'The Quiet Epidemic of Sleep Deprivation' }),
      createStoryBlock('paragraph', {
        text: 'More than one in three adults routinely receives less than seven hours of quality sleep per night. While societal norms frequently praise overwork and early rising, neurological research demonstrates that chronic sleep restriction impairs cognitive function, weakens immune response, and dramatically elevates cardiovascular strain over time.',
      }),
      createStoryBlock('stat', {
        value: '35%',
        label: 'Adults reporting chronic insufficient sleep',
        source: 'National Sleep Health Survey',
      }),
      createStoryBlock('paragraph', {
        text: 'Adequate restorative sleep allows the glymphatic system to clear metabolic waste from brain tissue, consolidates daily memories, and regulates glucose tolerance. Spreading practical, non-judgmental guidance ensures shift workers, parents, and caregivers possess the physiological knowledge required to protect their long-term health.',
      }),
      createStoryBlock('quote', {
        text: 'Sleep is not an optional lifestyle luxury; it is a biological requirement for human survival.',
        attribution: 'Dr. Marcus Vance, Center for Circadian Medicine',
      }),
      createStoryBlock('actions', {
        items: [
          'Review the bedtime digital wind-down checklist',
          'Calculate your personal sleep debt score',
          'Forward this guide to coworkers on shift rotation',
        ],
      }),
    ],
    suggestedActions: [
      'Review the bedtime digital wind-down checklist',
      'Calculate your personal sleep debt score',
      'Forward this guide to coworkers on shift rotation',
    ],
    suggestedSourceTypes: [
      'Peer-reviewed sleep research publications',
      'Centers for disease surveillance reports',
      'Occupational safety guidelines for shift work',
    ],
  },
  'Public Policy': {
    headline: 'Why Open Data Makes Better Budgets',
    intro:
      'Empowering citizens to track municipal spending and demand public accountability in our local government.',
    blocks: () => [
      createStoryBlock('heading', { level: 2, text: 'Following the Neighborhood Dollar' }),
      createStoryBlock('paragraph', {
        text: 'Municipal budget documents regularly span hundreds of complex spreadsheet pages, obscuring capital expenditures and infrastructure commitments from ordinary residents. When fiscal data remains locked in opaque PDFs, civic trust declines and community priorities go unaddressed across underserved school districts and transit lines.',
      }),
      createStoryBlock('stat', {
        value: '$4.2B',
        label: 'Annual local public spending tracked with open data',
        source: 'Civic Accountability Project',
      }),
      createStoryBlock('paragraph', {
        text: 'By transforming municipal spending reports into transparent, interactive maps, neighborhood groups can directly observe which streets receive road repair funds and which community centers receive operating grants. Transparent civic accounting builds durable public trust and ensures taxpayers participate meaningfully in capital planning.',
      }),
      createStoryBlock('quote', {
        text: 'Sunlight is not just a moral principle; it is the most effective tool for fiscal efficiency.',
        attribution: 'Council Member Sarah Chen',
      }),
      createStoryBlock('actions', {
        items: [
          'Explore your neighborhood capital expenditure map',
          'Submit public comment on the upcoming draft budget',
          'Share budget visualizations with your block association',
        ],
      }),
    ],
    suggestedActions: [
      'Explore your neighborhood capital expenditure map',
      'Submit public comment on the upcoming draft budget',
      'Share budget visualizations with your block association',
    ],
    suggestedSourceTypes: [
      'Municipal annual comprehensive financial reports',
      'State auditor general oversight reviews',
      'Independent civic technology transparency studies',
    ],
  },
  Science: {
    headline: 'The Quiet Science of Soil Microbes',
    intro:
      'Educating local farmers and gardeners on biological regenerative agriculture techniques.',
    blocks: () => [
      createStoryBlock('heading', { level: 2, text: 'The Living Ecosystem Beneath Our Feet' }),
      createStoryBlock('paragraph', {
        text: 'Beneath every square foot of topsoil lies an interconnected community of billions of bacteria, fungi, protozoa, and microscopic nematodes. Decades of intensive chemical fertilization have depleted these biological soil webs, leaving crops vulnerable to disease and reducing the nutrient density of common produce.',
      }),
      createStoryBlock('stat', {
        value: '1 Billion',
        label: 'Active microbes in a single teaspoon of healthy soil',
        source: 'Agricultural Biological Institute',
      }),
      createStoryBlock('paragraph', {
        text: 'Regenerative techniques such as cover cropping, compost teas, and minimal tillage restore microbial diversity and enhance natural moisture retention during seasonal droughts. Educating home growers and regional producers safeguards regional soil health for the next generation of farming families.',
      }),
      createStoryBlock('quote', {
        text: 'When we feed the soil microbiome, the soil feeds the crop without chemical dependency.',
        attribution: 'Dr. Raymond Holt, Agroecology Research Lab',
      }),
      createStoryBlock('actions', {
        items: [
          'Request a local compost testing kit',
          'Read the regenerative cover cropping primer',
          'Join the community seed exchange network',
        ],
      }),
    ],
    suggestedActions: [
      'Request a local compost testing kit',
      'Read the regenerative cover cropping primer',
      'Join the community seed exchange network',
    ],
    suggestedSourceTypes: [
      'University agricultural extension field trials',
      'Soil science society peer-reviewed papers',
      'USDA natural resources conservation guidelines',
    ],
  },
  Education: {
    headline: 'Free After-School Coding for Every Kid',
    intro:
      'Providing laptops, mentors, and accessible tech training to underserved neighborhood youth.',
    blocks: () => [
      createStoryBlock('heading', { level: 2, text: 'Closing the Digital Opportunity Divide' }),
      createStoryBlock('paragraph', {
        text: 'In an economy driven by software, computational thinking has become an essential literacy alongside reading and mathematics. Yet thousands of neighborhood students lack home broadband or guidance from experienced technical mentors, placing high-wage careers out of reach before high school graduation.',
      }),
      createStoryBlock('stat', {
        value: '72%',
        label: 'Elementary schools lacking dedicated computing programs',
        source: 'National STEM Equity Coalition',
      }),
      createStoryBlock('paragraph', {
        text: 'Our free community workshops pair middle school students with working engineers to build web applications, games, and hardware projects using open-source tools. This grassroots curriculum sparks early confidence and equips young creators with skills for future technological leadership.',
      }),
      createStoryBlock('quote', {
        text: 'Teaching a young person to write code gives them agency over the digital world they inherit.',
        attribution: 'Amina Al-Mansoor, Community Tech Director',
      }),
      createStoryBlock('actions', {
        items: [
          'Register a student for weekend coding workshops',
          'Volunteer two hours as a coding mentor',
          'Donate refurbished laptops to the local lab',
        ],
      }),
    ],
    suggestedActions: [
      'Register a student for weekend coding workshops',
      'Volunteer two hours as a coding mentor',
      'Donate refurbished laptops to the local lab',
    ],
    suggestedSourceTypes: [
      'State department of education STEM enrollment figures',
      'Nonprofit digital access and workforce reports',
      'Independent technology education outcome assessments',
    ],
  },
  'Economic Policy': {
    headline: 'Small Shops, Big Shifts: Local Spending',
    intro:
      'Measuring the multiplied economic footprint of buying from neighborhood independent merchants.',
    blocks: () => [
      createStoryBlock('heading', { level: 2, text: 'The Multiplier Effect of Local Commerce' }),
      createStoryBlock('paragraph', {
        text: 'Every consumer dollar spent with an independent neighborhood business circulates through the regional economy multiple times, supporting local accountants, delivery drivers, repair technicians, and civic payrolls. By contrast, transactions with remote conglomerates direct capital immediately out of the community.',
      }),
      createStoryBlock('stat', {
        value: '3.5x',
        label: 'Greater local economic circulation from independent retail',
        source: 'Regional Economic Development Institute',
      }),
      createStoryBlock('paragraph', {
        text: 'Preserving diverse high streets prevents neighborhood commercial vacancies and provides resilient employment during broader economic downturns. Spreading empirical data on local spending patterns encourages residents to make intentional purchasing decisions that protect community vitality.',
      }),
      createStoryBlock('quote', {
        text: 'Local businesses are the connective tissue that preserves character and economic independence.',
        attribution: 'Tariq Patel, Downtown Merchant Guild',
      }),
      createStoryBlock('actions', {
        items: [
          'Download the neighborhood independent shop directory',
          'Commit to the 10% shift pledge this month',
          'Display a community commerce badge in your window',
        ],
      }),
    ],
    suggestedActions: [
      'Download the neighborhood independent shop directory',
      'Commit to the 10% shift pledge this month',
      'Display a community commerce badge in your window',
    ],
    suggestedSourceTypes: [
      'State commerce department retail tax receipts',
      'Federal reserve district community development papers',
      'Independent business alliance economic impact studies',
    ],
  },
  Community: {
    headline: 'Block Party for a Safer Street',
    intro:
      'Transforming residential corridors into pedestrian-safe community gathering zones with traffic calming.',
    blocks: () => [
      createStoryBlock('heading', { level: 2, text: 'Reclaiming Streets for Neighborhood Life' }),
      createStoryBlock('paragraph', {
        text: 'Residential corridors have increasingly been treated as high-speed cut-through avenues by regional commuter traffic, posing safety hazards for children walking to school and diminishing neighborly social interaction. Simple traffic calming measures, such as painted curb bulb-outs and pedestrian islands, dramatically slow vehicle speeds.',
      }),
      createStoryBlock('stat', {
        value: '44%',
        label: 'Reduction in vehicle pedestrian collisions with traffic calming',
        source: 'Urban Transportation Safety Council',
      }),
      createStoryBlock('paragraph', {
        text: 'By gathering neighbors for seasonal block festivals, communities demonstrate how shared roadways can accommodate play, gardening, and conversation alongside vehicle access. Building consensus among residents enables neighborhoods to petition transportation departments for permanent safety upgrades.',
      }),
      createStoryBlock('quote', {
        text: 'A street where children can play safely is a street where everyone feels secure.',
        attribution: 'Carlos Mendoza, Resident Association President',
      }),
      createStoryBlock('actions', {
        items: [
          'Sign the neighborhood traffic calming petition',
          'Join the weekend crosswalk painting team',
          'Attend the upcoming district street safety forum',
        ],
      }),
    ],
    suggestedActions: [
      'Sign the neighborhood traffic calming petition',
      'Join the weekend crosswalk painting team',
      'Attend the upcoming district street safety forum',
    ],
    suggestedSourceTypes: [
      'City department of transportation speed radar data',
      'Pedestrian safety council collision summaries',
      'Public works traffic calming case studies',
    ],
  },
  'Arts & Culture': {
    headline: 'Lost Looms: Saving Handwoven Textiles',
    intro:
      'Preserving generational artisanal heritage and supporting independent craft workshops.',
    blocks: () => [
      createStoryBlock('heading', { level: 2, text: 'Generational Craft in an Industrial World' }),
      createStoryBlock('paragraph', {
        text: 'Traditional handloom weaving represents centuries of cultural knowledge, natural dyeing techniques, and artisanal mastery passed down through families. Fast fashion mass manufacturing has pushed independent weavers toward financial insolvency, threatening to erase distinct textile traditions within a single generation.',
      }),
      createStoryBlock('stat', {
        value: '80%',
        label: 'Decline in active traditional artisanal looms over 20 years',
        source: 'Heritage Craft Preservation Trust',
      }),
      createStoryBlock('paragraph', {
        text: 'Our campaign connects artisanal weaving collectives directly with conscious consumers and design apprenticeships, creating viable financial pathways for young artisans to continue their ancestral practices. Documenting these techniques preserves tangible living heritage for future generations.',
      }),
      createStoryBlock('quote', {
        text: 'When a loom falls silent, an encyclopedia of cultural memory and design history goes with it.',
        attribution: 'Maya Sen, Master Weaver',
      }),
      createStoryBlock('actions', {
        items: [
          'Explore the digital living textile archive',
          'Enroll in an introductory handloom weaving workshop',
          'Support direct fair-trade artisan cooperatives',
        ],
      }),
    ],
    suggestedActions: [
      'Explore the digital living textile archive',
      'Enroll in an introductory handloom weaving workshop',
      'Support direct fair-trade artisan cooperatives',
    ],
    suggestedSourceTypes: [
      'Museum folklore and ethnography field archives',
      'Fair trade artisan federation market surveys',
      'Cultural heritage preservation grant reports',
    ],
  },
  Business: {
    headline: 'Fair Pricing for Independent Bookstores',
    intro:
      'Championing fair wholesale terms and level competition for neighborhood community bookshops.',
    blocks: () => [
      createStoryBlock('heading', { level: 2, text: 'The Cultural Anchor of Independent Books' }),
      createStoryBlock('paragraph', {
        text: 'Independent bookshops serve as essential cultural hubs, hosting author talks, children story hours, and curated literature recommendations that no algorithmic storefront can replicate. Yet discriminatory wholesale discount structures give massive monopolistic distributors unfair price advantages.',
      }),
      createStoryBlock('stat', {
        value: '2,500',
        label: 'Independent bookstores serving American communities',
        source: 'Booksellers Association Economic Report',
      }),
      createStoryBlock('paragraph', {
        text: 'Advocating for fair wholesale competition ensures diverse literary voices reach readers and protects neighborhood retail diversity. Community awareness empowers readers to prioritize local bookstores for their cultural and economic contributions.',
      }),
      createStoryBlock('quote', {
        text: 'A bookshop is not merely a store; it is a community living room where ideas encounter readers.',
        attribution: 'Evelyn Brooks, Bookseller',
      }),
      createStoryBlock('actions', {
        items: [
          'Locate your nearest independent bookseller',
          'Pre-order upcoming titles through community shops',
          'Sign the fair wholesale market competition letter',
        ],
      }),
    ],
    suggestedActions: [
      'Locate your nearest independent bookseller',
      'Pre-order upcoming titles through community shops',
      'Sign the fair wholesale market competition letter',
    ],
    suggestedSourceTypes: [
      'Publishing industry wholesale sales statistics',
      'Antitrust institute fair competition filings',
      'Independent bookseller association surveys',
    ],
  },
  Other: {
    headline: 'A Public Message Worth Amplifying',
    intro:
      'Sharing verified research and actionable facts to bring constructive public attention to community causes.',
    blocks: () => [
      createStoryBlock('heading', { level: 2, text: 'Why Public Awareness Matters' }),
      createStoryBlock('paragraph', {
        text: 'Public message distribution is most effective when grounded in clear evidence, respectful storytelling, and actionable steps for community members. By pooling small contributions to fund digital advertising, creators can ensure that important ideas reach beyond their existing social circles to the people who need them most.',
      }),
      createStoryBlock('stat', {
        value: '100%',
        label: 'Transparent reach allocation funded by community backers',
        source: 'Campaigns Transparency Report',
      }),
      createStoryBlock('paragraph', {
        text: 'Every contribution funds direct ad placements rather than private donations or overhead fees. When communities support transparent distribution, verified perspectives gain the visibility necessary to spark genuine civic dialogue and policy improvements.',
      }),
      createStoryBlock('quote', {
        text: 'Democracy thrives when important information travels as far as commercial advertising.',
        attribution: 'Public Message Coalition',
      }),
      createStoryBlock('actions', {
        items: [
          'Read the full verified research report',
          'Share this campaign on your preferred social platform',
          'Join the community newsletter for project updates',
        ],
      }),
    ],
    suggestedActions: [
      'Read the full verified research report',
      'Share this campaign on your preferred social platform',
      'Join the community newsletter for project updates',
    ],
    suggestedSourceTypes: [
      'Public agency transparency reports',
      'Peer-reviewed civic communication research',
      'Independent verified statistical surveys',
    ],
  },
};

export const aiService = new AiService();

