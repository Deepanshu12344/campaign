import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDraftStore } from '../store/draftStore';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock apiClient
vi.mock('../api/client', () => ({
  apiClient: {
    patch: vi.fn().mockResolvedValue({ id: 'test-draft', title: 'Patched Title' }),
  },
}));

describe('Draft Engine Store (useDraftStore)', () => {
  beforeEach(() => {
    // Reset store state
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
  });

  describe('Immediate Local State Updates', () => {
    it('updates local state immediately on field edit', () => {
      const store = useDraftStore.getState();
      store.setActiveDraft('draft-101', { id: 'draft-101', title: 'Initial Title' });

      store.updateDraftField('title', 'Updated Clean Water Campaign');

      const active = useDraftStore.getState().getActiveDraft();
      expect(active?.title).toBe('Updated Clean Water Campaign');

      const dirty = useDraftStore.getState().dirtyFields['draft-101'];
      expect(dirty?.title).toBe('Updated Clean Water Campaign');
    });

    it('updates multiple fields at once', () => {
      const store = useDraftStore.getState();
      store.setActiveDraft('draft-101', { id: 'draft-101' });

      store.updateDraftFields({
        title: 'New Title',
        summary: 'New Summary description',
        category: 'Environment',
      });

      const active = useDraftStore.getState().getActiveDraft();
      expect(active?.title).toBe('New Title');
      expect(active?.summary).toBe('New Summary description');
      expect(active?.category).toBe('Environment');
    });
  });

  describe('Critical Invariant: fundingGoalCents Guard', () => {
    it('strictly throws GUARD_VIOLATION if fundingGoalCents is updated without fromSubmitStep', () => {
      const store = useDraftStore.getState();
      store.setActiveDraft('draft-101');

      // Attempt to set fundingGoalCents from step 1 (Basics)
      expect(() => {
        store.updateDraftField('fundingGoalCents', 200000);
      }).toThrow(/GUARD_VIOLATION.*Step 5 \(Submit\)/);

      // Attempt via updateDraftFields without flag
      expect(() => {
        store.updateDraftFields({ fundingGoalCents: 200000 });
      }).toThrow(/GUARD_VIOLATION.*Step 5 \(Submit\)/);

      // Verify draft state was NOT modified
      const active = useDraftStore.getState().getActiveDraft();
      expect(active?.fundingGoalCents).toBeUndefined();
    });

    it('allows updating fundingGoalCents ONLY when fromSubmitStep is explicitly true', () => {
      const store = useDraftStore.getState();
      store.setActiveDraft('draft-101');

      // Setting with fromSubmitStep: true succeeds
      expect(() => {
        store.updateDraftField('fundingGoalCents', 250000, { fromSubmitStep: true });
      }).not.toThrow();

      const active = useDraftStore.getState().getActiveDraft();
      expect(active?.fundingGoalCents).toBe(250000);

      // Also works via updateDraftFields with flag
      expect(() => {
        store.updateDraftFields({ fundingGoalCents: 350000 }, { fromSubmitStep: true });
      }).not.toThrow();

      expect(useDraftStore.getState().getActiveDraft()?.fundingGoalCents).toBe(350000);
    });
  });

  describe('Draft Isolation: No Cross-Contamination', () => {
    it('maintains complete isolation between multiple drafts', () => {
      const store = useDraftStore.getState();

      // Draft 1
      store.setActiveDraft('draft-alpha', { id: 'draft-alpha', title: 'Alpha Campaign' });
      store.updateDraftField('summary', 'Alpha summary');

      // Switch to Draft 2
      store.setActiveDraft('draft-beta', { id: 'draft-beta', title: 'Beta Campaign' });
      store.updateDraftField('summary', 'Beta summary');

      // Check Draft Beta
      expect(useDraftStore.getState().getActiveDraft()?.title).toBe('Beta Campaign');
      expect(useDraftStore.getState().getActiveDraft()?.summary).toBe('Beta summary');

      // Switch back to Draft Alpha
      store.setActiveDraft('draft-alpha');
      expect(useDraftStore.getState().getActiveDraft()?.title).toBe('Alpha Campaign');
      expect(useDraftStore.getState().getActiveDraft()?.summary).toBe('Alpha summary');

      // Verify dirty fields per draft remain strictly separated
      const dirty = useDraftStore.getState().dirtyFields;
      expect(dirty['draft-alpha']?.summary).toBe('Alpha summary');
      expect(dirty['draft-beta']?.summary).toBe('Beta summary');
    });
  });

  describe('Dirty Fields Tracking & Diffing', () => {
    it('tracks only modified fields in dirty state', () => {
      const store = useDraftStore.getState();
      store.setActiveDraft('draft-101', {
        id: 'draft-101',
        title: 'Original Title',
        summary: 'Original Summary',
      });

      // Modify only title
      store.updateDraftField('title', 'Modified Title');

      const dirty = useDraftStore.getState().dirtyFields['draft-101'];
      expect(dirty).toHaveProperty('title', 'Modified Title');
      expect(dirty).not.toHaveProperty('summary');
    });
  });

  describe('Creator Type Normalization & Persistence', () => {
    it('normalizes uppercase creatorType to lowercase on updateDraftField', () => {
      const store = useDraftStore.getState();
      store.setActiveDraft('draft-201', { id: 'draft-201' });

      store.updateDraftField('creatorType', 'INDIVIDUAL' as unknown as 'individual');

      const active = useDraftStore.getState().getActiveDraft();
      expect(active?.creatorType).toBe('individual');
    });

    it('normalizes uppercase creatorType to lowercase on updateDraftFields', () => {
      const store = useDraftStore.getState();
      store.setActiveDraft('draft-202', { id: 'draft-202' });

      store.updateDraftFields({
        creatorType: 'NONPROFIT' as unknown as 'nonprofit',
      });

      const active = useDraftStore.getState().getActiveDraft();
      expect(active?.creatorType).toBe('nonprofit');
    });

    it('normalizes uppercase creatorType when loading initial draft from server', () => {
      const store = useDraftStore.getState();
      store.setActiveDraft('draft-203', {
        id: 'draft-203',
        creatorType: 'COMMUNITY' as unknown as 'community',
      });

      const active = useDraftStore.getState().getActiveDraft();
      expect(active?.creatorType).toBe('community');
    });

    it('normalizes creatorType in saveDraftNow server response', async () => {
      const store = useDraftStore.getState();
      store.setActiveDraft('draft-204', { id: 'draft-204' });
      store.updateDraftField('title', 'Saved Campaign');

      const { apiClient } = await import('../api/client');
      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        id: 'draft-204',
        title: 'Saved Campaign',
        creatorType: 'BUSINESS',
      });

      const success = await store.saveDraftNow('draft-204');
      expect(success).toBe(true);

      const active = useDraftStore.getState().getActiveDraft();
      expect(active?.creatorType).toBe('business');
    });
  });

  describe('Session Isolation & clearAllDrafts', () => {
    it('wipes in-memory draft state, active draft, dirty fields, and deletes from AsyncStorage', async () => {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const store = useDraftStore.getState();

      store.setActiveDraft('draft-secret-1', {
        id: 'draft-secret-1',
        title: 'Secret Campaign Plan',
      });
      store.updateDraftField('title', 'Secret Campaign Modified');

      expect(useDraftStore.getState().getActiveDraft()?.title).toBe('Secret Campaign Modified');
      expect(Object.keys(useDraftStore.getState().drafts).length).toBe(1);

      await store.clearAllDrafts();

      const stateAfter = useDraftStore.getState();
      expect(stateAfter.activeDraftId).toBeNull();
      expect(stateAfter.getActiveDraft()).toBeNull();
      expect(Object.keys(stateAfter.drafts).length).toBe(0);
      expect(Object.keys(stateAfter.dirtyFields).length).toBe(0);
      expect(Object.keys(stateAfter.syncedState).length).toBe(0);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@campaigns_draft_store_v1');
    });
  });
});
