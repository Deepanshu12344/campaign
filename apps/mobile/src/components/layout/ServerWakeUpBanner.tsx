import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../../api';
import { theme } from '../../theme';

export function ServerWakeUpBanner() {
  const [isWakingUp, setIsWakingUp] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsubscribe = apiClient.onServerWakeUp((waking) => {
      setIsWakingUp(waking);
    });
    return unsubscribe;
  }, []);

  if (!isWakingUp) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeInUp.duration(250)}
      exiting={FadeOutUp.duration(200)}
      style={[styles.banner, { top: insets.top > 0 ? insets.top : 8 }]}
      pointerEvents="none"
    >
      <View style={styles.card}>
        <ActivityIndicator size="small" color={theme.colors.amber600 || '#D97706'} style={styles.spinner} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Waking up the server...</Text>
          <Text style={styles.subtitle}>Free tier instances take a moment to spin up</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 9999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7', // Amber 100
    borderColor: '#F59E0B',     // Amber 500
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  spinner: {
    marginRight: theme.spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: '#92400E', // Amber 800
    fontWeight: '600',
  },
  subtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    color: '#B45309', // Amber 700
    marginTop: 1,
  },
});
