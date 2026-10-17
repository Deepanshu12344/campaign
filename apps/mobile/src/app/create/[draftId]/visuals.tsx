import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Modal,
  findNodeHandle,
  UIManager,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Upload,
  Sparkles,
  Trash2,
  Star,
  RefreshCw,
  Info,
  Film,
  Camera,
  Layers,
  Check,
  ExternalLink,
} from 'lucide-react-native';
import {
  getStepErrors,
  AdCreative,
  CTA_PRESETS,
  CtaPreset,
  validateImageFile,
  deriveAdHeadlineFromTitle,
  AiAdCopyResponse,
} from '@campaigns/shared';
import { useDraftStore } from '../../../store/draftStore';
import { apiClient } from '../../../api/client';
import { useAiAdCopy } from '../../../api';
import { useRequireAuth } from '../../../auth/requireAuth';
import {
  TextField,
  TextArea,
  Card,
  Button,
  Sheet,
  Segmented,
  useToast,
  Avatar,
} from '../../../components/ui';
import { theme } from '../../../theme';

// Curated demo AI placeholder images for the "Generate image ideas" feature
const AI_IMAGE_IDEAS = [
  {
    id: 'solar',
    title: 'Clean Energy & Solar Grid',
    url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1200&q=80',
    category: 'Environment',
  },
  {
    id: 'water',
    title: 'Community Water Stream',
    url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80',
    category: 'Environment',
  },
  {
    id: 'community',
    title: 'Neighborhood Gathering',
    url: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=1200&q=80',
    category: 'Community',
  },
  {
    id: 'learning',
    title: 'Youth Digital Coding',
    url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80',
    category: 'Education',
  },
  {
    id: 'civic',
    title: 'Open Municipal Hall',
    url: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&q=80',
    category: 'Public Policy',
  },
  {
    id: 'wellness',
    title: 'Health & Deep Recovery',
    url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80',
    category: 'Health',
  },
];

export default function CreateVisualsScreen() {
  const { draftId } = useLocalSearchParams<{ draftId: string }>();
  const toast = useToast();
  const { requireAuth } = useRequireAuth();

  const draft = useDraftStore((s) => s.getDraft(draftId as string)) || {};
  const updateDraftField = useDraftStore((s) => s.updateDraftField);
  const saveDraftNow = useDraftStore((s) => s.saveDraftNow);
  const setStepContinueHandler = useDraftStore((s) => s.setStepContinueHandler);

  // References for smooth scrolling
  const scrollViewRef = useRef<ScrollView>(null);
  const coverSectionRef = useRef<View>(null);
  const adImagesSectionRef = useRef<View>(null);
  const adCopySectionRef = useRef<View>(null);
  const fieldPositions = useRef<Record<string, number>>({});

  // Cover image states
  const coverUrl = typeof draft.coverUrl === 'string' ? draft.coverUrl : '';
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);
  const lastCoverAssetRef = useRef<{ uri: string; name: string; mimeType: string } | null>(null);

  // Ad Creative state
  const rawAdCreative = draft.adCreative as AdCreative | null | undefined;
  const adCreative: AdCreative = {
    images: Array.isArray(rawAdCreative?.images) ? rawAdCreative.images : [],
    headline: typeof rawAdCreative?.headline === 'string' ? rawAdCreative.headline : '',
    description: typeof rawAdCreative?.description === 'string' ? rawAdCreative.description : '',
    cta: typeof rawAdCreative?.cta === 'string' && rawAdCreative.cta ? rawAdCreative.cta : 'Learn more',
    videoUrl: typeof rawAdCreative?.videoUrl === 'string' ? rawAdCreative.videoUrl : undefined,
  };

  const adImages = adCreative.images;
  const [isUploadingAdImage, setIsUploadingAdImage] = useState(false);
  const [adUploadError, setAdUploadError] = useState<string | null>(null);
  const [lowResWarning, setLowResWarning] = useState<string | null>(null);
  const lastAdAssetRef = useRef<{ uri: string; name: string; mimeType: string } | null>(null);

  // Pre-fill Headline from Title tracking
  const [isHeadlineDefault, setIsHeadlineDefault] = useState(() => {
    if (!adCreative.headline && typeof draft.title === 'string' && draft.title.trim().length > 0) {
      return true;
    }
    if (
      adCreative.headline &&
      typeof draft.title === 'string' &&
      adCreative.headline === deriveAdHeadlineFromTitle(draft.title)
    ) {
      return true;
    }
    return false;
  });

  // Automatically initialize headline from title if headline is currently empty
  useEffect(() => {
    if (!adCreative.headline && typeof draft.title === 'string' && draft.title.trim().length > 0) {
      const derived = deriveAdHeadlineFromTitle(draft.title);
      updateDraftField('adCreative', {
        ...adCreative,
        headline: derived,
      });
      setIsHeadlineDefault(true);
    }
  }, [draft.title, adCreative.headline, updateDraftField]);

  // AI-suggested fields tracking (clears on manual edit)
  const [aiSuggestedFields, setAiSuggestedFields] = useState<Record<string, boolean>>({});

  // Placement previews tab index: 0 = Social Feed, 1 = Vertical Story, 2 = Display Banner
  const [previewTabIndex, setPreviewTabIndex] = useState(0);

  // AI Ad Copy Mutation and Sheet
  const aiAdCopyMutation = useAiAdCopy();
  const [isAiSheetOpen, setIsAiSheetOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState<AiAdCopyResponse | null>(null);

  // AI Demo Image Ideas Gallery Modal
  const [isAiImageGalleryOpen, setIsAiImageGalleryOpen] = useState(false);

  // Overwrite confirmation modal state
  const [overwriteConfirm, setOverwriteConfirm] = useState<{
    type: 'headline' | 'description';
    text: string;
  } | null>(null);

  // Validation calculations
  const errors = getStepErrors(draft, 'visuals');
  const isComplete = errors.length === 0;

  // Scroll to a specific section on error tap
  const scrollToField = (fieldKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const yPos = fieldPositions.current[fieldKey];
    if (typeof yPos === 'number' && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: Math.max(0, yPos - 20), animated: true });
      return;
    }

    let targetRef: React.RefObject<View | null> | null = null;
    if (fieldKey === 'cover') targetRef = coverSectionRef;
    else if (fieldKey === 'adImages') targetRef = adImagesSectionRef;
    else if (fieldKey === 'adCopy' || fieldKey === 'headline' || fieldKey === 'description' || fieldKey === 'cta') {
      targetRef = adCopySectionRef;
    }

    if (targetRef?.current && scrollViewRef.current) {
      const handle = findNodeHandle(targetRef.current);
      if (handle) {
        UIManager.measureLayout(
          handle,
          findNodeHandle(scrollViewRef.current) as number,
          () => {},
          (_x, y) => {
            scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true });
          }
        );
      }
    }
  };

  // Register continue handler with creation layout
  useEffect(() => {
    setStepContinueHandler(async () => {
      const stepErrors = getStepErrors(draft, 'visuals');
      if (stepErrors.length > 0) {
        toast.error(stepErrors[0]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        scrollToField('cover');
        return false;
      }
      await saveDraftNow();
      return true;
    });

    return () => {
      setStepContinueHandler(null);
    };
  }, [draft, setStepContinueHandler, saveDraftNow, toast]);

  // COVER IMAGE HANDLERS
  const handlePickCoverImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCoverUploadError(null);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const filename = asset.fileName || asset.uri.split('/').pop() || 'cover.jpg';
      const ext = filename.split('.').pop()?.toLowerCase();
      const mimeType =
        asset.mimeType ||
        (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');

      // Validate file
      const validation = validateImageFile({
        name: filename,
        mimeType,
        sizeBytes: asset.fileSize,
        width: asset.width,
        height: asset.height,
      });

      if (!validation.isValid) {
        const msg = validation.error || 'Invalid image file';
        setCoverUploadError(msg);
        toast.error(msg);
        return;
      }

      lastCoverAssetRef.current = { uri: asset.uri, name: filename, mimeType };
      await uploadCoverImage(asset.uri, filename, mimeType);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to select image';
      setCoverUploadError(msg);
      toast.error(msg);
    }
  };

  const uploadCoverImage = async (uri: string, filename: string, mimeType: string) => {
    setIsUploadingCover(true);
    setCoverUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: filename,
        type: mimeType,
      } as unknown as Blob);

      const res = await apiClient.uploadFile<{ url: string }>('/uploads', formData);
      const fullUrl = res.url.startsWith('http')
        ? res.url
        : `${apiClient.getBaseUrl().replace(/\/api\/v1$/, '')}${res.url}`;

      updateDraftField('coverUrl', fullUrl);
      lastCoverAssetRef.current = null;
      toast.success('Campaign cover updated');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setCoverUploadError(msg);
      toast.error(msg);
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleRetryCoverUpload = () => {
    if (!lastCoverAssetRef.current) return;
    uploadCoverImage(
      lastCoverAssetRef.current.uri,
      lastCoverAssetRef.current.name,
      lastCoverAssetRef.current.mimeType
    );
  };

  const handleRemoveCover = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    updateDraftField('coverUrl', null);
    setCoverUploadError(null);
    lastCoverAssetRef.current = null;
    toast.info('Cover image removed');
  };

  // AD IMAGES HANDLERS
  const handlePickAdImage = async () => {
    if (adImages.length >= 5) {
      toast.warning('Maximum 5 ad images reached');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setAdUploadError(null);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const filename = asset.fileName || asset.uri.split('/').pop() || 'ad-image.jpg';
      const ext = filename.split('.').pop()?.toLowerCase();
      const mimeType =
        asset.mimeType ||
        (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');

      // Client-side validation: format, size, resolution
      const validation = validateImageFile({
        name: filename,
        mimeType,
        sizeBytes: asset.fileSize,
        width: asset.width,
        height: asset.height,
      });

      if (!validation.isValid) {
        const msg = validation.error || 'Invalid image file';
        setAdUploadError(msg);
        toast.error(msg);
        return;
      }

      if (validation.warning) {
        setLowResWarning(validation.warning);
        toast.warning(validation.warning);
      } else {
        setLowResWarning(null);
      }

      lastAdAssetRef.current = { uri: asset.uri, name: filename, mimeType };
      await uploadAdImage(asset.uri, filename, mimeType);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to select image';
      setAdUploadError(msg);
      toast.error(msg);
    }
  };

  const uploadAdImage = async (uri: string, filename: string, mimeType: string) => {
    setIsUploadingAdImage(true);
    setAdUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: filename,
        type: mimeType,
      } as unknown as Blob);

      const res = await apiClient.uploadFile<{ url: string }>('/uploads', formData);
      const fullUrl = res.url.startsWith('http')
        ? res.url
        : `${apiClient.getBaseUrl().replace(/\/api\/v1$/, '')}${res.url}`;

      updateDraftField('adCreative', {
        ...adCreative,
        images: [...adImages, fullUrl],
      });
      lastAdAssetRef.current = null;
      toast.success('Ad image added');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ad image upload failed. Please try again.';
      setAdUploadError(msg);
      toast.error(msg);
    } finally {
      setIsUploadingAdImage(false);
    }
  };

  const handleRetryAdUpload = () => {
    if (!lastAdAssetRef.current) return;
    uploadAdImage(
      lastAdAssetRef.current.uri,
      lastAdAssetRef.current.name,
      lastAdAssetRef.current.mimeType
    );
  };

  const handleRemoveAdImage = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const updated = adImages.filter((_, i) => i !== index);
    updateDraftField('adCreative', {
      ...adCreative,
      images: updated,
    });
    toast.info('Ad image removed');
  };

  const handleSetPrimaryAdImage = (index: number) => {
    if (index === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const selected = adImages[index];
    const rest = adImages.filter((_, i) => i !== index);
    updateDraftField('adCreative', {
      ...adCreative,
      images: [selected, ...rest],
    });
    toast.success('Set as primary ad image');
  };

  const handleAddAiDemoImage = (imageUrl: string) => {
    if (adImages.length >= 5) {
      toast.warning('Maximum 5 ad images reached');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    updateDraftField('adCreative', {
      ...adCreative,
      images: [...adImages, imageUrl],
    });
    setIsAiImageGalleryOpen(false);
    toast.success('Added placeholder ad image');
  };

  // AD COPY HANDLERS
  const handleHeadlineChange = (text: string) => {
    setIsHeadlineDefault(false);
    if (aiSuggestedFields.headline) {
      setAiSuggestedFields((prev) => ({ ...prev, headline: false }));
    }
    updateDraftField('adCreative', {
      ...adCreative,
      headline: text,
    });
  };

  const handleDescriptionChange = (text: string) => {
    if (aiSuggestedFields.description) {
      setAiSuggestedFields((prev) => ({ ...prev, description: false }));
    }
    updateDraftField('adCreative', {
      ...adCreative,
      description: text,
    });
  };

  const handleCtaSelect = (preset: CtaPreset) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    updateDraftField('adCreative', {
      ...adCreative,
      cta: preset,
    });
  };

  // AI ASSISTANT HANDLERS
  const handleLaunchAiAdCopy = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    requireAuth({
      reason: 'Sign in to use AI suggestions for generating ad creative copy.',
      returnTo: `/create/${draftId}/visuals`,
      onAuthenticated: executeAiAdCopy,
    });
  };

  const executeAiAdCopy = async () => {
    setIsAiSheetOpen(true);
    try {
      const res = await aiAdCopyMutation.mutateAsync({
        title: typeof draft.title === 'string' ? draft.title : undefined,
        summary: typeof draft.summary === 'string' ? draft.summary : undefined,
        category: draft.category,
        currentHeadline: adCreative.headline,
        currentDescription: adCreative.description,
        currentCta: adCreative.cta,
        hasImages: adImages.length > 0,
        imageCount: adImages.length,
        includeFeedback: true,
      });
      setAiResponse(res);
    } catch {
      toast.error('AI suggestions are unavailable. You can write your ad copy directly.');
    }
  };

  const handleApplyAiHeadline = (option: string) => {
    if (adCreative.headline && adCreative.headline.trim().length > 0 && adCreative.headline !== option) {
      setOverwriteConfirm({ type: 'headline', text: option });
      return;
    }
    applyHeadline(option);
  };

  const applyHeadline = (text: string) => {
    updateDraftField('adCreative', {
      ...adCreative,
      headline: text,
    });
    setIsHeadlineDefault(false);
    setAiSuggestedFields((prev) => ({ ...prev, headline: true }));
    setOverwriteConfirm(null);
    toast.success('Applied ad headline');
  };

  const handleApplyAiDescription = (option: string) => {
    if (adCreative.description && adCreative.description.trim().length > 0 && adCreative.description !== option) {
      setOverwriteConfirm({ type: 'description', text: option });
      return;
    }
    applyDescription(option);
  };

  const applyDescription = (text: string) => {
    updateDraftField('adCreative', {
      ...adCreative,
      description: text,
    });
    setAiSuggestedFields((prev) => ({ ...prev, description: true }));
    setOverwriteConfirm(null);
    toast.success('Applied ad description');
  };

  const handleApplyAiCta = (preset: CtaPreset) => {
    handleCtaSelect(preset);
    toast.success('Applied recommended CTA');
  };

  const primaryImage = adImages[0] || coverUrl || '';

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Step Header */}
      <View style={styles.headerBox}>
        <Text style={styles.stepTitle}>Step 3: Campaign & Ad Visuals</Text>
        <Text style={styles.stepSubtitle}>
          Configure your editorial story cover and design the advertising creative that will be
          served to external social and display audiences.
        </Text>
      </View>

      {/* TOP CONSOLIDATED WARNINGS & STATUS BAR */}
      <View style={styles.warningsContainer}>
        {isComplete ? (
          <View style={styles.readyCard}>
            <View style={styles.readyIconRow}>
              <CheckCircle2 size={18} color={theme.colors.success} />
              <Text style={styles.readyTitle}>Step 3 Ready for Review</Text>
            </View>
            <Text style={styles.readySubtitle}>
              Hero cover image and digital ad creative meet all publication requirements.
            </Text>
          </View>
        ) : (
          <View style={styles.alertsCard}>
            <View style={styles.alertsHeaderRow}>
              <AlertCircle size={18} color={theme.colors.danger} />
              <Text style={styles.alertsTitle}>
                {errors.length} {errors.length === 1 ? 'item' : 'items'} needed before continuing
              </Text>
            </View>
            <View style={styles.alertsList}>
              {!coverUrl && (
                <Pressable
                  onPress={() => scrollToField('cover')}
                  style={styles.alertItemRow}
                  accessibilityRole="button"
                  accessibilityLabel="Fix missing cover image"
                >
                  <View style={styles.alertDot} />
                  <Text style={styles.alertItemText}>Hero cover image is required for your article</Text>
                  <Text style={styles.alertFixLink}>Fix</Text>
                </Pressable>
              )}

              {adImages.length === 0 && (
                <Pressable
                  onPress={() => scrollToField('adImages')}
                  style={styles.alertItemRow}
                  accessibilityRole="button"
                  accessibilityLabel="Fix missing ad image"
                >
                  <View style={styles.alertDot} />
                  <Text style={styles.alertItemText}>At least one ad creative image is required</Text>
                  <Text style={styles.alertFixLink}>Fix</Text>
                </Pressable>
              )}

              {(!adCreative.headline || adCreative.headline.length > 40) && (
                <Pressable
                  onPress={() => scrollToField('adCopy')}
                  style={styles.alertItemRow}
                  accessibilityRole="button"
                  accessibilityLabel="Fix ad headline"
                >
                  <View style={styles.alertDot} />
                  <Text style={styles.alertItemText}>
                    {!adCreative.headline
                      ? 'Ad headline is required'
                      : 'Ad headline cannot exceed 40 characters'}
                  </Text>
                  <Text style={styles.alertFixLink}>Fix</Text>
                </Pressable>
              )}

              {(!adCreative.description || adCreative.description.length > 90) && (
                <Pressable
                  onPress={() => scrollToField('adCopy')}
                  style={styles.alertItemRow}
                  accessibilityRole="button"
                  accessibilityLabel="Fix ad description"
                >
                  <View style={styles.alertDot} />
                  <Text style={styles.alertItemText}>
                    {!adCreative.description
                      ? 'Ad description is required'
                      : 'Ad description cannot exceed 90 characters'}
                  </Text>
                  <Text style={styles.alertFixLink}>Fix</Text>
                </Pressable>
              )}

              {!adCreative.cta && (
                <Pressable
                  onPress={() => scrollToField('adCopy')}
                  style={styles.alertItemRow}
                  accessibilityRole="button"
                  accessibilityLabel="Fix call to action"
                >
                  <View style={styles.alertDot} />
                  <Text style={styles.alertItemText}>Call-to-action (CTA) text is required</Text>
                  <Text style={styles.alertFixLink}>Fix</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Non-blocking low resolution warning if triggered */}
        {lowResWarning && (
          <View style={styles.nonBlockingWarningCard}>
            <AlertTriangle size={16} color={theme.colors.warning} />
            <Text style={styles.nonBlockingWarningText}>{lowResWarning}</Text>
          </View>
        )}
      </View>

      {/* SECTION 1: EDITORIAL STORY COVER */}
      <View
        ref={coverSectionRef}
        onLayout={(e) => {
          fieldPositions.current.cover = e.nativeEvent.layout.y;
        }}
      >
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <Camera size={18} color={theme.colors.primary600} />
            </View>
            <View style={styles.sectionTitleCol}>
              <Text style={styles.sectionHeading}>Campaign Cover Image</Text>
              <Text style={styles.sectionHelper}>
                Hero image for the top of your reading page. Synced with Step 1.
              </Text>
            </View>
          </View>

          {coverUrl ? (
            <View style={styles.coverPreviewContainer}>
              <Image source={{ uri: coverUrl }} style={styles.coverImagePreview} resizeMode="cover" />
              <View style={styles.coverOverlayBadge}>
                <Text style={styles.coverOverlayBadgeText}>16:9 Aspect Ratio</Text>
              </View>
              <View style={styles.imageActionButtonsRow}>
                <Button
                  title="Replace"
                  variant="secondary"
                  size="sm"
                  onPress={handlePickCoverImage}
                  iconLeft={<RefreshCw size={14} color={theme.colors.primary600} />}
                  disabled={isUploadingCover}
                />
                <Button
                  title="Remove"
                  variant="ghost"
                  size="sm"
                  onPress={handleRemoveCover}
                  iconLeft={<Trash2 size={14} color={theme.colors.danger} />}
                  disabled={isUploadingCover}
                />
              </View>
            </View>
          ) : (
            <Pressable
              onPress={handlePickCoverImage}
              style={[styles.uploadBox, coverUploadError && styles.uploadBoxError]}
              accessibilityRole="button"
              accessibilityLabel="Upload hero cover image"
              disabled={isUploadingCover}
            >
              {isUploadingCover ? (
                <View style={styles.uploadingStateBox}>
                  <ActivityIndicator size="small" color={theme.colors.primary600} />
                  <Text style={styles.uploadingText}>Uploading cover image...</Text>
                </View>
              ) : (
                <>
                  <View style={styles.uploadIconCircle}>
                    <Upload size={22} color={theme.colors.primary600} />
                  </View>
                  <Text style={styles.uploadBoxTitle}>Select Cover Photo</Text>
                  <Text style={styles.uploadBoxSubtitle}>
                    16:9 crop · JPEG, PNG, or WebP · Max 5MB
                  </Text>
                </>
              )}
            </Pressable>
          )}

          {coverUploadError && (
            <View style={styles.errorNoticeRow}>
              <AlertCircle size={14} color={theme.colors.danger} />
              <Text style={styles.errorNoticeText}>{coverUploadError}</Text>
              {lastCoverAssetRef.current && (
                <Pressable onPress={handleRetryCoverUpload} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </Pressable>
              )}
            </View>
          )}
        </Card>
      </View>

      {/* SECTION 2: AD IMAGES CREATIVE */}
      <View
        ref={adImagesSectionRef}
        onLayout={(e) => {
          fieldPositions.current.adImages = e.nativeEvent.layout.y;
        }}
      >
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <Layers size={18} color={theme.colors.primary600} />
            </View>
            <View style={styles.sectionTitleCol}>
              <View style={styles.titleWithCountRow}>
                <Text style={styles.sectionHeading}>Social & Display Ad Images</Text>
                <View style={styles.counterBadge}>
                  <Text style={styles.counterBadgeText}>{adImages.length} / 5</Text>
                </View>
              </View>
              <Text style={styles.sectionHelper}>
                Visuals served on social feeds and digital networks. Up to 5 images.
              </Text>
            </View>
          </View>

          {/* Aspect Ratio Guidance Card */}
          <View style={styles.guidanceBanner}>
            <Info size={16} color={theme.colors.primary600} />
            <View style={styles.guidanceTextCol}>
              <Text style={styles.guidanceTitle}>Recommended Ad Ratios</Text>
              <Text style={styles.guidanceBody}>
                1:1 (Square, feed), 4:5 (Portrait, mobile feed), or 1.91:1 (Landscape banner).
                High resolution with $\ge$1080px short side recommended.
              </Text>
            </View>
          </View>

          {/* Thumbnails Grid */}
          {adImages.length > 0 && (
            <View style={styles.adThumbnailsGrid}>
              {adImages.map((imgUrl, index) => {
                const isPrimary = index === 0;
                return (
                  <View key={`ad-img-${index}-${imgUrl}`} style={styles.thumbnailCard}>
                    <Image source={{ uri: imgUrl }} style={styles.thumbnailImage} resizeMode="cover" />

                    {isPrimary ? (
                      <View style={styles.primaryBadge}>
                        <Star size={10} color="#FFFFFF" fill="#FFFFFF" />
                        <Text style={styles.primaryBadgeText}>Primary Ad</Text>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => handleSetPrimaryAdImage(index)}
                        style={styles.setPrimaryBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Set image ${index + 1} as primary ad`}
                      >
                        <Text style={styles.setPrimaryBtnText}>Set Primary</Text>
                      </Pressable>
                    )}

                    <Pressable
                      onPress={() => handleRemoveAdImage(index)}
                      style={styles.thumbnailDeleteBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ad image ${index + 1}`}
                    >
                      <Trash2 size={13} color="#FFFFFF" />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}

          {/* Add Image Action Row */}
          <View style={styles.adActionButtonsRow}>
            {adImages.length < 5 && (
              <Button
                title={isUploadingAdImage ? 'Uploading...' : 'Upload Ad Image'}
                variant="secondary"
                size="md"
                onPress={handlePickAdImage}
                iconLeft={
                  isUploadingAdImage ? (
                    <ActivityIndicator size="small" color={theme.colors.primary600} />
                  ) : (
                    <Upload size={16} color={theme.colors.primary600} />
                  )
                }
                disabled={isUploadingAdImage}
                style={styles.flex1}
              />
            )}

            <Button
              title="Image Ideas (AI)"
              variant="ghost"
              size="md"
              onPress={() => setIsAiImageGalleryOpen(true)}
              iconLeft={<Sparkles size={16} color={theme.colors.primary600} />}
            />
          </View>

          {adUploadError && (
            <View style={styles.errorNoticeRow}>
              <AlertCircle size={14} color={theme.colors.danger} />
              <Text style={styles.errorNoticeText}>{adUploadError}</Text>
              {lastAdAssetRef.current && (
                <Pressable onPress={handleRetryAdUpload} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </Pressable>
              )}
            </View>
          )}
        </Card>
      </View>

      {/* SECTION 3: VIDEO CREATIVE (COMING SOON) */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View style={[styles.sectionIconBadge, { backgroundColor: theme.colors.slate100 }]}>
            <Film size={18} color={theme.colors.ink600} />
          </View>
          <View style={styles.sectionTitleCol}>
            <View style={styles.titleWithCountRow}>
              <Text style={styles.sectionHeading}>Video Creative</Text>
              <View style={[styles.counterBadge, { backgroundColor: theme.colors.slate200 }]}>
                <Text style={[styles.counterBadgeText, { color: theme.colors.ink700 }]}>Preview</Text>
              </View>
            </View>
            <Text style={styles.sectionHelper}>
              Support for up to 30-second video advertisements.
            </Text>
          </View>
        </View>

        <View style={styles.videoNoticeBox}>
          <Text style={styles.videoNoticeTitle}>Video ads: coming soon</Text>
          <Text style={styles.videoNoticeBody}>
            Video ads require automated multi-resolution transcoding, preview thumbnail synthesis,
            and advertising network video policy verification that are currently in private pilot.
            Image ads are fully active and distribute immediately upon launch.
          </Text>
        </View>
      </Card>

      {/* SECTION 4: AD COPY COMPOSER */}
      <View
        ref={adCopySectionRef}
        onLayout={(e) => {
          fieldPositions.current.adCopy = e.nativeEvent.layout.y;
        }}
      >
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <Sparkles size={18} color={theme.colors.primary600} />
            </View>
            <View style={styles.sectionTitleCol}>
              <Text style={styles.sectionHeading}>Ad Copy & Call-To-Action</Text>
              <Text style={styles.sectionHelper}>
                Concise message text served alongside your creative in digital ad placements.
              </Text>
            </View>
          </View>

          {/* AI Assistance Action Row */}
          <View style={styles.aiButtonRow}>
            <Button
              title="Suggest Ad Copy with AI"
              variant="secondary"
              size="sm"
              onPress={handleLaunchAiAdCopy}
              iconLeft={<Sparkles size={14} color={theme.colors.primary600} />}
            />
          </View>

          {/* Headline Field */}
          <View style={styles.fieldSpacing}>
            <View style={styles.labelWithTagRow}>
              <Text style={styles.fieldLabel}>
                Ad Headline <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              {aiSuggestedFields.headline && (
                <View style={styles.aiTagPill}>
                  <Sparkles size={10} color={theme.colors.primary600} />
                  <Text style={styles.aiTagText}>AI-suggested</Text>
                </View>
              )}
            </View>
            <TextField
              placeholder="e.g. Protect Local Clean Water"
              value={adCreative.headline}
              onChangeText={handleHeadlineChange}
              maxLength={40}
              showCounter
              helper={
                isHeadlineDefault
                  ? 'Using your title as the headline'
                  : 'Bold headline displayed beneath ad image (max 40 chars).'
              }
            />
          </View>

          {/* Description Field */}
          <View style={styles.fieldSpacing}>
            <View style={styles.labelWithTagRow}>
              <Text style={styles.fieldLabel}>
                Ad Description <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              {aiSuggestedFields.description && (
                <View style={styles.aiTagPill}>
                  <Sparkles size={10} color={theme.colors.primary600} />
                  <Text style={styles.aiTagText}>AI-suggested</Text>
                </View>
              )}
            </View>
            <TextArea
              placeholder="Brief message to capture attention in high-velocity social feeds..."
              value={adCreative.description}
              onChangeText={handleDescriptionChange}
              maxLength={90}
              showCounter
              numberOfLines={2}
              helper="Primary ad body copy served on external channels (max 90 chars)."
            />
          </View>

          {/* Call To Action Selector */}
          <View style={styles.fieldSpacing}>
            <Text style={styles.fieldLabel}>
              Call-To-Action (CTA) <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <Text style={styles.fieldSubHelper}>
              Select the button text displayed on your advertisement.
            </Text>
            <View style={styles.ctaChipsRow}>
              {CTA_PRESETS.map((preset) => {
                const isSelected = adCreative.cta === preset;
                return (
                  <Pressable
                    key={preset}
                    onPress={() => handleCtaSelect(preset)}
                    style={[styles.ctaChip, isSelected && styles.ctaChipActive]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Call to action: ${preset}`}
                  >
                    {isSelected && <Check size={13} color={theme.colors.primary600} />}
                    <Text
                      style={[
                        styles.ctaChipText,
                        isSelected && styles.ctaChipTextActive,
                      ]}
                    >
                      {preset}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Card>
      </View>

      {/* SECTION 5: PLACEMENT PREVIEWS */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionIconBadge}>
            <ExternalLink size={18} color={theme.colors.primary600} />
          </View>
          <View style={styles.sectionTitleCol}>
            <Text style={styles.sectionHeading}>Placement Previews</Text>
            <Text style={styles.sectionHelper}>
              See how your ad looks across different network formats.
            </Text>
          </View>
        </View>

        <Segmented
          options={['Social Feed', 'Vertical Story', 'Display Banner']}
          selectedIndex={previewTabIndex}
          onChange={setPreviewTabIndex}
          style={styles.segmentedControl}
        />

        <Text style={styles.previewDisclaimerText}>
          Preview only. Final placements are set during review.
        </Text>

        {/* PREVIEW 1: SOCIAL FEED CARD */}
        {previewTabIndex === 0 && (
          <View style={styles.previewFeedContainer}>
            <View style={styles.feedHeaderRow}>
              <Avatar
                name={typeof draft.creatorName === 'string' ? draft.creatorName : 'Campaign'}
                size="sm"
              />
              <View style={styles.feedHeaderTextCol}>
                <Text style={styles.feedCreatorName} numberOfLines={1}>
                  {typeof draft.creatorName === 'string' && draft.creatorName
                    ? draft.creatorName
                    : 'Community Organizer'}
                </Text>
                <Text style={styles.feedSponsoredLabel}>Sponsored · Community Funded</Text>
              </View>
            </View>

            <View style={styles.feedImageContainer}>
              {primaryImage ? (
                <Image source={{ uri: primaryImage }} style={styles.feedImage} resizeMode="cover" />
              ) : (
                <View style={styles.previewImagePlaceholder}>
                  <Camera size={28} color={theme.colors.ink400} />
                  <Text style={styles.previewImagePlaceholderText}>Add an ad image to preview</Text>
                </View>
              )}
            </View>

            <View style={styles.feedFooterBox}>
              <View style={styles.feedTextCol}>
                <Text style={styles.feedHeadlineText} numberOfLines={1}>
                  {adCreative.headline || 'Your Ad Headline Here'}
                </Text>
                <Text style={styles.feedDescriptionText} numberOfLines={2}>
                  {adCreative.description ||
                    'Your message will appear here to spread vital information to community audiences.'}
                </Text>
              </View>
              <View style={styles.feedCtaButton}>
                <Text style={styles.feedCtaButtonText}>{adCreative.cta || 'Learn more'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* PREVIEW 2: VERTICAL STORY (9:16) */}
        {previewTabIndex === 1 && (
          <View style={styles.previewStoryWrapper}>
            <View style={styles.storyFrame}>
              {primaryImage ? (
                <Image source={{ uri: primaryImage }} style={styles.storyBackgroundImg} resizeMode="cover" />
              ) : (
                <View style={[styles.storyBackgroundImg, styles.previewImagePlaceholder]}>
                  <Camera size={28} color={theme.colors.ink400} />
                  <Text style={styles.previewImagePlaceholderText}>Add an ad image to preview</Text>
                </View>
              )}

              {/* Story Top Header Bar */}
              <View style={styles.storyTopOverlay}>
                <View style={styles.storyProgressBar} />
                <View style={styles.storyHeaderProfile}>
                  <Avatar
                    name={typeof draft.creatorName === 'string' ? draft.creatorName : 'Campaign'}
                    size="sm"
                  />
                  <Text style={styles.storyCreatorName} numberOfLines={1}>
                    {typeof draft.creatorName === 'string' && draft.creatorName
                      ? draft.creatorName
                      : 'Community Voice'}
                  </Text>
                  <View style={styles.storySponsoredPill}>
                    <Text style={styles.storySponsoredPillText}>Sponsored</Text>
                  </View>
                </View>
              </View>

              {/* Story Bottom Content Overlay */}
              <View style={styles.storyBottomOverlay}>
                <Text style={styles.storyHeadlineText} numberOfLines={2}>
                  {adCreative.headline || 'Your Ad Headline Here'}
                </Text>
                <Text style={styles.storyDescriptionText} numberOfLines={2}>
                  {adCreative.description || 'Actionable community facts that make a difference.'}
                </Text>
                <View style={styles.storyCtaPill}>
                  <Text style={styles.storyCtaPillText}>Swipe up or tap: {adCreative.cta || 'Learn more'}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* PREVIEW 3: SEARCH / DISPLAY BANNER */}
        {previewTabIndex === 2 && (
          <View style={styles.previewBannerContainer}>
            <View style={styles.bannerAdBadge}>
              <Text style={styles.bannerAdBadgeText}>AD</Text>
            </View>
            <View style={styles.bannerContentRow}>
              <View style={styles.bannerImageContainer}>
                {primaryImage ? (
                  <Image source={{ uri: primaryImage }} style={styles.bannerImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.bannerImage, styles.previewImagePlaceholder]}>
                    <Camera size={18} color={theme.colors.ink400} />
                  </View>
                )}
              </View>
              <View style={styles.bannerTextCol}>
                <Text style={styles.bannerHeadlineText} numberOfLines={1}>
                  {adCreative.headline || 'Your Ad Headline Here'}
                </Text>
                <Text style={styles.bannerDescriptionText} numberOfLines={2}>
                  {adCreative.description ||
                    'Clear, community-supported information delivered straight to digital feeds.'}
                </Text>
                <View style={styles.bannerCtaRow}>
                  <View style={styles.bannerCtaBtn}>
                    <Text style={styles.bannerCtaBtnText}>{adCreative.cta || 'Learn more'}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}
      </Card>

      {/* AI SUGGESTIONS BOTTOM SHEET */}
      <Sheet
        visible={isAiSheetOpen}
        onClose={() => setIsAiSheetOpen(false)}
        title="AI Ad Copy Suggestions"
      >
        <ScrollView style={styles.aiSheetScroll} showsVerticalScrollIndicator={false}>
          {aiAdCopyMutation.isPending ? (
            <View style={styles.aiLoadingBox}>
              <ActivityIndicator size="large" color={theme.colors.primary600} />
              <Text style={styles.aiLoadingText}>
                Synthesizing high-performing ad copy options from your campaign details...
              </Text>
            </View>
          ) : aiResponse ? (
            <View style={styles.aiResultsBox}>
              {/* Headline Options */}
              <Text style={styles.aiSectionTitle}>Suggested Headlines</Text>
              {aiResponse.headlines.map((option, idx) => (
                <View key={`ai-h-${idx}`} style={styles.aiOptionCard}>
                  <View style={styles.aiOptionTextCol}>
                    <Text style={styles.aiOptionContent}>{option}</Text>
                    <Text style={styles.aiCharCount}>{option.length} / 40 chars</Text>
                  </View>
                  <Button
                    title="Apply"
                    variant="secondary"
                    size="sm"
                    onPress={() => handleApplyAiHeadline(option)}
                  />
                </View>
              ))}

              {/* Description Options */}
              <Text style={styles.aiSectionTitle}>Suggested Descriptions</Text>
              {aiResponse.descriptions.map((desc, idx) => (
                <View key={`ai-d-${idx}`} style={styles.aiOptionCard}>
                  <View style={styles.aiOptionTextCol}>
                    <Text style={styles.aiOptionContent}>{desc}</Text>
                    <Text style={styles.aiCharCount}>{desc.length} / 90 chars</Text>
                  </View>
                  <Button
                    title="Apply"
                    variant="secondary"
                    size="sm"
                    onPress={() => handleApplyAiDescription(desc)}
                  />
                </View>
              ))}

              {/* Suggested Call to Action */}
              <Text style={styles.aiSectionTitle}>Recommended CTA</Text>
              <View style={styles.aiOptionCard}>
                <View style={styles.aiOptionTextCol}>
                  <Text style={styles.aiOptionContent}>{aiResponse.suggestedCta}</Text>
                  <Text style={styles.aiCharCount}>Preset placement action</Text>
                </View>
                <Button
                  title="Apply"
                  variant="secondary"
                  size="sm"
                  onPress={() => handleApplyAiCta(aiResponse.suggestedCta)}
                />
              </View>

              {/* Creative Quality Tips */}
              {aiResponse.creativeFeedback && aiResponse.creativeFeedback.length > 0 && (
                <>
                  <Text style={styles.aiSectionTitle}>Creative Quality Tips</Text>
                  <View style={styles.aiFeedbackBox}>
                    {aiResponse.creativeFeedback.map((tip, idx) => (
                      <View key={`tip-${idx}`} style={styles.aiFeedbackItem}>
                        <View style={styles.aiFeedbackBullet} />
                        <Text style={styles.aiFeedbackText}>{tip}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
          ) : null}
        </ScrollView>
      </Sheet>

      {/* AI DEMO IMAGE GALLERY MODAL */}
      <Modal
        visible={isAiImageGalleryOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAiImageGalleryOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Card style={styles.galleryModalCard}>
            <View style={styles.galleryHeader}>
              <View>
                <Text style={styles.galleryTitle}>AI Image Placeholders</Text>
                <Text style={styles.gallerySubtitle}>
                  Curated demo images for testing your ad placements.
                </Text>
              </View>
              <Pressable
                onPress={() => setIsAiImageGalleryOpen(false)}
                style={styles.galleryCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.galleryCloseText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.galleryScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.galleryGrid}>
                {AI_IMAGE_IDEAS.map((item) => (
                  <View key={item.id} style={styles.galleryItemCard}>
                    <Image source={{ uri: item.url }} style={styles.galleryItemImg} resizeMode="cover" />
                    <View style={styles.galleryItemBadge}>
                      <Text style={styles.galleryItemBadgeText}>AI-generated placeholder</Text>
                    </View>
                    <Text style={styles.galleryItemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Button
                      title="Add to Creative"
                      variant="secondary"
                      size="sm"
                      onPress={() => handleAddAiDemoImage(item.url)}
                      style={styles.galleryItemBtn}
                    />
                  </View>
                ))}
              </View>
            </ScrollView>
          </Card>
        </View>
      </Modal>

      {/* OVERWRITE CONFIRMATION MODAL */}
      <Modal
        visible={Boolean(overwriteConfirm)}
        transparent
        animationType="fade"
        onRequestClose={() => setOverwriteConfirm(null)}
      >
        <View style={styles.modalBackdrop}>
          <Card style={styles.confirmModalCard}>
            <View style={styles.confirmIconCircle}>
              <AlertTriangle size={24} color={theme.colors.warning} />
            </View>
            <Text style={styles.confirmModalTitle}>
              Replace existing {overwriteConfirm?.type}?
            </Text>
            <Text style={styles.confirmModalBody}>
              Applying this AI suggestion will overwrite your current {overwriteConfirm?.type}. This
              action can be changed before submitting.
            </Text>
            <View style={styles.confirmButtonsRow}>
              <Button
                title="Cancel"
                variant="ghost"
                size="md"
                onPress={() => setOverwriteConfirm(null)}
                style={styles.flex1}
              />
              <Button
                title="Replace"
                variant="primary"
                size="md"
                onPress={() => {
                  if (overwriteConfirm?.type === 'headline') {
                    applyHeadline(overwriteConfirm.text);
                  } else if (overwriteConfirm?.type === 'description') {
                    applyDescription(overwriteConfirm.text);
                  }
                }}
                style={styles.flex1}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    padding: theme.spacing.base,
    paddingBottom: 60,
    gap: theme.spacing.base,
  },
  flex1: {
    flex: 1,
  },
  headerBox: {
    marginBottom: 2,
  },
  stepTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: theme.typography.styles.h2.fontSize,
    lineHeight: theme.typography.styles.h2.lineHeight,
    color: theme.colors.ink900,
  },
  stepSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.body.fontSize,
    lineHeight: theme.typography.styles.body.lineHeight,
    color: theme.colors.ink600,
    marginTop: 4,
  },
  warningsContainer: {
    gap: theme.spacing.sm,
  },
  readyCard: {
    backgroundColor: theme.colors.successBg,
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  readyIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  readyTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: theme.typography.styles.body.fontSize,
    color: theme.colors.success,
  },
  readySubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.ink700,
  },
  alertsCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  alertsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  alertsTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.danger,
  },
  alertsList: {
    gap: 8,
  },
  alertItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  alertDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.danger,
  },
  alertItemText: {
    flex: 1,
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.ink800,
  },
  alertFixLink: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.primary600,
  },
  nonBlockingWarningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.warningBg,
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
  },
  nonBlockingWarningText: {
    flex: 1,
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.ink800,
  },
  sectionCard: {
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  sectionIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleCol: {
    flex: 1,
  },
  titleWithCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeading: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 16,
    color: theme.colors.ink900,
  },
  counterBadge: {
    backgroundColor: theme.colors.primary50,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: theme.radius.full,
  },
  counterBadgeText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
    color: theme.colors.primary700,
  },
  sectionHelper: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.ink600,
    marginTop: 2,
  },
  coverPreviewContainer: {
    borderRadius: theme.radius.input,
    overflow: 'hidden',
    backgroundColor: theme.colors.slate100,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  coverImagePreview: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  coverOverlayBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: theme.radius.sm,
  },
  coverOverlayBadgeText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
    color: '#FFFFFF',
  },
  imageActionButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  uploadBox: {
    borderWidth: 2,
    borderColor: theme.colors.line,
    borderStyle: 'dashed',
    borderRadius: theme.radius.input,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bgMuted,
  },
  uploadBoxError: {
    borderColor: theme.colors.danger,
    backgroundColor: '#FEF2F2',
  },
  uploadingStateBox: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  uploadingText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.ink600,
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  uploadBoxTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.ink900,
  },
  uploadBoxSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.ink500,
    marginTop: 2,
  },
  errorNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.xs,
  },
  errorNoticeText: {
    flex: 1,
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.danger,
  },
  retryButton: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    backgroundColor: theme.colors.primary50,
    borderRadius: theme.radius.xs,
  },
  retryButtonText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.primary600,
  },
  guidanceBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary50,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.base,
  },
  guidanceTextCol: {
    flex: 1,
  },
  guidanceTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    color: theme.colors.primary700,
  },
  guidanceBody: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.ink700,
    marginTop: 2,
  },
  adThumbnailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.base,
  },
  thumbnailCard: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    backgroundColor: theme.colors.slate100,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  primaryBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary600,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: theme.radius.xs,
  },
  primaryBadgeText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  setPrimaryBtn: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: theme.radius.xs,
  },
  setPrimaryBtnText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 10,
    color: '#FFFFFF',
  },
  thumbnailDeleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adActionButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  videoNoticeBox: {
    backgroundColor: theme.colors.bgMuted,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.base,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  videoNoticeTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.ink800,
    marginBottom: 4,
  },
  videoNoticeBody: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.ink600,
  },
  aiButtonRow: {
    marginBottom: theme.spacing.base,
  },
  fieldSpacing: {
    marginBottom: theme.spacing.base,
  },
  labelWithTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fieldLabel: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.ink800,
  },
  fieldSubHelper: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.ink500,
    marginBottom: theme.spacing.sm,
  },
  requiredAsterisk: {
    color: theme.colors.danger,
  },
  aiTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary50,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: theme.radius.full,
  },
  aiTagText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 10,
    color: theme.colors.primary700,
  },
  ctaChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  ctaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surface,
  },
  ctaChipActive: {
    borderColor: theme.colors.primary600,
    backgroundColor: theme.colors.primary50,
  },
  ctaChipText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.ink700,
  },
  ctaChipTextActive: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    color: theme.colors.primary700,
  },
  segmentedControl: {
    marginBottom: theme.spacing.sm,
  },
  previewDisclaimerText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    color: theme.colors.ink500,
    textAlign: 'center',
    marginBottom: theme.spacing.base,
  },
  previewFeedContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: theme.spacing.sm,
  },
  feedHeaderTextCol: {
    flex: 1,
  },
  feedCreatorName: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.ink900,
  },
  feedSponsoredLabel: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    color: theme.colors.ink500,
  },
  feedImageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: theme.colors.slate100,
  },
  feedImage: {
    width: '100%',
    height: '100%',
  },
  feedFooterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.bgMuted,
  },
  feedTextCol: {
    flex: 1,
  },
  feedHeadlineText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.ink900,
  },
  feedDescriptionText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.ink600,
    marginTop: 2,
  },
  feedCtaButton: {
    backgroundColor: theme.colors.primary600,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
  },
  feedCtaButtonText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  previewStoryWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
  },
  storyFrame: {
    width: 250,
    height: 444,
    borderRadius: theme.radius.card,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    ...theme.shadows.elevated,
  },
  storyBackgroundImg: {
    width: '100%',
    height: '100%',
  },
  storyTopOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 12,
    paddingTop: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  storyProgressBar: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 1,
    marginBottom: 8,
  },
  storyHeaderProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storyCreatorName: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    color: '#FFFFFF',
    flex: 1,
  },
  storySponsoredPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: theme.radius.xs,
  },
  storySponsoredPillText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 10,
    color: '#FFFFFF',
  },
  storyBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
  },
  storyHeadlineText: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 15,
    lineHeight: 19,
    color: '#FFFFFF',
  },
  storyDescriptionText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    lineHeight: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
  },
  storyCtaPill: {
    marginTop: 10,
    backgroundColor: theme.colors.primary600,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: theme.radius.full,
    alignItems: 'center',
  },
  storyCtaPillText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  previewBannerContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    overflow: 'hidden',
    padding: theme.spacing.sm,
    ...theme.shadows.card,
  },
  bannerAdBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.slate200,
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 2,
    marginBottom: 6,
  },
  bannerAdBadgeText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 9,
    color: theme.colors.ink600,
  },
  bannerContentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bannerImageContainer: {
    width: 90,
    height: 90,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    backgroundColor: theme.colors.slate100,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerTextCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bannerHeadlineText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.ink900,
  },
  bannerDescriptionText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.ink600,
    marginTop: 2,
  },
  bannerCtaRow: {
    alignItems: 'flex-start',
    marginTop: 6,
  },
  bannerCtaBtn: {
    backgroundColor: theme.colors.primary600,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.radius.sm,
  },
  bannerCtaBtnText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  previewImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.base,
    backgroundColor: theme.colors.slate100,
  },
  previewImagePlaceholderText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.ink500,
    marginTop: 6,
    textAlign: 'center',
  },
  aiSheetScroll: {
    padding: theme.spacing.base,
  },
  aiLoadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: theme.spacing.md,
  },
  aiLoadingText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.ink600,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  aiResultsBox: {
    gap: theme.spacing.md,
    paddingBottom: 40,
  },
  aiSectionTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.ink900,
    marginTop: 4,
  },
  aiOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.bgMuted,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  aiOptionTextCol: {
    flex: 1,
  },
  aiOptionContent: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.ink900,
  },
  aiCharCount: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 11,
    color: theme.colors.ink500,
    marginTop: 2,
  },
  aiFeedbackBox: {
    backgroundColor: theme.colors.primary50,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    gap: 8,
  },
  aiFeedbackItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  aiFeedbackBullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.primary600,
    marginTop: 6,
  },
  aiFeedbackText: {
    flex: 1,
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.ink800,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.base,
  },
  galleryModalCard: {
    width: '100%',
    maxHeight: '80%',
    padding: theme.spacing.base,
    borderRadius: theme.radius.card,
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.base,
  },
  galleryTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 18,
    color: theme.colors.ink900,
  },
  gallerySubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.ink600,
    marginTop: 2,
  },
  galleryCloseBtn: {
    padding: 4,
  },
  galleryCloseText: {
    fontSize: 18,
    color: theme.colors.ink600,
    fontWeight: 'bold',
  },
  galleryScroll: {
    maxHeight: 400,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.base,
  },
  galleryItemCard: {
    width: '48%',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.line,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    paddingBottom: 8,
  },
  galleryItemImg: {
    width: '100%',
    aspectRatio: 1,
  },
  galleryItemBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: theme.radius.xs,
  },
  galleryItemBadgeText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 8,
    color: '#FFFFFF',
  },
  galleryItemTitle: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.ink900,
    paddingHorizontal: 8,
    marginTop: 6,
  },
  galleryItemBtn: {
    marginHorizontal: 8,
    marginTop: 6,
  },
  confirmModalCard: {
    width: '90%',
    padding: theme.spacing.lg,
    borderRadius: theme.radius.card,
    alignItems: 'center',
  },
  confirmIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  confirmModalTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 16,
    color: theme.colors.ink900,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  confirmModalBody: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.ink600,
    textAlign: 'center',
    marginBottom: theme.spacing.base,
  },
  confirmButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    width: '100%',
  },
});
