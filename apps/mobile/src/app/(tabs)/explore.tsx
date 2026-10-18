import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {
  Search,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  Check,
  Clock,
  Trash2,
  LayoutGrid,
  Rows3,
  HelpCircle,
  Sparkles,
} from 'lucide-react-native';
import {
  CATEGORIES,
  Category,
  CampaignCardDto,
  CampaignSort,
  CampaignStatus,
  CreatorType,
  ProgressRange,
  GoalRange,
} from '@campaigns/shared';
import { theme } from '../../theme';
import {
  Button,
  CategoryChip,
  ErrorState,
  EmptyState,
  Sheet,
} from '../../components/ui';
import { HeaderAvatar } from '../../components/layout';
import { CampaignCard } from '../../components/campaign/CampaignCard';
import { useCampaigns, useFeatured } from '../../api/hooks/useCampaigns';
import { useRequireAuth } from '../../auth/requireAuth';
import { useExploreStore, ExploreFilters } from '../../store/exploreStore';

const RECENT_SEARCHES_STORAGE_KEY = '@campaigns:recent_searches';
const MAX_RECENT_SEARCHES = 6;

const SORT_OPTIONS: { id: CampaignSort; label: string; description: string }[] = [
  { id: 'trending', label: 'Trending', description: 'High momentum and recent backer activity' },
  { id: 'newest', label: 'Newest', description: 'Most recently published campaigns' },
  { id: 'most_funded', label: 'Most funded', description: 'Highest total contribution amount' },
  { id: 'ending_soon', label: 'Ending soon', description: 'Campaigns closest to funding close date' },
  { id: 'closest_to_goal', label: 'Closest to goal', description: 'Campaigns nearest to 100% funding goal' },
];

const STATUS_OPTIONS: { id: CampaignStatus; label: string }[] = [
  { id: 'FUNDING', label: 'Funding' },
  { id: 'PROMOTING', label: 'Promoting' },
  { id: 'COMPLETED', label: 'Completed' },
];

const PROGRESS_OPTIONS: { id: ProgressRange; label: string }[] = [
  { id: 'under_25', label: 'Under 25%' },
  { id: '25_75', label: '25% to 75%' },
  { id: 'over_75', label: 'Over 75%' },
];

const GOAL_OPTIONS: { id: GoalRange; label: string }[] = [
  { id: 'under_1000', label: 'Under $1,000' },
  { id: '1000_5000', label: '$1,000 to $5,000' },
  { id: 'over_5000', label: 'Over $5,000' },
];

const CREATOR_TYPE_OPTIONS: { id: CreatorType; label: string }[] = [
  { id: 'individual', label: 'Individual' },
  { id: 'creator', label: 'Creator' },
  { id: 'nonprofit', label: 'Non-profit' },
  { id: 'community', label: 'Community' },
  { id: 'business', label: 'Business' },
];

const SUGGESTED_CATEGORIES: Category[] = ['Health', 'Environment', 'Community'];

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { requireAuth } = useRequireAuth();

  // Global persistent Explore store
  const {
    searchQuery,
    selectedCategory,
    sort,
    filters,
    isCompact,
    setSearchQuery,
    setSelectedCategory,
    setSort,
    setFilters,
    removeFilter,
    clearAllFilters,
    toggleCompact,
  } = useExploreStore();

  // Local state for debounced search and modals
  const [rawSearch, setRawSearch] = useState(searchQuery);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<ExploreFilters>({ ...filters });

  // Sync draft filters when opening filter sheet
  useEffect(() => {
    if (isFilterSheetOpen) {
      setDraftFilters({ ...filters });
    }
  }, [isFilterSheetOpen, filters]);

  // Load recent searches from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(RECENT_SEARCHES_STORAGE_KEY)
      .then((val) => {
        if (val) {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) {
              setRecentSearches(parsed.slice(0, MAX_RECENT_SEARCHES));
            }
          } catch {
            // ignore JSON parse error
          }
        }
      })
      .catch(() => {});
  }, []);

  // Save recent search helper
  const addRecentSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const updated = [trimmed, ...prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(
        0,
        MAX_RECENT_SEARCHES
      );
      AsyncStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const removeRecentSearch = useCallback((term: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item !== term);
      AsyncStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const clearAllRecentSearches = useCallback(() => {
    setRecentSearches([]);
    AsyncStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY).catch(() => {});
  }, []);

  // 300ms Debounce search input
  useEffect(() => {
    if (rawSearch !== searchQuery) {
      setIsDebouncing(true);
      const timer = setTimeout(() => {
        setSearchQuery(rawSearch);
        setIsDebouncing(false);
        if (rawSearch.trim().length > 1) {
          addRecentSearch(rawSearch.trim());
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setIsDebouncing(false);
    }
  }, [rawSearch, searchQuery, setSearchQuery, addRecentSearch]);

  // Keep rawSearch in sync with store (e.g. if cleared from outside)
  useEffect(() => {
    setRawSearch(searchQuery);
  }, [searchQuery]);

  // Count active filters (excluding category, since category has its own row)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status) count++;
    if (filters.progressRange) count++;
    if (filters.goalRange) count++;
    if (filters.creatorType) count++;
    return count;
  }, [filters]);

  const hasAnyFilter = useMemo(() => {
    return activeFilterCount > 0 || selectedCategory !== 'All' || Boolean(searchQuery.trim());
  }, [activeFilterCount, selectedCategory, searchQuery]);

  // Server-side query parameters
  const queryParams = useMemo(() => {
    return {
      search: searchQuery.trim() || undefined,
      category: selectedCategory === 'All' ? undefined : selectedCategory,
      sort,
      status: filters.status,
      progressRange: filters.progressRange,
      goalRange: filters.goalRange,
      creatorType: filters.creatorType,
    };
  }, [searchQuery, selectedCategory, sort, filters]);

  // Feed query
  const {
    data: feedData,
    isLoading: isFeedLoading,
    isError: isFeedError,
    error: feedError,
    refetch: refetchFeed,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCampaigns(queryParams);

  // Live preview query for filter sheet Apply button count
  const previewParams = useMemo(() => {
    return {
      search: searchQuery.trim() || undefined,
      category: selectedCategory === 'All' ? undefined : selectedCategory,
      status: draftFilters.status,
      progressRange: draftFilters.progressRange,
      goalRange: draftFilters.goalRange,
      creatorType: draftFilters.creatorType,
      limit: 1,
    };
  }, [searchQuery, selectedCategory, draftFilters]);

  const { data: previewData, isFetching: isPreviewFetching } = useCampaigns(previewParams);

  // Featured campaigns query (shown only when no search, no filters, All category)
  const showFeaturedStrip = useMemo(() => {
    return !hasAnyFilter;
  }, [hasAnyFilter]);

  const { data: featuredCampaigns, isLoading: isFeaturedLoading } = useFeatured();

  // Flattened campaigns
  const campaigns = useMemo(() => {
    return feedData?.pages.flatMap((page) => page.items) ?? [];
  }, [feedData]);

  const totalCampaigns = feedData?.pages[0]?.total ?? 0;
  const categoryCounts = feedData?.pages[0]?.categoryCounts ?? {};

  // Actions
  const handleSelectRecentSearch = useCallback(
    (term: string) => {
      setRawSearch(term);
      setSearchQuery(term);
      setIsSearchFocused(false);
      Keyboard.dismiss();
      addRecentSearch(term);
    },
    [setSearchQuery, addRecentSearch]
  );

  const handleClearSearch = useCallback(() => {
    setRawSearch('');
    setSearchQuery('');
  }, [setSearchQuery]);

  const handleSelectSort = useCallback(
    (newSort: CampaignSort) => {
      Haptics.selectionAsync().catch(() => {});
      setSort(newSort);
      setIsSortSheetOpen(false);
    },
    [setSort]
  );

  const handleApplyFilters = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setFilters(draftFilters);
    setIsFilterSheetOpen(false);
  }, [draftFilters, setFilters]);

  const handleClearDraftFilters = useCallback(() => {
    setDraftFilters({
      status: undefined,
      progressRange: undefined,
      goalRange: undefined,
      creatorType: undefined,
    });
  }, []);

  const handleResetAll = useCallback(() => {
    setRawSearch('');
    setSearchQuery('');
    setSelectedCategory('All');
    setSort('trending');
    clearAllFilters();
  }, [setSearchQuery, setSelectedCategory, setSort, clearAllFilters]);

  const handleStartCampaign = useCallback(() => {
    requireAuth({
      reason: 'Sign in to create, draft, and launch an amplification campaign.',
      returnTo: '/(tabs)/create',
      onAuthenticated: () => {
        router.push('/(tabs)/create');
      },
    });
  }, [requireAuth, router]);

  const handleBackCampaign = useCallback(
    (campaign: CampaignCardDto) => {
      if (campaign.status === 'FUNDING') {
        router.push(`/back/${campaign.id}/amount`);
      } else {
        router.push(`/campaign/${campaign.id}`);
      }
    },
    [router]
  );

  // Render Header of the Feed FlatList
  const renderListHeader = useCallback(() => {
    return (
      <View style={styles.headerWrap}>
        {/* Category Chips Bar */}
        <FlatList
          horizontal
          data={['All', ...CATEGORIES] as (Category | 'All')[]}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryChipsContent}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item;
            const count = item === 'All' ? totalCampaigns : categoryCounts[item] ?? 0;
            return (
              <CategoryChip
                category={item}
                selected={isSelected}
                count={count}
                showIcon={false}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setSelectedCategory(item);
                }}
                style={styles.categoryChipItem}
              />
            );
          }}
        />



        {/* Results Controls Strip */}
        <View style={styles.controlsStrip}>
          <Text style={styles.resultsCountText}>
            {totalCampaigns} {totalCampaigns === 1 ? 'campaign' : 'campaigns'}
          </Text>

          <View style={styles.controlsButtonsRow}>
            {/* Sort Control */}
            <Pressable
              onPress={() => setIsSortSheetOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`Sort: currently ${SORT_OPTIONS.find((s) => s.id === sort)?.label}`}
              style={({ pressed }) => [
                styles.controlBtn,
                pressed && { opacity: 0.8 },
              ]}
            >
              <ArrowUpDown size={14} color={theme.colors.textSecondary} />
              <Text style={styles.controlBtnText}>
                {SORT_OPTIONS.find((s) => s.id === sort)?.label}
              </Text>
            </Pressable>

            {/* Filter Control */}
            <Pressable
              onPress={() => setIsFilterSheetOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`Filter: ${activeFilterCount} active filters`}
              style={({ pressed }) => [
                styles.controlBtn,
                activeFilterCount > 0 && styles.controlBtnActive,
                pressed && { opacity: 0.8 },
              ]}
            >
              <SlidersHorizontal
                size={14}
                color={activeFilterCount > 0 ? theme.colors.lime : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.controlBtnText,
                  activeFilterCount > 0 && styles.controlBtnTextActive,
                ]}
              >
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </Text>
            </Pressable>

            {/* Compact Toggle */}
            <Pressable
              onPress={toggleCompact}
              accessibilityRole="button"
              accessibilityLabel={`Switch to ${isCompact ? 'expanded' : 'compact'} card view`}
              style={({ pressed }) => [
                styles.iconControlBtn,
                pressed && { opacity: 0.8 },
              ]}
            >
              {isCompact ? (
                <Rows3 size={16} color={theme.colors.lime} />
              ) : (
                <LayoutGrid size={16} color={theme.colors.textSecondary} />
              )}
            </Pressable>
          </View>
        </View>

        {/* Removable Active Filter Chips */}
        {hasAnyFilter && (
          <View style={styles.activeFiltersRow}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[
                ...(selectedCategory !== 'All' ? [{ key: 'category', label: `Category: ${selectedCategory}` }] : []),
                ...(filters.status
                  ? [
                      {
                        key: 'status',
                        label: `Status: ${STATUS_OPTIONS.find((s) => s.id === filters.status)?.label}`,
                      },
                    ]
                  : []),
                ...(filters.progressRange
                  ? [
                      {
                        key: 'progressRange',
                        label: `Progress: ${PROGRESS_OPTIONS.find((p) => p.id === filters.progressRange)?.label}`,
                      },
                    ]
                  : []),
                ...(filters.goalRange
                  ? [
                      {
                        key: 'goalRange',
                        label: `Goal: ${GOAL_OPTIONS.find((g) => g.id === filters.goalRange)?.label}`,
                      },
                    ]
                  : []),
                ...(filters.creatorType
                  ? [
                      {
                        key: 'creatorType',
                        label: `Creator: ${CREATOR_TYPE_OPTIONS.find((c) => c.id === filters.creatorType)?.label}`,
                      },
                    ]
                  : []),
              ]}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    if (item.key === 'category') {
                      setSelectedCategory('All');
                    } else {
                      removeFilter(item.key as keyof ExploreFilters);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove filter ${item.label}`}
                  style={styles.activeFilterChip}
                >
                  <Text style={styles.activeFilterChipText}>{item.label}</Text>
                  <View style={styles.activeFilterChipRemoveIcon}>
                    <X size={12} color={theme.colors.textSecondary} />
                  </View>
                </Pressable>
              )}
              ListFooterComponent={
                <Pressable
                  onPress={handleResetAll}
                  accessibilityRole="button"
                  accessibilityLabel="Clear all search and filters"
                  style={styles.clearAllFiltersBtn}
                >
                  <Text style={styles.clearAllFiltersBtnText}>Clear all</Text>
                </Pressable>
              }
            />
          </View>
        )}
      </View>
    );
  }, [
    selectedCategory,
    totalCampaigns,
    categoryCounts,
    showFeaturedStrip,
    isFeaturedLoading,
    featuredCampaigns,
    sort,
    activeFilterCount,
    isCompact,
    hasAnyFilter,
    filters,
    windowWidth,
    setSelectedCategory,
    toggleCompact,
    handleResetAll,
    removeFilter,
    handleBackCampaign,
    router,
  ]);

  // Render Empty State
  const renderEmptyComponent = useCallback(() => {
    if (isFeedLoading) {
      return (
        <View style={styles.emptyWrap}>
          <CampaignCard variant={isCompact ? 'compact' : 'skeleton'} style={styles.skeletonItem} />
          <CampaignCard variant={isCompact ? 'compact' : 'skeleton'} style={styles.skeletonItem} />
        </View>
      );
    }

    if (isFeedError) {
      return (
        <View style={styles.emptyWrap}>
          <ErrorState
            title="Failed to load campaigns"
            message={feedError?.message || 'We could not reach the campaign directory.'}
            onRetry={refetchFeed}
            retryTitle="Retry"
          />
        </View>
      );
    }

    // Distinguish between category empty and search/filter no-results
    if (searchQuery.trim() || activeFilterCount > 0) {
      return (
        <View style={styles.noResultsContainer}>
          <EmptyState
            title={searchQuery.trim() ? `No results for "${searchQuery}"` : 'No campaigns match your filters'}
            description="Try broadening your search term or clearing some filters to explore more causes."
            actionTitle="Clear filters"
            onAction={handleResetAll}
            icon={<HelpCircle size={38} color={theme.colors.textSecondary} />}
          />

          <View style={styles.suggestionsSection}>
            <Text style={styles.suggestionsTitle}>Or explore these popular topics:</Text>
            <View style={styles.suggestionsChipsRow}>
              {SUGGESTED_CATEGORIES.map((cat) => (
                <CategoryChip
                  key={cat}
                  category={cat}
                  showIcon={false}
                  onPress={() => {
                    handleClearSearch();
                    setSelectedCategory(cat);
                  }}
                  style={styles.suggestionChip}
                />
              ))}
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.emptyWrap}>
        <EmptyState
          title="Nothing here yet"
          description={`There are currently no active public campaigns in "${selectedCategory}". Be the first to start an amplification message!`}
          actionTitle="Start a Campaign"
          onAction={handleStartCampaign}
          icon={<Sparkles size={38} color={theme.colors.lime} />}
        />
      </View>
    );
  }, [
    isFeedLoading,
    isFeedError,
    feedError,
    searchQuery,
    activeFilterCount,
    selectedCategory,
    isCompact,
    refetchFeed,
    handleResetAll,
    handleClearSearch,
    setSelectedCategory,
    handleStartCampaign,
  ]);

  return (
    <View style={styles.container}>
      {/* 1. Sticky Search Bar Container */}
      <View
        style={[
          styles.stickySearchBarContainer,
          { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 12 : 8) },
        ]}
      >
        <View style={styles.searchBarHeaderRow}>
          <HeaderAvatar size={36} />
          <View style={styles.searchInputRow}>
            <View style={styles.searchIconWrap}>
              <Search size={18} color={theme.colors.textSecondary} />
            </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Search campaigns, causes, stories..."
            placeholderTextColor={theme.colors.textSecondary}
            value={rawSearch}
            onChangeText={setRawSearch}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => {
              // Delay slightly so press events on recent searches register
              setTimeout(() => setIsSearchFocused(false), 200);
            }}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (rawSearch.trim()) {
                addRecentSearch(rawSearch.trim());
              }
              Keyboard.dismiss();
            }}
            accessibilityLabel="Search campaigns"
          />

          {/* Activity indicator when searching / debouncing */}
          {(isDebouncing || isFeedLoading) && (
            <View style={styles.searchIndicatorWrap}>
              <ActivityIndicator size="small" color={theme.colors.lime} />
            </View>
          )}

          {/* Clear button */}
          {rawSearch.length > 0 && (
            <Pressable
              onPress={handleClearSearch}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear search input"
              style={styles.clearSearchBtn}
            >
              <X size={16} color={theme.colors.textSecondary} />
            </Pressable>
          )}
          </View>
        </View>

        {/* Recent Searches Overlay / Dropdown */}
        {isSearchFocused && rawSearch.trim() === '' && recentSearches.length > 0 && (
          <View style={styles.recentSearchesDropdown}>
            <View style={styles.recentSearchesHeader}>
              <Text style={styles.recentSearchesTitle}>Recent Searches</Text>
              <Pressable
                onPress={clearAllRecentSearches}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Clear all recent searches"
              >
                <Text style={styles.clearRecentText}>Clear</Text>
              </Pressable>
            </View>

            {recentSearches.map((term) => (
              <View key={term} style={styles.recentSearchItem}>
                <Pressable
                  onPress={() => handleSelectRecentSearch(term)}
                  style={styles.recentSearchItemPressable}
                  accessibilityRole="button"
                  accessibilityLabel={`Search ${term}`}
                >
                  <Clock size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.recentSearchItemText} numberOfLines={1}>
                    {term}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => removeRecentSearch(term)}
                  hitSlop={8}
                  style={styles.removeRecentItemBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${term} from recent searches`}
                >
                  <Trash2 size={13} color={theme.colors.textSecondary} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Primary Results FlatList */}
      <FlatList
        data={campaigns}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.feedItemContainer}>
            <CampaignCard
              campaign={item}
              variant={isCompact ? 'compact' : 'default'}
              onPress={() => router.push(`/campaign/${item.id}`)}
              onBackPress={() => handleBackCampaign(item)}
            />
          </View>
        )}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmptyComponent}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerWrap}>
              <View style={styles.nextPageLoading}>
                <ActivityIndicator size="small" color={theme.colors.lime} />
                <Text style={styles.nextPageLoadingText}>Loading more campaigns...</Text>
              </View>
            </View>
          ) : null
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.flatListContent}
      />

      {/* 4. Sort Bottom Sheet */}
      <Sheet visible={isSortSheetOpen} onClose={() => setIsSortSheetOpen(false)} title="Sort Campaigns">
        <View style={styles.sheetBody}>
          {SORT_OPTIONS.map((opt) => {
            const isSelected = sort === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => handleSelectSort(opt.id)}
                accessibilityRole="button"
                accessibilityLabel={`Sort by ${opt.label}`}
                style={({ pressed }) => [
                  styles.sheetOptionRow,
                  isSelected && styles.sheetOptionRowSelected,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View style={styles.sheetOptionTextWrap}>
                  <Text style={[styles.sheetOptionTitle, isSelected && styles.sheetOptionTitleSelected]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.sheetOptionDescription}>{opt.description}</Text>
                </View>

                {isSelected && (
                  <View style={styles.sheetOptionCheckWrap}>
                    <Check size={18} color={theme.colors.lime} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      {/* 5. Filter Bottom Sheet */}
      <Sheet visible={isFilterSheetOpen} onClose={() => setIsFilterSheetOpen(false)} title="Filter Campaigns">
        <View style={styles.sheetBody}>
          {/* Header Action: Clear all */}
          <View style={styles.filterSheetTopRow}>
            <Text style={styles.filterSheetSubtitle}>Refine campaigns by lifecycle, goal size, and backer progress</Text>
            <Pressable
              onPress={handleClearDraftFilters}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear all draft filter selections"
            >
              <Text style={styles.filterClearAllText}>Reset</Text>
            </Pressable>
          </View>

          {/* Section: Status */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupTitle}>Campaign Status</Text>
            <View style={styles.filterPillsRow}>
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = draftFilters.status === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setDraftFilters((prev) => ({
                        ...prev,
                        status: isSelected ? undefined : opt.id,
                      }));
                    }}
                    style={[styles.filterPill, isSelected && styles.filterPillSelected]}
                  >
                    <Text style={[styles.filterPillText, isSelected && styles.filterPillTextSelected]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Section: Funding Progress */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupTitle}>Funding Progress</Text>
            <View style={styles.filterPillsRow}>
              {PROGRESS_OPTIONS.map((opt) => {
                const isSelected = draftFilters.progressRange === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setDraftFilters((prev) => ({
                        ...prev,
                        progressRange: isSelected ? undefined : opt.id,
                      }));
                    }}
                    style={[styles.filterPill, isSelected && styles.filterPillSelected]}
                  >
                    <Text style={[styles.filterPillText, isSelected && styles.filterPillTextSelected]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Section: Funding Goal */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupTitle}>Goal Size</Text>
            <View style={styles.filterPillsRow}>
              {GOAL_OPTIONS.map((opt) => {
                const isSelected = draftFilters.goalRange === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setDraftFilters((prev) => ({
                        ...prev,
                        goalRange: isSelected ? undefined : opt.id,
                      }));
                    }}
                    style={[styles.filterPill, isSelected && styles.filterPillSelected]}
                  >
                    <Text style={[styles.filterPillText, isSelected && styles.filterPillTextSelected]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Section: Creator Type */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupTitle}>Creator Type</Text>
            <View style={styles.filterPillsRow}>
              {CREATOR_TYPE_OPTIONS.map((opt) => {
                const isSelected = draftFilters.creatorType === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setDraftFilters((prev) => ({
                        ...prev,
                        creatorType: isSelected ? undefined : opt.id,
                      }));
                    }}
                    style={[styles.filterPill, isSelected && styles.filterPillSelected]}
                  >
                    <Text style={[styles.filterPillText, isSelected && styles.filterPillTextSelected]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Apply Button */}
          <View style={styles.filterSheetFooter}>
            <Button
              title={
                isPreviewFetching
                  ? 'Updating...'
                  : `Show ${previewData?.pages[0]?.total ?? 0} ${(previewData?.pages[0]?.total ?? 0) === 1 ? 'campaign' : 'campaigns'}`
              }
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleApplyFilters}
            />
          </View>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  flatListContent: {
    flexGrow: 1,
  },

  // Sticky Search Bar
  stickySearchBarContainer: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
    zIndex: 10,
  },
  searchBarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.line,
    height: 48,
    paddingHorizontal: theme.spacing.md,
  },
  searchIconWrap: {
    marginRight: theme.spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 15,
    color: theme.colors.textPrimary,
    height: '100%',
    padding: 0,
  },
  searchIndicatorWrap: {
    marginRight: 6,
  },
  clearSearchBtn: {
    padding: 6,
  },

  // Recent Searches Dropdown
  recentSearchesDropdown: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: theme.spacing.sm,
    ...theme.shadows.card,
  },
  recentSearchesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  recentSearchesTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearRecentText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.lime,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.xs,
  },
  recentSearchItemPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recentSearchItemText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  removeRecentItemBtn: {
    padding: 6,
  },

  // Header components
  headerWrap: {
    paddingTop: theme.spacing.sm,
  },
  categoryChipsContent: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: theme.spacing.sm,
  },
  categoryChipItem: {
    marginRight: theme.spacing.sm,
  },

  // Featured Strip (kept for layout consistency if needed)
  featuredSection: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  featuredHeaderRow: {
    paddingHorizontal: theme.spacing.base,
    marginBottom: theme.spacing.sm,
  },
  featuredTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featuredSectionTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 17,
    color: theme.colors.textPrimary,
  },
  featuredSectionSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  featuredContent: {
    paddingHorizontal: theme.spacing.base,
  },
  featuredLoadingRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.base,
  },

  // Controls Strip
  controlsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
  },
  resultsCountText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  controlsButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 11,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  controlBtnActive: {
    backgroundColor: theme.colors.tintedPillBg,
    borderColor: '#234F02',
  },
  controlBtnText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  controlBtnTextActive: {
    color: theme.colors.lime,
    fontFamily: theme.typography.fonts.uiSemiBold,
  },
  iconControlBtn: {
    padding: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },

  // Removable Active Filter Chips
  activeFiltersRow: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: theme.spacing.sm,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingVertical: 5,
    paddingLeft: 12,
    paddingRight: 8,
    marginRight: 6,
  },
  activeFilterChipText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.textPrimary,
    marginRight: 6,
  },
  activeFilterChipRemoveIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearAllFiltersBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  clearAllFiltersBtnText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    color: theme.colors.lime,
  },

  // Feed items
  feedItemContainer: {
    paddingHorizontal: theme.spacing.base,
    marginBottom: theme.spacing.base,
  },
  skeletonItem: {
    marginBottom: theme.spacing.base,
  },
  emptyWrap: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xl,
  },
  nextPageLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: theme.spacing.md,
  },
  nextPageLoadingText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },

  // No results state
  noResultsContainer: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.lg,
  },
  suggestionsSection: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    alignItems: 'center',
  },
  suggestionsTitle: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  suggestionsChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  suggestionChip: {
    marginRight: 0,
  },

  // Bottom Sheets Body
  sheetBody: {
    paddingVertical: theme.spacing.xs,
  },
  sheetOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  sheetOptionRowSelected: {
    backgroundColor: theme.colors.surfaceRaised,
  },
  sheetOptionTextWrap: {
    flex: 1,
  },
  sheetOptionTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  sheetOptionTitleSelected: {
    color: theme.colors.lime,
  },
  sheetOptionDescription: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  sheetOptionCheckWrap: {
    marginLeft: theme.spacing.sm,
  },

  // Filter Sheet
  filterSheetTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    marginBottom: theme.spacing.md,
  },
  filterSheetSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  filterClearAllText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.lime,
  },
  filterGroup: {
    paddingHorizontal: theme.spacing.base,
    marginBottom: theme.spacing.md,
  },
  filterGroupTitle: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  filterPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterPill: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  filterPillSelected: {
    backgroundColor: theme.colors.tintedPillBg,
    borderColor: '#234F02',
  },
  filterPillText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  filterPillTextSelected: {
    color: theme.colors.lime,
    fontFamily: theme.typography.fonts.uiSemiBold,
  },
  filterSheetFooter: {
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },

  // Footer & Demo label
  footerWrap: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  demoLabelText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
});
