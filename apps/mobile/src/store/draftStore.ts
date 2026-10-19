import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CampaignDetailDto,
  CreatorType,
  DraftUpdateInput,
} from '@campaigns/shared';
import { apiClient } from '../api/client';

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'offline_pending' | 'error';

export type DraftModel = Partial<Omit<CampaignDetailDto, 'adCreative' | 'reach'>> & {
  adCreative?: DraftUpdateInput['adCreative'];
  reach?: DraftUpdateInput['reach'];
  [key: string]: unknown;
};

export function normalizeDraftData<T extends DraftModel | Partial<CampaignDetailDto>>(draft: T): T {
  if (!draft || typeof draft !== 'object') return draft;
  const normalized = { ...draft };
  if (typeof (normalized as Record<string, unknown>).creatorType === 'string') {
    (normalized as Record<string, unknown>).creatorType = (
      (normalized as Record<string, unknown>).creatorType as string
    ).toLowerCase() as CreatorType;
  }
  return normalized;
}

export interface DraftStoreState {
  drafts: Record<string, DraftModel>;
  dirtyFields: Record<string, Partial<DraftUpdateInput>>;
  syncedState: Record<string, Partial<DraftUpdateInput>>;
  activeDraftId: string | null;
  syncStatus: Record<string, SyncStatus>;
  lastSavedAt: Record<string, number>;
  lastError: Record<string, string | null>;
  isHydrated: boolean;

  // Actions
  hydrate: () => Promise<void>;
  setActiveDraft: (draftId: string, initialData?: Partial<CampaignDetailDto> | DraftModel) => void;
  getActiveDraft: () => DraftModel | null;
  getDraft: (draftId: string) => DraftModel | null;
  getSyncStatus: (draftId?: string) => SyncStatus;
  getLastSavedAt: (draftId?: string) => number | null;

  updateDraftField: <K extends keyof DraftUpdateInput | string>(
    field: K,
    value: K extends keyof DraftUpdateInput ? DraftUpdateInput[K] : unknown,
    options?: { fromSubmitStep?: boolean; draftId?: string }
  ) => void;

  updateDraftFields: (
    fields: Partial<DraftUpdateInput>,
    options?: { fromSubmitStep?: boolean; draftId?: string }
  ) => void;

  saveDraftNow: (draftId?: string) => Promise<boolean>;
  syncOfflineDrafts: () => Promise<void>;
  removeDraft: (draftId: string) => void;
  resetDirtyState: (draftId: string) => void;
  clearAllDrafts: () => Promise<void>;

  stepContinueHandler: (() => Promise<boolean>) | null;
  setStepContinueHandler: (handler: (() => Promise<boolean>) | null) => void;
  isSubmitting: boolean;
  setIsSubmitting: (submitting: boolean) => void;
}

const STORAGE_KEY = '@campaigns_draft_store_v1';
const AUTOSAVE_DEBOUNCE_MS = 1500;

// Internal timer tracking map outside Zustand state to prevent re-renders on timer updates
const debounceTimers: Record<string, ReturnType<typeof setTimeout> | null> = {};

export const useDraftStore = create<DraftStoreState>((set, get) => ({
  drafts: {},
  dirtyFields: {},
  syncedState: {},
  activeDraftId: null,
  syncStatus: {},
  lastSavedAt: {},
  lastError: {},
  isHydrated: false,
  stepContinueHandler: null,
  isSubmitting: false,

  setStepContinueHandler: (handler) => set({ stepContinueHandler: handler }),
  setIsSubmitting: (submitting) => set({ isSubmitting: submitting }),

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const hydratedDrafts = { ...(parsed.drafts || {}) };
        for (const id of Object.keys(hydratedDrafts)) {
          hydratedDrafts[id] = normalizeDraftData(hydratedDrafts[id]);
        }

        set((state) => ({
          drafts: { ...state.drafts, ...hydratedDrafts },
          dirtyFields: { ...state.dirtyFields, ...(parsed.dirtyFields || {}) },
          syncedState: { ...state.syncedState, ...(parsed.syncedState || {}) },
          syncStatus: { ...state.syncStatus, ...(parsed.syncStatus || {}) },
          lastSavedAt: { ...state.lastSavedAt, ...(parsed.lastSavedAt || {}) },
          isHydrated: true,
        }));

        // After restoring, check if there are pending unsynced drafts to flush
        const hasPending = Object.keys(parsed.dirtyFields || {}).some(
          (id) => Object.keys(parsed.dirtyFields[id] || {}).length > 0
        );
        if (hasPending) {
          get().syncOfflineDrafts().catch(() => {});
        }
      } else {
        set({ isHydrated: true });
      }
    } catch {
      set({ isHydrated: true });
    }
  },

  setActiveDraft: (draftId: string, initialData?: Partial<CampaignDetailDto> | DraftModel) => {
    set((state) => {
      const existingDraft = state.drafts[draftId];
      let mergedDraft: DraftModel = existingDraft ? { ...existingDraft } : {};

      if (initialData) {
        // Last write wins: if incoming server data has newer or equal updatedAt, merge safely
        const serverUpdatedAt = initialData.updatedAt
          ? new Date(initialData.updatedAt as string | number | Date).getTime()
          : 0;
        const localUpdatedAt = existingDraft?.updatedAt
          ? new Date(existingDraft.updatedAt as string | number | Date).getTime()
          : 0;

        if (!existingDraft || serverUpdatedAt >= localUpdatedAt) {
          // If we have local dirty fields that have not been synced yet, preserve them!
          const pendingDirty = state.dirtyFields[draftId] || {};
          mergedDraft = normalizeDraftData({
            ...initialData,
            ...existingDraft,
            ...pendingDirty,
          });
        } else {
          mergedDraft = normalizeDraftData(mergedDraft);
        }
      } else {
        mergedDraft = normalizeDraftData(mergedDraft);
      }

      return {
        activeDraftId: draftId,
        drafts: {
          ...state.drafts,
          [draftId]: mergedDraft,
        },
        syncStatus: {
          ...state.syncStatus,
          [draftId]: state.syncStatus[draftId] || 'idle',
        },
      };
    });
  },

  getActiveDraft: () => {
    const { drafts, activeDraftId } = get();
    if (!activeDraftId) return null;
    return drafts[activeDraftId] || null;
  },

  getDraft: (draftId: string) => {
    const { drafts } = get();
    return drafts[draftId] || null;
  },

  getSyncStatus: (draftId?: string) => {
    const targetId = draftId || get().activeDraftId;
    if (!targetId) return 'idle';
    return get().syncStatus[targetId] || 'idle';
  },

  getLastSavedAt: (draftId?: string) => {
    const targetId = draftId || get().activeDraftId;
    if (!targetId) return null;
    return get().lastSavedAt[targetId] || null;
  },

  updateDraftField: (field, value, options) => {
    // CRITICAL GUARD: fundingGoalCents can ONLY be entered on Step 5 (Submit)
    if (field === 'fundingGoalCents' && !options?.fromSubmitStep) {
      throw new Error(
        'GUARD_VIOLATION: fundingGoalCents can ONLY be set from Step 5 (Submit). Any attempt to set it from earlier steps is prohibited.'
      );
    }

    const targetId = options?.draftId || get().activeDraftId;
    if (!targetId) {
      console.warn('updateDraftField called with no active draft ID');
      return;
    }

    const normalizedValue =
      field === 'creatorType' && typeof value === 'string'
        ? value.toLowerCase()
        : value;

    // 1. Immediate local state update
    set((state) => {
      const draft = state.drafts[targetId] || {};
      const updatedDraft: DraftModel = {
        ...draft,
        [field]: normalizedValue,
        updatedAt: new Date(),
      };

      const dirty = state.dirtyFields[targetId] || {};
      const updatedDirty = {
        ...dirty,
        [field]: normalizedValue,
      };

      const nextDrafts = { ...state.drafts, [targetId]: updatedDraft };
      const nextDirty = { ...state.dirtyFields, [targetId]: updatedDirty };

      // Persist to storage asynchronously
      persistDraftStore({
        drafts: nextDrafts,
        dirtyFields: nextDirty,
        syncedState: state.syncedState,
        syncStatus: state.syncStatus,
        lastSavedAt: state.lastSavedAt,
      });

      return {
        drafts: nextDrafts,
        dirtyFields: nextDirty,
      };
    });

    // 2. Schedule debounced autosave
    scheduleDebouncedAutosave(targetId, get);
  },

  updateDraftFields: (fields, options) => {
    // CRITICAL GUARD: fundingGoalCents check
    if (fields.fundingGoalCents !== undefined && !options?.fromSubmitStep) {
      throw new Error(
        'GUARD_VIOLATION: fundingGoalCents can ONLY be set from Step 5 (Submit). Any attempt to set it from earlier steps is prohibited.'
      );
    }

    const targetId = options?.draftId || get().activeDraftId;
    if (!targetId) {
      throw new Error('No active draft to update. Call setActiveDraft first.');
    }

    const normalizedFields = { ...fields };
    if (typeof normalizedFields.creatorType === 'string') {
      normalizedFields.creatorType = normalizedFields.creatorType.toLowerCase() as CreatorType;
    }

    set((state) => {
      const draft = state.drafts[targetId] || {};
      const updatedDraft: DraftModel = {
        ...draft,
        ...normalizedFields,
        updatedAt: new Date(),
      };

      const dirty = state.dirtyFields[targetId] || {};
      const updatedDirty = {
        ...dirty,
        ...normalizedFields,
      };

      const nextDrafts = { ...state.drafts, [targetId]: updatedDraft };
      const nextDirty = { ...state.dirtyFields, [targetId]: updatedDirty };

      persistDraftStore({
        drafts: nextDrafts,
        dirtyFields: nextDirty,
        syncedState: state.syncedState,
        syncStatus: state.syncStatus,
        lastSavedAt: state.lastSavedAt,
      });

      return {
        drafts: nextDrafts,
        dirtyFields: nextDirty,
      };
    });

    scheduleDebouncedAutosave(targetId, get);
  },

  saveDraftNow: async (draftId?: string): Promise<boolean> => {
    const targetId = draftId || get().activeDraftId;
    if (!targetId) return false;

    // Clear any pending debounced timer for this draft
    if (debounceTimers[targetId]) {
      clearTimeout(debounceTimers[targetId]!);
      debounceTimers[targetId] = null;
    }

    const { dirtyFields } = get();
    const payload = dirtyFields[targetId];

    // If there are no dirty fields, nothing to patch
    if (!payload || Object.keys(payload).length === 0) {
      set((state) => ({
        syncStatus: { ...state.syncStatus, [targetId]: 'saved' },
      }));
      return true;
    }

    // Set saving status
    set((state) => ({
      syncStatus: { ...state.syncStatus, [targetId]: 'saving' },
      lastError: { ...state.lastError, [targetId]: null },
    }));

    try {
      const res = await apiClient.patch<CampaignDetailDto>(
        `/campaigns/${targetId}/draft`,
        payload
      );

      // On successful autosave
      set((state) => {
        const remainingDirty = { ...(state.dirtyFields[targetId] || {}) };
        // Remove keys that were successfully saved
        for (const key of Object.keys(payload)) {
          if (remainingDirty[key as keyof DraftUpdateInput] === payload[key as keyof DraftUpdateInput]) {
            delete remainingDirty[key as keyof DraftUpdateInput];
          }
        }

        const nextDirty = {
          ...state.dirtyFields,
          [targetId]: remainingDirty,
        };

        const nextSynced = {
          ...state.syncedState,
          [targetId]: { ...(state.syncedState[targetId] || {}), ...payload },
        };

        const nextStatus = {
          ...state.syncStatus,
          [targetId]: 'saved' as SyncStatus,
        };

        const nextSavedAt = {
          ...state.lastSavedAt,
          [targetId]: Date.now(),
        };

        // If backend returned updated campaign, merge updated server fields
        const normalizedRes = res && typeof res === 'object'
          ? normalizeDraftData(res as DraftModel)
          : res;

        const updatedDraft: DraftModel = normalizeDraftData({
          ...(state.drafts[targetId] || {}),
          ...normalizedRes,
          ...remainingDirty, // Keep any very new edits typed during in-flight network call
        });

        persistDraftStore({
          drafts: { ...state.drafts, [targetId]: updatedDraft },
          dirtyFields: nextDirty,
          syncedState: nextSynced,
          syncStatus: nextStatus,
          lastSavedAt: nextSavedAt,
        });

        return {
          drafts: { ...state.drafts, [targetId]: updatedDraft },
          dirtyFields: nextDirty,
          syncedState: nextSynced,
          syncStatus: nextStatus,
          lastSavedAt: nextSavedAt,
        };
      });

      return true;
    } catch (err: unknown) {
      // Offline or network error: mark offline_pending so it syncs when network returns
      set((state) => {
        const nextStatus = {
          ...state.syncStatus,
          [targetId]: 'offline_pending' as SyncStatus,
        };
        const errorMsg = err instanceof Error ? err.message : 'Autosave failed';

        persistDraftStore({
          drafts: state.drafts,
          dirtyFields: state.dirtyFields,
          syncedState: state.syncedState,
          syncStatus: nextStatus,
          lastSavedAt: state.lastSavedAt,
        });

        return {
          syncStatus: nextStatus,
          lastError: { ...state.lastError, [targetId]: errorMsg },
        };
      });
      return false;
    }
  },

  syncOfflineDrafts: async () => {
    const { dirtyFields } = get();
    const pendingIds = Object.keys(dirtyFields).filter(
      (id) => Object.keys(dirtyFields[id] || {}).length > 0
    );

    for (const draftId of pendingIds) {
      await get().saveDraftNow(draftId);
    }
  },

  removeDraft: (draftId: string) => {
    if (debounceTimers[draftId]) {
      clearTimeout(debounceTimers[draftId]!);
      delete debounceTimers[draftId];
    }

    set((state) => {
      const nextDrafts = { ...state.drafts };
      delete nextDrafts[draftId];

      const nextDirty = { ...state.dirtyFields };
      delete nextDirty[draftId];

      const nextSynced = { ...state.syncedState };
      delete nextSynced[draftId];

      const nextStatus = { ...state.syncStatus };
      delete nextStatus[draftId];

      const nextSavedAt = { ...state.lastSavedAt };
      delete nextSavedAt[draftId];

      persistDraftStore({
        drafts: nextDrafts,
        dirtyFields: nextDirty,
        syncedState: nextSynced,
        syncStatus: nextStatus,
        lastSavedAt: nextSavedAt,
      });

      return {
        drafts: nextDrafts,
        dirtyFields: nextDirty,
        syncedState: nextSynced,
        syncStatus: nextStatus,
        lastSavedAt: nextSavedAt,
        activeDraftId: state.activeDraftId === draftId ? null : state.activeDraftId,
      };
    });
  },

  resetDirtyState: (draftId: string) => {
    if (debounceTimers[draftId]) {
      clearTimeout(debounceTimers[draftId]!);
      debounceTimers[draftId] = null;
    }

    set((state) => ({
      dirtyFields: { ...state.dirtyFields, [draftId]: {} },
      syncStatus: { ...state.syncStatus, [draftId]: 'saved' },
    }));
  },

  clearAllDrafts: async () => {
    // Clear all scheduled debounce timers
    Object.keys(debounceTimers).forEach((id) => {
      if (debounceTimers[id]) {
        clearTimeout(debounceTimers[id]!);
        debounceTimers[id] = null;
      }
    });

    set({
      drafts: {},
      dirtyFields: {},
      syncedState: {},
      activeDraftId: null,
      syncStatus: {},
      lastSavedAt: {},
      lastError: {},
      stepContinueHandler: null,
      isSubmitting: false,
    });

    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage cleanup error
    }
  },
}));

function scheduleDebouncedAutosave(draftId: string, get: () => DraftStoreState) {
  if (debounceTimers[draftId]) {
    clearTimeout(debounceTimers[draftId]!);
  }

  debounceTimers[draftId] = setTimeout(() => {
    debounceTimers[draftId] = null;
    get().saveDraftNow(draftId).catch(() => {});
  }, AUTOSAVE_DEBOUNCE_MS);
}

function persistDraftStore(data: {
  drafts: Record<string, DraftModel>;
  dirtyFields: Record<string, Partial<DraftUpdateInput>>;
  syncedState: Record<string, Partial<DraftUpdateInput>>;
  syncStatus: Record<string, SyncStatus>;
  lastSavedAt: Record<string, number>;
}) {
  try {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  } catch {
    // Ignore storage write error
  }
}

if (typeof window !== 'undefined') {
  (window as unknown as { __draftStore?: typeof useDraftStore }).__draftStore = useDraftStore;
}
