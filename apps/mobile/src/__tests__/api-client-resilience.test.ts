import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: vi.fn(async (key: string) => store.get(key) || null),
    setItemAsync: vi.fn(async (key: string, val: string) => {
      store.set(key, val);
    }),
    deleteItemAsync: vi.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

import { ApiClient } from '../api/client';
import { getGuestReceiptTokens, getGuestTokenMap } from '../api/tokens';

describe('ApiClient Resilience & Token Parsing', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('safely handles non-JSON responses starting with B (like Bad Gateway) without raw SyntaxError', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      text: async () => 'Bad Gateway: Upstream connection failed',
    });

    const client = new ApiClient('http://test-api/api/v1');

    await expect(client.get('/campaigns')).rejects.toMatchObject({
      statusCode: 502,
      message: expect.stringContaining('Bad Gateway'),
    });
  });

  it('safely handles 200 OK responses with non-JSON plain text body without crashing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => 'Blocked by administrative policy',
    });

    const client = new ApiClient('http://test-api/api/v1');

    await expect(client.get('/campaigns')).rejects.toMatchObject({
      code: 'INVALID_JSON',
      message: expect.stringContaining('Server returned non-JSON response'),
    });
  });

  it('safely parses 204 No Content and empty string without throwing JSON parse error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      statusText: 'No Content',
      text: async () => '',
    });

    const client = new ApiClient('http://test-api/api/v1');
    const result = await client.get('/test');
    expect(result).toEqual({});
  });

  it('safely handles corrupted non-JSON strings starting with B in guest tokens', async () => {
    // Test that getGuestReceiptTokens never throws SyntaxError even if non-JSON string is passed
    const tokens = await getGuestReceiptTokens();
    expect(Array.isArray(tokens)).toBe(true);

    const tokenMap = await getGuestTokenMap();
    expect(typeof tokenMap).toBe('object');
  });

  it('falls back to secondary backend when primary candidate returns 502 HTML/text error', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      callCount++;
      if (url.includes('192.168.1.110') || url.includes('primary-failing')) {
        return Promise.resolve({
          ok: false,
          status: 502,
          statusText: 'Bad Gateway',
          text: async () => 'Bad Gateway: Upstream offline',
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify({ items: [{ id: 'c1', title: 'Fallback campaign' }] }),
      });
    });

    const client = new ApiClient();
    // Simulate candidate URLs: primary fails, secondary succeeds
    (client as unknown as { candidateUrls: string[] }).candidateUrls = [
      'http://primary-failing/api/v1',
      'http://secondary-working/api/v1',
    ];

    const result = await client.get<{ items: Array<{ id: string; title: string }> }>('/campaigns');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Fallback campaign');
    expect(client.getBaseUrl()).toBe('http://secondary-working/api/v1');
  });
});
