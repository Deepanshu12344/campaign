import React from 'react';
import { StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native';
import { Image, ImageStyle } from 'expo-image';
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
  style?: StyleProp<ViewStyle | ImageStyle>;
}

export function Avatar({
  imageUrl,
  uri,
  name = 'Anonymous',
  size = 40,
  style,
}: AvatarProps) {
  const pixelSize = typeof size === 'number' ? size : AVATAR_SIZES[size] ?? 40;
  const initials = getInitials(name);
  const bgColor = getAvatarColor(name);
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

  return (
    <View
      style={[
        styles.fallbackContainer,
        {
          width: pixelSize,
          height: pixelSize,
          borderRadius: pixelSize / 2,
          backgroundColor: bgColor,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={`Avatar for ${name}`}
    >
      <Text
        style={[
          styles.initialsText,
          { fontSize: Math.max(Math.round(pixelSize * 0.4), 11) },
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

function getAvatarColor(name: string): string {
  const palette = [
    '#4F46E5', // Primary indigo
    '#0284C7', // Info blue
    '#059669', // Emerald
    '#D97706', // Amber
    '#7C3AED', // Purple
    '#DB2777', // Pink
    '#475569', // Slate
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % palette.length;
  return palette[index] ?? '#4F46E5';
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: theme.colors.line,
  },
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontFamily: theme.typography.fonts.uiBold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
