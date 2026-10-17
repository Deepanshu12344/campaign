import React, { createContext, useContext, useState, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter, usePathname, Href } from 'expo-router';
import { ShieldCheck, LogIn, UserPlus } from 'lucide-react-native';
import { theme } from '../theme';
import { Sheet, Button } from '../components/ui';
import { useAuthStore } from '../store/authStore';

export interface AuthGateOptions {
  reason: string;
  returnTo?: string;
  onAuthenticated?: () => void;
}

interface AuthGateContextValue {
  requireAuth: (options: AuthGateOptions) => boolean;
}

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

export function AuthGateProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const currentPath = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('Sign in to continue');
  const [targetRoute, setTargetRoute] = useState<string>('');

  const requireAuth = useCallback(
    ({ reason: gateReason, returnTo, onAuthenticated }: AuthGateOptions): boolean => {
      if (isAuthenticated) {
        onAuthenticated?.();
        return true;
      }

      setReason(gateReason);
      setTargetRoute(returnTo || currentPath || '/(tabs)');
      setIsOpen(true);
      return false;
    },
    [isAuthenticated, currentPath]
  );

  const handleSignIn = () => {
    setIsOpen(false);
    const destination = targetRoute ? `/auth/sign-in?returnTo=${encodeURIComponent(targetRoute)}` : '/auth/sign-in';
    router.push(destination as Href);
  };

  const handleSignUp = () => {
    setIsOpen(false);
    const destination = targetRoute ? `/auth/sign-up?returnTo=${encodeURIComponent(targetRoute)}` : '/auth/sign-up';
    router.push(destination as Href);
  };

  return (
    <AuthGateContext.Provider value={{ requireAuth }}>
      {children}

      <Sheet
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        title="Sign in required"
      >
        <View style={styles.sheetBody}>
          <View style={styles.iconCircle}>
            <ShieldCheck size={32} color={theme.colors.primary600} />
          </View>

          <Text style={styles.sheetTitle}>Account Needed</Text>
          <Text style={styles.sheetDescription}>{reason}</Text>

          <View style={styles.actionColumn}>
            <Button
              title="Sign In"
              variant="primary"
              size="lg"
              fullWidth
              iconLeft={<LogIn size={18} color="#FFFFFF" />}
              onPress={handleSignIn}
            />

            <Button
              title="Create an Account"
              variant="secondary"
              size="lg"
              fullWidth
              iconLeft={<UserPlus size={18} color={theme.colors.primary600} />}
              onPress={handleSignUp}
              style={styles.secondaryButton}
            />

            <Button
              title="Continue as Guest"
              variant="ghost"
              size="md"
              fullWidth
              onPress={() => setIsOpen(false)}
            />
          </View>
        </View>
      </Sheet>
    </AuthGateContext.Provider>
  );
}

export function useRequireAuth() {
  const context = useContext(AuthGateContext);
  if (!context) {
    throw new Error('useRequireAuth must be used within an AuthGateProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  sheetBody: {
    alignItems: 'center',
    paddingVertical: theme.spacing.base,
    paddingHorizontal: theme.spacing.sm,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.base,
  },
  sheetTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: theme.typography.styles.h2.fontSize,
    lineHeight: theme.typography.styles.h2.lineHeight,
    color: theme.colors.ink900,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  sheetDescription: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.body.fontSize,
    lineHeight: theme.typography.styles.body.lineHeight,
    color: theme.colors.ink700,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.base,
  },
  actionColumn: {
    width: '100%',
    gap: theme.spacing.sm,
  },
  secondaryButton: {
    marginBottom: theme.spacing.xs,
  },
});

