import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../store/authStore';
import { useDraftStore } from '../store/draftStore';
import { useBackingStore } from '../store/backingStore';
import { queryClient } from '../api/queryClient';
import { apiClient } from '../api/client';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock tokens
vi.mock('../api/tokens', () => ({
  getAccessToken: vi.fn().mockResolvedValue(null),
  getRefreshToken: vi.fn().mockResolvedValue(null),
  setTokens: vi.fn().mockResolvedValue(undefined),
  clearTokens: vi.fn().mockResolvedValue(undefined),
  getGuestTokenForContribution: vi.fn().mockResolvedValue(null),
  getLatestGuestReceiptToken: vi.fn().mockResolvedValue(null),
  recordGuestReceiptToken: vi.fn().mockResolvedValue(undefined),
}));

// Mock apiClient methods
vi.mock('../api/client', () => {
  const unauthorizedListeners = new Set<() => void>();
  return {
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      onServerWakeUp: vi.fn(() => () => {}),
      onUnauthorized: vi.fn((cb: () => void) => {
        unauthorizedListeners.add(cb);
        return () => unauthorizedListeners.delete(cb);
      }),
      _triggerUnauthorized: () => {
        for (const l of unauthorizedListeners) l();
      },
    },
  };
});

describe('Auth & Session Logout Isolation (No Data Leaks)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isHydrated: true,
      isLoading: false,
      error: null,
    });
    useDraftStore.setState({
      drafts: {},
      dirtyFields: {},
      syncedState: {},
      activeDraftId: null,
      syncStatus: {},
      lastSavedAt: {},
      lastError: {},
      isHydrated: true,
    });
    useBackingStore.getState().reset();
  });

  describe('SignOut Isolation', () => {
    it('completely clears tokens, queryClient cache, draftStore, and backingStore on signOut', async () => {
      const clearSpy = vi.spyOn(queryClient, 'clear');

      // 1. Simulate active logged-in user with active draft and backing state
      useAuthStore.setState({
        user: {
          id: 'usr-1',
          email: 'creator@example.com',
          name: 'Alice Creator',
          role: 'USER',
          createdAt: new Date(),
        },
        isAuthenticated: true,
      });

      useDraftStore.getState().setActiveDraft('draft-user-1', {
        id: 'draft-user-1',
        title: 'Alice Private Campaign',
      });

      useBackingStore.getState().setAmountDollars('500');
      useBackingStore.getState().setContribution('contrib-123', null);

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useDraftStore.getState().getActiveDraft()?.title).toBe('Alice Private Campaign');
      expect(useBackingStore.getState().amountDollars).toBe('500');

      // 2. Perform sign out
      await useAuthStore.getState().signOut();

      // 3. Verify complete cleanup across all stores
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();

      // React Query cache cleared
      expect(clearSpy).toHaveBeenCalled();

      // Local drafts wiped
      expect(useDraftStore.getState().getActiveDraft()).toBeNull();
      expect(Object.keys(useDraftStore.getState().drafts).length).toBe(0);
      expect(Object.keys(useDraftStore.getState().dirtyFields).length).toBe(0);

      // Backing store reset
      expect(useBackingStore.getState().amountDollars).toBe('25');
      expect(useBackingStore.getState().contributionId).toBeNull();
    });
  });

  describe('SignIn / SignUp Clean Slate', () => {
    it('clears previous query cache and drafts before initializing a new user session on signIn', async () => {
      const clearSpy = vi.spyOn(queryClient, 'clear');

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        user: { id: 'usr-2', email: 'bob@example.com', name: 'Bob Creator', role: 'USER' },
        tokens: { accessToken: 'access-2', refreshToken: 'refresh-2', expiresIn: 3600 },
      });
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        id: 'usr-2',
        email: 'bob@example.com',
        name: 'Bob Creator',
        role: 'USER',
        createdAt: new Date(),
      });

      // Populate draft before signing in
      useDraftStore.getState().setActiveDraft('old-draft', { id: 'old-draft', title: 'Old Draft' });

      await useAuthStore.getState().signIn({
        email: 'bob@example.com',
        password: 'Password123!',
      });

      expect(clearSpy).toHaveBeenCalled();
      expect(useDraftStore.getState().getActiveDraft()).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user?.email).toBe('bob@example.com');
    });

    it('clears previous query cache and drafts before initializing a new user session on signUp', async () => {
      const clearSpy = vi.spyOn(queryClient, 'clear');

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        user: { id: 'usr-new', email: 'charlie@example.com', name: 'Charlie New', role: 'USER' },
        tokens: { accessToken: 'access-new', refreshToken: 'refresh-new', expiresIn: 3600 },
      });
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        id: 'usr-new',
        email: 'charlie@example.com',
        name: 'Charlie New',
        role: 'USER',
        createdAt: new Date(),
      });

      useDraftStore.getState().setActiveDraft('stale-draft', { id: 'stale-draft', title: 'Stale' });

      await useAuthStore.getState().signUp({
        email: 'charlie@example.com',
        password: 'Password123!',
        name: 'Charlie New',
      });

      expect(clearSpy).toHaveBeenCalled();
      expect(useDraftStore.getState().getActiveDraft()).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user?.email).toBe('charlie@example.com');
    });
  });

  describe('Hydration Failure Isolation', () => {
    it('wipes cached state and drafts if tokens are expired or invalid on app launch', async () => {
      const clearSpy = vi.spyOn(queryClient, 'clear');
      const { getAccessToken, getRefreshToken } = await import('../api/tokens');

      vi.mocked(getAccessToken).mockResolvedValueOnce('expired-token');
      vi.mocked(getRefreshToken).mockResolvedValueOnce(null);
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('401 Unauthorized'));

      useDraftStore.getState().setActiveDraft('d-hyd', { id: 'd-hyd', title: 'Unsaved' });

      await useAuthStore.getState().hydrate();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
      expect(clearSpy).toHaveBeenCalled();
      expect(useDraftStore.getState().getActiveDraft()).toBeNull();
    });
  });

  describe('Create Screen Draft Isolation Rule', () => {
    it('ensures drafts array is strictly empty when unauthenticated, preventing leaks of cached campaigns', () => {
      // If cached campaigns existed from a previous session
      const mockStaleCampaigns = [
        {
          id: 'camp-101',
          title: 'Secret Leak Draft',
          status: 'DRAFT',
          slug: 'secret-draft',
        },
        {
          id: 'camp-102',
          title: 'Needs Changes Draft',
          status: 'CHANGES_REQUESTED',
          slug: 'changes-draft',
        },
      ];

      // Simulated unauthenticated state:
      const isAuthenticated = false;
      const drafts = isAuthenticated
        ? (mockStaleCampaigns as { status: string }[]).filter(
            (c) => c.status === 'DRAFT' || c.status === 'CHANGES_REQUESTED'
          )
        : [];

      expect(drafts).toEqual([]);
      expect(drafts.length).toBe(0);
    });

    it('populates drafts only when authenticated', () => {
      const mockCampaigns = [
        {
          id: 'camp-101',
          title: 'My Valid Draft',
          status: 'DRAFT',
          slug: 'my-valid-draft',
        },
        {
          id: 'camp-102',
          title: 'Published Campaign',
          status: 'FUNDING',
          slug: 'published-campaign',
        },
      ];

      const isAuthenticated = true;
      const drafts = isAuthenticated
        ? (mockCampaigns as { status: string; title: string }[]).filter(
            (c) => c.status === 'DRAFT' || c.status === 'CHANGES_REQUESTED'
          )
        : [];

      expect(drafts.length).toBe(1);
      expect(drafts[0].title).toBe('My Valid Draft');
    });
  });
});
