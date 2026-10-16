import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Newsreader_400Regular,
  Newsreader_500Medium_Italic,
  Newsreader_600SemiBold,
  Newsreader_700Bold,
} from '@expo-google-fonts/newsreader';
import { ToastProvider } from '../components/ui/Toast';
import { theme } from '../theme';

// Hold splash screen visible while loading custom fonts
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore on web/hot-reload */
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
    'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
    'Newsreader-Regular': Newsreader_400Regular,
    'Newsreader-MediumItalic': Newsreader_500Medium_Italic,
    'Newsreader-SemiBold': Newsreader_600SemiBold,
    'Newsreader-Bold': Newsreader_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {
        /* ignore */
      });
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.colors.surface,
            },
            headerTintColor: theme.colors.ink900,
            headerTitleStyle: {
              fontFamily: theme.typography.fonts.uiSemiBold,
              fontSize: theme.typography.styles.h3.fontSize,
            },
            contentStyle: {
              backgroundColor: theme.colors.bg,
            },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Campaigns' }} />
          <Stack.Screen name="dev/components" options={{ title: 'Design System Gallery' }} />
        </Stack>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
