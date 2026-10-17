import React from 'react';
import { StyleSheet, View, Text, Platform, ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Compass, Plus, Bell, User } from 'lucide-react-native';
import { theme } from '../../theme';
import { useNotifications } from '../../api/hooks/useActivity';
import { useAuthStore } from '../../store/authStore';

function ActivityTabIcon({ color }: { color?: ColorValue }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data } = useNotifications();
  const unreadCount = isAuthenticated ? data?.unreadCount ?? 0 : 0;
  const resolvedColor = typeof color === 'string' ? color : theme.colors.ink500;

  return (
    <View style={styles.iconContainer}>
      <Bell size={22} color={resolvedColor} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </View>
  );
}

function CreateTabIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.createIconWrapper, focused && styles.createIconWrapperActive]}>
      <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 6 : 4);
  const barHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary600,
        tabBarInactiveTintColor: theme.colors.ink500,
        tabBarStyle: {
          height: barHeight,
          paddingTop: 6,
          paddingBottom: bottomPadding,
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.line,
          elevation: 8,
          shadowColor: theme.colors.black,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontFamily: theme.typography.fonts.uiMedium,
          fontSize: 11,
          lineHeight: 14,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarLabel: 'Explore',
          tabBarIcon: ({ color }) => <Compass size={22} color={color} />,
        }}
      />

      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarLabel: 'Create',
          tabBarIcon: ({ focused }) => <CreateTabIcon focused={focused} />,
        }}
      />

      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarLabel: 'Activity',
          tabBarIcon: ({ color }) => <ActivityTabIcon color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <User size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  createIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary600,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary600,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  createIconWrapperActive: {
    backgroundColor: theme.colors.primary700,
    transform: [{ scale: 1.05 }],
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radius.pill,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.surface,
  },
  badgeText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 9,
    lineHeight: 11,
    color: theme.colors.white,
  },
});
