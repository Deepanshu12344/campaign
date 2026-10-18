import React from 'react';
import { StyleSheet, View, Text, Platform, ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Compass, Plus, Bell } from 'lucide-react-native';
import { theme } from '../../theme';
import { useNotifications } from '../../api/hooks/useActivity';
import { useAuthStore } from '../../store/authStore';

function ActivityTabIcon({ color }: { color?: ColorValue }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data } = useNotifications();
  const unreadCount = isAuthenticated ? data?.unreadCount ?? 0 : 0;
  const resolvedColor = typeof color === 'string' ? color : theme.colors.tabBarInactive;

  return (
    <View style={styles.iconContainer}>
      <Bell size={22} color={resolvedColor} strokeWidth={2} />
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

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 6 : 4);
  const barHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.tabBarActive, // #9FE870
        tabBarInactiveTintColor: theme.colors.tabBarInactive, // #A8ADA5
        tabBarStyle: {
          height: barHeight,
          paddingTop: 6,
          paddingBottom: bottomPadding,
          backgroundColor: theme.colors.tabBarBg, // #1F221E
          borderTopWidth: 1,
          borderTopColor: theme.colors.tabBarBorder, // #262924
          elevation: 0,
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
          tabBarIcon: ({ color }) => <Home size={22} color={color} strokeWidth={2} />,
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarLabel: 'Explore',
          tabBarIcon: ({ color }) => <Compass size={22} color={color} strokeWidth={2} />,
        }}
      />

      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarLabel: 'Create',
          tabBarIcon: ({ color }) => <Plus size={22} color={color} strokeWidth={2} />,
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
          href: null,
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
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
    backgroundColor: theme.colors.lime,
    borderRadius: theme.radii.pill,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.tabBarBg,
  },
  badgeText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 9,
    lineHeight: 11,
    color: theme.colors.onLime,
  },
});
