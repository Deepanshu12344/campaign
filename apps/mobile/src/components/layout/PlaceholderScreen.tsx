import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Layers } from 'lucide-react-native';
import { theme } from '../../theme';
import { SharedHeader } from './SharedHeader';
import { Card, Button, DemoDataBadge } from '../ui';

export interface PlaceholderAction {
  label: string;
  route?: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

export interface PlaceholderScreenProps {
  title: string;
  subtitle?: string;
  routePath: string;
  description?: string;
  showBack?: boolean;
  fallbackRoute?: string;
  stepConfig?: {
    currentStep: number;
    totalSteps?: number;
    labels?: string[];
  };
  actions?: PlaceholderAction[];
  children?: React.ReactNode;
}

export function PlaceholderScreen({
  title,
  subtitle,
  routePath,
  description = 'This screen structure is mounted as part of the Expo Router navigation shell. Feature implementations will be populated in subsequent phases.',
  showBack = true,
  fallbackRoute = '/(tabs)',
  stepConfig,
  actions = [],
  children,
}: PlaceholderScreenProps) {
  const router = useRouter();

  return (
    <View style={styles.screenContainer}>
      <SharedHeader
        title={title}
        subtitle={subtitle}
        showBack={showBack}
        fallbackRoute={fallbackRoute}
        stepConfig={stepConfig}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <View style={styles.badgeRow}>
            <DemoDataBadge size="sm" />
            <View style={styles.routePill}>
              <Text style={styles.routeText}>{routePath}</Text>
            </View>
          </View>

          <View style={styles.iconCircle}>
            <Layers size={28} color={theme.colors.primary600} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          {children}

          {actions.length > 0 && (
            <View style={styles.actionsContainer}>
              {actions.map((act, idx) => (
                <Button
                  key={idx}
                  title={act.label}
                  variant={act.variant || (idx === 0 ? 'primary' : 'secondary')}
                  size="md"
                  fullWidth
                  onPress={() => {
                    if (act.onPress) {
                      act.onPress();
                    } else if (act.route) {
                      router.push(act.route as Href);
                    }
                  }}
                />
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollContent: {
    padding: theme.spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  badgeRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.base,
  },
  routePill: {
    backgroundColor: theme.colors.bgMuted,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  routeText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.caption.fontSize,
    color: theme.colors.ink500,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.base,
  },
  title: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: theme.typography.styles.h2.fontSize,
    lineHeight: theme.typography.styles.h2.lineHeight,
    color: theme.colors.ink900,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  description: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.small.fontSize,
    lineHeight: theme.typography.styles.small.lineHeight,
    color: theme.colors.ink700,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  actionsContainer: {
    width: '100%',
    gap: theme.spacing.sm,
  },
});
