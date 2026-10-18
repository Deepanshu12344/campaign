import { describe, it, expect } from 'vitest';
import { isAllowedStorageUrl, UpdateProfileInputSchema } from '@campaigns/shared';

describe('Avatar Storage Host Validation', () => {
  const allowedSupabaseUrl = 'https://mvxaqapnoxtvdhwsyrwg.supabase.co';

  it('accepts valid Supabase storage URLs for allowed host', () => {
    const url = 'https://mvxaqapnoxtvdhwsyrwg.supabase.co/storage/v1/object/public/campaign-uploads/avatar-123.jpg';
    expect(isAllowedStorageUrl(url, allowedSupabaseUrl)).toBe(true);
  });

  it('accepts valid local /uploads/ relative paths', () => {
    const path = '/uploads/179223-avatar.png';
    expect(isAllowedStorageUrl(path)).toBe(true);
  });

  it('accepts localhost in dev/testing environments', () => {
    const url = 'http://localhost:4000/uploads/avatar.webp';
    expect(isAllowedStorageUrl(url)).toBe(true);
  });

  it('rejects third-party / untrusted domains', () => {
    const maliciousUrl = 'https://malicious-site.com/uploads/exploit.jpg';
    expect(isAllowedStorageUrl(maliciousUrl, allowedSupabaseUrl)).toBe(false);
  });

  it('rejects arbitrary external image hosts without permission', () => {
    const externalUrl = 'https://random-image-host.net/pic.jpg';
    expect(isAllowedStorageUrl(externalUrl, allowedSupabaseUrl)).toBe(false);
  });

  it('validates UpdateProfileInputSchema with allowed avatarUrl', () => {
    const valid = UpdateProfileInputSchema.safeParse({
      name: 'Valid Name',
      avatarUrl: 'https://mvxaqapnoxtvdhwsyrwg.supabase.co/storage/v1/object/public/campaign-uploads/test.jpg',
    });
    expect(valid.success).toBe(true);
  });

  it('validates UpdateProfileInputSchema with null avatarUrl (removing photo)', () => {
    const valid = UpdateProfileInputSchema.safeParse({
      avatarUrl: null,
    });
    expect(valid.success).toBe(true);
  });

  it('rejects UpdateProfileInputSchema when avatarUrl belongs to an untrusted domain', () => {
    const invalid = UpdateProfileInputSchema.safeParse({
      name: 'Valid Name',
      avatarUrl: 'https://attacker.org/phishing.png',
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.errors[0]?.message).toContain('verified platform storage host');
    }
  });
});
