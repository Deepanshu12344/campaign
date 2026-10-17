import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter, useLocalSearchParams, Href } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, UserPlus } from 'lucide-react-native';
import { SignUpInputSchema, SignUpInput } from '@campaigns/shared';
import { theme } from '../../theme';
import { SharedHeader } from '../../components/layout/SharedHeader';
import { Card, Button, TextField } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';

export default function SignUpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const toast = useToast();

  const signUp = useAuthStore((s) => s.signUp);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(SignUpInputSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: SignUpInput) => {
    setAuthError(null);
    try {
      await signUp(data);
      toast.success('Account created successfully');
      if (params.returnTo) {
        router.replace(decodeURIComponent(params.returnTo) as Href);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create account. Please try again.';
      setAuthError(message);
    }
  };

  return (
    <View style={styles.container}>
      <SharedHeader title="Create Account" fallbackRoute="/(tabs)" />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <View style={styles.headerBox}>
            <View style={styles.iconCircle}>
              <UserPlus size={28} color={theme.colors.primary600} />
            </View>
            <Text style={styles.title}>Join Campaigns</Text>
            <Text style={styles.subtitle}>
              Create your account to start campaigns, monitor real-time ad distribution, and pool contributions.
            </Text>
          </View>

          {authError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          )}

          <View style={styles.form}>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Full Name"
                  placeholder="e.g. Maya Lin"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.name?.message}
                  required
                />
              )}
            />

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
                  placeholder="At least 8 characters"
                  secureTextEntry={!showPassword}
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.password?.message}
                  helperText="Must be at least 8 characters"
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
              title="Create Account"
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
              <Text style={styles.footerText}>Already have an account?</Text>
              <Pressable
                onPress={() => {
                  const dest = params.returnTo
                    ? `/auth/sign-in?returnTo=${encodeURIComponent(params.returnTo)}`
                    : '/auth/sign-in';
                  router.push(dest as Href);
                }}
                hitSlop={8}
              >
                <Text style={styles.linkText}>Sign In</Text>
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
