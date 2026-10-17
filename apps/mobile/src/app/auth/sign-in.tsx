import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter, useLocalSearchParams, Href } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LogIn } from 'lucide-react-native';
import { SignInInputSchema, SignInInput } from '@campaigns/shared';
import { theme } from '../../theme';
import { SharedHeader } from '../../components/layout/SharedHeader';
import { Card, Button, TextField, CategoryChip } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';

export default function SignInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const toast = useToast();

  const signIn = useAuthStore((s) => s.signIn);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(SignInInputSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: SignInInput) => {
    setAuthError(null);
    try {
      await signIn(data);
      toast.success('Signed in successfully');
      if (params.returnTo) {
        router.replace(decodeURIComponent(params.returnTo) as Href);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Invalid email or password. Please try again.';
      setAuthError(message);
    }
  };

  const handleQuickFillCreator = () => {
    setValue('email', 'creator@demo.com', { shouldValidate: true });
    setValue('password', 'Demo@1234', { shouldValidate: true });
    setAuthError(null);
  };

  const handleQuickFillBacker = () => {
    setValue('email', 'backer@demo.com', { shouldValidate: true });
    setValue('password', 'Demo@1234', { shouldValidate: true });
    setAuthError(null);
  };

  return (
    <View style={styles.container}>
      <SharedHeader title="Sign In" fallbackRoute="/(tabs)" />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <View style={styles.headerBox}>
            <View style={styles.iconCircle}>
              <LogIn size={28} color={theme.colors.primary600} />
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to manage your campaigns, monitor distribution impact, and track contribution receipts.
            </Text>
          </View>

          {/* Quick-Fill Demo Credentials */}
          <View style={styles.demoSection}>
            <Text style={styles.demoSectionLabel}>Demo Quick-Fill:</Text>
            <View style={styles.chipsRow}>
              <Pressable
                onPress={handleQuickFillCreator}
                style={styles.chipButton}
                accessibilityRole="button"
                accessibilityLabel="Use demo creator credentials"
              >
                <CategoryChip category="Community" label="Use Demo Creator" selected />
              </Pressable>

              <Pressable
                onPress={handleQuickFillBacker}
                style={styles.chipButton}
                accessibilityRole="button"
                accessibilityLabel="Use demo backer credentials"
              >
                <CategoryChip category="Education" label="Use Demo Backer" selected />
              </Pressable>
            </View>
          </View>

          {authError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          )}

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Email address"
                  placeholder="name@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.email?.message}
                  required
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Password"
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.password?.message}
                  required
                  rightAccessory={
                    <Pressable
                      onPress={() => setShowPassword((prev) => !prev)}
                      hitSlop={12}
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff size={20} color={theme.colors.ink500} />
                      ) : (
                        <Eye size={20} color={theme.colors.ink500} />
                      )}
                    </Pressable>
                  }
                />
              )}
            />

            <Button
              title="Sign In"
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              onPress={() => {
                void handleSubmit(onSubmit)();
              }}
              style={styles.submitButton}
            />

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account?</Text>
              <Pressable
                onPress={() => {
                  const dest = params.returnTo
                    ? `/auth/sign-up?returnTo=${encodeURIComponent(params.returnTo)}`
                    : '/auth/sign-up';
                  router.push(dest as Href);
                }}
                hitSlop={8}
              >
                <Text style={styles.linkText}>Create Account</Text>
              </Pressable>
            </View>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    padding: theme.spacing.xl,
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: theme.spacing.base,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: theme.typography.styles.h2.fontSize,
    lineHeight: theme.typography.styles.h2.lineHeight,
    color: theme.colors.ink900,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.small.fontSize,
    lineHeight: theme.typography.styles.small.lineHeight,
    color: theme.colors.ink700,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  demoSection: {
    backgroundColor: theme.colors.bgMuted,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.input,
    marginBottom: theme.spacing.base,
  },
  demoSectionLabel: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 11,
    color: theme.colors.ink500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    flexWrap: 'wrap',
  },
  chipButton: {
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  errorBox: {
    backgroundColor: theme.colors.dangerBg,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.input,
    marginBottom: theme.spacing.base,
    borderWidth: 1,
    borderColor: theme.colors.red200,
  },
  errorText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.danger,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  submitButton: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.base,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  footerText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.small.fontSize,
    color: theme.colors.ink500,
  },
  linkText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: theme.typography.styles.small.fontSize,
    color: theme.colors.primary600,
  },
});
