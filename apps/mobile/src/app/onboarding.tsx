import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, {
  Circle,
  Path,
  Rect,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { ArrowLeft } from 'lucide-react-native';
import { theme } from '../theme';
import { Button, IconButton, ArrowButton } from '../components/ui';

// Original Vector Illustration 1: Amplification & Signal Broadcast
function BroadcastIllustration() {
  return (
    <View style={styles.illustrationWrapper}>
      <Svg width={260} height={180} viewBox="0 0 260 180" fill="none">
        <Defs>
          <LinearGradient id="coneGrad" x1="50" y1="90" x2="160" y2="90" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#163300" />
            <Stop offset="100%" stopColor="#2A2D29" />
          </LinearGradient>
          <LinearGradient id="beamGrad" x1="160" y1="90" x2="260" y2="90" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#9FE870" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#9FE870" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Outer ambient glow circle */}
        <Circle cx="90" cy="90" r="70" fill="#1B1E19" />

        {/* Expanding broadcast beam fan */}
        <Path d="M 120 90 L 250 20 L 250 160 Z" fill="url(#beamGrad)" />

        {/* Megaphone/transmitter horn */}
        <Path
          d="M 60 76 L 75 76 L 130 50 C 136 47, 142 51, 142 58 L 142 122 C 142 129, 136 133, 130 130 L 75 104 L 60 104 C 55 104, 50 100, 50 94 L 50 86 C 50 80, 55 76, 60 76 Z"
          fill="url(#coneGrad)"
          stroke="#3F423E"
          strokeWidth="2"
        />

        {/* Focal circle inside transmitter */}
        <Circle cx="95" cy="90" r="14" fill="#9FE870" />

        {/* Radiating signal arcs */}
        <Path
          d="M 165 65 A 35 35 0 0 1 165 115"
          stroke="#9FE870"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <Path
          d="M 195 48 A 65 65 0 0 1 195 132"
          stroke="#9FE870"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <Path
          d="M 225 32 A 95 95 0 0 1 225 148"
          stroke="#9FE870"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Modern decorative nodes */}
        <Circle cx="245" cy="40" r="4" fill="#9FE870" />
        <Circle cx="248" cy="90" r="5" fill="#9FE870" />
        <Circle cx="245" cy="140" r="4" fill="#9FE870" />
      </Svg>
    </View>
  );
}

// Original Vector Illustration 2: Real Reach Math & Ad Distribution
function ReachMathIllustration() {
  return (
    <View style={styles.illustrationWrapper}>
      <Svg width={260} height={180} viewBox="0 0 260 180" fill="none">
        {/* Background circular radar */}
        <Circle cx="130" cy="90" r="75" stroke="#262924" strokeWidth="2" strokeDasharray="6 6" />
        <Circle cx="130" cy="90" r="50" stroke="#3F423E" strokeWidth="2" />
        <Circle cx="130" cy="90" r="24" fill="#163300" stroke="#9FE870" strokeWidth="2" />

        {/* Central Dollar icon -> converting into ad impressions */}
        <Path
          d="M 130 80 L 130 100 M 125 84 C 125 82, 135 82, 135 87 C 135 92, 125 91, 125 96 C 125 100, 135 100, 135 98"
          stroke="#9FE870"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Target Reach Badge in radar space */}
        <Rect x="20" y="24" width="105" height="32" rx="16" fill="#2A2D29" stroke="#3F423E" strokeWidth="1" />
        <Circle cx="36" cy="40" r="6" fill="#9FE870" />
        <Rect x="48" y="36" width="62" height="8" rx="4" fill="#F2F5EE" />

        {/* Ad Impression Output Badge */}
        <Rect x="145" y="125" width="100" height="32" rx="16" fill="#163300" stroke="#9FE870" strokeWidth="1.5" />
        <Rect x="160" y="137" width="55" height="8" rx="4" fill="#9FE870" />
        <Circle cx="230" cy="141" r="5" fill="#9FE870" />

        {/* Flow connection vector */}
        <Path
          d="M 130 66 L 130 35 L 125 35"
          stroke="#9FE870"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <Path
          d="M 130 114 L 130 141 L 145 141"
          stroke="#9FE870"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

// Original Vector Illustration 3: Verified Stories & Transparent Tracking
function VerifiedMetricsIllustration() {
  return (
    <View style={styles.illustrationWrapper}>
      <Svg width={260} height={180} viewBox="0 0 260 180" fill="none">
        {/* Background rounded card */}
        <Rect x="55" y="25" width="150" height="130" rx="20" fill="#2A2D29" stroke="#3F423E" strokeWidth="1.5" />

        {/* Verified Shield Badge at Top */}
        <Circle cx="130" cy="60" r="26" fill="#163300" stroke="#9FE870" strokeWidth="2.5" />
        {/* Checkmark */}
        <Path
          d="M 121 60 L 127 66 L 139 54"
          stroke="#9FE870"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Metric bars representing transparent analytics */}
        <Rect x="75" y="102" width="110" height="8" rx="4" fill="#3F423E" />
        <Rect x="75" y="102" width="75" height="8" rx="4" fill="#9FE870" />

        <Rect x="75" y="120" width="110" height="8" rx="4" fill="#3F423E" />
        <Rect x="75" y="120" width="95" height="8" rx="4" fill="#9FE870" />

        {/* Source citation nodes on left and right */}
        <Circle cx="30" cy="90" r="14" fill="#1B1E19" stroke="#3F423E" strokeWidth="1.5" />
        <Path d="M 26 90 L 34 90 M 30 86 L 30 94" stroke="#A8ADA5" strokeWidth="2" strokeLinecap="round" />

        <Circle cx="230" cy="90" r="14" fill="#163300" stroke="#9FE870" strokeWidth="1.5" />
        <Circle cx="230" cy="90" r="5" fill="#9FE870" />

        <Path d="M 44 90 L 55 90" stroke="#3F423E" strokeWidth="2" strokeDasharray="3 3" />
        <Path d="M 205 90 L 216 90" stroke="#9FE870" strokeWidth="2" />
      </Svg>
    </View>
  );
}

const ONBOARDING_SLIDES = [
  {
    step: 1,
    headline: 'SPREAD THE WORD NOT JUST POSTS',
    body: 'Transform important messages into targeted digital advertising campaigns that reach beyond echo chambers to inform real audiences.',
    illustration: <BroadcastIllustration />,
  },
  {
    step: 2,
    headline: 'NOT A DONATION. REAL REACH.',
    body: '100% of contributions strictly fund external ad distribution. Every single dollar expands audience reach backed by public formulas.',
    illustration: <ReachMathIllustration />,
  },
  {
    step: 3,
    headline: 'VERIFIED STORIES. TRANSPARENT METRICS.',
    body: 'Every claim backed by public citations. Track verified impressions and ad distribution performance in real time.',
    illustration: <VerifiedMetricsIllustration />,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slide?: string }>();
  const initialSlide = params.slide ? Math.max(0, Math.min(2, parseInt(params.slide, 10) - 1)) : 0;
  const [slideIndex, setSlideIndex] = useState(initialSlide);

  const currentSlide = ONBOARDING_SLIDES[slideIndex];
  const isLast = slideIndex === ONBOARDING_SLIDES.length - 1;

  const handleNext = () => {
    if (isLast) {
      router.replace('/welcome');
    } else {
      setSlideIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (slideIndex > 0) {
      setSlideIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    router.replace('/welcome');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      {/* Top Header: 3-Segment Progress Bar + Skip */}
      <View style={styles.topBar}>
        <View style={styles.segmentsRow}>
          {ONBOARDING_SLIDES.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.segmentBar,
                idx <= slideIndex ? styles.segmentActive : styles.segmentInactive,
              ]}
            />
          ))}
        </View>

        <Pressable
          onPress={handleSkip}
          style={styles.skipButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {/* Main Slide Content */}
      <View style={styles.content}>
        {/* Original Graphic Illustration */}
        <View style={styles.illustrationArea}>
          {currentSlide.illustration}
        </View>

        {/* Slide Copy Area */}
        <View style={styles.copyArea}>
          <Text style={styles.headline}>
            {currentSlide.headline}
          </Text>
          <Text style={styles.body}>
            {currentSlide.body}
          </Text>
        </View>

        {/* Footer Navigation Area */}
        <View style={styles.footer}>
          {isLast ? (
            <Button
              title="GET STARTED"
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleNext}
            />
          ) : (
            <View style={styles.controlsRow}>
              {slideIndex > 0 ? (
                <IconButton
                  icon={<ArrowLeft size={20} color={theme.colors.textPrimary} strokeWidth={2} />}
                  onPress={handleBack}
                  accessibilityLabel="Previous slide"
                />
              ) : (
                <View style={{ width: 44 }} />
              )}

              <ArrowButton
                onPress={handleNext}
                accessibilityLabel="Next slide"
              />
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  topBar: {
    paddingHorizontal: theme.spacing.horizontal,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  segmentsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: theme.spacing.base,
  },
  segmentBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  segmentActive: {
    backgroundColor: theme.colors.lime,
  },
  segmentInactive: {
    backgroundColor: theme.colors.surfaceRaised,
  },
  skipButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  skipText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.horizontal,
    justifyContent: 'space-between',
    paddingBottom: theme.spacing.lg,
  },
  illustrationArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    maxHeight: 280,
  },
  illustrationWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyArea: {
    marginBottom: theme.spacing.xl,
  },
  headline: {
    fontFamily: theme.typography.fonts.display,
    fontSize: 30,
    lineHeight: 33,
    color: theme.colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    marginBottom: theme.spacing.md,
  },
  body: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.textSecondary,
  },
  footer: {
    paddingBottom: theme.spacing.sm,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
