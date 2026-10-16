import React from 'react';
import { StyleSheet, Text, View, Pressable, Linking } from 'react-native';
import { ExternalLink, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Source } from '@campaigns/shared';
import { theme } from '../../theme';

export interface SourceItemProps {
  source?: Source;
  title?: string;
  url?: string;
  publisher?: string;
  note?: string;
  verified?: boolean;
  onPress?: (url: string) => void;
}

export function SourceItem({
  source,
  title,
  url,
  publisher,
  note,
  verified = true,
  onPress,
}: SourceItemProps) {
  const resolvedTitle = source?.title ?? title ?? 'Source Citation';
  const resolvedUrl = source?.url ?? url ?? 'https://example.com';
  const resolvedPublisher = source?.publisher ?? publisher;
  const resolvedNote = source?.note ?? note;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (onPress) {
      onPress(resolvedUrl);
    } else {
      Linking.openURL(resolvedUrl).catch(() => {});
    }
  };

  const domain = extractDomain(resolvedUrl);

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Source: ${resolvedTitle}, publisher ${resolvedPublisher || domain}`}
      onPress={handlePress}
      style={styles.card}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      <View style={styles.contentRow}>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {resolvedTitle}
          </Text>
          {resolvedNote && (
            <Text style={styles.noteText} numberOfLines={1}>
              {resolvedNote}
            </Text>
          )}
          <View style={styles.metaRow}>
            {resolvedPublisher && (
              <Text style={styles.publisher}>{resolvedPublisher}</Text>
            )}
            <Text style={styles.domain}>({domain})</Text>
            {verified && (
              <View style={styles.verifiedBadge}>
                <CheckCircle size={12} color={theme.colors.success} />
                <Text style={styles.verifiedText}>Checked</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.iconContainer}>
          <ExternalLink size={16} color={theme.colors.ink500} />
        </View>
      </View>
    </Pressable>
  );
}

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'source link';
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  title: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: theme.typography.styles.small.fontSize,
    lineHeight: theme.typography.styles.small.lineHeight,
    color: theme.colors.ink900,
    marginBottom: 4,
  },
  noteText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.caption.fontSize,
    color: theme.colors.ink600,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  publisher: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: theme.typography.styles.caption.fontSize,
    color: theme.colors.ink700,
  },
  domain: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.caption.fontSize,
    color: theme.colors.ink500,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.successBg,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.radius.pill,
  },
  verifiedText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 10,
    color: theme.colors.success,
  },
  iconContainer: {
    padding: theme.spacing.xs,
  },
});
