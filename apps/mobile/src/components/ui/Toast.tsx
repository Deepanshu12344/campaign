import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react-native';
import { theme } from '../../theme';

export type ToastType = 'success' | 'info' | 'warning' | 'danger';

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

export interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  info: (message: string, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  danger: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((options: ToastOptions) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setToast(options);
    const duration = options.duration ?? 3000;
    timerRef.current = setTimeout(() => {
      setToast(null);
    }, duration);
  }, []);

  const info = useCallback(
    (message: string, duration?: number) => {
      showToast({ message, type: 'info', duration });
    },
    [showToast]
  );

  const success = useCallback(
    (message: string, duration?: number) => {
      showToast({ message, type: 'success', duration });
    },
    [showToast]
  );

  const warning = useCallback(
    (message: string, duration?: number) => {
      showToast({ message, type: 'warning', duration });
    },
    [showToast]
  );

  const error = useCallback(
    (message: string, duration?: number) => {
      showToast({ message, type: 'danger', duration });
    },
    [showToast]
  );

  const danger = useCallback(
    (message: string, duration?: number) => {
      showToast({ message, type: 'danger', duration });
    },
    [showToast]
  );

  const getToastIcon = (type: ToastType = 'info') => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={20} color={theme.colors.success} />;
      case 'warning':
        return <AlertTriangle size={20} color={theme.colors.warning} />;
      case 'danger':
        return <AlertCircle size={20} color={theme.colors.danger} />;
      case 'info':
      default:
        return <Info size={20} color={theme.colors.info} />;
    }
  };

  const getBorderColor = (type: ToastType = 'info') => {
    switch (type) {
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'danger':
        return theme.colors.danger;
      case 'info':
      default:
        return theme.colors.info;
    }
  };

  return (
    <ToastContext.Provider
      value={{ showToast, info, success, warning, error, danger }}
    >
      {children}
      {toast && (
        <Animated.View
          entering={FadeInUp.duration(theme.motion.durationShort)}
          exiting={FadeOutUp.duration(theme.motion.durationShort)}
          style={[
            styles.toastContainer,
            { top: Math.max(insets.top, 16) + 8 },
            { borderLeftColor: getBorderColor(toast.type) },
          ]}
        >
          <View style={styles.iconContainer}>{getToastIcon(toast.type)}</View>
          <Text style={styles.messageText}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.input,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: theme.colors.line,
    ...theme.shadows.elevated,
    zIndex: 9999,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageText: {
    flex: 1,
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: theme.typography.styles.small.fontSize,
    lineHeight: theme.typography.styles.small.lineHeight,
    color: theme.colors.ink900,
  },
});
