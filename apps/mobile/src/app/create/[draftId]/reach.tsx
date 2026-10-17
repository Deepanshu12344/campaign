import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import {
  MapPin,
  Search,
  Share2,
  Sliders,
  Clock,
  CheckCircle2,
  AlertCircle,
  Check,
  X,
  Plus,
  Minus,
  Sparkles,
  Info,
  Users,
  ShieldCheck,
  Eye,
  Camera,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  getStepErrors,
  ReachSettings,
  TARGET_LOCATIONS,
  toggleTargetLocation,
  AUDIENCE_INTEREST_THEMES,
  AGE_RANGE_PRESETS,
  DISTRIBUTION_CHANNELS,
  rebalanceBudgetAllocation,
  adjustChannelAllocation,
  formatAudienceSummary,
  reachAtGoal,
  AdCreative,
} from '@campaigns/shared';
import { useDraftStore } from '../../../store/draftStore';
import {
  Card,
  Segmented,
  InfoTip,
  ReachEstimateBadge,
  Avatar,
  useToast,
} from '../../../components/ui';
import { theme } from '../../../theme';

const DURATION_PRESETS = [7, 14, 30, 60] as const;
const FUNDING_WINDOW_PRESETS = [14, 30, 45, 60] as const;

const CHANNEL_COLORS: Record<string, string> = {
  'Social feeds': '#2563EB',
  Search: '#059669',
  'Display network': '#D97706',
  Video: '#7C3AED',
};

export default function CreateReachScreen() {
  const { draftId } = useLocalSearchParams<{ draftId: string }>();
  const toast = useToast();

  const draft = useDraftStore((s) => s.getDraft(draftId as string)) || {};
  const updateDraftField = useDraftStore((s) => s.updateDraftField);
  const saveDraftNow = useDraftStore((s) => s.saveDraftNow);
  const setStepContinueHandler = useDraftStore((s) => s.setStepContinueHandler);

  const scrollViewRef = useRef<ScrollView>(null);
  const sectionPositions = useRef<Record<string, number>>({});

  // Search input for target locations
  const [locationSearch, setLocationSearch] = useState('');

  // Duration custom toggle
  const reach = (draft.reach as ReachSettings | null | undefined) || {
    locations: ['United States'],
    interests: [],
    channels: ['Social feeds'],
    budgetAllocation: { 'Social feeds': 100 },
    durationDays: 30,
    fundingWindowDays: 30,
    ageRange: '18-65+',
  };

  const [isCustomDuration, setIsCustomDuration] = useState(() => {
    return !DURATION_PRESETS.includes(reach.durationDays as (typeof DURATION_PRESETS)[number]);
  });
  const [customDurationInput, setCustomDurationInput] = useState(
    reach.durationDays ? String(reach.durationDays) : '30'
  );

  // Placement preview tab in audience card (0: Social, 1: Story, 2: Banner)
  const [placementTab, setPlacementTab] = useState(0);

  // Consolidated step errors
  const errors = useMemo(() => getStepErrors(draft, 'reach'), [draft]);
  const isComplete = errors.length === 0;

  // Indicative reach at goal (if goal was set, e.g. from prior navigation)
  const indicativeReach = useMemo(() => {
    if (typeof draft.fundingGoalCents === 'number' && draft.fundingGoalCents > 0) {
      return reachAtGoal(draft.fundingGoalCents);
    }
    return null;
  }, [draft.fundingGoalCents]);

  // Current creative assets for placement preview
  const adCreative = (draft.adCreative as AdCreative | null | undefined) || {
    images: [],
    headline: typeof draft.title === 'string' ? draft.title.slice(0, 40) : '',
    description: typeof draft.summary === 'string' ? draft.summary.slice(0, 90) : '',
    cta: 'Learn more',
  };
  const primaryAdImage = adCreative.images[0] || (typeof draft.coverUrl === 'string' ? draft.coverUrl : '');

  // ---------------------------------------------------------------------------
  // STEP CONTINUE HANDLER REGISTRATION
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setStepContinueHandler(async () => {
      const stepErrors = getStepErrors(draft, 'reach');
      if (stepErrors.length > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        toast.error(stepErrors[0] || 'Please resolve all required reach settings before continuing');

        // Scroll to the first error's section
        const firstErr = stepErrors[0] || '';
        if (firstErr.includes('location')) {
          scrollToSection('locations');
        } else if (firstErr.includes('channel')) {
          scrollToSection('channels');
        } else if (firstErr.includes('allocation')) {
          scrollToSection('allocation');
        } else if (firstErr.includes('duration')) {
          scrollToSection('duration');
        }
        return false;
      }

      await saveDraftNow(draftId as string);
      return true;
    });

    return () => {
      setStepContinueHandler(null);
    };
  }, [draft, draftId, saveDraftNow, setStepContinueHandler, toast]);

  const scrollToSection = (sectionKey: string) => {
    const y = sectionPositions.current[sectionKey];
    if (typeof y === 'number' && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: Math.max(0, y - 20), animated: true });
    }
  };

  // ---------------------------------------------------------------------------
  // FIELD HANDLERS
  // ---------------------------------------------------------------------------
  const handleToggleLocation = (locId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const currentLocs = reach.locations || [];
    const updated = toggleTargetLocation(currentLocs, locId);
    updateDraftField('reach', {
      ...reach,
      locations: updated,
    });
  };

  const handleRemoveLocation = (locId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const currentLocs = reach.locations || [];
    updateDraftField('reach', {
      ...reach,
      locations: currentLocs.filter((l) => l !== locId),
    });
  };

  const handleToggleInterest = (interest: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const current = reach.interests || [];
    const updated = current.includes(interest)
      ? current.filter((i) => i !== interest)
      : [...current, interest];
    updateDraftField('reach', {
      ...reach,
      interests: updated,
    });
  };

  const handleAgeRangeSelect = (age: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    updateDraftField('reach', {
      ...reach,
      ageRange: age,
    });
  };

  const handleToggleChannel = (channelId: string) => {
    const channelDef = DISTRIBUTION_CHANNELS.find((c) => c.id === channelId);
    if (channelDef?.status === 'coming_soon') {
      return; // Disabled
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const currentChannels = reach.channels || [];
    let updatedChannels: string[];

    if (currentChannels.includes(channelId)) {
      if (currentChannels.length === 1) {
        toast.warning('At least one available advertising channel is required');
        return;
      }
      updatedChannels = currentChannels.filter((c) => c !== channelId);
    } else {
      updatedChannels = [...currentChannels, channelId];
    }

    // Auto-rebalance budget allocation across updated channels
    const newAllocation = rebalanceBudgetAllocation(updatedChannels, reach.budgetAllocation);

    updateDraftField('reach', {
      ...reach,
      channels: updatedChannels,
      budgetAllocation: newAllocation,
    });
  };

  const handleAdjustAllocation = (channelId: string, delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const currentAlloc = reach.budgetAllocation || {};
    const selectedChannels = reach.channels || [];
    const currentPercent = currentAlloc[channelId] || 0;
    const targetPercent = Math.max(0, Math.min(100, currentPercent + delta));

    const updatedAlloc = adjustChannelAllocation(
      channelId,
      targetPercent,
      currentAlloc,
      selectedChannels
    );

    updateDraftField('reach', {
      ...reach,
      budgetAllocation: updatedAlloc,
    });
  };

  const handleResetEqualAllocation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const selectedChannels = reach.channels || [];
    const equalAllocation = rebalanceBudgetAllocation(selectedChannels);
    updateDraftField('reach', {
      ...reach,
      budgetAllocation: equalAllocation,
    });
    toast.success('Reset to equal distribution');
  };

  const handleDurationPresetSelect = (days: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsCustomDuration(false);
    updateDraftField('reach', {
      ...reach,
      durationDays: days,
    });
  };

  const handleCustomDurationToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsCustomDuration(true);
    const parsed = parseInt(customDurationInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 90) {
      updateDraftField('reach', {
        ...reach,
        durationDays: parsed,
      });
    }
  };

  const handleCustomDurationChange = (text: string) => {
    setCustomDurationInput(text);
    const parsed = parseInt(text, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 90) {
      updateDraftField('reach', {
        ...reach,
        durationDays: parsed,
      });
    }
  };

  const handleFundingWindowSelect = (days: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    updateDraftField('reach', {
      ...reach,
      fundingWindowDays: days,
    });
  };

  // Filtered locations
  const filteredLocations = useMemo(() => {
    if (!locationSearch.trim()) return TARGET_LOCATIONS;
    const q = locationSearch.toLowerCase();
    return TARGET_LOCATIONS.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.country && l.country.toLowerCase().includes(q))
    );
  }, [locationSearch]);

  const selectedLocations = reach.locations || [];
  const isWorldwideSelected = selectedLocations.includes('Worldwide');

  // Allocation validation calculation
  const allocationSum = useMemo(() => {
    const alloc = reach.budgetAllocation || {};
    return Object.values(alloc).reduce((a, b) => Number(a) + Number(b), 0);
  }, [reach.budgetAllocation]);

  const isAllocation100 = Math.abs(allocationSum - 100) <= 0.5;

  // Plain-language summary
  const audienceSummaryText = useMemo(() => formatAudienceSummary(reach), [reach]);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* HEADER BOX */}
      <View style={styles.headerBox}>
        <Text style={styles.stepTitle}>Step 4: Reach & Distribution</Text>
        <Text style={styles.stepSubtitle}>
          Explain how your campaign will find an audience across digital ad channels. We never promise or guarantee an audience size.
        </Text>
      </View>

      {/* CONSOLIDATED STATUS & WARNINGS CARD */}
      <View style={styles.statusSection}>
        {isComplete ? (
          <View style={styles.readyCard}>
            <CheckCircle2 size={18} color={theme.colors.success} />
            <View style={styles.statusCol}>
              <Text style={styles.readyTitle}>Step 4 Ready</Text>
              <Text style={styles.readyBody}>
                Audience targeting, channels, and budget allocation (100%) are completely configured.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.warningsCard}>
            <View style={styles.warningsHeaderRow}>
              <AlertCircle size={18} color={theme.colors.danger} />
              <Text style={styles.warningsTitle}>
                {errors.length} {errors.length === 1 ? 'item needs attention' : 'items need attention'}
              </Text>
            </View>
            <View style={styles.warningsList}>
              {errors.map((err, idx) => (
                <Pressable
                  key={`err-${idx}`}
                  onPress={() => {
                    if (err.includes('location')) scrollToSection('locations');
                    else if (err.includes('channel')) scrollToSection('channels');
                    else if (err.includes('allocation')) scrollToSection('allocation');
                    else if (err.includes('duration')) scrollToSection('duration');
                  }}
                  style={styles.warningItem}
                  accessibilityRole="button"
                  accessibilityLabel={`Fix: ${err}`}
                >
                  <Text style={styles.warningBullet}>•</Text>
                  <Text style={styles.warningText}>{err}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* INDICATIVE REACH CARD */}
      <Card style={styles.indicativeCard}>
        <View style={styles.indicativeHeaderRow}>
          <View style={styles.indicativeIconBox}>
            <Sparkles size={16} color={theme.colors.primary600} />
          </View>
          <View style={styles.indicativeTitleCol}>
            <Text style={styles.indicativeTitle}>Indicative Reach</Text>
            <Text style={styles.indicativeSubtitle}>
              Audience size depends on pricing, targeting, and ad auction performance.
            </Text>
          </View>
          <InfoTip term="estimatedReach" size={16} color={theme.colors.primary600} />
        </View>

        {indicativeReach ? (
          <View style={styles.indicativeResultBox}>
            <ReachEstimateBadge
              low={indicativeReach.estimatedReachLow}
              high={indicativeReach.estimatedReachHigh}
              showSubtitle={true}
              size="md"
            />
            <Text style={styles.indicativeGoalNote}>
              Calculated from your ${(draft.fundingGoalCents! / 100).toLocaleString()} goal configured in Step 5.
            </Text>
          </View>
        ) : (
          <View style={styles.indicativePendingBox}>
            <Text style={styles.indicativePendingText}>
              Set your funding goal in the final step to see an estimate.
            </Text>
            <Text style={styles.indicativePendingSubtext}>
              Funding goal is entered exclusively in Step 5 (Submit).
            </Text>
          </View>
        )}
      </Card>

      {/* ===================================================================== */}
      {/* GROUP 1: YOU CHOOSE                                                  */}
      {/* ===================================================================== */}
      <View style={styles.groupHeaderRow}>
        <View style={styles.groupBadge}>
          <Text style={styles.groupBadgeText}>YOU CHOOSE</Text>
        </View>
        <Text style={styles.groupHeaderDescription}>
          Targeting parameters you configure and control directly.
        </Text>
      </View>

      {/* SECTION 1: TARGET LOCATIONS */}
      <View
        onLayout={(e) => {
          sectionPositions.current.locations = e.nativeEvent.layout.y;
        }}
      >
        <Card style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <MapPin size={18} color={theme.colors.primary600} />
            </View>
            <View style={styles.sectionTitleCol}>
              <View style={styles.titleWithRequiredRow}>
                <Text style={styles.sectionHeading}>Target Geographic Locations</Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <Text style={styles.sectionHelper}>
                Select countries, regions, or major cities where digital ads will be distributed.
              </Text>
            </View>
          </View>

          {/* Worldwide Button */}
          <Pressable
            onPress={() => handleToggleLocation('Worldwide')}
            style={[styles.worldwideBtn, isWorldwideSelected && styles.worldwideBtnActive]}
            accessibilityRole="button"
            accessibilityLabel="Worldwide targeting (clears all specific locations)"
          >
            <View style={[styles.checkboxCircle, isWorldwideSelected && styles.checkboxCircleActive]}>
              {isWorldwideSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
            </View>
            <View style={styles.worldwideTextCol}>
              <Text style={[styles.worldwideTitle, isWorldwideSelected && styles.worldwideTitleActive]}>
                Worldwide
              </Text>
              <Text style={styles.worldwideDesc}>
                Distribute internationally across all supported digital ad networks. (Clears specific locations).
              </Text>
            </View>
          </Pressable>

          {/* Selected Locations Chips */}
          <View style={styles.selectedLocationsSection}>
            <Text style={styles.selectedLocationsLabel}>
              Selected Locations ({selectedLocations.length}):
            </Text>
            {selectedLocations.length === 0 ? (
              <Text style={styles.noLocationsNotice}>
                No locations selected. Choose "Worldwide" or select specific regions below.
              </Text>
            ) : (
              <View style={styles.chipsContainer}>
                {selectedLocations.map((loc) => (
                  <View key={`selected-${loc}`} style={styles.locationChipSelected}>
                    <Text style={styles.locationChipSelectedText}>{loc}</Text>
                    <Pressable
                      onPress={() => handleRemoveLocation(loc)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${loc}`}
                    >
                      <X size={14} color={theme.colors.primary700} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Location Search Input */}
          <View style={styles.searchRow}>
            <Search size={16} color={theme.colors.ink500} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search countries, regions, or cities..."
              placeholderTextColor={theme.colors.ink400}
              value={locationSearch}
              onChangeText={setLocationSearch}
              autoCapitalize="words"
            />
            {locationSearch.length > 0 && (
              <Pressable onPress={() => setLocationSearch('')} hitSlop={8}>
                <X size={16} color={theme.colors.ink500} />
              </Pressable>
            )}
          </View>

          {/* Curated List */}
          <View style={styles.curatedList}>
            {filteredLocations
              .filter((l) => l.id !== 'Worldwide')
              .map((loc) => {
                const isSelected = selectedLocations.includes(loc.id);
                return (
                  <Pressable
                    key={loc.id}
                    onPress={() => handleToggleLocation(loc.id)}
                    style={[styles.locationChip, isSelected && styles.locationChipActive]}
                    accessibilityRole="button"
                    accessibilityLabel={`Toggle location: ${loc.name}`}
                  >
                    <Text style={[styles.locationChipText, isSelected && styles.locationChipTextActive]}>
                      {loc.name}
                    </Text>
                    {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                  </Pressable>
                );
              })}
          </View>
        </Card>
      </View>

      {/* SECTION 2: AUDIENCE INTERESTS & DEMOGRAPHICS */}
      <Card style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionIconBadge}>
            <Users size={18} color={theme.colors.primary600} />
          </View>
          <View style={styles.sectionTitleCol}>
            <View style={styles.titleWithRequiredRow}>
              <Text style={styles.sectionHeading}>Audience Interests & Demographics</Text>
              <View style={styles.optionalBadge}>
                <Text style={styles.optionalBadgeText}>Where supported · Optional</Text>
              </View>
            </View>
            <Text style={styles.sectionHelper}>
              Guide digital placement algorithms toward individuals interested in these thematic topics.
            </Text>
          </View>
        </View>

        {/* Age Range Selector */}
        <View style={styles.subSectionBox}>
          <Text style={styles.subSectionLabel}>Age Range</Text>
          <View style={styles.ageChipsRow}>
            {AGE_RANGE_PRESETS.map((age) => {
              const isSelected = (reach.ageRange || '18-65+') === age;
              return (
                <Pressable
                  key={age}
                  onPress={() => handleAgeRangeSelect(age)}
                  style={[styles.ageChip, isSelected && styles.ageChipSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={`Age range ${age}`}
                >
                  <Text style={[styles.ageChipText, isSelected && styles.ageChipTextSelected]}>
                    {age}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Themed Interest Chips */}
        <View style={styles.subSectionBox}>
          <View style={styles.interestsHeaderRow}>
            <Text style={styles.subSectionLabel}>Thematic Interests</Text>
            <Text style={styles.interestsCount}>
              {reach.interests?.length || 0} selected
            </Text>
          </View>

          {AUDIENCE_INTEREST_THEMES.map((themeGroup) => (
            <View key={themeGroup.theme} style={styles.themeGroupBlock}>
              <Text style={styles.themeGroupName}>{themeGroup.theme}</Text>
              <View style={styles.themeInterestsGrid}>
                {themeGroup.interests.map((interest) => {
                  const isSelected = (reach.interests || []).includes(interest);
                  return (
                    <Pressable
                      key={interest}
                      onPress={() => handleToggleInterest(interest)}
                      style={[styles.interestChip, isSelected && styles.interestChipSelected]}
                      accessibilityRole="button"
                      accessibilityLabel={`Toggle interest: ${interest}`}
                    >
                      <Text
                        style={[
                          styles.interestChipText,
                          isSelected && styles.interestChipTextSelected,
                        ]}
                      >
                        {interest}
                      </Text>
                      {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </Card>

      {/* SECTION 3: DISTRIBUTION CHANNELS */}
      <View
        onLayout={(e) => {
          sectionPositions.current.channels = e.nativeEvent.layout.y;
        }}
      >
        <Card style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <Share2 size={18} color={theme.colors.primary600} />
            </View>
            <View style={styles.sectionTitleCol}>
              <View style={styles.titleWithRequiredRow}>
                <Text style={styles.sectionHeading}>Distribution Channels</Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <Text style={styles.sectionHelper}>
                Select the advertising networks where your creative message will be displayed.
              </Text>
            </View>
          </View>

          <View style={styles.channelCardsList}>
            {DISTRIBUTION_CHANNELS.map((ch) => {
              const isSelected = (reach.channels || []).includes(ch.id);
              const isComingSoon = ch.status === 'coming_soon';

              return (
                <Pressable
                  key={ch.id}
                  disabled={isComingSoon}
                  onPress={() => handleToggleChannel(ch.id)}
                  style={[
                    styles.channelCard,
                    isSelected && styles.channelCardSelected,
                    isComingSoon && styles.channelCardDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${ch.name} advertising channel. Status: ${ch.status}`}
                >
                  <View style={styles.channelCardTopRow}>
                    <View style={styles.channelTitleRow}>
                      <View
                        style={[
                          styles.channelCheckbox,
                          isSelected && styles.channelCheckboxSelected,
                          isComingSoon && styles.channelCheckboxDisabled,
                        ]}
                      >
                        {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                      </View>
                      <Text
                        style={[
                          styles.channelCardName,
                          isSelected && styles.channelCardNameSelected,
                          isComingSoon && styles.channelCardNameDisabled,
                        ]}
                      >
                        {ch.name}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.channelStatusPill,
                        isComingSoon ? styles.channelPillComingSoon : styles.channelPillAvailable,
                      ]}
                    >
                      <Text
                        style={[
                          styles.channelStatusPillText,
                          isComingSoon ? styles.channelPillTextComingSoon : styles.channelPillTextAvailable,
                        ]}
                      >
                        {isComingSoon ? 'Coming soon' : 'Available'}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.channelCardDescription,
                      isComingSoon && styles.channelCardDescDisabled,
                    ]}
                  >
                    {ch.description}
                  </Text>

                  {isComingSoon && ch.disabledReason && (
                    <View style={styles.disabledReasonBox}>
                      <Info size={13} color={theme.colors.ink600} />
                      <Text style={styles.disabledReasonText}>{ch.disabledReason}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Card>
      </View>

      {/* SECTION 4: BUDGET ALLOCATION */}
      <View
        onLayout={(e) => {
          sectionPositions.current.allocation = e.nativeEvent.layout.y;
        }}
      >
        <Card style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <Sliders size={18} color={theme.colors.primary600} />
            </View>
            <View style={styles.sectionTitleCol}>
              <View style={styles.titleWithRequiredRow}>
                <Text style={styles.sectionHeading}>Ad Budget Allocation</Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <Text style={styles.sectionHelper}>
                Percentage allocation across selected channels. Must total exactly 100%.
              </Text>
            </View>
          </View>

          {/* Allocation Total Indicator Bar */}
          <View style={styles.allocationStatusBar}>
            <View style={styles.allocationStatusLeft}>
              <Text style={styles.allocationTotalLabel}>Total Allocation:</Text>
              <View
                style={[
                  styles.totalBadge,
                  isAllocation100 ? styles.totalBadgeSuccess : styles.totalBadgeError,
                ]}
              >
                <Text
                  style={[
                    styles.totalBadgeText,
                    isAllocation100 ? styles.totalBadgeTextSuccess : styles.totalBadgeTextError,
                  ]}
                >
                  {allocationSum}%
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleResetEqualAllocation}
              style={styles.resetAllocationBtn}
              accessibilityRole="button"
              accessibilityLabel="Reset allocation to equal split"
            >
              <Text style={styles.resetAllocationBtnText}>Equal Split</Text>
            </Pressable>
          </View>

          {/* Visual Multi-Segment Bar */}
          <View style={styles.multiSegmentBar}>
            {(reach.channels || []).map((ch) => {
              const pct = (reach.budgetAllocation || {})[ch] || 0;
              if (pct <= 0) return null;
              const barColor = CHANNEL_COLORS[ch] || theme.colors.primary600;
              return (
                <View
                  key={`bar-${ch}`}
                  style={[
                    styles.segmentSlice,
                    {
                      flex: pct,
                      backgroundColor: barColor,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Stepper Rows for each Selected Channel */}
          <View style={styles.stepperRowsContainer}>
            {(reach.channels || []).map((ch) => {
              const pct = (reach.budgetAllocation || {})[ch] || 0;
              const dotColor = CHANNEL_COLORS[ch] || theme.colors.primary600;
              const isSingleChannel = (reach.channels || []).length <= 1;

              return (
                <View key={`stepper-${ch}`} style={styles.stepperRow}>
                  <View style={styles.stepperChannelInfo}>
                    <View style={[styles.channelColorDot, { backgroundColor: dotColor }]} />
                    <Text style={styles.stepperChannelName}>{ch}</Text>
                  </View>

                  <View style={styles.stepperControls}>
                    <Pressable
                      disabled={isSingleChannel || pct <= 0}
                      onPress={() => handleAdjustAllocation(ch, -5)}
                      style={[
                        styles.stepperBtn,
                        (isSingleChannel || pct <= 0) && styles.stepperBtnDisabled,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Decrease ${ch} budget by 5 percent`}
                    >
                      <Minus
                        size={14}
                        color={isSingleChannel || pct <= 0 ? theme.colors.ink400 : theme.colors.ink700}
                      />
                    </Pressable>

                    <View style={styles.percentageDisplayBox}>
                      <Text style={styles.percentageDisplayText}>{pct}%</Text>
                    </View>

                    <Pressable
                      disabled={isSingleChannel || pct >= 100}
                      onPress={() => handleAdjustAllocation(ch, 5)}
                      style={[
                        styles.stepperBtn,
                        (isSingleChannel || pct >= 100) && styles.stepperBtnDisabled,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Increase ${ch} budget by 5 percent`}
                    >
                      <Plus
                        size={14}
                        color={isSingleChannel || pct >= 100 ? theme.colors.ink400 : theme.colors.ink700}
                      />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </Card>
      </View>

      {/* SECTION 5: DURATION & FUNDING WINDOW */}
      <View
        onLayout={(e) => {
          sectionPositions.current.duration = e.nativeEvent.layout.y;
        }}
      >
        <Card style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <Clock size={18} color={theme.colors.primary600} />
            </View>
            <View style={styles.sectionTitleCol}>
              <View style={styles.titleWithRequiredRow}>
                <Text style={styles.sectionHeading}>Campaign Duration & Funding Window</Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <Text style={styles.sectionHelper}>
                Define the advertising run length and how long your campaign is open to community backers.
              </Text>
            </View>
          </View>

          {/* Ad Distribution Duration */}
          <View style={styles.subSectionBox}>
            <View style={styles.durationTitleRow}>
              <Text style={styles.subSectionLabel}>Ad Distribution Run Duration</Text>
              <Text style={styles.durationCurrentBadge}>{reach.durationDays || 30} Days</Text>
            </View>
            <Text style={styles.subSectionHelper}>
              How many days your ads will run once the campaign is published and active.
            </Text>

            <View style={styles.segmentedPresetsRow}>
              {DURATION_PRESETS.map((days) => {
                const isSelected = !isCustomDuration && reach.durationDays === days;
                return (
                  <Pressable
                    key={days}
                    onPress={() => handleDurationPresetSelect(days)}
                    style={[styles.presetChip, isSelected && styles.presetChipSelected]}
                    accessibilityRole="button"
                    accessibilityLabel={`${days} days distribution duration`}
                  >
                    <Text style={[styles.presetChipText, isSelected && styles.presetChipTextSelected]}>
                      {days}d
                    </Text>
                  </Pressable>
                );
              })}

              <Pressable
                onPress={handleCustomDurationToggle}
                style={[styles.presetChip, isCustomDuration && styles.presetChipSelected]}
                accessibilityRole="button"
                accessibilityLabel="Custom distribution duration"
              >
                <Text style={[styles.presetChipText, isCustomDuration && styles.presetChipTextSelected]}>
                  Custom
                </Text>
              </Pressable>
            </View>

            {isCustomDuration && (
              <View style={styles.customDurationInputBox}>
                <Text style={styles.customDurationLabel}>Custom duration (1 to 90 days):</Text>
                <View style={styles.customInputRow}>
                  <TextInput
                    style={styles.customDurationInput}
                    keyboardType="number-pad"
                    value={customDurationInput}
                    onChangeText={handleCustomDurationChange}
                    maxLength={2}
                  />
                  <Text style={styles.customDurationUnit}>Days</Text>
                </View>
              </View>
            )}
          </View>

          {/* Funding Window Length */}
          <View style={[styles.subSectionBox, { marginTop: theme.spacing.lg }]}>
            <View style={styles.durationTitleRow}>
              <Text style={styles.subSectionLabel}>Funding Window Length</Text>
              <Text style={styles.durationCurrentBadge}>
                {reach.fundingWindowDays || 30} Days
              </Text>
            </View>
            <Text style={styles.subSectionHelper}>
              Length of time community backers have to fund the campaign.
            </Text>

            <View style={styles.segmentedPresetsRow}>
              {FUNDING_WINDOW_PRESETS.map((days) => {
                const isSelected = (reach.fundingWindowDays || 30) === days;
                return (
                  <Pressable
                    key={days}
                    onPress={() => handleFundingWindowSelect(days)}
                    style={[styles.presetChip, isSelected && styles.presetChipSelected]}
                    accessibilityRole="button"
                    accessibilityLabel={`${days} days funding window`}
                  >
                    <Text style={[styles.presetChipText, isSelected && styles.presetChipTextSelected]}>
                      {days}d
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Card>
      </View>

      {/* ===================================================================== */}
      {/* GROUP 2: FINALIZED DURING REVIEW                                      */}
      {/* ===================================================================== */}
      <View style={styles.groupHeaderRow}>
        <View style={[styles.groupBadge, styles.groupBadgeReview]}>
          <Text style={[styles.groupBadgeText, styles.groupBadgeTextReview]}>
            FINALIZED DURING REVIEW
          </Text>
        </View>
        <Text style={styles.groupHeaderDescription}>
          Technical delivery parameters calibrated by human reviewers for safety, compliance, and maximum legitimate reach.
        </Text>
      </View>

      <Card style={styles.card}>
        <View style={styles.reviewHeaderRow}>
          <ShieldCheck size={20} color={theme.colors.primary600} />
          <Text style={styles.reviewMainTitle}>Reviewer Calibrated Delivery</Text>
          <InfoTip term="reviewProcess" size={16} color={theme.colors.primary600} />
        </View>

        <View style={styles.reviewGrid}>
          {/* Card 1 */}
          <View style={styles.reviewFeatureCard}>
            <Text style={styles.reviewFeatureTitle}>Exact Placements & Whitelists</Text>
            <Text style={styles.reviewFeatureDesc}>
              Reviewers curate verified sub-networks and publisher whitelists to exclude clickbait or low-trust digital environments.
            </Text>
          </View>

          {/* Card 2 */}
          <View style={styles.reviewFeatureCard}>
            <Text style={styles.reviewFeatureTitle}>Algorithmic Bids & Pacing</Text>
            <Text style={styles.reviewFeatureDesc}>
              Reviewers set bid ceilings and smoothed delivery curves to protect against auction price spikes and ensure steady distribution.
            </Text>
          </View>

          {/* Card 3 */}
          <View style={styles.reviewFeatureCard}>
            <Text style={styles.reviewFeatureTitle}>Dayparting & Frequency Capping</Text>
            <Text style={styles.reviewFeatureDesc}>
              Pacing controls prevent viewer ad fatigue and avoid wasteful impression duplication across repetitive browsing sessions.
            </Text>
          </View>

          {/* Card 4 */}
          <View style={styles.reviewFeatureCard}>
            <Text style={styles.reviewFeatureTitle}>Compliance & Policy Verification</Text>
            <Text style={styles.reviewFeatureDesc}>
              Geographic and audience criteria are examined for full alignment with digital advertising transparency laws.
            </Text>
          </View>
        </View>

        {/* Permanent Note */}
        <View style={styles.permanentNoteBox}>
          <Info size={16} color={theme.colors.ink600} />
          <Text style={styles.permanentNoteText}>
            Reach depends on ad inventory, prices, targeting and performance. We never guarantee an audience size.
          </Text>
        </View>
      </Card>

      {/* ===================================================================== */}
      {/* AUDIENCE PREVIEW CARD                                                 */}
      {/* ===================================================================== */}
      <Card style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionIconBadge}>
            <Eye size={18} color={theme.colors.primary600} />
          </View>
          <View style={styles.sectionTitleCol}>
            <Text style={styles.sectionHeading}>Audience Preview</Text>
            <Text style={styles.sectionHelper}>
              Plain-language summary of your reach targeting and how your ad will appear.
            </Text>
          </View>
        </View>

        {/* Summary Narrative */}
        <View style={styles.narrativeSummaryBox}>
          <Text style={styles.narrativeSummaryText}>{audienceSummaryText}</Text>
        </View>

        {/* Ad Placement Preview Component (Reused from Step 3) */}
        <View style={styles.placementPreviewWrapper}>
          <Segmented
            options={['Social Feed', 'Vertical Story', 'Display Banner']}
            selectedIndex={placementTab}
            onChange={setPlacementTab}
            style={styles.placementSegmented}
          />

          <Text style={styles.previewDisclaimerText}>
            Preview only. Final placements are set during review.
          </Text>

          {/* Placement 1: Social Feed */}
          {placementTab === 0 && (
            <View style={styles.feedPreviewCard}>
              <View style={styles.feedHeaderRow}>
                <Avatar
                  name={typeof draft.creatorName === 'string' ? draft.creatorName : 'Campaign'}
                  size="sm"
                />
                <View style={styles.feedHeaderCol}>
                  <Text style={styles.feedCreatorName} numberOfLines={1}>
                    {typeof draft.creatorName === 'string' && draft.creatorName
                      ? draft.creatorName
                      : 'Community Organizer'}
                  </Text>
                  <Text style={styles.feedSponsoredLabel}>Sponsored · Community Funded</Text>
                </View>
              </View>

              <View style={styles.feedMediaFrame}>
                {primaryAdImage ? (
                  <Image source={{ uri: primaryAdImage }} style={styles.feedMediaImg} contentFit="cover" transition={200} />
                ) : (
                  <View style={styles.feedPlaceholderFrame}>
                    <Camera size={24} color={theme.colors.ink400} />
                    <Text style={styles.feedPlaceholderText}>Primary ad image from Step 3</Text>
                  </View>
                )}
              </View>

              <View style={styles.feedContentBox}>
                <View style={styles.feedContentCol}>
                  <Text style={styles.feedHeadlineText} numberOfLines={1}>
                    {adCreative.headline || 'Your Ad Headline'}
                  </Text>
                  <Text style={styles.feedDescText} numberOfLines={2}>
                    {adCreative.description ||
                      'Vital community-funded information delivered straight to digital feeds.'}
                  </Text>
                </View>
                <View style={styles.feedCtaBtn}>
                  <Text style={styles.feedCtaBtnText}>{adCreative.cta || 'Learn more'}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Placement 2: Vertical Story */}
          {placementTab === 1 && (
            <View style={styles.storyPreviewFrame}>
              {primaryAdImage ? (
                <Image source={{ uri: primaryAdImage }} style={styles.storyBgImg} contentFit="cover" transition={200} />
              ) : (
                <View style={[styles.storyBgImg, styles.feedPlaceholderFrame]}>
                  <Camera size={24} color={theme.colors.ink400} />
                </View>
              )}
              <View style={styles.storyTopOverlay}>
                <View style={styles.storyBar} />
                <View style={styles.storyAuthorRow}>
                  <Avatar
                    name={typeof draft.creatorName === 'string' ? draft.creatorName : 'Campaign'}
                    size="sm"
                  />
                  <Text style={styles.storyAuthorName}>
                    {typeof draft.creatorName === 'string' ? draft.creatorName : 'Community Voice'}
                  </Text>
                </View>
              </View>
              <View style={styles.storyBottomOverlay}>
                <Text style={styles.storyHeadline} numberOfLines={2}>
                  {adCreative.headline || 'Your Ad Headline'}
                </Text>
                <Text style={styles.storyDesc} numberOfLines={2}>
                  {adCreative.description || 'Actionable community facts that make a difference.'}
                </Text>
                <View style={styles.storyCtaPill}>
                  <Text style={styles.storyCtaText}>{adCreative.cta || 'Learn more'}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Placement 3: Display Banner */}
          {placementTab === 2 && (
            <View style={styles.bannerPreviewCard}>
              <View style={styles.bannerAdPill}>
                <Text style={styles.bannerAdPillText}>AD</Text>
              </View>
              <View style={styles.bannerRow}>
                <View style={styles.bannerMediaBox}>
                  {primaryAdImage ? (
                    <Image source={{ uri: primaryAdImage }} style={styles.bannerImg} contentFit="cover" transition={200} />
                  ) : (
                    <View style={[styles.bannerImg, styles.feedPlaceholderFrame]}>
                      <Camera size={16} color={theme.colors.ink400} />
                    </View>
                  )}
                </View>
                <View style={styles.bannerTextCol}>
                  <Text style={styles.bannerHeadline} numberOfLines={1}>
                    {adCreative.headline || 'Your Ad Headline'}
                  </Text>
                  <Text style={styles.bannerDesc} numberOfLines={2}>
                    {adCreative.description || 'Community message distributed across vetted sites.'}
                  </Text>
                  <View style={styles.bannerCtaBox}>
                    <Text style={styles.bannerCtaText}>{adCreative.cta || 'Learn more'}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    padding: theme.spacing.base,
    paddingBottom: 48,
    gap: theme.spacing.md,
  },
  headerBox: {
    marginBottom: 4,
  },
  stepTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 22,
    lineHeight: 28,
    color: theme.colors.ink900,
  },
  stepSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.ink600,
    marginTop: 4,
  },
  statusSection: {
    marginBottom: 2,
  },
  readyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: theme.colors.successBg,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: theme.spacing.md,
  },
  statusCol: {
    flex: 1,
  },
  readyTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.success,
  },
  readyBody: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.ink700,
    marginTop: 2,
  },
  warningsCard: {
    backgroundColor: theme.colors.dangerBg,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: theme.spacing.md,
    gap: 8,
  },
  warningsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningsTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.danger,
  },
  warningsList: {
    gap: 6,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  warningBullet: {
    fontSize: 12,
    color: theme.colors.danger,
    lineHeight: 18,
  },
  warningText: {
    flex: 1,
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.ink800,
  },
  indicativeCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  indicativeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  indicativeIconBox: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicativeTitleCol: {
    flex: 1,
  },
  indicativeTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.ink900,
  },
  indicativeSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.ink500,
    marginTop: 1,
  },
  indicativeResultBox: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    gap: 4,
  },
  indicativeGoalNote: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    color: theme.colors.ink500,
  },
  indicativePendingBox: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
  },
  indicativePendingText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.ink800,
  },
  indicativePendingSubtext: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    color: theme.colors.ink500,
    marginTop: 2,
  },
  groupHeaderRow: {
    marginTop: theme.spacing.sm,
    marginBottom: 2,
    gap: 4,
  },
  groupBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.xs,
  },
  groupBadgeText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: theme.colors.primary800,
  },
  groupBadgeReview: {
    backgroundColor: theme.colors.slate200,
  },
  groupBadgeTextReview: {
    color: theme.colors.ink800,
  },
  groupHeaderDescription: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.ink600,
  },
  card: {
    padding: theme.spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: theme.spacing.md,
  },
  sectionIconBadge: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleCol: {
    flex: 1,
  },
  titleWithRequiredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  sectionHeading: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 15,
    color: theme.colors.ink900,
  },
  requiredStar: {
    color: theme.colors.danger,
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 14,
  },
  optionalBadge: {
    backgroundColor: theme.colors.bgMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.xs,
  },
  optionalBadgeText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 10,
    color: theme.colors.ink600,
  },
  sectionHelper: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.ink500,
    marginTop: 2,
  },
  worldwideBtn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: theme.colors.bgMuted,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  worldwideBtnActive: {
    backgroundColor: theme.colors.primary50,
    borderColor: theme.colors.primary600,
  },
  checkboxCircle: {
    width: 20,
    height: 20,
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    borderColor: theme.colors.ink400,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxCircleActive: {
    backgroundColor: theme.colors.primary600,
    borderColor: theme.colors.primary600,
  },
  worldwideTextCol: {
    flex: 1,
  },
  worldwideTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.ink800,
  },
  worldwideTitleActive: {
    color: theme.colors.primary800,
  },
  worldwideDesc: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.ink600,
    marginTop: 2,
  },
  selectedLocationsSection: {
    marginBottom: theme.spacing.md,
  },
  selectedLocationsLabel: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.ink700,
    marginBottom: 6,
  },
  noLocationsNotice: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    fontStyle: 'italic',
    color: theme.colors.ink400,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  locationChipSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary50,
    borderColor: theme.colors.primary100,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  locationChipSelectedText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.primary800,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bgMuted,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.input,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: theme.spacing.md,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.ink900,
    padding: 0,
  },
  curatedList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  locationChipActive: {
    backgroundColor: theme.colors.primary600,
    borderColor: theme.colors.primary600,
  },
  locationChipText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.ink700,
  },
  locationChipTextActive: {
    color: '#FFFFFF',
  },
  subSectionBox: {
    marginTop: theme.spacing.sm,
  },
  subSectionLabel: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.ink800,
    marginBottom: 6,
  },
  subSectionHelper: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.ink500,
    marginBottom: 8,
  },
  ageChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  ageChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.bgMuted,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  ageChipSelected: {
    backgroundColor: theme.colors.primary50,
    borderColor: theme.colors.primary600,
  },
  ageChipText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.ink700,
  },
  ageChipTextSelected: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    color: theme.colors.primary700,
  },
  interestsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  interestsCount: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
    color: theme.colors.primary600,
  },
  themeGroupBlock: {
    marginTop: 8,
  },
  themeGroupName: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.ink600,
    marginBottom: 6,
  },
  themeInterestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.bgMuted,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  interestChipSelected: {
    backgroundColor: theme.colors.primary600,
    borderColor: theme.colors.primary600,
  },
  interestChipText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    color: theme.colors.ink800,
  },
  interestChipTextSelected: {
    fontFamily: theme.typography.fonts.uiMedium,
    color: '#FFFFFF',
  },
  channelCardsList: {
    gap: 10,
  },
  channelCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.card,
    padding: theme.spacing.md,
    gap: 6,
  },
  channelCardSelected: {
    backgroundColor: theme.colors.primary50,
    borderColor: theme.colors.primary600,
  },
  channelCardDisabled: {
    backgroundColor: theme.colors.bgMuted,
    borderColor: theme.colors.line,
    opacity: 0.8,
  },
  channelCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  channelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  channelCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.ink400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelCheckboxSelected: {
    backgroundColor: theme.colors.primary600,
    borderColor: theme.colors.primary600,
  },
  channelCheckboxDisabled: {
    borderColor: theme.colors.ink400,
    backgroundColor: theme.colors.slate200,
  },
  channelCardName: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.ink900,
  },
  channelCardNameSelected: {
    color: theme.colors.primary800,
  },
  channelCardNameDisabled: {
    color: theme.colors.ink500,
  },
  channelStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  channelPillAvailable: {
    backgroundColor: theme.colors.successBg,
  },
  channelPillComingSoon: {
    backgroundColor: theme.colors.slate200,
  },
  channelStatusPillText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  channelPillTextAvailable: {
    color: theme.colors.success,
  },
  channelPillTextComingSoon: {
    color: theme.colors.ink600,
  },
  channelCardDescription: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.ink600,
  },
  channelCardDescDisabled: {
    color: theme.colors.ink400,
  },
  disabledReasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: theme.colors.slate100,
    borderRadius: theme.radius.xs,
    padding: 8,
    marginTop: 4,
  },
  disabledReasonText: {
    flex: 1,
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.ink700,
  },
  allocationStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  allocationStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  allocationTotalLabel: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.ink800,
  },
  totalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.xs,
  },
  totalBadgeSuccess: {
    backgroundColor: theme.colors.successBg,
  },
  totalBadgeError: {
    backgroundColor: theme.colors.dangerBg,
  },
  totalBadgeText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 12,
  },
  totalBadgeTextSuccess: {
    color: theme.colors.success,
  },
  totalBadgeTextError: {
    color: theme.colors.danger,
  },
  resetAllocationBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resetAllocationBtnText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.primary600,
  },
  multiSegmentBar: {
    height: 10,
    flexDirection: 'row',
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    backgroundColor: theme.colors.slate200,
    marginBottom: theme.spacing.md,
  },
  segmentSlice: {
    height: '100%',
  },
  stepperRowsContainer: {
    gap: 10,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.bgMuted,
    borderRadius: theme.radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  stepperChannelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  channelColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepperChannelName: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.ink900,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    opacity: 0.4,
  },
  percentageDisplayBox: {
    minWidth: 42,
    alignItems: 'center',
  },
  percentageDisplayText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 13,
    color: theme.colors.ink900,
  },
  durationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  durationCurrentBadge: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    color: theme.colors.primary600,
  },
  segmentedPresetsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.bgMuted,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  presetChipSelected: {
    backgroundColor: theme.colors.primary50,
    borderColor: theme.colors.primary600,
  },
  presetChipText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.ink700,
  },
  presetChipTextSelected: {
    fontFamily: theme.typography.fonts.uiBold,
    color: theme.colors.primary700,
  },
  customDurationInputBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: theme.colors.bgMuted,
    borderRadius: theme.radius.sm,
    gap: 6,
  },
  customDurationLabel: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
    color: theme.colors.ink700,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customDurationInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.xs,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 14,
    color: theme.colors.ink900,
    width: 60,
    textAlign: 'center',
  },
  customDurationUnit: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.ink600,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  reviewMainTitle: {
    flex: 1,
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 15,
    color: theme.colors.ink900,
  },
  reviewGrid: {
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  reviewFeatureCard: {
    backgroundColor: theme.colors.bgMuted,
    borderRadius: theme.radius.sm,
    padding: 10,
    gap: 2,
  },
  reviewFeatureTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    color: theme.colors.ink900,
  },
  reviewFeatureDesc: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.ink600,
  },
  permanentNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.primary50,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
  },
  permanentNoteText: {
    flex: 1,
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.primary800,
  },
  narrativeSummaryBox: {
    backgroundColor: theme.colors.bgMuted,
    borderRadius: theme.radius.card,
    padding: theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary600,
    marginBottom: theme.spacing.md,
  },
  narrativeSummaryText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.ink800,
  },
  placementPreviewWrapper: {
    gap: 8,
  },
  placementSegmented: {
    marginBottom: 4,
  },
  previewDisclaimerText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    color: theme.colors.ink500,
    textAlign: 'center',
    marginBottom: 4,
  },
  feedPreviewCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.card,
    overflow: 'hidden',
  },
  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
  },
  feedHeaderCol: {
    flex: 1,
  },
  feedCreatorName: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    color: theme.colors.ink900,
  },
  feedSponsoredLabel: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 10,
    color: theme.colors.ink500,
  },
  feedMediaFrame: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: theme.colors.slate100,
  },
  feedMediaImg: {
    width: '100%',
    height: '100%',
  },
  feedPlaceholderFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 16,
  },
  feedPlaceholderText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    color: theme.colors.ink400,
  },
  feedContentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    gap: 8,
  },
  feedContentCol: {
    flex: 1,
    gap: 2,
  },
  feedHeadlineText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 12,
    color: theme.colors.ink900,
  },
  feedDescText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.ink600,
  },
  feedCtaBtn: {
    backgroundColor: theme.colors.primary600,
    borderRadius: theme.radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  feedCtaBtnText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  storyPreviewFrame: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: theme.radius.card,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000000',
  },
  storyBgImg: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  storyTopOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    gap: 8,
  },
  storyBar: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 1,
  },
  storyAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storyAuthorName: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  storyBottomOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: theme.radius.sm,
    padding: 10,
  },
  storyHeadline: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  storyDesc: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 15,
  },
  storyCtaPill: {
    backgroundColor: theme.colors.primary600,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    paddingVertical: 6,
    marginTop: 4,
  },
  storyCtaText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  bannerPreviewCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.card,
    padding: 10,
    gap: 6,
    position: 'relative',
  },
  bannerAdPill: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: theme.colors.slate200,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  bannerAdPillText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 9,
    color: theme.colors.ink600,
  },
  bannerRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  bannerMediaBox: {
    width: 60,
    height: 60,
    borderRadius: theme.radius.xs,
    overflow: 'hidden',
    backgroundColor: theme.colors.slate100,
  },
  bannerImg: {
    width: '100%',
    height: '100%',
  },
  bannerTextCol: {
    flex: 1,
    gap: 2,
  },
  bannerHeadline: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 12,
    color: theme.colors.ink900,
  },
  bannerDesc: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 10,
    lineHeight: 14,
    color: theme.colors.ink600,
  },
  bannerCtaBox: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary600,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 2,
  },
  bannerCtaText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 10,
    color: '#FFFFFF',
  },
});
