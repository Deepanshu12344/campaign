import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react-native';
import { theme } from '../../theme';

export type ToastType = 'success' | 'info' | 'warning' | 'danger';

export interface ToastAction {
  label: string;
  onPress?: () => void;
  onClick?: () => void;
}

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
  action?: ToastAction;
}

export interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  info: (
    message: string,
    durationOrOptions?: number | { duration?: number; action?: ToastAction },
    action?: ToastAction
  ) => void;
  success: (
    message: string,
    durationOrOptions?: number | { duration?: number; action?: ToastAction },
    action?: ToastAction
  ) => void;
  warning: (
    message: string,
    durationOrOptions?: number | { duration?: number; action?: ToastAction },
    action?: ToastAction
  ) => void;
  error: (
    message: string,
    durationOrOptions?: number | { duration?: number; action?: ToastAction },
    action?: ToastAction
  ) => void;
  danger: (
    message: string,
    durationOrOptions?: number | { duration?: number; action?: ToastAction },
    action?: ToastAction
  ) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function normalizeToastArgs(
  message: string,
  type: ToastType,
  durationOrOptions?: number | { duration?: number; action?: ToastAction },
  action?: ToastAction
): ToastOptions {
  if (typeof durationOrOptions === 'object' && durationOrOptions !== null) {
    return {
      message,
      type,
      duration: durationOrOptions.duration,
      action: durationOrOptions.action,
    };
  }
  return {
    message,
    type,
    duration: durationOrOptions,
    action,
  };
}

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
    (
      message: string,
      durationOrOptions?: number | { duration?: number; action?: ToastAction },
      action?: ToastAction
    ) => {
      showToast(normalizeToastArgs(message, 'info', durationOrOptions, action));
    },
    [showToast]
  );

  const success = useCallback(
    (
      message: string,
      durationOrOptions?: number | { duration?: number; action?: ToastAction },
      action?: ToastAction
    ) => {
      showToast(normalizeToastArgs(message, 'success', durationOrOptions, action));
    },
    [showToast]
  );

  const warning = useCallback(
    (
      message: string,
      durationOrOptions?: number | { duration?: number; action?: ToastAction },
      action?: ToastAction
    ) => {
      showToast(normalizeToastArgs(message, 'warning', durationOrOptions, action));
    },
    [showToast]
  );

  const error = useCallback(
    (
      message: string,
      durationOrOptions?: number | { duration?: number; action?: ToastAction },
      action?: ToastAction
    ) => {
      showToast(normalizeToastArgs(message, 'danger', durationOrOptions, action));
    },
    [showToast]
  );

  const danger = useCallback(
    (
      message: string,
      durationOrOptions?: number | { duration?: number; action?: ToastAction },
      action?: ToastAction
    ) => {
      showToast(normalizeToastArgs(message, 'danger', durationOrOptions, action));
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
          {toast.action && (
            <Pressable
              onPress={() => {
                const act = toast.action;
                setToast(null);
                if (act?.onPress) {
                  act.onPress();
                } else if (act?.onClick) {
                  act.onClick();
                }
              }}
              style={styles.actionButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={toast.action.label}
            >
              <Text style={styles.actionText}>{toast.action.label}</Text>
            </Pressable>
          )}
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
  actionButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.primary50,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary100,
    marginLeft: theme.spacing.xs,
  },
  actionText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: theme.typography.styles.caption.fontSize,
    lineHeight: theme.typography.styles.caption.lineHeight,
    color: theme.colors.primary700,
  },
});
