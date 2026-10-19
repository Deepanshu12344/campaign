import { Platform } from 'react-native';
import { ApiError, RequestOptions } from './types';
import { getAccessToken, getRefreshToken, setTokens, clearTokens, getLatestGuestReceiptToken } from './tokens';
import { AuthResponse } from '@campaigns/shared';

function getHostIpFromConstants(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require('expo-constants')?.default;
    const hostUri =
      Constants?.expoConfig?.hostUri ||
      Constants?.manifest2?.extra?.expoGo?.debuggerHost;
    if (typeof hostUri === 'string') {
      return hostUri.split(':')[0] || null;
    }
  } catch {
    // ignore
  }
  return null;
}

const CLOUD_BASE_URL = 'https://campaign-admj.onrender.com/api/v1';
const DEFAULT_TIMEOUT_MS = 60000; // 60 seconds (accommodates free-tier cold starts)

export type ServerWakeUpListener = (isWakingUp: boolean) => void;
export type UnauthorizedListener = () => void;

function getCandidateBaseUrls(): string[] {
  const candidates: string[] = [];

  // 1. Explicit environment variable has top priority if configured
  if (process.env.EXPO_PUBLIC_API_URL) {
    candidates.push(process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, ''));
  }

  // 2. Local development candidates (LAN IP / localhost)
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname || 'localhost';
      candidates.push(`http://${hostname}:4000/api/v1`);
      if (hostname !== '127.0.0.1' && hostname !== 'localhost') {
        candidates.push('http://127.0.0.1:4000/api/v1');
      }
    } else {
      candidates.push('http://127.0.0.1:4000/api/v1');
    }
  } else {
    // Physical device or emulator connected to Metro
    const hostIp = getHostIpFromConstants();
    if (hostIp) {
      candidates.push(`http://${hostIp}:4000/api/v1`);
    }
    // Android emulator loopback alias
    candidates.push('http://10.0.2.2:4000/api/v1');
    candidates.push('http://127.0.0.1:4000/api/v1');
  }

  // 3. Cloud Render deployment
  candidates.push(CLOUD_BASE_URL);

  // De-duplicate while preserving priority order
  return Array.from(new Set(candidates.map((u) => u.replace(/\/$/, ''))));
}

export class ApiClient {
  private baseUrl: string;
  private candidateUrls: string[];
  private wakeUpListeners: Set<ServerWakeUpListener> = new Set();
  private unauthorizedListeners: Set<UnauthorizedListener> = new Set();
  private pendingSlowRequests = 0;

  constructor(baseUrl?: string) {
    this.candidateUrls = getCandidateBaseUrls();
    this.baseUrl = baseUrl?.replace(/\/$/, '') || this.candidateUrls[0] || CLOUD_BASE_URL;
  }

  public onServerWakeUp(listener: ServerWakeUpListener): () => void {
    this.wakeUpListeners.add(listener);
    return () => this.wakeUpListeners.delete(listener);
  }

  private notifyWakeUp(isWakingUp: boolean) {
    for (const listener of this.wakeUpListeners) {
      try {
        listener(isWakingUp);
      } catch {
        // ignore listener errors
      }
    }
  }

  public onUnauthorized(listener: UnauthorizedListener): () => void {
    this.unauthorizedListeners.add(listener);
    return () => this.unauthorizedListeners.delete(listener);
  }

  private notifyUnauthorized() {
    for (const listener of this.unauthorizedListeners) {
      try {
        listener();
      } catch {
        // ignore listener errors
      }
    }
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  }

  private async executeFetch<T>(
    pathOrUrl: string,
    options: RequestOptions,
    isRetry = false,
    candidateIndex = 0
  ): Promise<T> {
    const isAbsolute = pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://');
    const activeBase = this.candidateUrls[candidateIndex] || this.baseUrl;
    const cleanPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
    const fullUrl = isAbsolute ? pathOrUrl : `${activeBase}${cleanPath}`;

    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let slowTimerTriggered = false;
    const slowTimer = setTimeout(() => {
      slowTimerTriggered = true;
      this.pendingSlowRequests++;
      if (this.pendingSlowRequests === 1) {
        this.notifyWakeUp(true);
      }
    }, 8000);

    const cleanupTimers = () => {
      clearTimeout(timer);
      clearTimeout(slowTimer);
      if (slowTimerTriggered) {
        this.pendingSlowRequests = Math.max(0, this.pendingSlowRequests - 1);
        if (this.pendingSlowRequests === 0) {
          this.notifyWakeUp(false);
        }
      }
    };

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    const isFormData =
      (typeof FormData !== 'undefined' && options.body instanceof FormData) ||
      Boolean(
        options.body &&
          typeof options.body === 'object' &&
          (typeof (options.body as { append?: unknown }).append === 'function' ||
            typeof (options.body as { getParts?: unknown }).getParts === 'function' ||
            typeof (options.body as { _parts?: unknown })._parts !== 'undefined')
      );

    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (isFormData) {
      // NEVER pass Content-Type header for FormData; the browser / React Native networking module
      // must automatically inject multipart/form-data with the correct boundary!
      delete headers['Content-Type'];
    }

    if (!options.skipAuth) {
      const token = await getAccessToken();
      if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        try {
          const guestToken = await getLatestGuestReceiptToken();
          if (guestToken && !headers['x-guest-receipt-token']) {
            headers['x-guest-receipt-token'] = guestToken;
          }
        } catch {
          // ignore guest token lookup error
        }
      }
    }

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers,
        signal: controller.signal,
      });

      cleanupTimers();

      // Handle 401 Unauthorized with token refresh if possible
      if (
        response.status === 401 &&
        !options.skipAuth &&
        !cleanPath.includes('/auth/refresh') &&
        !isRetry
      ) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          return this.executeFetch<T>(pathOrUrl, options, true, candidateIndex);
        }
        this.notifyUnauthorized();
      }

      // Safely read response text once to avoid raw JSON parse crashes
      const rawText = await response.text();

      if (!response.ok) {
        let errorData: { error?: { code?: string; message?: string; fields?: Record<string, string[]> } } | null = null;
        if (rawText) {
          try {
            errorData = JSON.parse(rawText) as {
              error?: { code?: string; message?: string; fields?: Record<string, string[]> };
            };
          } catch {
            // Not a JSON response
          }
        }

        if (errorData?.error) {
          throw new ApiError(
            response.status,
            errorData.error.code || 'API_ERROR',
            errorData.error.message || 'Request failed',
            errorData.error.fields
          );
        }

        // If the server returned an HTML / plain-text error like "Bad Gateway" or "Blocked",
        // try fallback backend before failing if un-tried candidates remain
        if (
          !isAbsolute &&
          (response.status >= 500 || response.status === 403 || !errorData) &&
          candidateIndex + 1 < this.candidateUrls.length
        ) {
          return this.executeFetch<T>(pathOrUrl, options, false, candidateIndex + 1);
        }

        const cleanMessage = rawText.trim().replace(/<[^>]*>/g, '').trim().slice(0, 120);
        throw new ApiError(
          response.status,
          `HTTP_${response.status}`,
          cleanMessage || response.statusText || 'An unexpected error occurred'
        );
      }

      // Request succeeded! Cache this working backend URL
      if (!isAbsolute && this.baseUrl !== activeBase) {
        this.baseUrl = activeBase;
      }

      // If 204 No Content or empty body
      if (response.status === 204 || !rawText.trim()) {
        return {} as T;
      }

      try {
        return JSON.parse(rawText) as T;
      } catch {
        // If 200 response returned HTML/text instead of JSON, attempt fallback backend
        if (!isAbsolute && candidateIndex + 1 < this.candidateUrls.length) {
          return this.executeFetch<T>(pathOrUrl, options, false, candidateIndex + 1);
        }

        const cleanPreview = rawText.trim().replace(/<[^>]*>/g, '').trim().slice(0, 100);
        throw new ApiError(
          response.status,
          'INVALID_JSON',
          `Server returned non-JSON response (${cleanPreview || 'empty response'})`
        );
      }
    } catch (error: unknown) {
      cleanupTimers();

      if (error instanceof ApiError) {
        throw error;
      }

      const err = error as { name?: string; message?: string } | undefined;
      const isAbort = err?.name === 'AbortError';
      const isNetworkError =
        isAbort ||
        error instanceof TypeError ||
        Boolean(err?.message?.includes('Network request failed')) ||
        Boolean(err?.message?.includes('Failed to fetch'));

      // If connection failed to current backend candidate, try next candidate URL
      if (!isAbsolute && isNetworkError && candidateIndex + 1 < this.candidateUrls.length) {
        return this.executeFetch<T>(pathOrUrl, options, false, candidateIndex + 1);
      }

      if (isNetworkError && !isRetry && options.retryOnNetworkError !== false) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return this.executeFetch<T>(pathOrUrl, options, true, candidateIndex);
      }

      if (isAbort) {
        throw new ApiError(408, 'TIMEOUT', `Request timed out after ${timeoutMs}ms`);
      }

      throw new ApiError(
        0,
        'NETWORK_ERROR',
        err?.message || 'Network request failed. Please check your connection.'
      );
    }
  }

  private async tryRefreshToken(): Promise<boolean> {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      await clearTokens();
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        await clearTokens();
        return false;
      }

      const raw = await response.text();
      let data: AuthResponse;
      try {
        data = JSON.parse(raw) as AuthResponse;
      } catch {
        await clearTokens();
        return false;
      }

      await setTokens(data.tokens.accessToken, data.tokens.refreshToken);
      return true;
    } catch {
      await clearTokens();
      return false;
    }
  }

  public async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.executeFetch<T>(path, {
      ...options,
      method: 'GET',
    });
  }

  public async post<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.executeFetch<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async patch<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.executeFetch<T>(path, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.executeFetch<T>(path, {
      ...options,
      method: 'DELETE',
    });
  }

  public async uploadFile<T>(path: string, formData: FormData, options: RequestOptions = {}): Promise<T> {
    return this.executeFetch<T>(path, {
      ...options,
      method: 'POST',
      body: formData,
    });
  }
}

export const apiClient = new ApiClient();
