import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'campaigns_access_token';
const REFRESH_TOKEN_KEY = 'campaigns_refresh_token';

// In-memory fallback for web and environments without SecureStore
let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;

export async function getAccessToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    }
    return memoryAccessToken;
  }
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return memoryAccessToken;
  }
}

export async function getRefreshToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return memoryRefreshToken;
  }
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return memoryRefreshToken;
  }
}

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  memoryAccessToken = accessToken;
  memoryRefreshToken = refreshToken;

  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    return;
  }

  try {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
    ]);
  } catch (e) {
    console.warn('Failed to persist tokens to SecureStore:', e);
  }
}

export async function clearTokens(): Promise<void> {
  memoryAccessToken = null;
  memoryRefreshToken = null;

  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    return;
  }

  try {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
  } catch (e) {
    console.warn('Failed to delete tokens from SecureStore:', e);
  }
}

const GUEST_RECEIPT_TOKENS_KEY = 'campaigns_guest_receipt_tokens';
const GUEST_TOKEN_MAP_KEY = 'campaigns_guest_token_map';
let memoryGuestTokens: string[] = [];
let memoryGuestTokenMap: Record<string, string> = {};

export async function getGuestReceiptTokens(): Promise<string[]> {
  try {
    let raw: string | null = null;
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        raw = localStorage.getItem(GUEST_RECEIPT_TOKENS_KEY);
      }
    } else {
      raw = await SecureStore.getItemAsync(GUEST_RECEIPT_TOKENS_KEY);
    }
    if (!raw) return memoryGuestTokens;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((t): t is string => typeof t === 'string');
      if (typeof parsed === 'string' && parsed.trim()) return [parsed.trim()];
      return memoryGuestTokens;
    } catch {
      // If raw was saved as a single raw string rather than JSON
      return typeof raw === 'string' && raw.trim() ? [raw.trim()] : memoryGuestTokens;
    }
  } catch {
    return memoryGuestTokens;
  }
}

export async function addGuestReceiptToken(token: string): Promise<void> {
  if (!token || typeof token !== 'string') return;
  const current = await getGuestReceiptTokens();
  if (!current.includes(token)) {
    const updated = [token, ...current];
    memoryGuestTokens = updated;
    const serialized = JSON.stringify(updated);
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(GUEST_RECEIPT_TOKENS_KEY, serialized);
      }
      return;
    }
    try {
      await SecureStore.setItemAsync(GUEST_RECEIPT_TOKENS_KEY, serialized);
    } catch (e) {
      console.warn('Failed to save guest receipt token:', e);
    }
  }
}

export async function getGuestTokenMap(): Promise<Record<string, string>> {
  try {
    let raw: string | null = null;
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        raw = localStorage.getItem(GUEST_TOKEN_MAP_KEY);
      }
    } else {
      raw = await SecureStore.getItemAsync(GUEST_TOKEN_MAP_KEY);
    }
    if (!raw) return memoryGuestTokenMap;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, string>;
      }
      return memoryGuestTokenMap;
    } catch {
      return memoryGuestTokenMap;
    }
  } catch {
    return memoryGuestTokenMap;
  }
}

export async function recordGuestReceiptToken(contributionId: string, token: string): Promise<void> {
  await addGuestReceiptToken(token);
  const currentMap = await getGuestTokenMap();
  currentMap[contributionId] = token;
  memoryGuestTokenMap = currentMap;
  const serialized = JSON.stringify(currentMap);
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(GUEST_TOKEN_MAP_KEY, serialized);
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(GUEST_TOKEN_MAP_KEY, serialized);
  } catch (e) {
    console.warn('Failed to save guest contribution token map:', e);
  }
}

export async function getGuestTokenForContribution(contributionId: string): Promise<string | null> {
  const map = await getGuestTokenMap();
  return map[contributionId] || null;
}

export async function getLatestGuestReceiptToken(): Promise<string | null> {
  const tokens = await getGuestReceiptTokens();
  return tokens.length > 0 ? tokens[0] : null;
}

export async function clearGuestReceiptTokens(): Promise<void> {
  memoryGuestTokens = [];
  memoryGuestTokenMap = {};
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(GUEST_RECEIPT_TOKENS_KEY);
      localStorage.removeItem(GUEST_TOKEN_MAP_KEY);
    }
    return;
  }
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(GUEST_RECEIPT_TOKENS_KEY),
      SecureStore.deleteItemAsync(GUEST_TOKEN_MAP_KEY),
    ]);
  } catch (e) {
    console.warn('Failed to delete guest receipt tokens:', e);
  }
}

