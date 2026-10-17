import { create } from 'zustand';
import { UserProfile, AuthResponse, SignInInput, SignUpInput } from '@campaigns/shared';
import { apiClient } from '../api/client';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../api/tokens';

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  isLoading: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  signIn: (input: SignInInput) => Promise<AuthResponse>;
  signUp: (input: SignUpInput) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isHydrated: false,
  isLoading: false,
  error: null,

  hydrate: async () => {
    try {
      const accessToken = await getAccessToken();
      const refreshToken = await getRefreshToken();

      if (!accessToken && !refreshToken) {
        set({ isHydrated: true, isAuthenticated: false, user: null });
        return;
      }

      // Try fetching current user with existing access token
      try {
        const user = await apiClient.get<UserProfile>('/me');
        set({ user, isAuthenticated: true, isHydrated: true, error: null });
        return;
      } catch {
        // Access token might be expired, attempt silent refresh if we have a refresh token
        if (refreshToken) {
          try {
            const refreshRes = await apiClient.post<AuthResponse>(
              '/auth/refresh',
              { refreshToken },
              { skipAuth: true }
            );
            await setTokens(refreshRes.tokens.accessToken, refreshRes.tokens.refreshToken);
            const user = await apiClient.get<UserProfile>('/me');
            set({ user, isAuthenticated: true, isHydrated: true, error: null });
            return;
          } catch {
            // Refresh failed as well; clear stored tokens
            await clearTokens();
            set({ user: null, isAuthenticated: false, isHydrated: true });
            return;
          }
        }
        await clearTokens();
        set({ user: null, isAuthenticated: false, isHydrated: true });
      }
    } catch (e: unknown) {
      console.warn('Auth hydration error:', e);
      set({ isHydrated: true, isAuthenticated: false, user: null });
    }
  },

  signIn: async (input: SignInInput) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post<AuthResponse>('/auth/sign-in', input, {
        skipAuth: true,
      });
      await setTokens(response.tokens.accessToken, response.tokens.refreshToken);

      // Fetch complete user profile
      const user = await apiClient.get<UserProfile>('/me');
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      return response;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to sign in. Please check your credentials.';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  signUp: async (input: SignUpInput) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post<AuthResponse>('/auth/sign-up', input, {
        skipAuth: true,
      });
      await setTokens(response.tokens.accessToken, response.tokens.refreshToken);

      const user = await apiClient.get<UserProfile>('/me');
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      return response;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create account. Please try again.';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await clearTokens();
    } catch (e) {
      console.warn('Error clearing tokens during sign out:', e);
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },

  setUser: (user: UserProfile | null) => {
    set({ user, isAuthenticated: Boolean(user) });
  },

  clearError: () => {
    set({ error: null });
  },
}));
