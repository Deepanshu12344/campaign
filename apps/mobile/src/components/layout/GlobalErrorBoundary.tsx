import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { theme } from '../../theme';
import { Button } from '../ui/Button';
import { AlertCircle, RefreshCw } from 'lucide-react-native';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('GlobalErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconCircle}>
              <AlertCircle size={40} color={theme.colors.danger} />
            </View>

            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              An unexpected error occurred in the application. You can reload this screen to continue.
            </Text>

            {__DEV__ && (
              <View style={styles.debugBox}>
                <Text style={styles.debugText} numberOfLines={4}>
                  {this.state.error.message}
                </Text>
              </View>
            )}

            <Button
              title="Try Again"
              variant="primary"
              size="lg"
              fullWidth
              iconLeft={<RefreshCw size={18} color="#FFFFFF" />}
              onPress={this.handleReset}
              style={styles.retryButton}
            />
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.base,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.base,
  },
  title: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: theme.typography.styles.h2.fontSize,
    lineHeight: theme.typography.styles.h2.lineHeight,
    color: theme.colors.ink900,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  message: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.body.fontSize,
    lineHeight: theme.typography.styles.body.lineHeight,
    color: theme.colors.ink700,
    textAlign: 'center',
    marginBottom: theme.spacing.base,
  },
  debugBox: {
    width: '100%',
    backgroundColor: theme.colors.bgMuted,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.input,
    marginBottom: theme.spacing.base,
  },
  debugText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: theme.colors.danger,
  },
  retryButton: {
    marginTop: theme.spacing.sm,
  },
});
