import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  AccessibilityInfo,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  Plus,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Sparkles,
  Heading,
  AlignLeft,
  Image as ImageIcon,
  BarChart3,
  Quote as QuoteIcon,
  ListOrdered,
  Bold,
  Italic,
  Link2,
  List,
  Camera,
  RefreshCw,
  FileCheck2,
  ShieldAlert,
  Check,
} from 'lucide-react-native';
import {
  getStepErrors,
  StoryBlock,
  Source,
  StoryBlockType,
  createStoryBlock,
  moveBlockUp,
  moveBlockDown,
  duplicateBlock,
  deleteBlock,
  restoreBlock,
  validateSourceUrl,
  applyMarkdownFormat,
  AiDraftStoryResponse,
} from '@campaigns/shared';
import { useDraftStore } from '../../../store/draftStore';
import { apiClient } from '../../../api/client';
import { useAiDraftStory } from '../../../api';
import { useRequireAuth } from '../../../auth/requireAuth';
import {
  TextField,
  Card,
  Button,
  Sheet,
  useToast,
} from '../../../components/ui';
import { StoryRenderer } from '../../../components/story/StoryRenderer';
import { theme } from '../../../theme';

function getBlockSnippet(block: StoryBlock): string {
  switch (block.type) {
    case 'heading':
    case 'paragraph':
    case 'quote':
      return block.text;
    case 'stat':
      return `${block.value} — ${block.label}`;
    case 'image':
      return block.caption || block.url;
    case 'actions':
      return block.items.join(', ');
  }
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function CreateStoryScreen() {
  const { draftId } = useLocalSearchParams<{ draftId: string }>();
  const draft = useDraftStore((s) => s.getDraft(draftId as string)) || {};
  const updateDraftField = useDraftStore((s) => s.updateDraftField);
  const saveDraftNow = useDraftStore((s) => s.saveDraftNow);
  const setStepContinueHandler = useDraftStore((s) => s.setStepContinueHandler);

  const toast = useToast();
  const { requireAuth } = useRequireAuth();
  const aiMutation = useAiDraftStory();

  // Mode: Edit vs Preview
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  // Story blocks initialization with stable IDs
  const rawStoryBlocks = (Array.isArray(draft.story) ? draft.story : []) as StoryBlock[];
  const storyBlocks = useMemo(() => {
    if (rawStoryBlocks.length === 0) {
      return [
        createStoryBlock('heading', { level: 2, text: '' }),
        createStoryBlock('paragraph', { text: '' }),
      ];
    }
    return rawStoryBlocks.map((b) => (b.id ? b : { ...b, id: createStoryBlock(b.type, b).id }));
  }, [rawStoryBlocks]);

  // Sources initialization
  const sources = useMemo(() => {
    return (Array.isArray(draft.sources) ? draft.sources : []) as Source[];
  }, [draft.sources]);

  // Headline and Standfirst / Intro
  const headline = typeof draft.title === 'string' ? draft.title : '';
  const intro = typeof draft.summary === 'string' ? draft.summary : '';

  // Block creation bottom sheet state
  const [isAddBlockSheetOpen, setIsAddBlockSheetOpen] = useState(false);

  // Undo delete tracking
  const lastDeletedBlockRef = useRef<{ block: StoryBlock; index: number } | null>(null);

  // Active paragraph tracking for floating formatting toolbar
  const [focusedParagraphId, setFocusedParagraphId] = useState<string | null>(null);
  const [paragraphSelection, setParagraphSelection] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });

  // Link insertion modal state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrlInput, setLinkUrlInput] = useState('');

  // AI Assistant Review Sheet State
  const [isAiSheetOpen, setIsAiSheetOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState<AiDraftStoryResponse | null>(null);
  const [aiAcceptedFields, setAiAcceptedFields] = useState<Record<string, boolean>>({});
  const [overwriteConfirmField, setOverwriteConfirmField] = useState<'headline' | 'intro' | 'blocks' | null>(null);

  // AI improve paragraph targeted block
  const [targetImproveBlockId, setTargetImproveBlockId] = useState<string | null>(null);

  // Scroll view reference for error scrolling
  const scrollRef = useRef<ScrollView>(null);
  const sourcesSectionRef = useRef<View>(null);

  // Status and Validation errors
  const errors = getStepErrors(draft, 'story');
  const isComplete = errors.length === 0;

  // Track if story has statistics but no sources
  const hasStatBlocks = storyBlocks.some((b) => b.type === 'stat');
  const missingSourcesForStats = hasStatBlocks && sources.length === 0;

  // Calculate total story text characters
  const totalWrittenChars = useMemo(() => {
    let count = 0;
    for (const b of storyBlocks) {
      switch (b.type) {
        case 'heading':
        case 'paragraph':
        case 'quote':
          count += b.text.trim().length;
          break;
        case 'stat':
          count += b.value.trim().length + b.label.trim().length;
          break;
        case 'actions':
          count += b.items.reduce((s, it) => s + (typeof it === 'string' ? it.trim().length : 0), 0);
          break;
        case 'image':
          break;
      }
    }
    return count;
  }, [storyBlocks]);

  // Register continue handler with shell
  useEffect(() => {
    setStepContinueHandler(async () => {
      const currentErrors = getStepErrors(draft, 'story');
      if (currentErrors.length > 0) {
        toast.error(currentErrors[0]);
        if (currentErrors.some((e) => e.includes('source'))) {
          sourcesSectionRef.current?.measureLayout(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (scrollRef.current as any)?.getScrollableNode?.() || 0,
            (_left, top) => {
              scrollRef.current?.scrollTo({ y: Math.max(0, top - 20), animated: true });
            },
            () => {
              scrollRef.current?.scrollToEnd({ animated: true });
            }
          );
        } else {
          scrollRef.current?.scrollTo({ y: 0, animated: true });
        }
        return false;
      }
      return true;
    });

    return () => {
      setStepContinueHandler(null);
    };
  }, [draft, setStepContinueHandler, toast]);

  // Headline change
  const handleHeadlineChange = (val: string) => {
    if (val.length <= 60) {
      updateDraftField('title', val);
      if (aiAcceptedFields['headline']) {
        setAiAcceptedFields((prev) => ({ ...prev, headline: false }));
      }
    }
  };

  // Intro / Standfirst change
  const handleIntroChange = (val: string) => {
    if (val.length <= 160) {
      updateDraftField('summary', val);
      if (aiAcceptedFields['intro']) {
        setAiAcceptedFields((prev) => ({ ...prev, intro: false }));
      }
    }
  };

  // Save as Draft action
  const handleSaveDraft = async () => {
    try {
      const ok = await saveDraftNow();
      if (ok) {
        toast.success('Draft saved');
      } else {
        toast.info('Draft saved locally (offline)');
      }
    } catch {
      toast.error('Failed to save draft');
    }
  };

  // Block updates
  const setBlocks = useCallback(
    (newBlocks: StoryBlock[]) => {
      updateDraftField('story', newBlocks);
    },
    [updateDraftField]
  );

  // Move block up
  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const updated = moveBlockUp(storyBlocks, index);
      setBlocks(updated);
      AccessibilityInfo.announceForAccessibility(`Moved block up to position ${index} of ${storyBlocks.length}`);
    },
    [storyBlocks, setBlocks]
  );

  // Move block down
  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= storyBlocks.length - 1) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const updated = moveBlockDown(storyBlocks, index);
      setBlocks(updated);
      AccessibilityInfo.announceForAccessibility(`Moved block down to position ${index + 2} of ${storyBlocks.length}`);
    },
    [storyBlocks, setBlocks]
  );

  // Duplicate block
  const handleDuplicate = useCallback(
    (index: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const updated = duplicateBlock(storyBlocks, index);
      setBlocks(updated);
      toast.info('Block duplicated');
    },
    [storyBlocks, setBlocks, toast]
  );

  // Delete block with Undo
  const handleDelete = useCallback(
    (index: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const { blocks: updated, deletedBlock, deletedIndex } = deleteBlock(storyBlocks, index);
      lastDeletedBlockRef.current = { block: deletedBlock, index: deletedIndex };
      setBlocks(updated);

      toast.info('Block deleted', {
        action: {
          label: 'Undo',
          onPress: () => {
            if (lastDeletedBlockRef.current) {
              const restored = restoreBlock(
                updated,
                lastDeletedBlockRef.current.block,
                lastDeletedBlockRef.current.index
              );
              setBlocks(restored);
              lastDeletedBlockRef.current = null;
              toast.success('Block restored');
            }
          },
        },
      });
    },
    [storyBlocks, setBlocks, toast]
  );

  // Add block from sheet
  const handleAddBlock = useCallback(
    (type: StoryBlockType) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const newBlock = createStoryBlock(type);
      setBlocks([...storyBlocks, newBlock]);
      setIsAddBlockSheetOpen(false);
      toast.success(`Added ${type} block`);
    },
    [storyBlocks, setBlocks, toast]
  );

  // Update specific block field
  const handleUpdateBlock = useCallback(
    (index: number, partial: Partial<StoryBlock>) => {
      const next = [...storyBlocks];
      const target = next[index];
      if (!target) return;
      next[index] = { ...target, ...partial } as StoryBlock;
      setBlocks(next);

      // If user edits block text, remove AI tag
      if (target.id && aiAcceptedFields[target.id]) {
        setAiAcceptedFields((prev) => ({ ...prev, [target.id as string]: false }));
      }
    },
    [storyBlocks, setBlocks, aiAcceptedFields]
  );

  // Apply formatting to focused paragraph
  const handleFormatParagraph = (format: 'bold' | 'italic' | 'link' | 'bullet') => {
    if (!focusedParagraphId) return;
    const targetIdx = storyBlocks.findIndex((b) => b.id === focusedParagraphId);
    if (targetIdx === -1) return;
    const targetBlock = storyBlocks[targetIdx];
    if (targetBlock.type !== 'paragraph') return;

    if (format === 'link') {
      setIsLinkModalOpen(true);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const formatted = applyMarkdownFormat(
      targetBlock.text,
      paragraphSelection,
      format
    );

    handleUpdateBlock(targetIdx, { text: formatted.text });
  };

  // Submit Link insertion
  const handleConfirmLink = () => {
    if (!focusedParagraphId) return;
    const targetIdx = storyBlocks.findIndex((b) => b.id === focusedParagraphId);
    if (targetIdx === -1) return;
    const targetBlock = storyBlocks[targetIdx];
    if (targetBlock.type !== 'paragraph') return;

    const formatted = applyMarkdownFormat(
      targetBlock.text,
      paragraphSelection,
      'link',
      linkUrlInput
    );
    handleUpdateBlock(targetIdx, { text: formatted.text });
    setIsLinkModalOpen(false);
    setLinkUrlInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  // Sources management
  const setSources = useCallback(
    (newSources: Source[]) => {
      updateDraftField('sources', newSources);
    },
    [updateDraftField]
  );

  const handleAddSource = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSources([
      ...sources,
      { title: '', url: 'https://', publisher: '', isDemo: false },
    ]);
  };

  const handleUpdateSource = (index: number, partial: Partial<Source>) => {
    const next = [...sources];
    next[index] = { ...next[index], ...partial };
    setSources(next);
  };

  const handleMoveSourceUp = (index: number) => {
    if (index <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSources(moveBlockUp(sources, index));
  };

  const handleMoveSourceDown = (index: number) => {
    if (index >= sources.length - 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSources(moveBlockDown(sources, index));
  };

  const handleDeleteSource = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSources(sources.filter((_, i) => i !== index));
    toast.info('Source removed');
  };

  // AI Draft Story Handler
  const handleLaunchAiStory = async () => {
    requireAuth({
      reason: 'sign in to use the AI writing assistant',
      onAuthenticated: async () => {
        setIsAiSheetOpen(true);
        setTargetImproveBlockId(null);

        try {
          const res = await aiMutation.mutateAsync({
            mode: 'full_story',
            title: headline,
            summary: intro,
            category: draft.category,
            creatorName: draft.creatorName,
            creatorType: draft.creatorType,
          });
          setAiResponse(res);
        } catch {
          toast.error('AI suggestions are unavailable. You can keep writing yourself.');
        }
      },
    });
  };

  // AI Improve Paragraph Handler
  const handleLaunchAiImproveParagraph = (blockId: string) => {
    const targetBlock = storyBlocks.find((b) => b.id === blockId);
    if (!targetBlock || targetBlock.type !== 'paragraph') return;

    requireAuth({
      reason: 'sign in to improve paragraphs with AI',
      onAuthenticated: async () => {
        setTargetImproveBlockId(blockId);
        setIsAiSheetOpen(true);

        try {
          const res = await aiMutation.mutateAsync({
            mode: 'improve_paragraph',
            paragraphText: targetBlock.text,
            title: headline,
            summary: intro,
            category: draft.category,
          });
          setAiResponse(res);
        } catch {
          toast.error('AI suggestions are unavailable. You can keep writing yourself.');
        }
      },
    });
  };

  // Accept entire AI full story
  const handleAcceptAiFullStory = () => {
    if (!aiResponse) return;

    const hasExisting = storyBlocks.some((b) => {
      switch (b.type) {
        case 'heading':
        case 'paragraph':
        case 'quote':
          return Boolean(b.text.trim());
        case 'stat':
          return Boolean(b.value.trim() || b.label.trim());
        case 'image':
          return Boolean(b.url.trim());
        case 'actions':
          return b.items.some((it) => Boolean(it.trim()));
      }
    });

    if (hasExisting) {
      setOverwriteConfirmField('blocks');
      return;
    }

    applyAiFullStory();
  };

  const applyAiFullStory = () => {
    if (!aiResponse) return;
    if (aiResponse.headline) {
      updateDraftField('title', aiResponse.headline);
      setAiAcceptedFields((prev) => ({ ...prev, headline: true }));
    }
    if (aiResponse.intro) {
      updateDraftField('summary', aiResponse.intro);
      setAiAcceptedFields((prev) => ({ ...prev, intro: true }));
    }
    if (aiResponse.blocks && aiResponse.blocks.length > 0) {
      setBlocks(aiResponse.blocks);
      const tagMap: Record<string, boolean> = {};
      for (const b of aiResponse.blocks) {
        if (b.id) tagMap[b.id] = true;
      }
      setAiAcceptedFields((prev) => ({ ...prev, ...tagMap }));
    }
    setIsAiSheetOpen(false);
    setOverwriteConfirmField(null);
    toast.success('Story drafted from basics');
  };

  // Accept improved paragraph
  const handleAcceptImprovedParagraph = () => {
    if (!aiResponse?.improvedParagraph || !targetImproveBlockId) return;
    const targetIdx = storyBlocks.findIndex((b) => b.id === targetImproveBlockId);
    if (targetIdx === -1) return;

    handleUpdateBlock(targetIdx, { text: aiResponse.improvedParagraph });
    setAiAcceptedFields((prev) => ({ ...prev, [targetImproveBlockId]: true }));
    setIsAiSheetOpen(false);
    toast.success('Paragraph updated');
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardRoot}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View style={styles.topControlBar}>
        {/* Edit | Preview Segmented Control */}
        <View style={styles.segmentedControl}>
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel="Switch to Edit mode"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setActiveTab('edit');
            }}
            style={[styles.segmentBtn, activeTab === 'edit' && styles.segmentBtnActive]}
          >
            <Edit3
              size={15}
              color={activeTab === 'edit' ? theme.colors.lime : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentText,
                activeTab === 'edit' && styles.segmentTextActive,
              ]}
            >
              Edit
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityLabel="Switch to Live Preview mode"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setActiveTab('preview');
            }}
            style={[styles.segmentBtn, activeTab === 'preview' && styles.segmentBtnActive]}
          >
            <Eye
              size={15}
              color={activeTab === 'preview' ? theme.colors.lime : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentText,
                activeTab === 'preview' && styles.segmentTextActive,
              ]}
            >
              Preview
            </Text>
          </Pressable>
        </View>

        {/* AI Assistant Button */}
        {activeTab === 'edit' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open AI Drafting Assistant"
            onPress={handleLaunchAiStory}
            style={styles.aiHeaderBtn}
          >
            <Sparkles size={14} color={theme.colors.lime} />
            <Text style={styles.aiHeaderBtnText}>AI Assistant</Text>
          </Pressable>
        )}
      </View>

      {/* PREVIEW MODE */}
      {activeTab === 'preview' ? (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.previewContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Mode Badge */}
          <View style={styles.previewModeBadge}>
            <View style={styles.previewPulseDot} />
            <Text style={styles.previewModeText}>Previewing (Exact reader view)</Text>
          </View>

          {/* Headline in Newsreader Serif */}
          <Text style={styles.previewHeadline}>{headline || 'Untitled Campaign'}</Text>

          {/* Standfirst Intro */}
          {Boolean(intro) && <Text style={styles.previewIntro}>{intro}</Text>}

          {/* Author Byline */}
          <View style={styles.previewBylineRow}>
            <View style={styles.previewAvatarCircle}>
              <Text style={styles.previewAvatarText}>
                {(draft.creatorName || 'C').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.previewCreatorName}>
                {draft.creatorName || 'Campaign Creator'}
              </Text>
              <Text style={styles.previewCategoryDate}>
                {draft.category || 'General'} • Community Campaign
              </Text>
            </View>
          </View>

          <View style={styles.previewDivider} />

          {/* Real Standalone StoryRenderer with showSources */}
          <StoryRenderer
            story={storyBlocks}
            sources={sources}
            showSources={true}
            containerPaddingHorizontal={0}
          />
        </ScrollView>
      ) : (
        /* EDIT MODE */
        <ScrollView
          ref={scrollRef}
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step Header */}
          <View style={styles.headerBox}>
            <Text style={styles.stepTitle}>Step 2: Campaign Story</Text>
            <Text style={styles.stepSubtitle}>
              Write a clear, compelling editorial article. High-impact campaigns cite credible
              sources and clearly articulate why community distribution matters.
            </Text>
          </View>

          {/* Status banner */}
          <View
            style={[
              styles.statusBanner,
              isComplete ? styles.statusBannerSuccess : styles.statusBannerPending,
            ]}
          >
            {isComplete ? (
              <>
                <CheckCircle2 size={16} color={theme.colors.lime} />
                <Text style={[styles.statusBannerText, { color: theme.colors.lime }]}>
                  Story ready — heading, {totalWrittenChars} characters, and {sources.length} sources verified.
                </Text>
              </>
            ) : (
              <>
                <AlertCircle size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.statusBannerText, { color: theme.colors.textSecondary }]}>
                  {errors[0]}
                </Text>
              </>
            )}
          </View>

          {/* ARTICLE TOP: Headline & Intro Standfirst (Newsreader Serif) */}
          <Card style={styles.articleCard}>
            <View style={styles.fieldHeaderRow}>
              <Text style={styles.fieldLabelSerif}>Headline</Text>
              <View style={styles.labelRightGroup}>
                {aiAcceptedFields['headline'] && (
                  <View style={styles.aiTagPill}>
                    <Sparkles size={10} color={theme.colors.lime} />
                    <Text style={styles.aiTagText}>AI-suggested</Text>
                  </View>
                )}
                <Text style={styles.charCountText}>{headline.length} / 60</Text>
              </View>
            </View>
            <TextInput
              value={headline}
              onChangeText={handleHeadlineChange}
              placeholder="e.g. Why Clean Water Cannot Wait"
              placeholderTextColor={theme.colors.textSecondary}
              maxLength={60}
              style={styles.headlineInput}
              multiline
            />

            <View style={styles.serifDivider} />

            <View style={styles.fieldHeaderRow}>
              <Text style={styles.fieldLabelSerif}>Standfirst / Lead Summary</Text>
              <View style={styles.labelRightGroup}>
                {aiAcceptedFields['intro'] && (
                  <View style={styles.aiTagPill}>
                    <Sparkles size={10} color={theme.colors.lime} />
                    <Text style={styles.aiTagText}>AI-suggested</Text>
                  </View>
                )}
                <Text style={styles.charCountText}>{intro.length} / 160</Text>
              </View>
            </View>
            <TextInput
              value={intro}
              onChangeText={handleIntroChange}
              placeholder="A brief opening statement setting the urgency and thesis of your article..."
              placeholderTextColor={theme.colors.textSecondary}
              maxLength={160}
              style={styles.introInput}
              multiline
              numberOfLines={3}
            />
          </Card>

          {/* STORY BLOCKS STREAM */}
          <View style={styles.blocksSectionHeader}>
            <Text style={styles.sectionTitle}>Article Content Blocks</Text>
            <Text style={styles.sectionSubtitle}>
              Total written text: {totalWrittenChars} / 300 minimum characters required.
            </Text>
          </View>

          <View style={styles.blocksList}>
            {storyBlocks.map((block, idx) => (
              <StoryBlockComposerItem
                key={block.id || `block-${idx}`}
                block={block}
                index={idx}
                totalBlocks={storyBlocks.length}
                isAiSuggested={Boolean(block.id && aiAcceptedFields[block.id])}
                onMoveUp={() => handleMoveUp(idx)}
                onMoveDown={() => handleMoveDown(idx)}
                onDuplicate={() => handleDuplicate(idx)}
                onDelete={() => handleDelete(idx)}
                onUpdate={(partial) => handleUpdateBlock(idx, partial)}
                onParagraphFocus={(id) => setFocusedParagraphId(id)}
                onParagraphSelectionChange={(sel) => setParagraphSelection(sel)}
                onLaunchAiImprove={() => block.id && handleLaunchAiImproveParagraph(block.id)}
              />
            ))}
          </View>

          {/* Add Block Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add new content block"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setIsAddBlockSheetOpen(true);
            }}
            style={styles.addBlockTrigger}
          >
            <Plus size={18} color={theme.colors.lime} />
            <Text style={styles.addBlockTriggerText}>Add Content Block</Text>
          </Pressable>

          {/* SOURCES MANAGER SECTION */}
          <View ref={sourcesSectionRef} style={styles.sourcesCardContainer}>
            <Card style={styles.sourcesCard}>
              <View style={styles.sourcesCardHeader}>
                <View style={styles.sourcesHeaderLeft}>
                  <FileCheck2 size={20} color={theme.colors.lime} />
                  <Text style={styles.sourcesCardTitle}>Verified Sources & Citations</Text>
                </View>
                <Text style={styles.sourcesRequiredBadge}>
                  {sources.length === 0 ? 'Required' : `${sources.length} added`}
                </Text>
              </View>

              <Text style={styles.sourcesPublicNotice}>
                Sources are shown publicly on your campaign page. Reviewers verify citations before approval.
              </Text>

              {missingSourcesForStats && (
                <View style={styles.warningBox}>
                  <ShieldAlert size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.warningBoxText}>
                    This story includes statistic blocks, but no verified sources have been added. Add sources to substantiate your statistics.
                  </Text>
                </View>
              )}

              {sources.map((src, srcIdx) => (
                <SourceComposerItem
                  key={`src-${srcIdx}`}
                  source={src}
                  index={srcIdx}
                  total={sources.length}
                  onUpdate={(p) => handleUpdateSource(srcIdx, p)}
                  onMoveUp={() => handleMoveSourceUp(srcIdx)}
                  onMoveDown={() => handleMoveSourceDown(srcIdx)}
                  onDelete={() => handleDeleteSource(srcIdx)}
                />
              ))}

              <Button
                variant="secondary"
                size="sm"
                onPress={handleAddSource}
                iconLeft={<Plus size={14} color={theme.colors.textPrimary} />}
                style={styles.addSourceBtn}
              >
                Add Another Source
              </Button>
            </Card>
          </View>

          {/* SAVE DRAFT & CONTINUE BUTTONS */}
          <View style={styles.bottomFormActions}>
            <Button
              variant="secondary"
              size="lg"
              onPress={handleSaveDraft}
              style={styles.actionBtnSecondary}
            >
              Save as Draft
            </Button>
          </View>
        </ScrollView>
      )}

      {/* FLOATING PARAGRAPH FORMATTING TOOLBAR (Visible when paragraph focused) */}
      {activeTab === 'edit' && focusedParagraphId && (
        <View style={styles.floatingToolbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Format bold"
            onPress={() => handleFormatParagraph('bold')}
            style={styles.formatBtn}
          >
            <Bold size={16} color={theme.colors.textPrimary} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Format italic"
            onPress={() => handleFormatParagraph('italic')}
            style={styles.formatBtn}
          >
            <Italic size={16} color={theme.colors.textPrimary} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Insert link"
            onPress={() => handleFormatParagraph('link')}
            style={styles.formatBtn}
          >
            <Link2 size={16} color={theme.colors.textPrimary} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Format bullet list"
            onPress={() => handleFormatParagraph('bullet')}
            style={styles.formatBtn}
          >
            <List size={16} color={theme.colors.textPrimary} />
          </Pressable>

          <View style={styles.toolbarDivider} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Improve paragraph with AI"
            onPress={() => handleLaunchAiImproveParagraph(focusedParagraphId)}
            style={styles.formatAiBtn}
          >
            <Sparkles size={13} color={theme.colors.tintedPillText} />
            <Text style={styles.formatAiText}>Improve</Text>
          </Pressable>
        </View>
      )}

      {/* ADD BLOCK BOTTOM SHEET */}
      <Sheet
        visible={isAddBlockSheetOpen}
        onClose={() => setIsAddBlockSheetOpen(false)}
        title="Add Content Block"
      >
        <View style={styles.addBlockSheetContent}>
          <BlockTypeOption
            icon={<AlignLeft size={20} color={theme.colors.lime} />}
            title="Paragraph"
            description="Editorial narrative with bold, italic, links, and bullet lists"
            onPress={() => handleAddBlock('paragraph')}
          />
          <BlockTypeOption
            icon={<Heading size={20} color={theme.colors.lime} />}
            title="Heading"
            description="Section title to organize your narrative"
            onPress={() => handleAddBlock('heading')}
          />
          <BlockTypeOption
            icon={<ImageIcon size={20} color={theme.colors.lime} />}
            title="Image"
            description="Photograph or diagram with optional caption and credit"
            onPress={() => handleAddBlock('image')}
          />
          <BlockTypeOption
            icon={<BarChart3 size={20} color={theme.colors.lime} />}
            title="Statistic"
            description="Key verified number or percentage with citation"
            onPress={() => handleAddBlock('stat')}
          />
          <BlockTypeOption
            icon={<QuoteIcon size={20} color={theme.colors.lime} />}
            title="Quote"
            description="Testimonial, expert opinion, or prominent excerpt"
            onPress={() => handleAddBlock('quote')}
          />
          <BlockTypeOption
            icon={<ListOrdered size={20} color={theme.colors.lime} />}
            title="Audience Actions"
            description="Up to 3 specific actions readers can take"
            onPress={() => handleAddBlock('actions')}
          />
        </View>
      </Sheet>

      {/* LINK INSERTION MODAL */}
      <Modal
        visible={isLinkModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLinkModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Card style={styles.linkModalCard}>
            <Text style={styles.linkModalTitle}>Insert External Link</Text>
            <TextField
              label="URL"
              placeholder="https://example.org/report"
              value={linkUrlInput}
              onChangeText={setLinkUrlInput}
              autoCapitalize="none"
              keyboardType="url"
              helper="Must start with http:// or https://"
            />
            <View style={styles.linkModalActions}>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => {
                  setIsLinkModalOpen(false);
                  setLinkUrlInput('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onPress={handleConfirmLink}
                disabled={!validateSourceUrl(linkUrlInput)}
              >
                Apply Link
              </Button>
            </View>
          </Card>
        </View>
      </Modal>

      {/* AI REVIEW BOTTOM SHEET */}
      <Sheet
        visible={isAiSheetOpen}
        onClose={() => setIsAiSheetOpen(false)}
        title={targetImproveBlockId ? 'AI Paragraph Polish' : 'AI Story Draft'}
      >
        <ScrollView style={styles.aiSheetScroll} showsVerticalScrollIndicator={false}>
          {aiMutation.isPending ? (
            <View style={styles.aiLoadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.lime} />
              <Text style={styles.aiLoadingText}>
                {targetImproveBlockId
                  ? 'Polishing paragraph for clarity and punch...'
                  : 'Synthesizing editorial story from your campaign basics...'}
              </Text>
            </View>
          ) : aiResponse ? (
            <View style={styles.aiResultsContainer}>
              {aiResponse.demo && (
                <View style={styles.demoSuggestionsBadge}>
                  <View style={styles.demoDot} />
                  <Text style={styles.demoSuggestionsText}>Demo suggestions</Text>
                </View>
              )}

              {aiResponse.mode === 'improve_paragraph' && aiResponse.improvedParagraph ? (
                <View style={styles.aiImproveCard}>
                  <Text style={styles.aiSectionLabel}>Improved Version:</Text>
                  <Text style={styles.aiSuggestedParagraph}>{aiResponse.improvedParagraph}</Text>

                  <View style={styles.aiImproveActions}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => setIsAiSheetOpen(false)}
                    >
                      Discard
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onPress={handleAcceptImprovedParagraph}
                      iconLeft={<Check size={14} color={theme.colors.onLime} />}
                    >
                      Accept Polish
                    </Button>
                  </View>
                </View>
              ) : (
                /* Full Story Review */
                <View style={styles.aiFullStoryReview}>
                  <Text style={styles.aiReviewIntro}>
                    Review generated narrative blocks. You can accept the draft or discard it.
                  </Text>

                  {/* Suggested Headline */}
                  {Boolean(aiResponse.headline) && (
                    <Card style={styles.aiPieceCard}>
                      <Text style={styles.aiPieceLabel}>Headline</Text>
                      <Text style={styles.aiPieceHeadline}>{aiResponse.headline}</Text>
                    </Card>
                  )}

                  {/* Suggested Intro */}
                  {Boolean(aiResponse.intro) && (
                    <Card style={styles.aiPieceCard}>
                      <Text style={styles.aiPieceLabel}>Standfirst Intro</Text>
                      <Text style={styles.aiPieceIntro}>{aiResponse.intro}</Text>
                    </Card>
                  )}

                  {/* Suggested Blocks */}
                  {aiResponse.blocks && (
                    <Card style={styles.aiPieceCard}>
                      <Text style={styles.aiPieceLabel}>
                        Narrative Blocks ({aiResponse.blocks.length})
                      </Text>
                      {aiResponse.blocks.map((b, bIdx) => (
                        <View key={`b-${bIdx}`} style={styles.aiBlockPreviewRow}>
                          <Text style={styles.aiBlockTypeTag}>{b.type.toUpperCase()}:</Text>
                          <Text style={styles.aiBlockSnippet} numberOfLines={2}>
                            {getBlockSnippet(b)}
                          </Text>
                        </View>
                      ))}
                    </Card>
                  )}

                  {/* Suggested Source Types Guidance (No Fake URLs!) */}
                  {aiResponse.suggestedSourceTypes && (
                    <Card style={styles.aiPieceCard}>
                      <View style={styles.aiSourceTypesHeader}>
                        <FileCheck2 size={16} color={theme.colors.lime} />
                        <Text style={styles.aiPieceLabel}>Recommended Sources to Research</Text>
                      </View>
                      <Text style={styles.aiSourceTypesNotice}>
                        AI does not generate synthetic URLs. Search for these credible source types:
                      </Text>
                      {aiResponse.suggestedSourceTypes.map((st, stIdx) => (
                        <Text key={`st-${stIdx}`} style={styles.aiSourceTypeItem}>
                          • {st}
                        </Text>
                      ))}
                    </Card>
                  )}

                  {/* Overwrite Confirmation Modal if needed */}
                  {overwriteConfirmField && (
                    <View style={styles.overwriteBox}>
                      <Text style={styles.overwriteTitle}>Overwrite existing content?</Text>
                      <Text style={styles.overwriteDesc}>
                        Applying this AI draft will replace your current story blocks.
                      </Text>
                      <View style={styles.overwriteActions}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onPress={() => setOverwriteConfirmField(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onPress={applyAiFullStory}
                        >
                          Replace Content
                        </Button>
                      </View>
                    </View>
                  )}

                  {!overwriteConfirmField && (
                    <View style={styles.aiSheetBottomActions}>
                      <Button
                        variant="secondary"
                        size="md"
                        onPress={() => setIsAiSheetOpen(false)}
                        style={styles.flex1}
                      >
                        Keep My Content
                      </Button>
                      <Button
                        variant="primary"
                        size="md"
                        onPress={handleAcceptAiFullStory}
                        iconLeft={<Check size={16} color={theme.colors.onLime} />}
                        style={styles.flex1}
                      >
                        Accept Story Draft
                      </Button>
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : null}
        </ScrollView>
      </Sheet>
    </KeyboardAvoidingView>
  );
}

// MEMOIZED STORY BLOCK COMPOSER ITEM
interface StoryBlockComposerItemProps {
  block: StoryBlock;
  index: number;
  totalBlocks: number;
  isAiSuggested: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onUpdate: (partial: Partial<StoryBlock>) => void;
  onParagraphFocus: (id: string) => void;
  onParagraphSelectionChange: (sel: { start: number; end: number }) => void;
  onLaunchAiImprove: () => void;
}

const StoryBlockComposerItem = React.memo(function StoryBlockComposerItem({
  block,
  index,
  totalBlocks,
  isAiSuggested,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onUpdate,
  onParagraphFocus,
  onParagraphSelectionChange,
  onLaunchAiImprove,
}: StoryBlockComposerItemProps) {
  const isFirst = index === 0;
  const isLast = index === totalBlocks - 1;

  return (
    <Card style={styles.blockCard}>
      {/* Block Controls Header */}
      <View style={styles.blockControlsRow}>
        <View style={styles.blockTypeBadge}>
          <Text style={styles.blockTypeBadgeText}>{block.type.toUpperCase()}</Text>
          {isAiSuggested && (
            <View style={styles.aiTagPill}>
              <Sparkles size={9} color={theme.colors.lime} />
              <Text style={styles.aiTagText}>AI-suggested</Text>
            </View>
          )}
        </View>

        <View style={styles.blockActionButtons}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Move block ${index + 1} up`}
            disabled={isFirst}
            onPress={onMoveUp}
            style={[styles.blockIconBtn, isFirst && styles.blockIconBtnDisabled]}
          >
            <ArrowUp
              size={15}
              color={isFirst ? theme.colors.textMuted : theme.colors.textPrimary}
            />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Move block ${index + 1} down`}
            disabled={isLast}
            onPress={onMoveDown}
            style={[styles.blockIconBtn, isLast && styles.blockIconBtnDisabled]}
          >
            <ArrowDown
              size={15}
              color={isLast ? theme.colors.textMuted : theme.colors.textPrimary}
            />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Duplicate block ${index + 1}`}
            onPress={onDuplicate}
            style={styles.blockIconBtn}
          >
            <Copy size={15} color={theme.colors.textPrimary} />
          </Pressable>

          {block.type === 'paragraph' && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Improve paragraph ${index + 1} with AI`}
              onPress={onLaunchAiImprove}
              style={styles.blockIconBtn}
            >
              <Sparkles size={14} color={theme.colors.lime} />
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete block ${index + 1}`}
            onPress={onDelete}
            style={styles.blockIconBtn}
          >
            <Trash2 size={15} color={theme.colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      {/* Block Body by Type */}
      {block.type === 'heading' && (
        <View style={styles.blockInputContainer}>
          <View style={styles.headingLevelRow}>
            {([1, 2, 3] as const).map((lvl) => (
              <Pressable
                key={`lvl-${lvl}`}
                onPress={() => onUpdate({ level: lvl })}
                style={[
                  styles.headingLevelChip,
                  block.level === lvl && styles.headingLevelChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.headingLevelChipText,
                    block.level === lvl && styles.headingLevelChipTextActive,
                  ]}
                >
                  H{lvl}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={block.text}
            onChangeText={(text) => onUpdate({ text })}
            placeholder="Section Heading..."
            placeholderTextColor={theme.colors.textSecondary}
            style={[
              styles.blockTextInput,
              block.level === 1
                ? styles.h1Input
                : block.level === 2
                ? styles.h2Input
                : styles.h3Input,
            ]}
          />
        </View>
      )}

      {block.type === 'paragraph' && (
        <View style={styles.blockInputContainer}>
          <TextInput
            value={block.text}
            onChangeText={(text) => onUpdate({ text })}
            onFocus={() => block.id && onParagraphFocus(block.id)}
            onSelectionChange={(e) => onParagraphSelectionChange(e.nativeEvent.selection)}
            placeholder="Write paragraph text here..."
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.paragraphInput}
            multiline
          />
        </View>
      )}

      {block.type === 'image' && (
        <ImageBlockComposer
          url={block.url}
          caption={block.caption}
          credit={block.credit}
          onUpdate={onUpdate}
        />
      )}

      {block.type === 'stat' && (
        <View style={styles.blockInputContainer}>
          <View style={styles.statInputRow}>
            <View style={styles.statValueCol}>
              <Text style={styles.miniLabel}>Metric Value</Text>
              <TextInput
                value={block.value}
                onChangeText={(val) => onUpdate({ value: val })}
                placeholder="e.g. 10°F or $4.2B"
                placeholderTextColor={theme.colors.textSecondary}
                style={styles.statValueInput}
              />
            </View>
            <View style={styles.statLabelCol}>
              <Text style={styles.miniLabel}>Description / Label</Text>
              <TextInput
                value={block.label}
                onChangeText={(lbl) => onUpdate({ label: lbl })}
                placeholder="e.g. Temperature differential"
                placeholderTextColor={theme.colors.textSecondary}
                style={styles.statLabelInput}
              />
            </View>
          </View>
          <Text style={styles.miniLabel}>Source Citation</Text>
          <TextInput
            value={block.source || ''}
            onChangeText={(src) => onUpdate({ source: src })}
            placeholder="e.g. Metropolitan Climate Alliance Report"
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.statSourceInput}
          />
        </View>
      )}

      {block.type === 'quote' && (
        <View style={styles.blockInputContainer}>
          <Text style={styles.miniLabel}>Quote Text</Text>
          <TextInput
            value={block.text}
            onChangeText={(txt) => onUpdate({ text: txt })}
            placeholder="A compelling quote from an expert or community member..."
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.quoteInput}
            multiline
          />
          <Text style={styles.miniLabel}>Attribution</Text>
          <TextInput
            value={block.attribution || ''}
            onChangeText={(att) => onUpdate({ attribution: att })}
            placeholder="e.g. Dr. Jane Smith, Research Director"
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.attributionInput}
          />
        </View>
      )}

      {block.type === 'actions' && (
        <ActionsBlockComposer
          items={block.items || []}
          onUpdate={(items) => onUpdate({ items })}
        />
      )}
    </Card>
  );
});

// IMAGE BLOCK COMPOSER (Upload, preview, caption, credit)
interface ImageBlockComposerProps {
  url?: string;
  caption?: string;
  credit?: string;
  onUpdate: (partial: Partial<StoryBlock>) => void;
}

function ImageBlockComposer({ url, caption, credit, onUpdate }: ImageBlockComposerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const toast = useToast();

  const handlePickImage = async () => {
    setUploadError(null);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setUploadError('Photo library permission is required to upload an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.85,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];

      // Validate file size
      if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) {
        const sizeMb = (asset.fileSize / (1024 * 1024)).toFixed(1);
        setUploadError(`File is ${sizeMb}MB. Please select an image under 5MB.`);
        return;
      }

      // Validate mime type
      const mime = asset.mimeType || 'image/jpeg';
      if (!ALLOWED_MIME_TYPES.includes(mime)) {
        setUploadError('Only JPG, PNG, and WebP images are supported.');
        return;
      }

      // Upload via POST /uploads
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName || 'story-image.jpg',
        type: mime,
      } as unknown as Blob);

      const res = await apiClient.uploadFile<{ url: string }>('/uploads', formData);
      const fullUrl = res.url.startsWith('http')
        ? res.url
        : `${apiClient.getBaseUrl().replace(/\/api\/v1$/, '')}${res.url}`;

      onUpdate({ url: fullUrl });
      toast.success('Image uploaded');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Image upload failed. Please try again.';
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.imageBlockContainer}>
      {url ? (
        <View style={styles.imagePreviewWrapper}>
          <Image source={{ uri: url }} style={styles.imagePreview} contentFit="cover" />
          <View style={styles.imageOverlayActions}>
            <Button
              variant="secondary"
              size="sm"
              onPress={handlePickImage}
              iconLeft={<Camera size={13} color={theme.colors.textPrimary} />}
            >
              Replace
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onPress={() => onUpdate({ url: '' })}
              iconLeft={<Trash2 size={13} color={theme.colors.textPrimary} />}
            >
              Remove
            </Button>
          </View>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pick and upload an image"
          onPress={handlePickImage}
          disabled={isUploading}
          style={[styles.emptyImageBox, uploadError && styles.emptyImageBoxError]}
        >
          {isUploading ? (
            <View style={styles.imageUploadingRow}>
              <ActivityIndicator size="small" color={theme.colors.lime} />
              <Text style={styles.imageUploadingText}>Uploading image...</Text>
            </View>
          ) : (
            <View style={styles.emptyImageInner}>
              <Camera size={26} color={theme.colors.lime} />
              <Text style={styles.emptyImageTitle}>Upload Story Image</Text>
              <Text style={styles.emptyImageSubtitle}>JPG, PNG, WebP up to 5MB</Text>
            </View>
          )}
        </Pressable>
      )}

      {uploadError && (
        <View style={styles.uploadErrorBox}>
          <AlertCircle size={14} color={theme.colors.textPrimary} />
          <Text style={styles.uploadErrorText}>{uploadError}</Text>
          <Button
            variant="ghost"
            size="sm"
            onPress={handlePickImage}
            iconLeft={<RefreshCw size={12} color={theme.colors.textPrimary} />}
          >
            Retry
          </Button>
        </View>
      )}

      {url && (
        <View style={styles.imageMetaFields}>
          <Text style={styles.miniLabel}>Caption (Optional)</Text>
          <TextInput
            value={caption || ''}
            onChangeText={(txt) => onUpdate({ caption: txt })}
            placeholder="e.g. Solar panel installation on community center"
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.imageMetaInput}
          />

          <Text style={styles.miniLabel}>Image Credit (Optional)</Text>
          <TextInput
            value={credit || ''}
            onChangeText={(txt) => onUpdate({ credit: txt })}
            placeholder="e.g. Photo by Alex Rivera / Clean Energy Lab"
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.imageMetaInput}
          />
        </View>
      )}
    </View>
  );
}

// ACTIONS BLOCK COMPOSER (up to 3 items)
interface ActionsBlockComposerProps {
  items: string[];
  onUpdate: (items: string[]) => void;
}

function ActionsBlockComposer({ items, onUpdate }: ActionsBlockComposerProps) {
  const actionList = items.length > 0 ? items : [''];

  const handleItemChange = (idx: number, val: string) => {
    const next = [...actionList];
    next[idx] = val;
    onUpdate(next);
  };

  const handleAddItem = () => {
    if (actionList.length >= 3) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onUpdate([...actionList, '']);
  };

  const handleRemoveItem = (idx: number) => {
    if (actionList.length <= 1) {
      onUpdate(['']);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onUpdate(actionList.filter((_, i) => i !== idx));
  };

  return (
    <View style={styles.actionsComposerBox}>
      <Text style={styles.miniLabel}>Suggested Audience Actions (Up to 3)</Text>
      {actionList.map((item, idx) => (
        <View key={`act-item-${idx}`} style={styles.actionItemInputRow}>
          <View style={styles.actionItemNumberBox}>
            <Text style={styles.actionItemNumberText}>{idx + 1}</Text>
          </View>
          <TextInput
            value={item}
            onChangeText={(val) => handleItemChange(idx, val)}
            placeholder="e.g. Read the municipal water report"
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.actionTextInput}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove action item ${idx + 1}`}
            onPress={() => handleRemoveItem(idx)}
            style={styles.actionDeleteBtn}
          >
            <Trash2 size={14} color={theme.colors.ink500} />
          </Pressable>
        </View>
      ))}

      {actionList.length < 3 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add another action item"
          onPress={handleAddItem}
          style={styles.addActionButton}
        >
          <Plus size={14} color={theme.colors.lime} />
          <Text style={styles.addActionButtonText}>Add Action Item</Text>
        </Pressable>
      )}
    </View>
  );
}

// SOURCE COMPOSER ITEM
interface SourceComposerItemProps {
  source: Source;
  index: number;
  total: number;
  onUpdate: (partial: Partial<Source>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

function SourceComposerItem({
  source,
  index,
  total,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onDelete,
}: SourceComposerItemProps) {
  const isUrlValid = validateSourceUrl(source.url);

  return (
    <View style={styles.sourceItemBox}>
      <View style={styles.sourceItemHeader}>
        <Text style={styles.sourceItemNumber}>Source #{index + 1}</Text>
        <View style={styles.sourceControlsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Move source ${index + 1} up`}
            disabled={index === 0}
            onPress={onMoveUp}
            style={[styles.sourceIconBtn, index === 0 && styles.blockIconBtnDisabled]}
          >
            <ArrowUp
              size={14}
              color={index === 0 ? theme.colors.textMuted : theme.colors.textPrimary}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Move source ${index + 1} down`}
            disabled={index === total - 1}
            onPress={onMoveDown}
            style={[styles.sourceIconBtn, index === total - 1 && styles.blockIconBtnDisabled]}
          >
            <ArrowDown
              size={14}
              color={index === total - 1 ? theme.colors.textMuted : theme.colors.textPrimary}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete source ${index + 1}`}
            onPress={onDelete}
            style={styles.sourceIconBtn}
          >
            <Trash2 size={14} color={theme.colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <TextInput
        value={source.title}
        onChangeText={(val) => onUpdate({ title: val })}
        placeholder="Source title or publication name (Required)"
        placeholderTextColor={theme.colors.textSecondary}
        style={styles.sourceTextInput}
      />

      <TextInput
        value={source.url}
        onChangeText={(val) => onUpdate({ url: val })}
        placeholder="https://..."
        placeholderTextColor={theme.colors.textSecondary}
        autoCapitalize="none"
        keyboardType="url"
        style={[styles.sourceTextInput, !isUrlValid && Boolean(source.url) && styles.sourceTextInputError]}
      />
      {!isUrlValid && Boolean(source.url) && (
        <Text style={styles.sourceInputErrorText}>
          Must be a valid URL starting with http:// or https://
        </Text>
      )}

      <TextInput
        value={source.publisher || ''}
        onChangeText={(val) => onUpdate({ publisher: val })}
        placeholder="Publisher or agency name (Optional)"
        placeholderTextColor={theme.colors.textSecondary}
        style={styles.sourceTextInput}
      />
    </View>
  );
}

// BLOCK TYPE SELECTION OPTION (In Add Block Sheet)
interface BlockTypeOptionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onPress: () => void;
}

function BlockTypeOption({ icon, title, description, onPress }: BlockTypeOptionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add ${title} block`}
      onPress={onPress}
      style={styles.blockTypeOption}
    >
      <View style={styles.blockTypeIconCircle}>{icon}</View>
      <View style={styles.blockTypeMeta}>
        <Text style={styles.blockTypeTitle}>{title}</Text>
        <Text style={styles.blockTypeDescription}>{description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    padding: theme.spacing.base,
    paddingBottom: 90,
    gap: theme.spacing.md,
  },
  previewContainer: {
    padding: theme.spacing.base,
    paddingBottom: 90,
  },
  topControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: 3,
    borderRadius: theme.radius.sm,
  },
  segmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: theme.radius.xs,
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.surfaceRaised,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  segmentTextActive: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    color: theme.colors.lime,
  },
  aiHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.tintedPillBg,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  aiHeaderBtnText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    color: theme.colors.tintedPillText,
  },
  headerBox: {
    marginBottom: 4,
  },
  stepTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 22,
    lineHeight: 28,
    color: theme.colors.textPrimary,
  },
  stepSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
  },
  statusBannerSuccess: {
    backgroundColor: theme.colors.tintedPillBg,
    borderColor: theme.colors.line,
  },
  statusBannerPending: {
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.line,
  },
  statusBannerText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    flex: 1,
  },
  articleCard: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  fieldHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabelSerif: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
  },
  labelRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  charCountText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  headlineInput: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 24,
    lineHeight: 32,
    color: theme.colors.textPrimary,
    paddingVertical: 4,
    minHeight: 40,
  },
  serifDivider: {
    height: 1,
    backgroundColor: theme.colors.line,
    marginVertical: theme.spacing.md,
  },
  introInput: {
    fontFamily: theme.typography.fonts.storyItalic,
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.textSecondary,
    paddingVertical: 4,
    minHeight: 50,
  },
  blocksSectionHeader: {
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  sectionSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  blocksList: {
    gap: 12,
  },
  blockCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
  },
  blockControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  blockTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blockTypeBadgeText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: theme.colors.lime,
  },
  aiTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: theme.colors.tintedPillBg,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  aiTagText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 10,
    color: theme.colors.tintedPillText,
  },
  blockActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  blockIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockIconBtnDisabled: {
    opacity: 0.4,
  },
  blockInputContainer: {
    gap: 8,
  },
  headingLevelRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  headingLevelChip: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  headingLevelChipActive: {
    backgroundColor: theme.colors.tintedPillBg,
    borderColor: theme.colors.lime,
  },
  headingLevelChipText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  headingLevelChipTextActive: {
    color: theme.colors.lime,
  },
  blockTextInput: {
    color: theme.colors.textPrimary,
    paddingVertical: 4,
  },
  h1Input: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 22,
    lineHeight: 28,
  },
  h2Input: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 18,
    lineHeight: 24,
  },
  h3Input: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 16,
    lineHeight: 22,
  },
  paragraphInput: {
    fontFamily: theme.typography.fonts.serifRegular,
    fontSize: 16,
    lineHeight: 26,
    color: theme.colors.textPrimary,
    minHeight: 80,
    paddingVertical: 4,
  },
  miniLabel: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  statInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statValueCol: {
    flex: 1,
  },
  statLabelCol: {
    flex: 1.5,
  },
  statValueInput: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 18,
    color: theme.colors.lime,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    padding: 8,
    backgroundColor: theme.colors.inputBg,
  },
  statLabelInput: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    padding: 8,
    backgroundColor: theme.colors.inputBg,
  },
  statSourceInput: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.textSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    padding: 8,
    backgroundColor: theme.colors.inputBg,
  },
  quoteInput: {
    fontFamily: theme.typography.fonts.storyItalic,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textPrimary,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.lime,
    paddingLeft: 10,
    paddingVertical: 6,
    backgroundColor: theme.colors.inputBg,
    borderRadius: 4,
  },
  attributionInput: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.textSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    padding: 8,
    backgroundColor: theme.colors.inputBg,
  },
  imageBlockContainer: {
    gap: 10,
  },
  imagePreviewWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: theme.colors.surface,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageOverlayActions: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: theme.colors.surface,
    padding: 4,
    borderRadius: theme.radius.xs,
  },
  emptyImageBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: theme.radius.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.base,
  },
  emptyImageBoxError: {
    borderColor: theme.colors.textPrimary,
  },
  emptyImageInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyImageTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginTop: 6,
  },
  emptyImageSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  imageUploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imageUploadingText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  uploadErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 6,
  },
  uploadErrorText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  imageMetaFields: {
    gap: 8,
    marginTop: 4,
  },
  imageMetaInput: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    padding: 8,
    backgroundColor: theme.colors.inputBg,
  },
  actionsComposerBox: {
    gap: 8,
  },
  actionItemInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionItemNumberBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionItemNumberText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 12,
    color: theme.colors.lime,
  },
  actionTextInput: {
    flex: 1,
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    padding: 8,
    backgroundColor: theme.colors.inputBg,
  },
  actionDeleteBtn: {
    padding: 6,
  },
  addActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  addActionButtonText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.lime,
  },
  addBlockTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceRaised,
  },
  addBlockTriggerText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.lime,
  },
  sourcesCardContainer: {
    marginTop: theme.spacing.sm,
  },
  sourcesCard: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  sourcesCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sourcesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourcesCardTitle: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  sourcesRequiredBadge: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.lime,
    backgroundColor: theme.colors.tintedPillBg,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: theme.radius.full,
  },
  sourcesPublicNotice: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  warningBoxText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  sourceItemBox: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceRaised,
    marginBottom: 10,
    gap: 6,
  },
  sourceItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceItemNumber: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  sourceControlsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  sourceIconBtn: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceTextInput: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    padding: 8,
    backgroundColor: theme.colors.inputBg,
  },
  sourceTextInputError: {
    borderColor: theme.colors.textPrimary,
  },
  sourceInputErrorText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    color: theme.colors.textPrimary,
  },
  addSourceBtn: {
    marginTop: 4,
  },
  bottomFormActions: {
    marginTop: theme.spacing.sm,
  },
  actionBtnSecondary: {
    width: '100%',
  },
  floatingToolbar: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  formatBtn: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarDivider: {
    width: 1,
    height: 20,
    backgroundColor: theme.colors.line,
  },
  formatAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.tintedPillBg,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  formatAiText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    color: theme.colors.tintedPillText,
  },
  addBlockSheetContent: {
    gap: 8,
    paddingVertical: 6,
  },
  blockTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  blockTypeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockTypeMeta: {
    flex: 1,
  },
  blockTypeTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  blockTypeDescription: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  linkModalCard: {
    width: '100%',
    padding: theme.spacing.lg,
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  linkModalTitle: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  linkModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  aiSheetScroll: {
    maxHeight: 520,
    paddingHorizontal: 4,
  },
  aiLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  aiLoadingText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  aiResultsContainer: {
    gap: 12,
    paddingBottom: 24,
  },
  demoSuggestionsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.full,
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: theme.spacing.xs,
  },
  demoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.textSecondary,
    marginRight: theme.spacing.xxs,
  },
  demoSuggestionsText: {
    fontFamily: theme.typography.fonts.uiMedium,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 10,
    lineHeight: 12,
  },
  aiImproveCard: {
    padding: theme.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceRaised,
    gap: 10,
  },
  aiSectionLabel: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: theme.colors.lime,
  },
  aiSuggestedParagraph: {
    fontFamily: theme.typography.fonts.serifRegular,
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.textPrimary,
  },
  aiImproveActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  aiFullStoryReview: {
    gap: 12,
  },
  aiReviewIntro: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  aiPieceCard: {
    padding: 12,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceRaised,
    gap: 6,
  },
  aiPieceLabel: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 11,
    color: theme.colors.lime,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aiPieceHeadline: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  aiPieceIntro: {
    fontFamily: theme.typography.fonts.storyItalic,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  aiBlockPreviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
  },
  aiBlockTypeTag: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 11,
    color: theme.colors.lime,
    width: 80,
  },
  aiBlockSnippet: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  aiSourceTypesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiSourceTypesNotice: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  aiSourceTypeItem: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.textPrimary,
    marginTop: 4,
  },
  overwriteBox: {
    padding: 14,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  overwriteTitle: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  overwriteDesc: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  overwriteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  aiSheetBottomActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  flex1: {
    flex: 1,
  },
  previewModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.full,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  previewPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.lime,
  },
  previewModeText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 11,
    color: theme.colors.lime,
    letterSpacing: 0.3,
  },
  previewHeadline: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 27,
    lineHeight: 35,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  previewIntro: {
    fontFamily: theme.typography.fonts.storyItalic,
    fontSize: 16,
    lineHeight: 25,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  previewBylineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 12,
  },
  previewAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.tintedPillBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAvatarText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 16,
    color: theme.colors.tintedPillText,
  },
  previewCreatorName: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  previewCategoryDate: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  previewDivider: {
    height: 1,
    backgroundColor: theme.colors.line,
    marginVertical: theme.spacing.lg,
  },
});
