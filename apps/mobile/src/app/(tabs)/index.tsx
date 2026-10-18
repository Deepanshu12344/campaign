import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
  Image as RNImage,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect } from 'react-native-svg';
import {
  ArrowUpRight,
  Pencil,
  ShieldCheck,
  Megaphone,
  Info,
  HelpCircle,
} from 'lucide-react-native';
import {
  CATEGORIES,
  Category,
  CampaignCardDto,
  quote,
} from '@campaigns/shared';
import { theme } from '../../theme';
import { Sheet } from '../../components/ui/Sheet';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { CampaignCard } from '../../components/campaign/CampaignCard';
import { useCampaigns, useFeatured } from '../../api/hooks/useCampaigns';
import { useEstimateConfig } from '../../api/hooks/useConfig';
import { useRequireAuth } from '../../auth/requireAuth';
import { HeaderAvatar } from '../../components/layout';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { requireAuth } = useRequireAuth();

  // State
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [disclaimerModalOpen, setDisclaimerModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Responsive dimensions for featured carousel
  const featuredCardWidth = Math.min(Math.round(windowWidth * 0.78), 300);
  const featuredSnapInterval = featuredCardWidth + 12;

  // Real API hooks
  useEstimateConfig();
  const {
    data: featuredCampaigns,
    isLoading: isFeaturedLoading,
    refetch: refetchFeatured,
  } = useFeatured();

  const {
    data: feedData,
    isLoading: isFeedLoading,
    isError: isFeedError,
    error: feedError,
    refetch: refetchFeed,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCampaigns({
    category: selectedCategory === 'All' ? undefined : selectedCategory,
  });

  // Dynamic reach quote for $1 estimate
  const illustrativeReach = useMemo(() => quote(100), []);

  const campaigns = useMemo(() => {
    return feedData?.pages.flatMap((page) => page.items) ?? [];
  }, [feedData]);

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchFeatured(), refetchFeed()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchFeatured, refetchFeed]);

  // Auth-gated creation
  const handleStartCampaign = useCallback(() => {
    requireAuth({
      reason: 'Sign in to create, draft, and launch an amplification campaign.',
      returnTo: '/(tabs)/create',
      onAuthenticated: () => {
        router.push('/(tabs)/create');
      },
    });
  }, [requireAuth, router]);

  // Back campaign handler
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

  // Render header component of the single FlatList
  const renderListHeader = useCallback(() => {
    return (
      <View style={styles.headerContainer}>
        {/* 1. Hero Card (~360dp high, 24dp radius, soothing nature photo) */}
        <View style={styles.heroWrap}>
          <View style={styles.heroCard}>
            <RNImage
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              source={require('../../../assets/images/hero-nature.jpg')}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
            {/* Dark green to black bottom gradient for text legibility over bottom half */}
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
              <Defs>
                <SvgGradient id="heroGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#121511" stopOpacity="0" />
                  <Stop offset="35%" stopColor="#121511" stopOpacity="0" />
                  <Stop offset="65%" stopColor="#121511" stopOpacity="0.65" />
                  <Stop offset="85%" stopColor="#121511" stopOpacity="0.9" />
                  <Stop offset="100%" stopColor="#121511" stopOpacity="0.98" />
                </SvgGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#heroGradient)" rx={24} />
            </Svg>

            <View style={styles.heroContent}>
              <Text style={styles.heroHeadline}>HELP MESSAGES TRAVEL FURTHER</Text>
              <Text style={styles.heroSupportingText}>
                People pool funds to run public ads for causes that matter.
              </Text>

              {/* Lime pill button (48dp height) */}
              <Pressable
                onPress={() => router.push('/(tabs)/explore')}
                accessibilityRole="button"
                accessibilityLabel="Explore campaigns"
                style={({ pressed }) => [
                  styles.explorePillBtn,
                  pressed && styles.explorePillBtnPressed,
                ]}
              >
                <Text style={styles.explorePillBtnText}>Explore campaigns</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* 2. Quiet note under hero: "Contributions pay for ads, not for the cause or creator." */}
        <Pressable
          onPress={() => setDisclaimerModalOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Read platform donation disclaimer"
          style={({ pressed }) => [
            styles.quietNoteContainer,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Info size={13} color={theme.colors.textSecondary} strokeWidth={2} />
          <Text style={styles.quietNoteText}>
            Contributions pay for ads, not for the cause or creator.
          </Text>
        </Pressable>

        {/* 3. Featured Section: horizontal snap carousel of photo cards */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Featured</Text>

          {isFeaturedLoading ? (
            <View style={styles.featuredLoadingRow}>
              <View style={[styles.featuredPlaceholder, { width: featuredCardWidth }]} />
              <View style={[styles.featuredPlaceholder, { width: featuredCardWidth }]} />
            </View>
          ) : featuredCampaigns && featuredCampaigns.length > 0 ? (
            <FlatList
              horizontal
              data={featuredCampaigns}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              snapToInterval={featuredSnapInterval}
              decelerationRate="fast"
              snapToAlignment="start"
              contentContainerStyle={styles.featuredCarouselContent}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => router.push(`/campaign/${item.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Featured: ${item.title}`}
                  style={({ pressed }) => [
                    styles.featuredCard,
                    { width: featuredCardWidth },
                    pressed && { transform: [{ scale: 0.98 }] },
                  ]}
                >
                  {item.coverUrl ? (
                    <Image
                      source={{ uri: item.coverUrl }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.surfaceRaised }]} />
                  )}

                  {/* Dark gradient overlay */}
                  <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                    <Defs>
                      <SvgGradient id={`featGrad-${item.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <Stop offset="0%" stopColor="#121511" stopOpacity="0.1" />
                        <Stop offset="45%" stopColor="#121511" stopOpacity="0.4" />
                        <Stop offset="100%" stopColor="#121511" stopOpacity="0.95" />
                      </SvgGradient>
                    </Defs>
                    <Rect width="100%" height="100%" fill={`url(#featGrad-${item.id})`} rx={20} />
                  </Svg>

                  <View style={styles.featuredCardBody}>
                    <View style={styles.featuredFooterRow}>
                      <Text style={[styles.featuredTitleText, { flex: 1, marginRight: 8, marginBottom: 0 }]} numberOfLines={2}>
                        {item.title}
                      </Text>
                      {/* Circular lime arrow button */}
                      <View style={styles.featuredArrowCircle}>
                        <ArrowUpRight size={16} color={theme.colors.onLime} strokeWidth={2.5} />
                      </View>
                    </View>
                  </View>
                </Pressable>
              )}
            />
          ) : null}
        </View>

        {/* 4. How It Works: single surface card with 3 compact rows */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>How it works</Text>
          <View style={styles.howCard}>
            {/* Row 1: Create */}
            <View style={styles.howRow}>
              <View style={styles.howIconCircle}>
                <Pencil size={16} color={theme.colors.lime} strokeWidth={2} />
              </View>
              <View style={styles.howTextContainer}>
                <Text style={styles.howRowTitle}>1. Create</Text>
                <Text style={styles.howRowBody}>Creators write a clear, sourced message.</Text>
              </View>
            </View>

            <View style={styles.howDivider} />

            {/* Row 2: Review */}
            <View style={styles.howRow}>
              <View style={styles.howIconCircle}>
                <ShieldCheck size={16} color={theme.colors.lime} strokeWidth={2} />
              </View>
              <View style={styles.howTextContainer}>
                <Text style={styles.howRowTitle}>2. Review</Text>
                <Text style={styles.howRowBody}>Content and sources are verified before launch.</Text>
              </View>
            </View>

            <View style={styles.howDivider} />

            {/* Row 3: Amplify */}
            <View style={styles.howRow}>
              <View style={styles.howIconCircle}>
                <Megaphone size={16} color={theme.colors.lime} strokeWidth={2} />
              </View>
              <View style={styles.howTextContainer}>
                <Text style={styles.howRowTitle}>3. Amplify</Text>
                <Text style={styles.howRowBody}>Backers pool funds to distribute ads to real audiences.</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 5. Campaigns Section: Title + Category pills row */}
        <View style={styles.feedHeaderWrap}>
          <Text style={styles.sectionTitle}>Campaigns</Text>
          <FlatList
            horizontal
            data={['All', ...CATEGORIES] as (Category | 'All')[]}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryPillsContent}
            renderItem={({ item }) => {
              const isSelected = selectedCategory === item;
              return (
                <Pressable
                  onPress={() => setSelectedCategory(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${item}`}
                  style={[
                    styles.categoryPill,
                    isSelected ? styles.categoryPillSelected : styles.categoryPillUnselected,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      isSelected ? styles.categoryPillTextSelected : styles.categoryPillTextUnselected,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    );
  }, [
    isFeaturedLoading,
    featuredCampaigns,
    featuredCardWidth,
    featuredSnapInterval,
    selectedCategory,
    router,
  ]);

  // Feed footer: loading more indicator
  const renderListFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerWrap}>
        <View style={styles.loadingMoreRow}>
          <ActivityIndicator size="small" color={theme.colors.lime} />
          <Text style={styles.loadingMoreText}>Loading more campaigns...</Text>
        </View>
      </View>
    );
  }, [isFetchingNextPage]);

  // Empty state
  const renderEmptyComponent = useCallback(() => {
    if (isFeedLoading) {
      return (
        <View style={styles.feedLoadingWrap}>
          <CampaignCard variant="skeleton" style={{ marginBottom: 16 }} />
          <CampaignCard variant="skeleton" style={{ marginBottom: 16 }} />
        </View>
      );
    }

    if (isFeedError) {
      return (
        <View style={styles.feedStateWrap}>
          <ErrorState
            title="Unable to load campaigns"
            message={feedError?.message || 'We encountered a problem fetching the feed.'}
            onRetry={refetchFeed}
            retryTitle="Reload"
          />
        </View>
      );
    }

    return (
      <View style={styles.feedStateWrap}>
        <EmptyState
          title={selectedCategory === 'All' ? 'No campaigns found' : `No ${selectedCategory} campaigns`}
          description={
            selectedCategory === 'All'
              ? 'There are currently no active campaigns in the feed.'
              : `There are no active campaigns under "${selectedCategory}" right now.`
          }
          actionTitle={selectedCategory !== 'All' ? 'Show all categories' : 'Start a Campaign'}
          onAction={
            selectedCategory !== 'All'
              ? () => setSelectedCategory('All')
              : handleStartCampaign
          }
          icon={<HelpCircle size={36} color={theme.colors.textSecondary} />}
        />
      </View>
    );
  }, [
    isFeedLoading,
    isFeedError,
    feedError,
    selectedCategory,
    refetchFeed,
    handleStartCampaign,
  ]);

  return (
    <View style={styles.screen}>
      {/* Sticky Top Header: pinned outside FlatList */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 12 : 8),
            borderBottomColor: isScrolled ? theme.colors.line : 'transparent',
            borderBottomWidth: 1,
          },
        ]}
      >
        <HeaderAvatar size={36} />

        <Pressable
          onPress={handleStartCampaign}
          accessibilityRole="button"
          accessibilityLabel="Start a campaign"
          style={({ pressed }) => [styles.startHeaderPill, pressed && styles.startHeaderPillPressed]}
        >
          <Text style={styles.startHeaderPillText}>Start a campaign</Text>
        </Pressable>
      </View>

      <FlatList
        data={campaigns}
        keyExtractor={(item) => item.id}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          const scrolled = y > 8;
          if (scrolled !== isScrolled) {
            setIsScrolled(scrolled);
          }
        }}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={styles.cardItemWrap}>
            <CampaignCard
              campaign={item}
              variant="default"
              onPress={() => router.push(`/campaign/${item.id}`)}
              onBackPress={() => handleBackCampaign(item)}
            />
          </View>
        )}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        ListEmptyComponent={renderEmptyComponent}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.lime]}
            tintColor={theme.colors.lime}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.flatListContent}
      />

      {/* Sheet: "Not a Donation" Disclaimer Modal */}
      <Sheet
        visible={disclaimerModalOpen}
        onClose={() => setDisclaimerModalOpen(false)}
        title="Amplify vs. Donate"
      >
        <View style={styles.modalBody}>
          <Text style={styles.modalHeadline}>Campaigns is NOT a donation platform.</Text>
          <Text style={styles.modalParagraph}>
            When you back a campaign, you are <Text style={styles.modalBold}>not giving money to the creator or a charity</Text>. 90% of your contribution strictly funds paid ad distribution across social feeds, search engines, and media.
          </Text>
          <Text style={styles.modalParagraph}>
            The remaining 10% platform fee covers independent human fact-checking, citation verification, compliance, and infrastructure.
          </Text>
          <View style={styles.estimateBox}>
            <Text style={styles.estimateBoxTitle}>Distribution Estimate</Text>
            <Text style={styles.estimateBoxText}>
              Contributions typically deliver about {illustrativeReach.estimatedReachLow}–{illustrativeReach.estimatedReachHigh} people reached per $1 (estimate, not a guarantee). Actual distribution depends on target audience, platform auction dynamics, and campaign timing.
            </Text>
          </View>
          <Button
            title="I Understand"
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => setDisclaimerModalOpen(false)}
            style={{ marginTop: 16 }}
          />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg, // #121511
  },
  flatListContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  headerContainer: {
    width: '100%',
  },

  // Top Bar: avatar left, compact lime pill right
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: theme.colors.bg,
    zIndex: 10,
  },
  avatarPressable: {
    borderRadius: 9999,
  },
  startHeaderPill: {
    backgroundColor: theme.colors.lime,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  startHeaderPillPressed: {
    backgroundColor: theme.colors.limePressed,
  },
  startHeaderPillText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.onLime,
  },

  // Hero Card (~360dp high, 24dp radius)
  heroWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 12,
  },
  heroCard: {
    height: 360,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.surface,
  },
  heroContent: {
    padding: 20,
    zIndex: 2,
  },
  heroHeadline: {
    fontFamily: theme.typography.fonts.display,
    fontSize: 26,
    lineHeight: 28,
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroSupportingText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  heroMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  heroMetricText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.lime,
  },
  explorePillBtn: {
    backgroundColor: theme.colors.lime,
    height: 48,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explorePillBtnPressed: {
    backgroundColor: theme.colors.limePressed,
  },
  explorePillBtnText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 15,
    color: theme.colors.onLime,
  },

  // Quiet note under hero
  quietNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  quietNoteText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.textSecondary,
    flex: 1,
  },

  // Section Wraps (24dp between sections)
  sectionWrap: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 20,
    lineHeight: 26,
    color: theme.colors.textPrimary,
    paddingHorizontal: 16,
    marginBottom: 14,
  },

  // Featured Carousel
  featuredLoadingRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  featuredPlaceholder: {
    height: 220,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
  },
  featuredCarouselContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  featuredCard: {
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.surface,
  },
  featuredCardBody: {
    padding: 16,
    zIndex: 2,
  },
  featuredCategoryText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  featuredTitleText: {
    fontFamily: theme.typography.fonts.display,
    fontSize: 16,
    lineHeight: 20,
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  featuredFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredProgressText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.lime,
  },
  featuredArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // How It Works Card
  howCard: {
    marginHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 20,
  },
  howRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  howIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  howTextContainer: {
    flex: 1,
  },
  howRowTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    lineHeight: 18,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  howRowBody: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  howDivider: {
    height: 1,
    backgroundColor: theme.colors.line,
    marginVertical: 14,
    marginLeft: 50,
  },

  // Feed Header & Category Pills
  feedHeaderWrap: {
    marginBottom: 16,
  },
  categoryPillsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPillSelected: {
    backgroundColor: theme.colors.lime,
  },
  categoryPillUnselected: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  categoryPillText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
  },
  categoryPillTextSelected: {
    color: theme.colors.onLime,
    fontFamily: theme.typography.fonts.uiSemiBold,
  },
  categoryPillTextUnselected: {
    color: theme.colors.textSecondary,
  },

  // Feed Items
  cardItemWrap: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  feedLoadingWrap: {
    paddingHorizontal: 16,
  },
  feedStateWrap: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },

  // Footer Wrap
  footerWrap: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  loadingMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  loadingMoreText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  // Modal styles
  modalBody: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  modalHeadline: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 18,
    lineHeight: 24,
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  modalParagraph: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  modalBold: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    color: theme.colors.textPrimary,
  },
  estimateBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  estimateBoxTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.lime,
    marginBottom: 4,
  },
  estimateBoxText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
});
