import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter, Href } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Camera,
  Trash2,
  RefreshCw,
  HelpCircle,
  Lightbulb,
  Target,
  Flame,
  BarChart3,
  Check,
  Edit3,
  Leaf,
  HeartPulse,
  FlaskConical,
  GraduationCap,
  Landmark,
  TrendingUp,
  Users,
  Palette,
  Briefcase,
  User,
  Building,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  Category,
  CATEGORIES,
  CreatorType,
  CREATOR_TYPES,
  getStepErrors,
  AiDraftBasicsResponse,
} from '@campaigns/shared';
import { useDraftStore } from '../../../store/draftStore';
import { useAiDraftBasics } from '../../../api';
import { useRequireAuth } from '../../../auth/requireAuth';
import { uploadImage } from '../../../utils/fileUpload';
import {
  TextField,
  TextArea,
  Card,
  Button,
  Sheet,
  useToast,
  CategoryChip,
} from '../../../components/ui';
import { theme } from '../../../theme';

// Category metadata & icons
const CATEGORY_META: Record<
  Category,
  { icon: React.ComponentType<{ size?: number; color?: string }>; description: string }
> = {
  Environment: { icon: Leaf, description: 'Climate, clean energy, conservation, wildlife' },
  Health: { icon: HeartPulse, description: 'Medical access, mental health, wellness, nutrition' },
  Science: { icon: FlaskConical, description: 'Research, technology, scientific discovery, space' },
  Education: { icon: GraduationCap, description: 'Schools, literacy, youth programs, learning access' },
  'Public Policy': { icon: Landmark, description: 'Civic reform, open governance, municipal issues' },
  'Economic Policy': { icon: TrendingUp, description: 'Fair wages, local commerce, housing, consumer rights' },
  Community: { icon: Users, description: 'Neighborhood initiatives, public parks, local safety' },
  'Arts & Culture': { icon: Palette, description: 'Heritage preservation, public art, indie music, theater' },
  Business: { icon: Briefcase, description: 'Independent shops, ethics, cooperative enterprise' },
  Other: { icon: HelpCircle, description: 'Unique public interest messages not fitting above' },
};

// Creator types with descriptions
const CREATOR_TYPE_OPTIONS: {
  type: CreatorType;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}[] = [
  { type: 'individual', label: 'Individual', description: 'Personal advocate or citizen organizer', icon: User },
  { type: 'creator', label: 'Creator / Influencer', description: 'Content creator or media voice', icon: Sparkles },
  { type: 'nonprofit', label: 'Nonprofit', description: 'Registered nonprofit or charitable entity', icon: HeartPulse },
  { type: 'business', label: 'Business', description: 'Mission-driven or independent enterprise', icon: Building },
  { type: 'community', label: 'Community Group', description: 'Grassroots collective or association', icon: Users },
];

export default function CreateBasicsScreen() {
  const { draftId } = useLocalSearchParams<{ draftId: string }>();
  const router = useRouter();
  const toast = useToast();
  const { requireAuth } = useRequireAuth();

  const draft = useDraftStore((s) => s.getDraft(draftId as string)) || {};
  const updateDraftField = useDraftStore((s) => s.updateDraftField);
  const saveDraftNow = useDraftStore((s) => s.saveDraftNow);
  const setStepContinueHandler = useDraftStore((s) => s.setStepContinueHandler);

  // References for scrolling and focusing
  const scrollViewRef = useRef<ScrollView>(null);
  const titleInputRef = useRef<TextInput>(null);
  const creatorNameInputRef = useRef<TextInput>(null);
  const summaryInputRef = useRef<TextInput>(null);
  const fieldYPositions = useRef<Record<string, number>>({});

  // Inline validation errors state
  const [inlineErrors, setInlineErrors] = useState<Record<string, string>>({});

  // AI-suggested fields tracking (tag disappears when user edits)
  const [aiSuggestedFields, setAiSuggestedFields] = useState<Record<string, boolean>>({});

  // UI state
  const [helpExpanded, setHelpExpanded] = useState(false);
  const [categorySheetVisible, setCategorySheetVisible] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);

  // AI suggestions sheet state
  const [aiSheetVisible, setAiSheetVisible] = useState(false);
  const [aiResponse, setAiResponse] = useState<AiDraftBasicsResponse | null>(null);
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
  const [editableSuggestions, setEditableSuggestions] = useState({
    title: '',
    summary: '',
    category: '' as Category | '',
    creatorDescription: '',
  });
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Record<string, boolean>>({});

  const aiBasicsMutation = useAiDraftBasics();

  // Step completeness tracking from shared rules
  const overallErrors = getStepErrors(draft, 'basics');
  const isComplete = overallErrors.length === 0;

  // Clear specific inline error when user updates a field
  const clearError = (field: string) => {
    if (inlineErrors[field]) {
      setInlineErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Field change handlers
  const handleTitleChange = (text: string) => {
    // Strictly cap input at 60 characters
    const trimmed = text.length > 60 ? text.slice(0, 60) : text;
    updateDraftField('title', trimmed);
    clearError('title');
    // Clear AI badge once edited
    if (aiSuggestedFields.title) {
      setAiSuggestedFields((prev) => ({ ...prev, title: false }));
    }
  };

  const handleCreatorNameChange = (text: string) => {
    const trimmed = text.length > 80 ? text.slice(0, 80) : text;
    updateDraftField('creatorName', trimmed);
    clearError('creatorName');
    if (aiSuggestedFields.creatorName) {
      setAiSuggestedFields((prev) => ({ ...prev, creatorName: false }));
    }
  };

  const handleCreatorTypeSelect = (type: CreatorType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    updateDraftField('creatorType', type.toLowerCase() as CreatorType);
    clearError('creatorType');
  };

  const handleSummaryChange = (text: string) => {
    const trimmed = text.length > 160 ? text.slice(0, 160) : text;
    updateDraftField('summary', trimmed);
    clearError('summary');
    if (aiSuggestedFields.summary) {
      setAiSuggestedFields((prev) => ({ ...prev, summary: false }));
    }
  };

  const handleCategorySelect = (cat: Category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    updateDraftField('category', cat);
    clearError('category');
    setCategorySheetVisible(false);
  };

  // Cover image picker & uploader
  const handlePickCoverImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCoverUploadError(null);

    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          const msg = 'Photo library permission is required to select a cover image.';
          setCoverUploadError(msg);
          toast.error(msg);
          return;
        }
      }

      let result: ImagePicker.ImagePickerResult;
      try {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.85,
        });
      } catch {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.85,
        });
      }

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];

      // Validate size: max 5MB (5 * 1024 * 1024)
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        const msg = 'File size exceeds 5MB limit. Please choose a smaller image.';
        setCoverUploadError(msg);
        toast.error(msg);
        return;
      }

      // Validate mime type
      const filename = asset.fileName || asset.uri.split('/').pop() || 'cover.jpg';
      const ext = filename.split('.').pop()?.toLowerCase();
      const mimeType =
        asset.mimeType ||
        (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');

      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedMimes.includes(mimeType) && !['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
        const msg = 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.';
        setCoverUploadError(msg);
        toast.error(msg);
        return;
      }

      // Proceed to upload
      await uploadCoverImage({
        uri: asset.uri,
        fileName: filename,
        mimeType,
        file: (asset as { file?: unknown }).file,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to select image';
      setCoverUploadError(msg);
      toast.error(msg);
    }
  };

  const uploadCoverImage = async (asset: { uri: string; fileName?: string; mimeType?: string; file?: unknown }) => {
    setIsUploadingCover(true);
    setCoverUploadError(null);

    try {
      const { fullUrl } = await uploadImage(asset);
      updateDraftField('coverUrl', fullUrl);
      toast.success('Cover image uploaded');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setCoverUploadError(msg);
      toast.error(msg);
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleRemoveCover = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    updateDraftField('coverUrl', null);
    setCoverUploadError(null);
    toast.info('Cover image removed');
  };

  // AI suggestions flow
  const handleSuggestWithAi = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    requireAuth({
      reason: 'Sign in to use AI suggestions for drafting your campaign.',
      returnTo: `/create/${draftId}/basics`,
      onAuthenticated: executeAiGeneration,
    });
  };

  const executeAiGeneration = async () => {
    try {
      const currentTitle = typeof draft.title === 'string' ? draft.title : undefined;
      const currentSummary = typeof draft.summary === 'string' ? draft.summary : undefined;
      const currentCategory = draft.category as Category | undefined;
      const currentCreatorName = typeof draft.creatorName === 'string' ? draft.creatorName : undefined;
      const currentCreatorType =
        typeof draft.creatorType === 'string'
          ? (draft.creatorType.toLowerCase() as CreatorType)
          : undefined;

      const res = await aiBasicsMutation.mutateAsync({
        currentTitle,
        currentSummary,
        currentCategory,
        currentCreatorName,
        currentCreatorType,
        topic: currentTitle || currentSummary,
      });

      setAiResponse(res);
      setEditableSuggestions({
        title: res.title,
        summary: res.summary,
        category: res.category,
        creatorDescription: res.creatorDescription,
      });
      setDismissedSuggestions({});
      setEditingFieldKey(null);
      setAiSheetVisible(true);
    } catch {
      toast.warning('AI suggestions are unavailable. You can keep writing yourself.');
    }
  };

  const handleAcceptSuggestion = (field: 'title' | 'summary' | 'category' | 'creatorDescription') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (field === 'title') {
      const val = editableSuggestions.title.slice(0, 60);
      updateDraftField('title', val);
      setAiSuggestedFields((prev) => ({ ...prev, title: true }));
      clearError('title');
    } else if (field === 'summary') {
      const val = editableSuggestions.summary.slice(0, 160);
      updateDraftField('summary', val);
      setAiSuggestedFields((prev) => ({ ...prev, summary: true }));
      clearError('summary');
    } else if (field === 'category') {
      if (editableSuggestions.category) {
        updateDraftField('category', editableSuggestions.category as Category);
        setAiSuggestedFields((prev) => ({ ...prev, category: true }));
        clearError('category');
      }
    } else if (field === 'creatorDescription') {
      const val = editableSuggestions.creatorDescription.slice(0, 80);
      updateDraftField('creatorName', val);
      setAiSuggestedFields((prev) => ({ ...prev, creatorName: true }));
      clearError('creatorName');
    }

    setDismissedSuggestions((prev) => ({ ...prev, [field]: true }));
    toast.success(`Applied AI suggestion`);
  };

  const handleDismissSuggestion = (field: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setDismissedSuggestions((prev) => ({ ...prev, [field]: true }));
  };

  const handleAcceptAllSuggestions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (!dismissedSuggestions.title) {
      updateDraftField('title', editableSuggestions.title.slice(0, 60));
    }
    if (!dismissedSuggestions.summary) {
      updateDraftField('summary', editableSuggestions.summary.slice(0, 160));
    }
    if (!dismissedSuggestions.category && editableSuggestions.category) {
      updateDraftField('category', editableSuggestions.category as Category);
    }
    if (!dismissedSuggestions.creatorDescription) {
      updateDraftField('creatorName', editableSuggestions.creatorDescription.slice(0, 80));
    }

    setAiSuggestedFields({
      title: !dismissedSuggestions.title,
      summary: !dismissedSuggestions.summary,
      category: !dismissedSuggestions.category,
      creatorName: !dismissedSuggestions.creatorDescription,
    });

    setInlineErrors({});
    setAiSheetVisible(false);
    toast.success('Applied all suggestions');
  };

  // Continue & Validation action
  const handleContinue = useCallback(async (): Promise<boolean> => {
    const errs: Record<string, string> = {};

    const titleStr = typeof draft.title === 'string' ? draft.title.trim() : '';
    if (!titleStr) {
      errs.title = 'Title is required';
    } else if (titleStr.length > 60) {
      errs.title = 'Title cannot exceed 60 characters';
    }

    if (!draft.category || !CATEGORIES.includes(draft.category as Category)) {
      errs.category = 'Please select a campaign category';
    }

    const creatorStr = typeof draft.creatorName === 'string' ? draft.creatorName.trim() : '';
    if (!creatorStr) {
      errs.creatorName = 'Creator or organization name is required';
    } else if (creatorStr.length > 80) {
      errs.creatorName = 'Creator name cannot exceed 80 characters';
    }

    const currentCreatorType =
      typeof draft.creatorType === 'string' ? draft.creatorType.toLowerCase() : '';
    if (!currentCreatorType || !CREATOR_TYPES.includes(currentCreatorType as CreatorType)) {
      errs.creatorType = 'Please select your creator or organization type';
    }

    const summaryStr = typeof draft.summary === 'string' ? draft.summary.trim() : '';
    if (!summaryStr) {
      errs.summary = 'Summary is required';
    } else if (summaryStr.length > 160) {
      errs.summary = 'Summary cannot exceed 160 characters';
    }

    if (Object.keys(errs).length > 0) {
      setInlineErrors(errs);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      toast.warning('Please complete all required fields to continue.');

      // Scroll to and focus first invalid field
      const fieldOrder = ['title', 'category', 'creatorName', 'creatorType', 'summary'];
      const firstInvalid = fieldOrder.find((k) => errs[k]);

      if (firstInvalid) {
        const y = fieldYPositions.current[firstInvalid] ?? 0;
        scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });

        if (firstInvalid === 'title') {
          setTimeout(() => titleInputRef.current?.focus(), 250);
        } else if (firstInvalid === 'creatorName') {
          setTimeout(() => creatorNameInputRef.current?.focus(), 250);
        } else if (firstInvalid === 'summary') {
          setTimeout(() => summaryInputRef.current?.focus(), 250);
        }
      }

      return false;
    }

    // Valid: save and proceed
    setInlineErrors({});
    await saveDraftNow(draftId as string);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push(`/create/${draftId}/story` as Href);
    return true;
  }, [draft, draftId, saveDraftNow, router, toast]);

  // Register continue handler with layout
  useEffect(() => {
    setStepContinueHandler(handleContinue);
    return () => {
      setStepContinueHandler(null);
    };
  }, [handleContinue, setStepContinueHandler]);

  const handleManualSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const success = await saveDraftNow(draftId as string);
    if (success) {
      toast.success('Draft saved');
    } else {
      toast.warning('Saved locally (offline)');
    }
  };

  const selectedCategoryMeta = draft.category
    ? CATEGORY_META[draft.category as Category]
    : null;
  const CategoryIconComponent = selectedCategoryMeta?.icon || HelpCircle;

  return (
    <View style={styles.outerContainer}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Header with Title & "Suggest with AI" Action */}
        <View style={styles.headerBox}>
          <View style={styles.headerRow}>
            <View style={styles.headerTextCol}>
              <Text style={styles.stepTitle}>Step 1: Campaign Basics</Text>
              {/* <Text style={styles.stepSubtitle}>
                Introduce your message with a compelling headline, category, and creator profile.
              </Text> */}
            </View>

            <Button
              title="Suggest with AI"
              variant="secondary"
              size="sm"
              iconLeft={
                aiBasicsMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.lime} />
                ) : (
                  <Sparkles size={14} color={theme.colors.lime} />
                )
              }
              onPress={handleSuggestWithAi}
              disabled={aiBasicsMutation.isPending}
              style={styles.aiButton}
            />
          </View>
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
                Step 1 complete — all required basics filled out.
              </Text>
            </>
          ) : (
            <>
              <AlertCircle size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.statusBannerText, { color: theme.colors.textSecondary }]}>
                {overallErrors[0]} ({overallErrors.length} required field
                {overallErrors.length > 1 ? 's' : ''} remaining)
              </Text>
            </>
          )}
        </View>

        {/* Collapsible "Need help getting started?" Guidance Card */}
        <Card style={styles.helpCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Need help getting started guidance"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setHelpExpanded(!helpExpanded);
            }}
            style={styles.helpHeaderRow}
          >
            <View style={styles.helpTitleGroup}>
              <HelpCircle size={18} color={theme.colors.lime} />
              <Text style={styles.helpCardTitle}>Need help getting started?</Text>
            </View>
            {helpExpanded ? (
              <ChevronUp size={18} color={theme.colors.textSecondary} />
            ) : (
              <ChevronDown size={18} color={theme.colors.textSecondary} />
            )}
          </Pressable>

          {helpExpanded && (
            <View style={styles.helpBody}>
              <Text style={styles.helpIntro}>
                Organize your thoughts with these four core prompts from our editorial guidelines:
              </Text>

              <View style={styles.promptItem}>
                <Lightbulb size={16} color={theme.colors.lime} style={styles.promptIcon} />
                <View style={styles.promptTextCol}>
                  <Text style={styles.promptLabel}>1. What the campaign is about</Text>
                  <Text style={styles.promptDesc}>
                    The core public-interest message or idea you want heard beyond your immediate circle.
                  </Text>
                </View>
              </View>

              <View style={styles.promptItem}>
                <Target size={16} color={theme.colors.lime} style={styles.promptIcon} />
                <View style={styles.promptTextCol}>
                  <Text style={styles.promptLabel}>2. Who it should reach</Text>
                  <Text style={styles.promptDesc}>
                    The external communities, voters, neighbors, or readers who need to hear this message.
                  </Text>
                </View>
              </View>

              <View style={styles.promptItem}>
                <Flame size={16} color={theme.colors.lime} style={styles.promptIcon} />
                <View style={styles.promptTextCol}>
                  <Text style={styles.promptLabel}>3. Why it matters</Text>
                  <Text style={styles.promptDesc}>
                    The urgency, community stakes, or real-world problem being addressed.
                  </Text>
                </View>
              </View>

              <View style={styles.promptItem}>
                <BarChart3 size={16} color={theme.colors.lime} style={styles.promptIcon} />
                <View style={styles.promptTextCol}>
                  <Text style={styles.promptLabel}>4. What evidence supports it</Text>
                  <Text style={styles.promptDesc}>
                    Research, primary records, civic data, or reporting validating your claim.
                  </Text>
                </View>
              </View>

              {/* <Text style={styles.helpFootnote}>
                Note: These prompts are guidance only to help draft your story. They are not required form fields.
              </Text> */}
            </View>
          )}
        </Card>

        {/* Core Form Card */}
        <Card style={styles.formCard}>
          {/* Field 1: Campaign Title */}
          <View
            onLayout={(e) => {
              fieldYPositions.current.title = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>
                Campaign Title <Text style={styles.requiredStar}>*</Text>
              </Text>
              {aiSuggestedFields.title && (
                <View style={styles.aiTagBadge}>
                  <Sparkles size={10} color={theme.colors.lime} />
                  <Text style={styles.aiTagText}>AI-suggested</Text>
                </View>
              )}
            </View>

            <TextField
              ref={titleInputRef}
              placeholder="e.g. Clean Rivers for Future Generations"
              value={typeof draft.title === 'string' ? draft.title : ''}
              onChangeText={handleTitleChange}
              maxLength={60}
              showCounter
              error={inlineErrors.title}
              helper="The start of your title may be used as the ad headline if you don't supply a custom one."
              style={styles.fieldSpacing}
            />
          </View>

          {/* Field 2: Category Picker */}
          <View
            style={styles.fieldSpacing}
            onLayout={(e) => {
              fieldYPositions.current.category = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>
                Cause Category <Text style={styles.requiredStar}>*</Text>
              </Text>
              {aiSuggestedFields.category && (
                <View style={styles.aiTagBadge}>
                  <Sparkles size={10} color={theme.colors.lime} />
                  <Text style={styles.aiTagText}>AI-suggested</Text>
                </View>
              )}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Select campaign category"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setCategorySheetVisible(true);
              }}
              style={[
                styles.categoryPickerTrigger,
                Boolean(inlineErrors.category) && styles.pickerTriggerError,
              ]}
            >
              <View style={styles.pickerTriggerLeft}>
                <View style={styles.pickerIconCircle}>
                  <CategoryIconComponent size={18} color={theme.colors.lime} />
                </View>
                <View>
                  <Text style={styles.pickerTriggerText}>
                    {draft.category || 'Select an official category...'}
                  </Text>
                  {selectedCategoryMeta && (
                    <Text style={styles.pickerTriggerDesc} numberOfLines={1}>
                      {selectedCategoryMeta.description}
                    </Text>
                  )}
                </View>
              </View>

              <ChevronDown size={18} color={theme.colors.textSecondary} />
            </Pressable>

            {/* {inlineErrors.category ? (
              <Text style={styles.inlineErrorText}>{inlineErrors.category}</Text>
            ) : (
              <Text style={styles.fieldHelperText}>
                Categories help relevant audiences find and support your message distribution.
              </Text>
            )} */}
          </View>

          {/* Field 3: Creator / Organization Name & Creator Type */}
          <View
            onLayout={(e) => {
              fieldYPositions.current.creatorName = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>
                Creator or Organization Name <Text style={styles.requiredStar}>*</Text>
              </Text>
              {aiSuggestedFields.creatorName && (
                <View style={styles.aiTagBadge}>
                  <Sparkles size={10} color={theme.colors.lime} />
                  <Text style={styles.aiTagText}>AI-suggested</Text>
                </View>
              )}
            </View>

            <TextField
              ref={creatorNameInputRef}
              placeholder="e.g. Jane Doe or Clean Water Coalition"
              value={typeof draft.creatorName === 'string' ? draft.creatorName : ''}
              onChangeText={handleCreatorNameChange}
              maxLength={80}
              showCounter
              error={inlineErrors.creatorName}
              // helper="The individual, collective, or organization taking responsibility for the message."
              style={styles.fieldSpacing}
            />
          </View>

          {/* Creator Type Selector */}
          <View
            style={styles.fieldSpacing}
            onLayout={(e) => {
              fieldYPositions.current.creatorType = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.fieldLabel}>
              Creator Type <Text style={styles.requiredStar}>*</Text>
            </Text>

            <View style={styles.creatorTypeGrid}>
              {CREATOR_TYPE_OPTIONS.map((opt) => {
                const normalizedType =
                  typeof draft.creatorType === 'string'
                    ? draft.creatorType.toLowerCase()
                    : draft.creatorType;
                const isSelected = normalizedType === opt.type;
                const Icon = opt.icon;

                return (
                  <Pressable
                    key={opt.type}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    onPress={() => handleCreatorTypeSelect(opt.type)}
                    style={[
                      styles.creatorTypeCard,
                      isSelected && styles.creatorTypeCardSelected,
                    ]}
                  >
                    <View style={styles.creatorTypeCardHeader}>
                      <View
                        style={[
                          styles.creatorTypeIconBox,
                          isSelected && styles.creatorTypeIconBoxSelected,
                        ]}
                      >
                        <Icon
                          size={16}
                          color={isSelected ? theme.colors.onLime : theme.colors.textSecondary}
                        />
                      </View>
                      {isSelected && <Check size={16} color={theme.colors.lime} />}
                    </View>
                    <Text
                      style={[
                        styles.creatorTypeTitle,
                        isSelected && styles.creatorTypeTitleSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={styles.creatorTypeDescription}>{opt.description}</Text>
                  </Pressable>
                );
              })}
            </View>

            {inlineErrors.creatorType ? (
              <Text style={styles.inlineErrorText}>{inlineErrors.creatorType}</Text>
            ) : null}
          </View>

          {/* Field 4: Short Summary */}
          <View
            onLayout={(e) => {
              fieldYPositions.current.summary = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>
                Short Summary <Text style={styles.requiredStar}>*</Text>
              </Text>
              {aiSuggestedFields.summary && (
                <View style={styles.aiTagBadge}>
                  <Sparkles size={10} color={theme.colors.lime} />
                  <Text style={styles.aiTagText}>AI-suggested</Text>
                </View>
              )}
            </View>

            <TextArea
              ref={summaryInputRef}
              placeholder="A 1-2 sentence overview of the message you want amplified..."
              value={typeof draft.summary === 'string' ? draft.summary : ''}
              onChangeText={handleSummaryChange}
              maxLength={160}
              showCounter
              numberOfLines={3}
              error={inlineErrors.summary}
              helper="Shown on feed cards and ad previews (max 160 chars)."
              style={styles.fieldSpacing}
            />
          </View>

          {/* Field 5: Optional Cover Image */}
          <View style={styles.coverSection}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>Cover Image (Optional)</Text>
              {/* <Text style={styles.optionalNotice}>16:9 aspect ratio</Text> */}
            </View>

            {draft.coverUrl ? (
              <View style={styles.coverPreviewContainer}>
                <Image
                  source={{ uri: draft.coverUrl as string }}
                  style={styles.coverImage}
                  contentFit="cover"
                  transition={200}
                />

                {isUploadingCover && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color={theme.colors.lime} />
                    <Text style={styles.uploadingText}>Uploading cover image...</Text>
                  </View>
                )}

                <View style={styles.coverActionsOverlay}>
                  <Button
                    title="Replace"
                    variant="secondary"
                    size="sm"
                    iconLeft={<Camera size={14} color={theme.colors.textPrimary} />}
                    onPress={handlePickCoverImage}
                    disabled={isUploadingCover}
                  />
                  <Button
                    title="Remove"
                    variant="ghost"
                    size="sm"
                    iconLeft={<Trash2 size={14} color={theme.colors.textPrimary} />}
                    onPress={handleRemoveCover}
                    disabled={isUploadingCover}
                  />
                </View>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose cover image"
                onPress={handlePickCoverImage}
                style={[styles.emptyCoverBox, Boolean(coverUploadError) && styles.emptyCoverBoxError]}
              >
                {isUploadingCover ? (
                  <View style={styles.emptyCoverInner}>
                    <ActivityIndicator size="small" color={theme.colors.lime} />
                    <Text style={styles.emptyCoverTitle}>Uploading cover image...</Text>
                  </View>
                ) : (
                  <View style={styles.emptyCoverInner}>
                    <View style={styles.cameraIconCircle}>
                      <Camera size={22} color={theme.colors.lime} />
                    </View>
                    <Text style={styles.emptyCoverTitle}>Choose a Cover Image</Text>
                    <Text style={styles.emptyCoverSubtitle}>
                      JPEG, PNG, or WebP up to 5MB · 16:9 crop applied
                    </Text>
                  </View>
                )}
              </Pressable>
            )}

            {coverUploadError && (
              <View style={styles.uploadErrorBox}>
                <AlertCircle size={14} color={theme.colors.textPrimary} />
                <Text style={styles.uploadErrorText}>{coverUploadError}</Text>
                <Button
                  title="Retry"
                  variant="ghost"
                  size="sm"
                  iconLeft={<RefreshCw size={12} color={theme.colors.textPrimary} />}
                  onPress={handlePickCoverImage}
                />
              </View>
            )}
          </View>
        </Card>

        {/* Bottom Form Actions (Save as Draft & Continue) */}
        <View style={styles.bottomFormActions}>
          <Button
            title="Save as Draft"
            variant="secondary"
            size="lg"
            fullWidth
            onPress={handleManualSave}
          />
          <Button
            title="Continue to Story"
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleContinue}
          />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Bottom Sheet */}
      <Sheet
        visible={categorySheetVisible}
        onClose={() => setCategorySheetVisible(false)}
        title="Select Cause Category"
      >
        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.categoryList}>
            {CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              const isSelected = draft.category === cat;

              return (
                <Pressable
                  key={cat}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${cat}`}
                  onPress={() => handleCategorySelect(cat)}
                  style={[styles.categoryOption, isSelected && styles.categoryOptionSelected]}
                >
                  <View style={styles.categoryOptionLeft}>
                    <View
                      style={[
                        styles.categoryOptionIconCircle,
                        isSelected && styles.categoryOptionIconCircleSelected,
                      ]}
                    >
                      <Icon
                        size={18}
                        color={isSelected ? theme.colors.onLime : theme.colors.textSecondary}
                      />
                    </View>
                    <View style={styles.categoryOptionMeta}>
                      <Text
                        style={[
                          styles.categoryOptionTitle,
                          isSelected && styles.categoryOptionTitleSelected,
                        ]}
                      >
                        {cat}
                      </Text>
                      <Text style={styles.categoryOptionDesc}>{meta.description}</Text>
                    </View>
                  </View>

                  {isSelected && <Check size={18} color={theme.colors.lime} />}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </Sheet>

      {/* AI Suggestions Review Sheet */}
      <Sheet
        visible={aiSheetVisible}
        onClose={() => setAiSheetVisible(false)}
        title="AI Draft Suggestions"
      >
        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.aiSheetHeader}>
            <Text style={styles.aiSheetSubtitle}>
              Review each suggested field below. Accept, edit, or dismiss them individually. AI will
              never overwrite without your confirmation.
            </Text>
            {aiResponse?.demo && (
              <View style={styles.demoBadgeRow}>
                <View style={styles.demoSuggestionsBadge}>
                  <View style={styles.demoDot} />
                  <Text style={styles.demoSuggestionsText}>Demo suggestions</Text>
                </View>
              </View>
            )}
          </View>

          {/* Suggestion 1: Title */}
          {!dismissedSuggestions.title && (
            <Card style={styles.suggestionCard}>
              <View style={styles.suggestionHeaderRow}>
                <View style={styles.suggestionTitleGroup}>
                  <Text style={styles.suggestionFieldLabel}>SUGGESTED TITLE</Text>
                  <Text style={styles.charLimitPill}>
                    {editableSuggestions.title.length}/60
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    setEditingFieldKey(editingFieldKey === 'title' ? null : 'title')
                  }
                  hitSlop={8}
                >
                  <Edit3 size={16} color={theme.colors.lime} />
                </Pressable>
              </View>

              {editingFieldKey === 'title' ? (
                <TextInput
                  value={editableSuggestions.title}
                  onChangeText={(t) =>
                    setEditableSuggestions((s) => ({ ...s, title: t.slice(0, 60) }))
                  }
                  maxLength={60}
                  style={styles.suggestionInput}
                  autoFocus
                />
              ) : (
                <Text style={styles.suggestionText}>{editableSuggestions.title}</Text>
              )}

              <View style={styles.suggestionActionsRow}>
                <Button
                  title="Dismiss"
                  variant="ghost"
                  size="sm"
                  onPress={() => handleDismissSuggestion('title')}
                />
                <Button
                  title="Accept Title"
                  variant="primary"
                  size="sm"
                  onPress={() => handleAcceptSuggestion('title')}
                />
              </View>
            </Card>
          )}

          {/* Suggestion 2: Category */}
          {!dismissedSuggestions.category && (
            <Card style={styles.suggestionCard}>
              <View style={styles.suggestionHeaderRow}>
                <Text style={styles.suggestionFieldLabel}>SUGGESTED CATEGORY</Text>
              </View>

              <View style={styles.suggestedCategoryDisplay}>
                <CategoryChip category={editableSuggestions.category || 'Other'} selected />
              </View>

              <View style={styles.suggestionActionsRow}>
                <Button
                  title="Dismiss"
                  variant="ghost"
                  size="sm"
                  onPress={() => handleDismissSuggestion('category')}
                />
                <Button
                  title="Accept Category"
                  variant="primary"
                  size="sm"
                  onPress={() => handleAcceptSuggestion('category')}
                />
              </View>
            </Card>
          )}

          {/* Suggestion 3: Creator */}
          {!dismissedSuggestions.creatorDescription && (
            <Card style={styles.suggestionCard}>
              <View style={styles.suggestionHeaderRow}>
                <View style={styles.suggestionTitleGroup}>
                  <Text style={styles.suggestionFieldLabel}>SUGGESTED CREATOR / ORG</Text>
                  <Text style={styles.charLimitPill}>
                    {editableSuggestions.creatorDescription.length}/80
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    setEditingFieldKey(editingFieldKey === 'creator' ? null : 'creator')
                  }
                  hitSlop={8}
                >
                  <Edit3 size={16} color={theme.colors.lime} />
                </Pressable>
              </View>

              {editingFieldKey === 'creator' ? (
                <TextInput
                  value={editableSuggestions.creatorDescription}
                  onChangeText={(t) =>
                    setEditableSuggestions((s) => ({
                      ...s,
                      creatorDescription: t.slice(0, 80),
                    }))
                  }
                  maxLength={80}
                  style={styles.suggestionInput}
                  autoFocus
                />
              ) : (
                <Text style={styles.suggestionText}>
                  {editableSuggestions.creatorDescription}
                </Text>
              )}

              <View style={styles.suggestionActionsRow}>
                <Button
                  title="Dismiss"
                  variant="ghost"
                  size="sm"
                  onPress={() => handleDismissSuggestion('creatorDescription')}
                />
                <Button
                  title="Accept Creator"
                  variant="primary"
                  size="sm"
                  onPress={() => handleAcceptSuggestion('creatorDescription')}
                />
              </View>
            </Card>
          )}

          {/* Suggestion 4: Summary */}
          {!dismissedSuggestions.summary && (
            <Card style={styles.suggestionCard}>
              <View style={styles.suggestionHeaderRow}>
                <View style={styles.suggestionTitleGroup}>
                  <Text style={styles.suggestionFieldLabel}>SUGGESTED SUMMARY</Text>
                  <Text style={styles.charLimitPill}>
                    {editableSuggestions.summary.length}/160
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    setEditingFieldKey(editingFieldKey === 'summary' ? null : 'summary')
                  }
                  hitSlop={8}
                >
                  <Edit3 size={16} color={theme.colors.lime} />
                </Pressable>
              </View>

              {editingFieldKey === 'summary' ? (
                <TextInput
                  value={editableSuggestions.summary}
                  onChangeText={(t) =>
                    setEditableSuggestions((s) => ({ ...s, summary: t.slice(0, 160) }))
                  }
                  maxLength={160}
                  multiline
                  numberOfLines={3}
                  style={[styles.suggestionInput, { minHeight: 64 }]}
                  autoFocus
                />
              ) : (
                <Text style={styles.suggestionText}>{editableSuggestions.summary}</Text>
              )}

              <View style={styles.suggestionActionsRow}>
                <Button
                  title="Dismiss"
                  variant="ghost"
                  size="sm"
                  onPress={() => handleDismissSuggestion('summary')}
                />
                <Button
                  title="Accept Summary"
                  variant="primary"
                  size="sm"
                  onPress={() => handleAcceptSuggestion('summary')}
                />
              </View>
            </Card>
          )}

          {/* Bottom Sheet Actions */}
          <View style={styles.sheetActionRow}>
            <Button
              title="Accept All Suggestions"
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleAcceptAllSuggestions}
              style={{ marginBottom: 8 }}
            />
            <Button
              title="Close"
              variant="ghost"
              size="md"
              fullWidth
              onPress={() => setAiSheetVisible(false)}
            />
          </View>
        </ScrollView>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  keyboardAvoid: {
    flex: 1,
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
  headerBox: {
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTextCol: {
    flex: 1,
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
  aiButton: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceRaised,
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
  helpCard: {
    padding: theme.spacing.base,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  helpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helpTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  helpCardTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  helpBody: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  helpIntro: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  promptItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.surfaceRaised,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  promptIcon: {
    marginTop: 2,
  },
  promptTextCol: {
    flex: 1,
  },
  promptLabel: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  promptDesc: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  helpFootnote: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 6,
  },
  formCard: {
    padding: theme.spacing.lg,
  },
  fieldSpacing: {
    marginBottom: theme.spacing.base,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  fieldLabel: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  requiredStar: {
    color: theme.colors.textSecondary,
  },
  optionalNotice: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  aiTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.tintedPillBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  aiTagText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
    color: theme.colors.tintedPillText,
  },
  categoryPickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pickerTriggerError: {
    borderColor: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
  },
  pickerTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pickerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerTriggerText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  pickerTriggerDesc: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  fieldHelperText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  inlineErrorText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.textPrimary,
    marginTop: 4,
  },
  creatorTypeGrid: {
    gap: 8,
    marginTop: theme.spacing.xs,
  },
  creatorTypeCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  creatorTypeCardSelected: {
    borderColor: theme.colors.lime,
    backgroundColor: theme.colors.surfaceRaised,
  },
  creatorTypeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  creatorTypeIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorTypeIconBoxSelected: {
    backgroundColor: theme.colors.lime,
  },
  creatorTypeTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  creatorTypeTitleSelected: {
    color: theme.colors.lime,
  },
  creatorTypeDescription: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  coverSection: {
    marginTop: theme.spacing.sm,
  },
  coverPreviewContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: theme.colors.surface,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverActionsOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: theme.colors.surface,
    padding: 4,
    borderRadius: theme.radius.sm,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(18, 21, 17, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadingText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  emptyCoverBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.base,
  },
  emptyCoverBoxError: {
    borderColor: theme.colors.textPrimary,
  },
  emptyCoverInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyCoverTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  emptyCoverSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  uploadErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
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
  bottomFormActions: {
    flexDirection: 'column',
    gap: 12,
    width: '100%',
    marginTop: theme.spacing.lg,
    paddingBottom: 40,
  },
  sheetScroll: {
    maxHeight: 500,
    paddingHorizontal: theme.spacing.base,
    paddingBottom: 24,
  },
  categoryList: {
    gap: 8,
    paddingVertical: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  categoryOptionSelected: {
    borderColor: theme.colors.lime,
    backgroundColor: theme.colors.tintedPillBg,
  },
  categoryOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  categoryOptionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryOptionIconCircleSelected: {
    backgroundColor: theme.colors.lime,
  },
  categoryOptionMeta: {
    flex: 1,
  },
  categoryOptionTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  categoryOptionTitleSelected: {
    color: theme.colors.lime,
  },
  categoryOptionDesc: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  aiSheetHeader: {
    marginBottom: 12,
  },
  aiSheetSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  demoBadgeRow: {
    marginTop: 8,
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
  suggestionCard: {
    padding: 12,
    marginBottom: 12,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceRaised,
  },
  suggestionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  suggestionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionFieldLabel: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: theme.colors.lime,
  },
  charLimitPill: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  suggestionText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  suggestionInput: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.radius.sm,
    padding: 8,
    marginBottom: 10,
  },
  suggestedCategoryDisplay: {
    marginVertical: 8,
    alignItems: 'flex-start',
  },
  suggestionActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  sheetActionRow: {
    marginTop: 8,
    marginBottom: 20,
  },
});
