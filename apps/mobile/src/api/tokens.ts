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
