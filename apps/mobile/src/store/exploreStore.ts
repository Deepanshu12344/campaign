import { create } from 'zustand';
import {
  Category,
  CampaignSort,
  CampaignStatus,
  CreatorType,
  ProgressRange,
  GoalRange,
} from '@campaigns/shared';

export interface ExploreFilters {
  status?: CampaignStatus;
  progressRange?: ProgressRange;
  goalRange?: GoalRange;
  creatorType?: CreatorType;
}

export interface ExploreState {
  searchQuery: string;
  selectedCategory: Category | 'All';
  sort: CampaignSort;
  filters: ExploreFilters;
  isCompact: boolean;

  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: Category | 'All') => void;
  setSort: (sort: CampaignSort) => void;
  setFilters: (filters: ExploreFilters) => void;
  removeFilter: (key: keyof ExploreFilters) => void;
  clearAllFilters: () => void;
  resetExplore: () => void;
  toggleCompact: () => void;
}

const DEFAULT_FILTERS: ExploreFilters = {
  status: undefined,
  progressRange: undefined,
  goalRange: undefined,
  creatorType: undefined,
};

export const useExploreStore = create<ExploreState>((set) => ({
  searchQuery: '',
  selectedCategory: 'All',
  sort: 'trending',
  filters: { ...DEFAULT_FILTERS },
  isCompact: false,

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),

  setSort: (sort) => set({ sort }),

  setFilters: (filters) => set({ filters }),

  removeFilter: (key) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: undefined,
      },
    })),

  clearAllFilters: () =>
    set({
      filters: { ...DEFAULT_FILTERS },
    }),

  resetExplore: () =>
    set({
      searchQuery: '',
      selectedCategory: 'All',
      sort: 'trending',
      filters: { ...DEFAULT_FILTERS },
    }),

  toggleCompact: () => set((state) => ({ isCompact: !state.isCompact })),
}));
