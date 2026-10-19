import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { StyleProp, ViewStyle, DimensionValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { theme } from '../../theme';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeight?: DimensionValue;
  footer?: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function Sheet({
  visible,
  onClose,
  title,
  children,
  maxHeight,
  footer,
  contentContainerStyle,
}: SheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheetContent,
                maxHeight !== undefined ? { maxHeight } : null,
                !footer && {
                  paddingBottom: Math.max(insets.bottom, theme.spacing.base) + theme.spacing.sm,
                },
              ]}
            >
              {/* Drag Handle */}
              <View style={styles.handleContainer}>
                <View style={styles.handle} />
              </View>

              {/* Header */}
              {title && (
                <View style={styles.header}>
                  <Text style={styles.headerTitle}>{title}</Text>
                  <Pressable
                    onPress={onClose}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel="Close sheet"
                    style={styles.closeButton}
                  >
                    <X size={20} color={theme.colors.ink500} />
                  </Pressable>
                </View>
              )}

              {/* Scrollable Children */}
              <ScrollView
                style={styles.body}
                contentContainerStyle={[
                  styles.bodyContent,
                  {
                    paddingBottom: footer
                      ? theme.spacing.lg
                      : Math.max(insets.bottom, 24) + 32,
                  },
                  contentContainerStyle,
                ]}
                showsVerticalScrollIndicator={false}
                bounces={false}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              >
                {children}
              </ScrollView>

              {/* Optional Fixed Bottom Footer */}
              {footer && (
                <View
                  style={[
                    styles.footer,
                    {
                      paddingBottom: Math.max(insets.bottom, theme.spacing.base),
                    },
                  ]}
                >
                  {footer}
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.sheet,
    borderTopRightRadius: theme.radius.sheet,
    maxHeight: '90%',
    ...theme.shadows.elevated,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.line,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  headerTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: theme.typography.styles.h3.fontSize,
    lineHeight: theme.typography.styles.h3.lineHeight,
    color: theme.colors.ink900,
  },
  closeButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.radius.pill,
  },
  body: {
    flexShrink: 1,
  },
  bodyContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    backgroundColor: theme.colors.surface,
  },
});
