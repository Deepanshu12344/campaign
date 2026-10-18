import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../store/authStore';

export interface HeaderAvatarProps {
  size?: number;
}

export function HeaderAvatar({ size = 36 }: HeaderAvatarProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  return (
    <Pressable
      onPress={() => router.push('/(tabs)/profile')}
      accessibilityRole="button"
      accessibilityLabel="Open profile"
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      hitSlop={8}
    >
      <Avatar
        name={user?.name || 'Guest'}
        imageUrl={user?.avatarUrl}
        size={size}
        isGuest={!isAuthenticated}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
});
