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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect } from 'react-native-svg';
import {
  Compass,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Megaphone,
  Pencil,
  Info,
  ChevronRight,
  HelpCircle,
} from 'lucide-react-native';
import {
  CATEGORIES,
  Category,
  CampaignCardDto,
  quote,
} from '@campaigns/shared';
import { theme } from '../../theme';
import {
  Button,
  CategoryChip,
  DemoDataBadge,
  ErrorState,
  EmptyState,
  Sheet,
} from '../../components/ui';
import { CampaignCard } from '../../components/campaign/CampaignCard';
import { useCampaigns, useFeatured } from '../../api/hooks/useCampaigns';
import { useEstimateConfig } from '../../api/hooks/useConfig';
import { useRequireAuth } from '../../auth/requireAuth';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { requireAuth } = useRequireAuth();

  // State
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [disclaimerModalOpen, setDisclaimerModalOpen] = useState(false);
  const [reachInfoModalOpen, setReachInfoModalOpen] = useState(false);

  // Responsive carousel dimensions: visible peek of next card
  const carouselCardWidth = Math.min(Math.round(windowWidth * 0.84), 340);
  const carouselSnapInterval = carouselCardWidth + theme.spacing.base;

  // Real API hooks
  useEstimateConfig(); // warms cache for estimates
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

  // Dynamic illustrative reach per $1 from shared reach math
  const illustrativeReach = useMemo(() => {
    return quote(100); // 100 cents = $1.00
  }, []);

  // Flattened campaigns across pages
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

  // Handle card primary action
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
        {/* Top App Branding Bar */}
        <View style={[styles.brandingBar, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 12 : 8) }]}>
          <View style={styles.brandTitleRow}>
            <View style={styles.brandIconCircle}>
              <Megaphone size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.brandTitle}>Campaigns</Text>
          </View>
          <DemoDataBadge size="sm" />
        </View>

        {/* 1. Hero Section (Calm indigo gradient) */}
        <View style={styles.heroOuter}>
          <View style={styles.heroCard}>
            <Svg style={StyleSheet.absoluteFill}>
              <Defs>
                <SvgGradient id="heroGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#312E81" />
                  <Stop offset="50%" stopColor="#3730A3" />
                  <Stop offset="100%" stopColor="#4338CA" />
                </SvgGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#heroGradient)" rx={theme.radius.sheet} />
            </Svg>

            <View style={styles.heroContent}>
              <View style={styles.heroBadgeRow}>
                <View style={styles.heroSubBadge}>
                  <Sparkles size={13} color="#C7D2FE" />
                  <Text style={styles.heroSubBadgeText}>Community-Funded Message Amplification</Text>
                </View>
              </View>

              <Text style={styles.heroHeadline}>
                Help important messages travel further.
              </Text>

              <Text style={styles.heroDescription}>
                Backers pool funds to distribute high-impact, verified public-interest ads across social and search networks.
              </Text>

              {/* Action Buttons */}
              <View style={styles.heroActionsRow}>
                <Button
                  title="Explore Campaigns"
                  variant="secondary"
                  size="md"
                  iconLeft={<Compass size={17} color={theme.colors.primary700} />}
                  onPress={() => router.push('/(tabs)/explore')}
                  style={styles.heroPrimaryBtn}
                  textStyle={styles.heroPrimaryBtnText}
                />

                <Button
                  title="Start a Campaign"
                  variant="ghost"
                  size="md"
                  onPress={handleStartCampaign}
                  style={styles.heroSecondaryBtn}
                  textStyle={styles.heroSecondaryBtnText}
                />
              </View>

              {/* Illustrative Reach per $1 Card */}
              <View style={styles.reachEstimateCard}>
                <View style={styles.reachCardHeader}>
                  <View style={styles.reachCardTitleRow}>
                    <Text style={styles.reachCardTitle}>Illustrative reach per $1</Text>
                    <Pressable
                      onPress={() => setReachInfoModalOpen(true)}
                      hitSlop={12}
                      accessibilityRole="button"
                      accessibilityLabel="Reach calculation explanation"
                      style={styles.infoTipBtn}
                    >
                      <Info size={14} color="#C7D2FE" />
                    </Pressable>
                  </View>
                  <DemoDataBadge size="sm" />
                </View>

                <View style={styles.reachCardBody}>
                  <Text style={styles.reachRangeText}>
                    ~{illustrativeReach.estimatedReachLow.toLocaleString()}–{illustrativeReach.estimatedReachHigh.toLocaleString()} people
                  </Text>
                  <Text style={styles.reachSubtext}>
                    Estimated unique audience reached per $1 backed, based on demo CPM and frequency.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 2. Disclaimer Chip */}
        <Pressable
          onPress={() => setDisclaimerModalOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Read platform donation disclaimer"
          style={({ pressed }) => [
            styles.disclaimerContainer,
            pressed && styles.disclaimerPressed,
          ]}
        >
          <View style={styles.disclaimerContent}>
            <View style={styles.disclaimerIconWrap}>
              <Info size={15} color={theme.colors.primary600} />
            </View>
            <Text style={styles.disclaimerText} numberOfLines={2}>
              Contributions fund ad distribution, not the cause or creator.
            </Text>
            <ChevronRight size={16} color={theme.colors.ink400} />
          </View>
        </Pressable>

        {/* 3. Featured Campaigns Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Featured Campaigns</Text>
              <Text style={styles.sectionSubtitle}>Curated public-interest messages ready to scale</Text>
            </View>
          </View>

          {isFeaturedLoading ? (
            <View style={styles.carouselLoadingRow}>
              <View style={{ width: carouselCardWidth, marginRight: theme.spacing.base }}>
                <CampaignCard variant="skeleton" />
              </View>
              <View style={{ width: carouselCardWidth, marginRight: theme.spacing.base }}>
                <CampaignCard variant="skeleton" />
              </View>
            </View>
          ) : featuredCampaigns && featuredCampaigns.length > 0 ? (
            <FlatList
              horizontal
              data={featuredCampaigns}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              snapToInterval={carouselSnapInterval}
              decelerationRate="fast"
              snapToAlignment="start"
              contentContainerStyle={styles.carouselContent}
              renderItem={({ item }) => (
                <View style={{ width: carouselCardWidth, marginRight: theme.spacing.base }}>
                  <CampaignCard
                    campaign={item}
                    variant="featured"
                    onPress={() => router.push(`/campaign/${item.id}`)}
                    onBackPress={() => handleBackCampaign(item)}
                  />
                </View>
              )}
            />
          ) : (
            <View style={styles.emptyFeaturedWrap}>
              <Text style={styles.emptySectionText}>No featured campaigns available right now.</Text>
            </View>
          )}
        </View>

        {/* 4. How It Works Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>How It Works</Text>
              <Text style={styles.sectionSubtitle}>A transparent 3-step amplification cycle</Text>
            </View>
          </View>

          <View style={styles.howItWorksCard}>
            {/* Step 1: Create */}
            <View style={styles.howStepRow}>
              <View style={[styles.howStepIconWrap, { backgroundColor: theme.colors.primary50 }]}>
                <Pencil size={18} color={theme.colors.primary600} />
              </View>
              <View style={styles.howStepTextWrap}>
                <Text style={styles.howStepTitle}>1. Create</Text>
                <Text style={styles.howStepBody}>Creators write a clear, sourced message.</Text>
              </View>
            </View>

            <View style={styles.howStepDivider} />

            {/* Step 2: Review */}
            <View style={styles.howStepRow}>
              <View style={[styles.howStepIconWrap, { backgroundColor: theme.colors.infoBg }]}>
                <ShieldCheck size={18} color={theme.colors.info} />
              </View>
              <View style={styles.howStepTextWrap}>
                <Text style={styles.howStepTitle}>2. Review</Text>
                <Text style={styles.howStepBody}>
                  We check content, sources and targeting before anything goes live.
                </Text>
              </View>
            </View>

            <View style={styles.howStepDivider} />

            {/* Step 3: Amplify */}
            <View style={styles.howStepRow}>
              <View style={[styles.howStepIconWrap, { backgroundColor: theme.colors.successBg }]}>
                <Megaphone size={18} color={theme.colors.success} />
              </View>
              <View style={styles.howStepTextWrap}>
                <Text style={styles.howStepTitle}>3. Amplify</Text>
                <Text style={styles.howStepBody}>
                  Backers pool money to pay for ads that spread the message.
                </Text>
              </View>
            </View>

            {/* Learn More Link */}
            <Pressable
              onPress={() => router.push('/info/how-it-works')}
              accessibilityRole="button"
              accessibilityLabel="Learn more about how Campaigns works"
              style={({ pressed }) => [
                styles.learnMoreLink,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.learnMoreLinkText}>Learn more about how Campaigns works</Text>
              <ArrowRight size={15} color={theme.colors.primary600} />
            </Pressable>
          </View>
        </View>

        {/* 5. Campaign Feed Header & Category Chips */}
        <View style={styles.feedHeaderSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Campaign Feed</Text>
              <Text style={styles.sectionSubtitle}>Discover and amplify active community messages</Text>
            </View>
          </View>

          {/* Category Chips Bar */}
          <FlatList
            horizontal
            data={['All', ...CATEGORIES] as (Category | 'All')[]}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChipsContent}
            renderItem={({ item }) => {
              const isSelected = selectedCategory === item;
              return (
                <CategoryChip
                  category={item}
                  selected={isSelected}
                  onPress={() => setSelectedCategory(item)}
                  style={styles.categoryChipItem}
                />
              );
            }}
          />
        </View>
      </View>
    );
  }, [
    insets.top,
    carouselCardWidth,
    carouselSnapInterval,
    isFeaturedLoading,
    featuredCampaigns,
    illustrativeReach,
    selectedCategory,
    handleStartCampaign,
    handleBackCampaign,
    router,
  ]);

  // Render footer component of the single FlatList
  const renderListFooter = useCallback(() => {
    return (
      <View style={styles.footerContainer}>
        {/* Next Page Loading Indicator */}
        {isFetchingNextPage && (
          <View style={styles.nextPageLoading}>
            <ActivityIndicator size="small" color={theme.colors.primary600} />
            <Text style={styles.nextPageLoadingText}>Loading more campaigns...</Text>
          </View>
        )}

        {/* 6. Footer Strip with Links */}
        <View style={styles.footerStrip}>
          <View style={styles.footerLinksRow}>
            <Pressable
              onPress={() => router.push('/info/how-it-works')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="How Campaigns works"
            >
              <Text style={styles.footerLinkText}>How It Works</Text>
            </Pressable>

            <Text style={styles.footerDot}>•</Text>

            <Pressable
              onPress={() => router.push('/info/partners')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Partners information"
            >
              <Text style={styles.footerLinkText}>Partners</Text>
            </Pressable>

            <Text style={styles.footerDot}>•</Text>

            <Pressable
              onPress={() => router.push('/info/about')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="About Campaigns"
            >
              <Text style={styles.footerLinkText}>About</Text>
            </Pressable>

            <Text style={styles.footerDot}>•</Text>

            <Pressable
              onPress={() => router.push('/info/faqs')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Frequently Asked Questions"
            >
              <Text style={styles.footerLinkText}>FAQs</Text>
            </Pressable>

            <Text style={styles.footerDot}>•</Text>

            <Pressable
              onPress={() => router.push('/info/terms')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Terms of Service"
            >
              <Text style={styles.footerLinkText}>Terms</Text>
            </Pressable>

            <Text style={styles.footerDot}>•</Text>

            <Pressable
              onPress={() => router.push('/info/privacy')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Privacy Policy"
            >
              <Text style={styles.footerLinkText}>Privacy</Text>
            </Pressable>

            <Text style={styles.footerDot}>•</Text>

            <Pressable
              onPress={() => router.push('/info/community-guidelines')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Community Guidelines"
            >
              <Text style={styles.footerLinkText}>Guidelines</Text>
            </Pressable>
          </View>

          <View style={styles.footerBrandRow}>
            <Text style={styles.footerBrandText}>
              Campaigns • Public Interest Ad Amplification
            </Text>
            <DemoDataBadge size="sm" />
          </View>
        </View>
      </View>
    );
  }, [isFetchingNextPage, router]);

  // Render empty state when feed has no items
  const renderEmptyComponent = useCallback(() => {
    if (isFeedLoading) {
      return (
        <View style={styles.feedLoadingContainer}>
          <CampaignCard variant="skeleton" style={styles.feedSkeletonCard} />
          <CampaignCard variant="skeleton" style={styles.feedSkeletonCard} />
        </View>
      );
    }

    if (isFeedError) {
      return (
        <View style={styles.feedErrorContainer}>
          <ErrorState
            title="Unable to load campaigns"
            message={feedError?.message || 'We encountered a problem fetching the campaign feed.'}
            onRetry={refetchFeed}
            retryTitle="Reload Campaigns"
          />
        </View>
      );
    }

    return (
      <View style={styles.feedEmptyContainer}>
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
          icon={<HelpCircle size={36} color={theme.colors.ink400} />}
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
      {/* Primary FlatList: No nested vertical ScrollViews */}
      <FlatList
        data={campaigns}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.feedItemContainer}>
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
            colors={[theme.colors.primary600]}
            tintColor={theme.colors.primary600}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.flatListContent}
      />

      {/* Sheet 1: "Not a Donation" Disclaimer Modal */}
      <Sheet
        visible={disclaimerModalOpen}
        onClose={() => setDisclaimerModalOpen(false)}
        title="Amplify vs. Donate"
      >
        <View style={styles.modalBody}>
          <View style={styles.modalIconCircle}>
            <Megaphone size={28} color={theme.colors.primary600} />
          </View>

          <Text style={styles.modalHeadline}>
            Campaigns is NOT a donation platform.
          </Text>

          <Text style={styles.modalParagraph}>
            When you back a campaign here, you are <Text style={styles.modalBold}>not giving money to the creator or a charity</Text>. Instead, 90% of your contribution strictly funds paid ad distribution across digital channels (social feeds, search, and video).
          </Text>

          <Text style={styles.modalParagraph}>
            The remaining 10% platform fee covers independent human fact-checking, citation verification, ad compliance review, and infrastructure.
          </Text>

          <View style={styles.modalHighlightBox}>
            <ShieldCheck size={18} color={theme.colors.primary700} />
            <Text style={styles.modalHighlightText}>
              Every dollar is accounted for in public performance reports showing real ad impressions and reach.
            </Text>
          </View>

          <Button
            title="I Understand"
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => setDisclaimerModalOpen(false)}
            style={{ marginTop: theme.spacing.md }}
          />
        </View>
      </Sheet>

      {/* Sheet 2: Illustrative Reach Explanation Modal */}
      <Sheet
        visible={reachInfoModalOpen}
        onClose={() => setReachInfoModalOpen(false)}
        title="Illustrative Reach Calculation"
      >
        <View style={styles.modalBody}>
          <Text style={styles.modalHeadline}>How Reach Is Estimated</Text>

          <Text style={styles.modalParagraph}>
            Reach represents the estimated number of unique people who will view a campaign message through sponsored distribution.
          </Text>

          <View style={styles.reachMathTable}>
            <View style={styles.reachMathRow}>
              <Text style={styles.reachMathLabel}>Ad Budget Allocation</Text>
              <Text style={styles.reachMathValue}>90% of contribution</Text>
            </View>
            <View style={styles.reachMathRow}>
              <Text style={styles.reachMathLabel}>Demonstration CPM</Text>
              <Text style={styles.reachMathValue}>$6.00 per 1,000 views</Text>
            </View>
            <View style={styles.reachMathRow}>
              <Text style={styles.reachMathLabel}>Average Frequency</Text>
              <Text style={styles.reachMathValue}>2.2 impressions / person</Text>
            </View>
            <View style={[styles.reachMathRow, styles.reachMathRowHighlight]}>
              <Text style={styles.reachMathLabelBold}>Resulting Range</Text>
              <Text style={styles.reachMathValueBold}>
                ~{illustrativeReach.estimatedReachLow}–{illustrativeReach.estimatedReachHigh} people / $1
              </Text>
            </View>
          </View>

          <Text style={styles.modalDisclaimerNote}>
            * This figure is an illustrative demonstration estimate. Real-world ad reach varies depending on geographic targeting, channel bidding competition, and audience engagement.
          </Text>

          <Button
            title="Close"
            variant="secondary"
            size="md"
            fullWidth
            onPress={() => setReachInfoModalOpen(false)}
            style={{ marginTop: theme.spacing.md }}
          />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  flatListContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xl,
  },
  headerContainer: {
    width: '100%',
  },

  // Branding bar
  brandingBar: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.bg,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIconCircle: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 20,
    color: theme.colors.ink900,
    letterSpacing: -0.2,
  },

  // Hero section
  heroOuter: {
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.xs,
  },
  heroCard: {
    borderRadius: theme.radius.sheet,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: theme.colors.primary700,
    ...theme.shadows.card,
  },
  heroContent: {
    padding: theme.spacing.lg,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  heroSubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.radius.full,
  },
  heroSubBadgeText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.primary100,
  },
  heroHeadline: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 27,
    lineHeight: 34,
    color: theme.colors.white,
    marginBottom: theme.spacing.sm,
    letterSpacing: -0.3,
  },
  heroDescription: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.primary100,
    marginBottom: theme.spacing.lg,
  },
  heroActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  heroPrimaryBtn: {
    backgroundColor: theme.colors.white,
    borderWidth: 0,
    minHeight: 46,
    paddingHorizontal: theme.spacing.lg,
  },
  heroPrimaryBtnText: {
    color: theme.colors.primary700,
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 15,
  },
  heroSecondaryBtn: {
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    minHeight: 46,
    paddingHorizontal: theme.spacing.base,
  },
  heroSecondaryBtnText: {
    color: theme.colors.white,
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 15,
  },

  // Reach estimate card inside hero
  reachEstimateCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  reachCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reachCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reachCardTitle: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.primary100,
  },
  infoTipBtn: {
    padding: 2,
  },
  reachCardBody: {},
  reachRangeText: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 22,
    color: theme.colors.white,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  reachSubtext: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.primary200,
  },

  // Disclaimer chip
  disclaimerContainer: {
    marginHorizontal: theme.spacing.base,
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primary50,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.primary200,
  },
  disclaimerPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  disclaimerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    gap: 8,
  },
  disclaimerIconWrap: {
    width: 24,
    height: 24,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimerText: {
    flex: 1,
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.primary800,
  },

  // Sections general
  sectionContainer: {
    marginTop: theme.spacing.xl,
  },
  sectionHeader: {
    paddingHorizontal: theme.spacing.base,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 20,
    color: theme.colors.ink900,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.ink500,
    marginTop: 2,
  },

  // Carousel
  carouselContent: {
    paddingHorizontal: theme.spacing.base,
  },
  carouselLoadingRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.base,
  },
  emptyFeaturedWrap: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
  },
  emptySectionText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    color: theme.colors.ink500,
  },

  // How it works
  howItWorksCard: {
    marginHorizontal: theme.spacing.base,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: theme.spacing.base,
    ...theme.shadows.card,
  },
  howStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  howStepIconWrap: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  howStepTextWrap: {
    flex: 1,
  },
  howStepTitle: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 15,
    color: theme.colors.ink900,
    marginBottom: 2,
  },
  howStepBody: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.ink600,
  },
  howStepDivider: {
    height: 1,
    backgroundColor: theme.colors.line,
    marginVertical: theme.spacing.md,
    marginLeft: 50,
  },
  learnMoreLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    marginTop: theme.spacing.base,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
  },
  learnMoreLinkText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.primary600,
  },

  // Feed & Categories
  feedHeaderSection: {
    marginTop: theme.spacing.xl,
  },
  categoryChipsContent: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: theme.spacing.md,
  },
  categoryChipItem: {
    marginRight: theme.spacing.sm,
  },
  feedItemContainer: {
    paddingHorizontal: theme.spacing.base,
    marginBottom: theme.spacing.base,
  },
  feedLoadingContainer: {
    paddingHorizontal: theme.spacing.base,
  },
  feedSkeletonCard: {
    marginBottom: theme.spacing.base,
  },
  feedErrorContainer: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xl,
  },
  feedEmptyContainer: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xl,
  },

  // Footer
  footerContainer: {
    marginTop: theme.spacing.lg,
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
    color: theme.colors.ink500,
  },
  footerStrip: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.base,
    alignItems: 'center',
  },
  footerLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 8,
    marginBottom: theme.spacing.md,
  },
  footerLinkText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.ink600,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  footerDot: {
    color: theme.colors.ink400,
    fontSize: 12,
  },
  footerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerBrandText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.ink400,
  },

  // Modal styles
  modalBody: {
    paddingVertical: theme.spacing.sm,
  },
  modalIconCircle: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    alignSelf: 'center',
  },
  modalHeadline: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 20,
    color: theme.colors.ink900,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  modalParagraph: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.ink700,
    marginBottom: theme.spacing.md,
  },
  modalBold: {
    fontFamily: theme.typography.fonts.uiBold,
    color: theme.colors.ink900,
  },
  modalHighlightBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: theme.colors.primary50,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary200,
    marginTop: 4,
  },
  modalHighlightText: {
    flex: 1,
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.primary800,
  },
  reachMathTable: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.line,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
  },
  reachMathRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  reachMathRowHighlight: {
    backgroundColor: theme.colors.primary50,
    borderBottomWidth: 0,
  },
  reachMathLabel: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.ink600,
  },
  reachMathValue: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.ink900,
  },
  reachMathLabelBold: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 14,
    color: theme.colors.primary800,
  },
  reachMathValueBold: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 14,
    color: theme.colors.primary700,
  },
  modalDisclaimerNote: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.ink500,
    fontStyle: 'italic',
  },
});
