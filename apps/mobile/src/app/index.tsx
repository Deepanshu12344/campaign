import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, Layers, ArrowRight } from 'lucide-react-native';
import { theme } from '../theme';
import { Button, Card, DemoDataBadge } from '../components/ui';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <View style={styles.badgeRow}>
          <DemoDataBadge size="md" />
        </View>

        <View style={styles.iconCircle}>
          <Layers size={32} color={theme.colors.primary600} />
        </View>

        <Text style={styles.title}>Campaigns</Text>
        <Text style={styles.tagline}>
          Community-funded message amplification & public-interest ad distribution
        </Text>

        <View style={styles.divider} />

        <Text style={styles.description}>
          Phase 2 Design System is fully mounted. Explore the comprehensive
          component library, tokens, interactive states, and mock campaign feeds.
        </Text>

        <View style={styles.actionWrap}>
          <Button
            title="Open Component Showcase"
            variant="primary"
            size="lg"
            fullWidth
            iconLeft={<Sparkles size={18} color="#FFFFFF" />}
            iconRight={<ArrowRight size={18} color="#FFFFFF" />}
            onPress={() => router.push('/dev/components')}
          />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bg,
    padding: theme.spacing.base,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  badgeRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: theme.spacing.base,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.base,
  },
  title: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: theme.typography.styles.h1.fontSize,
    lineHeight: theme.typography.styles.h1.lineHeight,
    color: theme.colors.ink900,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  tagline: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: theme.typography.styles.body.fontSize,
    lineHeight: theme.typography.styles.body.lineHeight,
    color: theme.colors.primary700,
    textAlign: 'center',
    marginBottom: theme.spacing.base,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: theme.colors.line,
    marginVertical: theme.spacing.sm,
  },
  description: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.ink600,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  actionWrap: {
    width: '100%',
  },
});
