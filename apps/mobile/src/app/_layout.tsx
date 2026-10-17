import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import { useAuthStore } from '../store/authStore';
import { AuthGateProvider } from '../auth/requireAuth';
import { GlobalErrorBoundary } from '../components/layout/GlobalErrorBoundary';
import { OfflineBanner } from '../components/layout/OfflineBanner';
import { ServerWakeUpBanner } from '../components/layout/ServerWakeUpBanner';

// Singleton QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60 * 1000,
    },
  },
});

// Hold splash screen visible while loading custom fonts and hydrating state
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

  const isHydrated = useAuthStore((s) => s.isHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && isHydrated) {
      SplashScreen.hideAsync().catch(() => {
        /* ignore */
      });
    }
  }, [fontsLoaded, fontError, isHydrated]);

  if ((!fontsLoaded && !fontError) || !isHydrated) {
    return null;
  }

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <AuthGateProvider>
            <ToastProvider>
              <OfflineBanner />
              <ServerWakeUpBanner />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: {
                    backgroundColor: theme.colors.bg,
                  },
                  animation: 'default',
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              </Stack>
            </ToastProvider>
          </AuthGateProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}
