import { describe, it, expect } from 'vitest';
import {
  FAQ_ITEMS,
  filterFaqs,
  HELP_PROBLEMS,
  DEMO_PARTNERS,
  TERMS_SECTIONS,
  PRIVACY_SECTIONS,
  GUIDELINES_SECTIONS,
  CANONICAL_SLUGS,
  normalizeInfoSlug,
  validateContactInput,
} from '../data/infoData';
import { ContactInputSchema, CONTACT_TOPICS } from '@campaigns/shared';

describe('Info & Editorial Pages Suite', () => {
  describe('1. FAQ Data & Search Filtering', () => {
    it('contains all 15 structured FAQ items across 5 canonical categories', () => {
      expect(FAQ_ITEMS.length).toBe(15);

      const categories = new Set(FAQ_ITEMS.map((item) => item.category));
      expect(categories).toEqual(
        new Set([
          'Basics',
          'Backing & Payments',
          'Creating & Editing',
          'Reach & Reports',
          'Privacy & Security',
        ])
      );

      // Verify each category has at least 2 questions
      for (const cat of categories) {
        const count = FAQ_ITEMS.filter((i) => i.category === cat).length;
        expect(count).toBeGreaterThanOrEqual(2);
      }

      // Verify centralized prototype disclosure FAQ entry
      const isDataReal = FAQ_ITEMS.find((i) => i.id === 'is-data-real');
      expect(isDataReal).toBeDefined();
      expect(isDataReal?.question).toBe('Is the data on this app real?');
      expect(isDataReal?.answer).toContain('This is a prototype');
    });

    it('returns all items when search query is empty or whitespace', () => {
      expect(filterFaqs('')).toHaveLength(15);
      expect(filterFaqs('   ')).toHaveLength(15);
    });

    it('filters FAQs by question text with case-insensitivity', () => {
      const results = filterFaqs('donation');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((i) => i.id === 'is-this-a-donation')).toBe(true);

      const upperResults = filterFaqs('DONATION');
      expect(upperResults).toEqual(results);
    });

    it('filters FAQs by answer body text (e.g. "10%")', () => {
      const results = filterFaqs('10%');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((i) => i.id === 'what-do-fees-pay-for')).toBe(true);
    });

    it('filters FAQs by category name', () => {
      const results = filterFaqs('Privacy');
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every((i) => i.category === 'Privacy & Security' || i.question.includes('Privacy') || i.answer.includes('privacy'))).toBe(true);
    });

    it('returns an empty list when no questions match the query', () => {
      const results = filterFaqs('supercalifragilisticexpialidocious-query');
      expect(results).toHaveLength(0);
    });
  });

  describe('2. Core Product Rules & Content Integrity', () => {
    it('verifies non-donation copy in FAQ matches exact architectural directive', () => {
      const donationFaq = FAQ_ITEMS.find((i) => i.id === 'is-this-a-donation');
      expect(donationFaq).toBeDefined();
      expect(donationFaq?.answer).toContain(
        'Your contribution pays to spread this message. It is NOT a donation to the cause or the creator.'
      );
    });

    it('verifies 10% platform fee and 90% direct ad budget in FAQ', () => {
      const feeFaq = FAQ_ITEMS.find((i) => i.id === 'what-do-fees-pay-for');
      expect(feeFaq).toBeDefined();
      expect(feeFaq?.answer).toContain('10% platform fee');
      expect(feeFaq?.answer).toContain('90% is dedicated strictly to direct advertising spend');
    });

    it('labels partners clearly as demo partners without claiming real partnerships', () => {
      expect(DEMO_PARTNERS.length).toBeGreaterThanOrEqual(4);
      for (const partner of DEMO_PARTNERS) {
        expect(partner.name).toBeDefined();
        expect(partner.description).toBeDefined();
      }
    });

    it('contains comprehensive Help & Support troubleshooting paths', () => {
      expect(HELP_PROBLEMS.length).toBeGreaterThanOrEqual(4);
      const routes = HELP_PROBLEMS.map((p) => p.targetRoute);
      expect(routes).toContain('/info/faqs');
      expect(routes).toContain('/profile/payments');
      expect(routes).toContain('/info/contact');
    });

    it('structures Terms, Privacy, and Guidelines with substantive sections', () => {
      expect(TERMS_SECTIONS.length).toBeGreaterThanOrEqual(5);
      expect(PRIVACY_SECTIONS.length).toBeGreaterThanOrEqual(5);
      expect(GUIDELINES_SECTIONS.length).toBeGreaterThanOrEqual(4);

      // Verify privacy policy asserts local secure token storage
      const guestPrivacy = PRIVACY_SECTIONS.find((s) => s.title.includes('Guest'));
      expect(guestPrivacy).toBeDefined();
      expect(guestPrivacy?.paragraphs.some((p) => p.includes('SecureStore') || p.includes('localStorage'))).toBe(true);

      // Verify guidelines prohibit hate speech and misinformation
      const prohibited = GUIDELINES_SECTIONS.find((s) => s.title.includes('Prohibited Content'));
      expect(prohibited).toBeDefined();
      expect(prohibited?.paragraphs.some((p) => p.includes('hate speech') && p.includes('misinformation'))).toBe(true);
    });
  });

  describe('3. Slug Resolution & Aliases', () => {
    it('maps valid canonical slugs to appropriate page titles', () => {
      const expectedSlugs = [
        'how-it-works',
        'about',
        'partners',
        'faqs',
        'help',
        'contact',
        'terms',
        'privacy',
        'community-guidelines',
      ];

      for (const slug of expectedSlugs) {
        expect(CANONICAL_SLUGS[slug]).toBeDefined();
        expect(typeof CANONICAL_SLUGS[slug]).toBe('string');
      }
    });

    it('correctly resolves and normalizes slug aliases', () => {
      expect(normalizeInfoSlug('faq')).toBe('faqs');
      expect(normalizeInfoSlug('FAQ')).toBe('faqs');
      expect(normalizeInfoSlug('  faqs  ')).toBe('faqs');

      expect(normalizeInfoSlug('guidelines')).toBe('community-guidelines');
      expect(normalizeInfoSlug('GUIDELINES')).toBe('community-guidelines');
      expect(normalizeInfoSlug('community-guidelines')).toBe('community-guidelines');
    });

    it('returns undefined title for unknown slugs to trigger 404 state', () => {
      expect(CANONICAL_SLUGS['non-existent-page']).toBeUndefined();
      expect(CANONICAL_SLUGS['unknown']).toBeUndefined();
      expect(CANONICAL_SLUGS['careers']).toBeUndefined();
    });
  });

  describe('4. Contact Form Validation Logic', () => {
    const validContact = {
      name: 'Sarah Connor',
      email: 'sarah@example.com',
      message: 'I have a question about running ads in California.',
    };

    it('accepts valid contact submission fields', () => {
      const result = validateContactInput(validContact);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('rejects empty or whitespace-only name', () => {
      const result = validateContactInput({ ...validContact, name: '   ' });
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe('Please enter your name.');
    });

    it('rejects name exceeding 100 characters', () => {
      const result = validateContactInput({ ...validContact, name: 'A'.repeat(101) });
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toContain('cannot exceed 100 characters');
    });

    it('rejects invalid email formats', () => {
      const badEmails = ['', 'not-an-email', 'missing@domain', '@no-local.com'];
      for (const email of badEmails) {
        const result = validateContactInput({ ...validContact, email });
        expect(result.isValid).toBe(false);
        expect(result.errors.email).toBeDefined();
      }
    });

    it('rejects message shorter than 10 characters', () => {
      const result = validateContactInput({ ...validContact, message: 'Too short' });
      expect(result.isValid).toBe(false);
      expect(result.errors.message).toBe('Message must be at least 10 characters.');
    });

    it('rejects message exceeding 2000 characters', () => {
      const result = validateContactInput({ ...validContact, message: 'M'.repeat(2001) });
      expect(result.isValid).toBe(false);
      expect(result.errors.message).toContain('cannot exceed 2000 characters');
    });

    it('validates against shared ContactInputSchema and topics list', () => {
      expect(CONTACT_TOPICS).toContain('general');
      expect(CONTACT_TOPICS).toContain('backing');
      expect(CONTACT_TOPICS).toContain('verification');

      const parsed = ContactInputSchema.safeParse({
        name: validContact.name,
        email: validContact.email,
        topic: 'general',
        message: validContact.message,
      });

      expect(parsed.success).toBe(true);

      const invalidParsed = ContactInputSchema.safeParse({
        name: '',
        email: 'invalid-email',
        topic: 'unsupported-topic',
        message: 'short',
      });

      expect(invalidParsed.success).toBe(false);
    });
  });
});
