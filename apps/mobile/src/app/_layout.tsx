import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import { StatusBar } from 'expo-status-bar';
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
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'ArchivoBlack-Regular': ArchivoBlack_400Regular,
    // Fallback aliases so existing code renders with Inter
    'PlusJakartaSans-Regular': Inter_400Regular,
    'PlusJakartaSans-Medium': Inter_500Medium,
    'PlusJakartaSans-SemiBold': Inter_600SemiBold,
    'PlusJakartaSans-Bold': Inter_700Bold,
    'Newsreader-Regular': Inter_400Regular,
    'Newsreader-MediumItalic': Inter_400Regular,
    'Newsreader-SemiBold': Inter_600SemiBold,
    'Newsreader-Bold': Inter_700Bold,
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
          <StatusBar style="light" />
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
