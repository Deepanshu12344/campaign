import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, {
  Circle,
  Path,
  Rect,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { theme } from '../theme';
import { Button } from '../components/ui';

function WelcomeLogoGraphic() {
  return (
    <View style={styles.logoWrap}>
      <Svg width={136} height={136} viewBox="0 0 180 180" fill="none">
        <Defs>
          <LinearGradient id="welcomeGlow" x1="0" y1="0" x2="180" y2="180" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#163300" />
            <Stop offset="100%" stopColor="#121511" />
          </LinearGradient>
        </Defs>

        {/* Ambient Container Card */}
        <Rect x="10" y="10" width="160" height="160" rx="36" fill="url(#welcomeGlow)" stroke="#262924" strokeWidth="2" />

        {/* Megaphone / Signal Cone */}
        <Path
          d="M 42 77 L 55 77 L 102 55 C 107 52, 112 55, 112 61 L 112 119 C 112 125, 107 128, 102 125 L 55 103 L 42 103 C 38 103, 35 100, 35 96 L 35 84 C 35 80, 38 77, 42 77 Z"
          fill="#163300"
          stroke="#9FE870"
          strokeWidth="2.5"
        />

        {/* Center transmitter node */}
        <Circle cx="72" cy="90" r="10" fill="#9FE870" />

        {/* Signal arcs */}
        <Path
          d="M 124 72 A 24 24 0 0 1 124 108"
          stroke="#9FE870"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <Path
          d="M 138 60 A 42 42 0 0 1 138 120"
          stroke="#9FE870"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header / Branding */}
        <View style={styles.topArea}>
          <WelcomeLogoGraphic />

          <Text style={styles.brandTitle}>CAMPAIGNS</Text>
          <Text style={styles.headline}>AMPLIFY WHAT MATTERS</Text>
          <Text style={styles.subtitle}>
            Fund targeted digital ad distribution to spread verified public messages beyond echo chambers.
          </Text>
        </View>

        {/* Actions Area */}
        <View style={styles.actionArea}>
          {/* Side-by-side or stacked Log in / Register pills */}
          <View style={styles.authButtonsRow}>
            <View style={styles.flexButton}>
              <Button
                title="Log in"
                variant="secondary"
                size="md"
                fullWidth
                onPress={() => router.push('/auth/sign-in')}
              />
            </View>
            <View style={styles.flexButton}>
              <Button
                title="Register"
                variant="primary"
                size="md"
                fullWidth
                onPress={() => router.push('/auth/sign-up')}
              />
            </View>
          </View>

          {/* Continue as guest white pill button */}
          <Button
            title="Continue as guest"
            variant="white"
            size="md"
            fullWidth
            onPress={() => router.replace('/(tabs)')}
            style={styles.guestButton}
          />

          {/* Secondary Tour Link */}
          <View style={styles.tourLinksRow}>
            <Button
              title="Tour Onboarding"
              variant="ghost"
              size="sm"
              onPress={() => router.push('/onboarding')}
            />
          </View>

          {/* Invariant Disclosure Statement */}
          <Text style={styles.legalDisclaimer}>
            NOT A DONATION · CONTRIBUTIONS STRICTLY FUND EXTERNAL DIGITAL AD DISTRIBUTION
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.horizontal,
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  topArea: {
    alignItems: 'center',
    paddingTop: theme.spacing.xs,
  },
  logoWrap: {
    marginBottom: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 12,
    letterSpacing: 2,
    color: theme.colors.lime,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  headline: {
    fontFamily: theme.typography.fonts.display,
    fontSize: 28,
    lineHeight: 30,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  actionArea: {
    width: '100%',
    gap: 8,
    marginTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  authButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  flexButton: {
    flex: 1,
  },
  guestButton: {
    marginTop: 0,
  },
  tourLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 2,
  },
  bulletSeparator: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  legalDisclaimer: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 9.5,
    lineHeight: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
