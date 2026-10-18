import React from 'react';
import { StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native';
import { Image, ImageStyle } from 'expo-image';
import { User } from 'lucide-react-native';
import { theme } from '../../theme';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl' | number;

const AVATAR_SIZES: Record<'sm' | 'md' | 'lg' | 'xl', number> = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

export interface AvatarProps {
  imageUrl?: string | null;
  uri?: string | null;
  name?: string;
  size?: AvatarSize;
  isGuest?: boolean;
  style?: StyleProp<ViewStyle | ImageStyle>;
}

export function Avatar({
  imageUrl,
  uri,
  name = 'Anonymous',
  size = 40,
  isGuest = false,
  style,
}: AvatarProps) {
  const pixelSize = typeof size === 'number' ? size : AVATAR_SIZES[size] ?? 40;
  const initials = getInitials(name);
  const resolvedUri = imageUrl || uri;

  if (resolvedUri) {
    return (
      <Image
        source={{ uri: resolvedUri }}
        style={[
          styles.avatar,
          { width: pixelSize, height: pixelSize, borderRadius: pixelSize / 2 },
          style as StyleProp<ImageStyle>,
        ]}
        contentFit="cover"
        transition={150}
      />
    );
  }

  if (isGuest || name === 'Guest' || name === 'Anonymous') {
    return (
      <View
        style={[
          styles.fallbackContainer,
          {
            width: pixelSize,
            height: pixelSize,
            borderRadius: pixelSize / 2,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.line,
          },
          style,
        ]}
        accessibilityRole="image"
        accessibilityLabel="Guest user avatar"
      >
        <User size={Math.round(pixelSize * 0.5)} color={theme.colors.lime} strokeWidth={2} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.fallbackContainer,
        {
          width: pixelSize,
          height: pixelSize,
          borderRadius: pixelSize / 2,
          backgroundColor: theme.colors.lime, // Lime circle
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={`Avatar for ${name}`}
    >
      <Text
        style={[
          styles.initialsText,
          { fontSize: Math.max(Math.round(pixelSize * 0.38), 11) },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  const first = parts[0]?.[0] || '';
  const second = parts[1]?.[0] || '';
  return (first + second).toUpperCase();
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: theme.colors.surface,
  },
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontFamily: theme.typography.fonts.uiBold,
    color: theme.colors.onLime, // Dark green text on lime
    letterSpacing: 0.5,
  },
});
