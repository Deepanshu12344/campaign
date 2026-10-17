import { ApiError, RequestOptions } from './types';
import { getAccessToken, getRefreshToken, setTokens, clearTokens, getLatestGuestReceiptToken } from './tokens';
import { AuthResponse } from '@campaigns/shared';

const DEFAULT_BASE_URL = 'http://localhost:4000/api/v1';
const DEFAULT_TIMEOUT_MS = 60000; // 60 seconds (accommodates free-tier cold starts)

export type ServerWakeUpListener = (isWakingUp: boolean) => void;

export class ApiClient {
  private baseUrl: string;
  private wakeUpListeners: Set<ServerWakeUpListener> = new Set();
  private pendingSlowRequests = 0;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.EXPO_PUBLIC_API_URL || DEFAULT_BASE_URL;
    // Strip trailing slash if present
    if (this.baseUrl.endsWith('/')) {
      this.baseUrl = this.baseUrl.slice(0, -1);
    }
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

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  }

  private async executeFetch<T>(
    url: string,
    options: RequestOptions,
    isRetry = false
  ): Promise<T> {
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

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (!options.skipAuth) {
      const token = await getAccessToken();
      if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        const guestToken = await getLatestGuestReceiptToken();
        if (guestToken && !headers['x-guest-receipt-token']) {
          headers['x-guest-receipt-token'] = guestToken;
        }
      }
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      cleanupTimers();

      // Handle 401 Unauthorized with token refresh if possible
      if (response.status === 401 && !options.skipAuth && !url.includes('/auth/refresh') && !isRetry) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          // Retry the request with new token
          return this.executeFetch<T>(url, options, true);
        }
      }

      if (!response.ok) {
        let errorData: { error?: { code?: string; message?: string; fields?: Record<string, string[]> } } | null = null;
        try {
          errorData = (await response.json()) as { error?: { code?: string; message?: string; fields?: Record<string, string[]> } };
        } catch {
          // Response body wasn't JSON
        }

        if (errorData?.error) {
          throw new ApiError(
            response.status,
            errorData.error.code || 'API_ERROR',
            errorData.error.message || 'Request failed',
            errorData.error.fields
          );
        }

        throw new ApiError(
          response.status,
          `HTTP_${response.status}`,
          response.statusText || 'An unexpected error occurred'
        );
      }

      // If no content
      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
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
        Boolean(err?.message?.includes('Network request failed'));

      if (isNetworkError && !isRetry && options.retryOnNetworkError !== false) {
        // Wait 300ms before retrying once
        await new Promise((resolve) => setTimeout(resolve, 300));
        return this.executeFetch<T>(url, options, true);
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

      const data = (await response.json()) as AuthResponse;
      await setTokens(data.tokens.accessToken, data.tokens.refreshToken);
      return true;
    } catch {
      await clearTokens();
      return false;
    }
  }

  public async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return this.executeFetch<T>(`${this.baseUrl}${cleanPath}`, {
      ...options,
      method: 'GET',
    });
  }

  public async post<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return this.executeFetch<T>(`${this.baseUrl}${cleanPath}`, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async patch<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return this.executeFetch<T>(`${this.baseUrl}${cleanPath}`, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return this.executeFetch<T>(`${this.baseUrl}${cleanPath}`, {
      ...options,
      method: 'DELETE',
    });
  }

  public async uploadFile<T>(path: string, formData: FormData, options: RequestOptions = {}): Promise<T> {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return this.executeFetch<T>(`${this.baseUrl}${cleanPath}`, {
      ...options,
      method: 'POST',
      body: formData,
    });
  }
}

export const apiClient = new ApiClient();

