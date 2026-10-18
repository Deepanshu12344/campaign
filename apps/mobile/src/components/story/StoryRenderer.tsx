import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import {
  X,
  CheckCircle2,
  Quote as QuoteIcon,
  Sparkles,
  FileCheck2,
} from 'lucide-react-native';
import { StoryBlock, Source } from '@campaigns/shared';
import { theme } from '../../theme';
import { SourceItem } from '../ui/SourceItem';

export interface StoryRendererProps {
  story: StoryBlock[];
  sources?: Source[];
  style?: StyleProp<ViewStyle>;
  containerPaddingHorizontal?: number;
  showSources?: boolean;
}

interface MarkdownToken {
  type: 'text' | 'bold' | 'italic' | 'link';
  content: string;
  url?: string;
}

export function StoryRenderer({
  story,
  sources = [],
  style,
  containerPaddingHorizontal = theme.spacing.lg,
  showSources = false,
}: StoryRendererProps) {
  const [zoomedImage, setZoomedImage] = useState<{
    url: string;
    caption?: string;
    credit?: string;
  } | null>(null);

  const handleOpenLink = async (url: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      await WebBrowser.openBrowserAsync(url);
    } catch {
      // Fallback ignore
    }
  };

  const handleImagePress = (url: string, caption?: string, credit?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setZoomedImage({ url, caption, credit });
  };

  const renderBlock = (block: StoryBlock, index: number) => {
    switch (block.type) {
      case 'heading': {
        const isH1 = block.level === 1;
        const isH2 = block.level === 2;
        const headingStyle = isH1
          ? styles.heading1
          : isH2
            ? styles.heading2
            : styles.heading3;

        return (
          <View key={`heading-${index}`} style={styles.blockWrapper}>
            <Text
              accessibilityRole="header"
              style={headingStyle}
            >
              {block.text}
            </Text>
          </View>
        );
      }

      case 'paragraph': {
        return (
          <View key={`paragraph-${index}`} style={styles.blockWrapper}>
            {renderFormattedContent(block.text, handleOpenLink)}
          </View>
        );
      }

      case 'image': {
        return (
          <View key={`image-${index}`} style={[styles.blockWrapper, styles.imageContainer]}>
            <Pressable
              accessibilityRole="imagebutton"
              accessibilityLabel={block.caption || 'Campaign story image, tap to zoom'}
              accessibilityHint="Opens full screen zoomable view"
              onPress={() => handleImagePress(block.url, block.caption, block.credit)}
              style={styles.imagePressable}
            >
              <Image
                source={{ uri: block.url }}
                style={styles.storyImage}
                contentFit="cover"
                transition={300}
              />
            </Pressable>

            {(block.caption || block.credit) && (
              <View style={styles.captionContainer}>
                {Boolean(block.caption) && (
                  <Text style={styles.captionText}>{block.caption}</Text>
                )}
                {Boolean(block.credit) && (
                  <Text style={styles.creditText}>{block.credit}</Text>
                )}
              </View>
            )}
          </View>
        );
      }

      case 'stat': {
        return (
          <View key={`stat-${index}`} style={[styles.blockWrapper, styles.statCard]}>
            <Text style={styles.statValue}>{block.value}</Text>
            <Text style={styles.statLabel}>{block.label}</Text>
            {Boolean(block.source) && (
              <View style={styles.statSourceRow}>
                <Text style={styles.statSourceLabel}>Source: </Text>
                <Text style={styles.statSourceText}>{block.source}</Text>
              </View>
            )}
          </View>
        );
      }

      case 'quote': {
        return (
          <View key={`quote-${index}`} style={[styles.blockWrapper, styles.quoteContainer]}>
            <View style={styles.quoteHeader}>
              <QuoteIcon size={20} color={theme.colors.lime} />
            </View>
            <Text style={styles.quoteText}>"{block.text}"</Text>
            {Boolean(block.attribution) && (
              <Text style={styles.quoteAttribution}>— {block.attribution}</Text>
            )}
          </View>
        );
      }

      case 'actions': {
        return (
          <View key={`actions-${index}`} style={[styles.blockWrapper, styles.actionsCard]}>
            <View style={styles.actionsHeaderRow}>
              <Sparkles size={18} color={theme.colors.lime} />
              <Text style={styles.actionsTitle}>Suggested Audience Actions</Text>
            </View>
            <View style={styles.actionsList}>
              {block.items.map((actionItem, actIdx) => (
                <View key={`act-${actIdx}`} style={styles.actionItemRow}>
                  <CheckCircle2
                    size={16}
                    color={theme.colors.lime}
                    style={styles.actionIcon}
                  />
                  <Text style={styles.actionText}>{actionItem}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      }

      default:
        return null;
    }
  };

  return (
    <View style={[{ paddingHorizontal: containerPaddingHorizontal }, style]}>
      {story.map((block, idx) => renderBlock(block, idx))}

      {/* Visible Sources Section */}
      {showSources && sources && sources.length > 0 && (
        <View style={styles.sourcesSection}>
          <View style={styles.sourcesHeader}>
            <View style={styles.sourcesTitleRow}>
              <FileCheck2 size={20} color={theme.colors.lime} />
              <Text style={styles.sourcesTitle}>Verified Sources & Citations</Text>
            </View>
            <Text style={styles.sourcesDisclaimer}>
              Sources are provided by the creator and are checked as part of our review. We do
              not independently verify external research or claim primary authority.
            </Text>
          </View>

          <View style={styles.sourcesList}>
            {sources.map((src, index) => (
              <SourceItem
                key={`source-${index}`}
                source={src}
                verified={true}
                onPress={handleOpenLink}
              />
            ))}
          </View>
        </View>
      )}

      {/* Full Screen Image Viewer Modal */}
      {zoomedImage && (
        <Modal
          visible={Boolean(zoomedImage)}
          transparent
          animationType="fade"
          onRequestClose={() => setZoomedImage(null)}
          statusBarTranslucent
        >
          <View style={styles.modalBackdrop}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close full screen image viewer"
              onPress={() => setZoomedImage(null)}
              style={styles.modalCloseButton}
              hitSlop={16}
            >
              <X size={24} color={theme.colors.textPrimary} />
            </Pressable>

            <View style={styles.modalImageContainer}>
              <Image
                source={{ uri: zoomedImage.url }}
                style={styles.modalImage}
                contentFit="contain"
              />
            </View>

            {(zoomedImage.caption || zoomedImage.credit) && (
              <View style={styles.modalCaptionContainer}>
                {Boolean(zoomedImage.caption) && (
                  <Text style={styles.modalCaptionText}>{zoomedImage.caption}</Text>
                )}
                {Boolean(zoomedImage.credit) && (
                  <Text style={styles.modalCreditText}>{zoomedImage.credit}</Text>
                )}
              </View>
            )}
          </View>
        </Modal>
      )}
    </View>
  );
}

/**
 * Parses markdown inline spans (bold, italic, links) and handles multiline bullet lists.
 */
function renderFormattedContent(
  rawText: string,
  onOpenLink: (url: string) => void
): React.ReactNode {
  const lines = rawText.split('\n');

  return (
    <View style={styles.paragraphsContainer}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <View key={`empty-${lineIdx}`} style={styles.emptyLineSpacer} />;
        }

        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
        const textToParse = isBullet ? trimmed.replace(/^[-*]\s+/, '') : line;
        const tokens = parseMarkdownTokens(textToParse);

        if (isBullet) {
          return (
            <View key={`bullet-${lineIdx}`} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.paragraphText}>
                {tokens.map((token, tokIdx) =>
                  renderToken(token, tokIdx, onOpenLink)
                )}
              </Text>
            </View>
          );
        }

        return (
          <Text key={`line-${lineIdx}`} style={styles.paragraphText}>
            {tokens.map((token, tokIdx) =>
              renderToken(token, tokIdx, onOpenLink)
            )}
          </Text>
        );
      })}
    </View>
  );
}

function renderToken(
  token: MarkdownToken,
  index: number,
  onOpenLink: (url: string) => void
): React.ReactNode {
  switch (token.type) {
    case 'bold':
      return (
        <Text key={`tok-${index}`} style={styles.boldText}>
          {token.content}
        </Text>
      );
    case 'italic':
      return (
        <Text key={`tok-${index}`} style={styles.italicText}>
          {token.content}
        </Text>
      );
    case 'link':
      return (
        <Text
          key={`tok-${index}`}
          onPress={() => token.url && onOpenLink(token.url)}
          style={styles.linkText}
          accessibilityRole="link"
        >
          {token.content}
        </Text>
      );
    case 'text':
    default:
      return <Text key={`tok-${index}`}>{token.content}</Text>;
  }
}

function parseMarkdownTokens(text: string): MarkdownToken[] {
  const tokens: MarkdownToken[] = [];
  // Regex pattern for [link text](url), **bold**, and *italic*
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(\*\*|__)(.*?)\3|(\*|_)(.*?)\5/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const matchStart = match.index;
    if (matchStart > lastIndex) {
      tokens.push({
        type: 'text',
        content: text.slice(lastIndex, matchStart),
      });
    }

    if (match[1] && match[2]) {
      // Link: [text](url)
      tokens.push({
        type: 'link',
        content: match[1],
        url: match[2],
      });
    } else if (match[4]) {
      // Bold: **text** or __text__
      tokens.push({
        type: 'bold',
        content: match[4],
      });
    } else if (match[6]) {
      // Italic: *text* or _text_
      tokens.push({
        type: 'italic',
        content: match[6],
      });
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return tokens;
}

const styles = StyleSheet.create({
  blockWrapper: {
    marginBottom: theme.spacing.lg,
  },
  heading1: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 26,
    lineHeight: 34,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  heading2: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 22,
    lineHeight: 28,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  heading3: {
    fontFamily: theme.typography.fonts.serifSemiBold,
    fontSize: 19,
    lineHeight: 25,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  paragraphsContainer: {
    gap: 12,
  },
  paragraphText: {
    fontFamily: theme.typography.fonts.serifRegular,
    fontSize: 18,
    lineHeight: 28,
    color: theme.colors.textPrimary,
  },
  boldText: {
    fontFamily: theme.typography.fonts.serifBold,
    color: theme.colors.textPrimary,
  },
  italicText: {
    fontFamily: theme.typography.fonts.storyItalic,
    color: theme.colors.textSecondary,
  },
  linkText: {
    fontFamily: theme.typography.fonts.serifSemiBold,
    color: theme.colors.lime,
    textDecorationLine: 'underline',
  },
  emptyLineSpacer: {
    height: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: theme.spacing.sm,
    marginVertical: 2,
  },
  bulletDot: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 18,
    lineHeight: 28,
    color: theme.colors.lime,
    width: 16,
  },
  imageContainer: {
    marginVertical: theme.spacing.sm,
  },
  imagePressable: {
    borderRadius: theme.radius.card,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceRaised,
    ...theme.shadows.card,
  },
  storyImage: {
    width: '100%',
    height: 220,
    borderRadius: theme.radius.card,
  },
  captionContainer: {
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  captionText: {
    fontFamily: theme.typography.fonts.storyItalic,
    fontSize: theme.typography.styles.small.fontSize,
    lineHeight: theme.typography.styles.small.lineHeight,
    color: theme.colors.textSecondary,
  },
  creditText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.caption.fontSize,
    lineHeight: theme.typography.styles.caption.lineHeight,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.lime,
    padding: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
    ...theme.shadows.card,
  },
  statValue: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 36,
    lineHeight: 42,
    color: theme.colors.lime,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: theme.typography.styles.body.fontSize,
    lineHeight: theme.typography.styles.body.lineHeight,
    color: theme.colors.textPrimary,
  },
  statSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexWrap: 'wrap',
  },
  statSourceLabel: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: theme.typography.styles.caption.fontSize,
    color: theme.colors.textSecondary,
  },
  statSourceText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.caption.fontSize,
    color: theme.colors.textSecondary,
  },
  quoteContainer: {
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.radius.card,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.lime,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    marginVertical: theme.spacing.sm,
  },
  quoteHeader: {
    marginBottom: 6,
    opacity: 0.8,
  },
  quoteText: {
    fontFamily: theme.typography.fonts.storyItalic,
    fontSize: 18,
    lineHeight: 28,
    color: theme.colors.textPrimary,
  },
  quoteAttribution: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: theme.typography.styles.small.fontSize,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: 'right',
  },
  actionsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
    ...theme.shadows.card,
  },
  actionsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  actionsTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: theme.typography.styles.h3.fontSize,
    color: theme.colors.textPrimary,
  },
  actionsList: {
    gap: 10,
  },
  actionItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  actionIcon: {
    marginTop: 2,
  },
  actionText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.body.fontSize,
    lineHeight: theme.typography.styles.body.lineHeight,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  // Modal Image Zoom Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(18, 21, 17, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImageContainer: {
    width: '100%',
    height: '70%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalCaptionContainer: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
  },
  modalCaptionText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: theme.typography.styles.small.fontSize,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  modalCreditText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.caption.fontSize,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  sourcesSection: {
    marginTop: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  sourcesHeader: {
    marginBottom: theme.spacing.md,
  },
  sourcesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sourcesTitle: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  sourcesDisclaimer: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  sourcesList: {
    gap: 10,
  },
});

