import React, { useState, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Svg, { G, Path, Circle } from 'react-native-svg';
import {
  ArrowLeft,
  Camera,
  LayoutDashboard,
  ShieldCheck,
  Bookmark,
  Receipt,
  Bell,
  Settings,
  HelpCircle,
  SlidersHorizontal,
  ChevronRight,
} from 'lucide-react-native';
import { theme } from '../../theme';
import { Avatar } from '../../components/ui/Avatar';
import { Sheet } from '../../components/ui/Sheet';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import { useUpdateProfile } from '../../api';
import { uploadImage } from '../../utils/fileUpload';

interface HelpTopic {
  id: string;
  title: string;
  description: string;
  content: string;
}

const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'how-it-works',
    title: 'How Campaigns Works',
    description: 'Ad distribution, not donations',
    content:
      'Campaigns is a crowdfunding platform that turns public support directly into paid digital advertising. Every dollar contributed (minus platform and payment fees) buys ad impressions on social feeds, search engines, and media to spread awareness on important causes. Backers fund targeted ad distribution, not charities or personal causes.',
  },
  {
    id: 'faqs',
    title: 'Frequently Asked Questions',
    description: 'Funding goals, refunds, and delivery',
    content:
      'Q: Can I back a campaign without an account?\nA: Yes. Guest checkout is supported with receipt tokens saved on your device.\n\nQ: What happens if a campaign misses its goal?\nA: If a funding deadline expires before the goal is met, pledges are marked for refund.\n\nQ: How is reach estimated?\nA: Reach is modeled on historical CPM benchmarks. Measured reach is reported after ads run.',
  },
  {
    id: 'guidelines',
    title: 'Community & Advertising Guidelines',
    description: 'Editorial standards and fact-checking',
    content:
      'All campaigns undergo review before ads are delivered. Claims of fact must cite verifiable public sources. Hate speech, misleading medical claims, and deceptive financial promotions are strictly prohibited.',
  },
  {
    id: 'terms',
    title: 'Terms of Service',
    description: 'Rights and advertising rules',
    content:
      'Campaign media assets are distributed under digital ad network policies. Creators retain moral rights to their content.',
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    description: 'Private backer names by default',
    content:
      'Backer names and payment details are private by default. We never sell your personal information.',
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { user, isAuthenticated, signOut, setUser } = useAuthStore();
  const updateProfileMutation = useUpdateProfile();

  const [showHelpSheet, setShowHelpSheet] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handle = useMemo(() => {
    if (!user?.email) return '@user';
    const slug = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
    return `@${slug || 'user'}`;
  }, [user?.email]);

  const initials = useMemo(() => {
    if (!user?.name) return 'U';
    return user.name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [user?.name]);

  const handleCopyHandle = async () => {
    await Clipboard.setStringAsync(handle);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    toast.success('Copied');
  };

  const handlePickPhoto = async () => {
    setShowPhotoSheet(false);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        toast.error('Photo library permission is required to select an avatar');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];

      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        toast.error('Image must be under 5MB');
        return;
      }

      setIsUploadingPhoto(true);

      const filename = asset.fileName || `avatar-${Date.now()}.jpg`;
      const mimeType = asset.mimeType || 'image/jpeg';

      const { fullUrl } = await uploadImage({
        uri: asset.uri,
        fileName: filename,
        mimeType,
        file: (asset as { file?: unknown }).file,
      });

      const updatedUser = await updateProfileMutation.mutateAsync({ avatarUrl: fullUrl });
      setUser(updatedUser);
      toast.success('Profile photo updated');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile photo';
      toast.error(msg);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    setShowPhotoSheet(false);
    try {
      setIsUploadingPhoto(true);
      const updatedUser = await updateProfileMutation.mutateAsync({ avatarUrl: null });
      setUser(updatedUser);
      toast.success('Profile photo removed');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove photo';
      toast.error(msg);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Easter egg: 7 taps on version opens demo control panel
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);

  const handleVersionTap = () => {
    const now = Date.now();
    if (now - lastTapTimeRef.current < 3500) {
      tapCountRef.current += 1;
    } else {
      tapCountRef.current = 1;
    }
    lastTapTimeRef.current = now;

    if (tapCountRef.current >= 7) {
      tapCountRef.current = 0;
      router.push('/demo/control');
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <View style={styles.screen}>
      {/* Top Navigation Row: 44dp surface circle back button with lime arrow */}
      <View
        style={[
          styles.topNavRow,
          { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 12 : 8) },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)' as Href);
            }
          }}
          style={styles.backCircleBtn}
          hitSlop={8}
        >
          <ArrowLeft size={20} color={theme.colors.lime} strokeWidth={2.5} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isAuthenticated && user ? (
          /* 1. Authenticated Redesigned Top Block */
          <View style={styles.profileTopBlock}>
            {/* 144dp Centered Avatar with 40dp Camera Badge */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              onPress={() => setShowPhotoSheet(true)}
              style={styles.avatarContainer}
            >
              <View style={styles.avatarCircle}>
                {user.avatarUrl ? (
                  <Image
                    source={{ uri: user.avatarUrl }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <Text style={styles.avatarInitials}>{initials}</Text>
                )}
              </View>

              <View style={styles.cameraBadge}>
                <Camera size={18} color="#163300" strokeWidth={2.2} />
              </View>
            </Pressable>

            {/* Name up to 2 lines in uppercase display font */}
            <View style={styles.nameAndAccountType}>
              <Text style={styles.userNameDisplay} numberOfLines={2}>
                {user.name}
              </Text>
              <Text style={styles.userAccountType}>Personal account</Text>
            </View>

            {/* Dark surface pill with logo mark and @handle */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Copy handle ${handle}`}
              onPress={handleCopyHandle}
              style={({ pressed }) => [styles.handlePill, pressed && { opacity: 0.8 }]}
            >
              <LogoMarkVector size={16} />
              <Text style={styles.handleText}>{handle}</Text>
            </Pressable>
          </View>
        ) : (
          /* Signed-Out Top Block */
          <>
            <Text style={styles.screenTitle}>Profile</Text>
            <View style={styles.accountCard}>
              <Avatar name="Guest" size={52} isGuest />
              <View style={styles.accountInfo}>
                <Text style={styles.userName}>Welcome to Campaigns</Text>
                <Text style={styles.userEmail}>Sign in to manage campaigns and settings</Text>
              </View>
              <Button
                title="Sign In"
                variant="primary"
                size="sm"
                onPress={() => router.push('/auth/sign-in')}
                style={styles.signInButton}
              />
            </View>
          </>
        )}

        {/* 2. List Card: "Your campaigns" */}
        {isAuthenticated && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionLabel}>Your campaigns</Text>
            <View style={styles.menuCard}>
              <Pressable
                style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
                onPress={() => router.push('/creator/dashboard')}
                accessibilityRole="button"
                accessibilityLabel="Creator Dashboard"
              >
                <View style={styles.menuLeft}>
                  <View style={styles.menuIconCircle}>
                    <LayoutDashboard size={18} color={theme.colors.lime} strokeWidth={2} />
                  </View>
                  <Text style={styles.menuLabel}>Creator Dashboard</Text>
                </View>
                <ChevronRight size={18} color={theme.colors.textSecondary} />
              </Pressable>

              <View style={styles.menuDivider} />

              <Pressable
                style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
                onPress={() => router.push('/profile/backed')}
                accessibilityRole="button"
                accessibilityLabel="Backed Campaigns"
              >
                <View style={styles.menuLeft}>
                  <View style={styles.menuIconCircle}>
                    <ShieldCheck size={18} color={theme.colors.lime} strokeWidth={2} />
                  </View>
                  <Text style={styles.menuLabel}>Backed Campaigns</Text>
                </View>
                <ChevronRight size={18} color={theme.colors.textSecondary} />
              </Pressable>

              <View style={styles.menuDivider} />

              <Pressable
                style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
                onPress={() => router.push('/profile/saved')}
                accessibilityRole="button"
                accessibilityLabel="Saved Campaigns"
              >
                <View style={styles.menuLeft}>
                  <View style={styles.menuIconCircle}>
                    <Bookmark size={18} color={theme.colors.lime} strokeWidth={2} />
                  </View>
                  <Text style={styles.menuLabel}>Saved Campaigns</Text>
                </View>
                <ChevronRight size={18} color={theme.colors.textSecondary} />
              </Pressable>

              <View style={styles.menuDivider} />

              <Pressable
                style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
                onPress={() => router.push('/profile/payments')}
                accessibilityRole="button"
                accessibilityLabel="Payment history and receipts"
              >
                <View style={styles.menuLeft}>
                  <View style={styles.menuIconCircle}>
                    <Receipt size={18} color={theme.colors.lime} strokeWidth={2} />
                  </View>
                  <Text style={styles.menuLabel}>Payment History & Receipts</Text>
                </View>
                <ChevronRight size={18} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
          </View>
        )}

        {/* 3. List Card: "Settings" */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionLabel}>Settings</Text>
          <View style={styles.menuCard}>
            {isAuthenticated && (
              <>
                <Pressable
                  style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
                  onPress={() => router.push('/profile/notifications-settings')}
                  accessibilityRole="button"
                  accessibilityLabel="Notification Preferences"
                >
                  <View style={styles.menuLeft}>
                    <View style={styles.menuIconCircle}>
                      <Bell size={18} color={theme.colors.lime} strokeWidth={2} />
                    </View>
                    <Text style={styles.menuLabel}>Notifications</Text>
                  </View>
                  <ChevronRight size={18} color={theme.colors.textSecondary} />
                </Pressable>

                <View style={styles.menuDivider} />

                <Pressable
                  style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
                  onPress={() => router.push('/profile/settings')}
                  accessibilityRole="button"
                  accessibilityLabel="Account Settings"
                >
                  <View style={styles.menuLeft}>
                    <View style={styles.menuIconCircle}>
                      <Settings size={18} color={theme.colors.lime} strokeWidth={2} />
                    </View>
                    <Text style={styles.menuLabel}>Account Settings</Text>
                  </View>
                  <ChevronRight size={18} color={theme.colors.textSecondary} />
                </Pressable>

                <View style={styles.menuDivider} />
              </>
            )}

            <Pressable
              style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
              onPress={() => {
                setSelectedTopic(null);
                setShowHelpSheet(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Help and support"
            >
              <View style={styles.menuLeft}>
                <View style={styles.menuIconCircle}>
                  <HelpCircle size={18} color={theme.colors.lime} strokeWidth={2} />
                </View>
                <Text style={styles.menuLabel}>Help & Support</Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textSecondary} />
            </Pressable>

            {/* Admin shortcut if applicable */}
            {user?.role === 'ADMIN' && (
              <>
                <View style={styles.menuDivider} />
                <Pressable
                  style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
                  onPress={() => router.push('/demo/control')}
                  accessibilityRole="button"
                  accessibilityLabel="Reviewer Control Panel"
                >
                  <View style={styles.menuLeft}>
                    <View style={styles.menuIconCircle}>
                      <SlidersHorizontal size={18} color={theme.colors.lime} strokeWidth={2} />
                    </View>
                    <Text style={styles.menuLabel}>Reviewer Control Panel</Text>
                  </View>
                  <ChevronRight size={18} color={theme.colors.textSecondary} />
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* 4. Bottom Area: Quiet text button "Sign out" + app version */}
        <View style={styles.bottomArea}>
          {isAuthenticated && (
            <Pressable
              onPress={handleSignOut}
              accessibilityRole="button"
              accessibilityLabel="Sign out of account"
              style={({ pressed }) => [styles.signOutPressable, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          )}

          <Pressable
            style={styles.versionWrap}
            onPress={handleVersionTap}
            hitSlop={12}
            accessibilityRole="text"
            accessibilityLabel="App version"
          >
            <Text style={styles.versionText}>Campaigns v1.0.0-demo (build 42)</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Help & Support Sheet */}
      <Sheet
        visible={showHelpSheet}
        onClose={() => {
          setShowHelpSheet(false);
          setSelectedTopic(null);
        }}
        title={selectedTopic ? selectedTopic.title : 'Help & Support'}
      >
        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          {selectedTopic ? (
            <View style={styles.topicDetailBox}>
              <Text style={styles.topicDetailDesc}>{selectedTopic.description}</Text>
              <Text style={styles.topicDetailContent}>{selectedTopic.content}</Text>
              <Button
                title="Back to Topics"
                variant="secondary"
                size="md"
                onPress={() => setSelectedTopic(null)}
                style={{ marginTop: 16 }}
              />
            </View>
          ) : (
            <View style={styles.topicList}>
              {HELP_TOPICS.map((topic) => (
                <Pressable
                  key={topic.id}
                  style={({ pressed }) => [styles.topicRow, pressed && { opacity: 0.7 }]}
                  onPress={() => setSelectedTopic(topic)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topicTitle}>{topic.title}</Text>
                    <Text style={styles.topicDesc}>{topic.description}</Text>
                  </View>
                  <ChevronRight size={16} color={theme.colors.textSecondary} />
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </Sheet>

      {/* Photo Picker Sheet */}
      <Sheet
        visible={showPhotoSheet}
        onClose={() => setShowPhotoSheet(false)}
        title="Profile Photo"
      >
        <View style={styles.photoSheetContent}>
          <Button
            title={isUploadingPhoto ? 'Uploading...' : 'Choose Photo'}
            variant="primary"
            size="lg"
            fullWidth
            loading={isUploadingPhoto}
            onPress={handlePickPhoto}
          />
          {Boolean(user?.avatarUrl) && (
            <Button
              title="Remove Photo"
              variant="danger"
              size="md"
              fullWidth
              disabled={isUploadingPhoto}
              onPress={handleRemovePhoto}
              style={{ marginTop: 8 }}
            />
          )}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg, // #121511
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  screenTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 32,
    lineHeight: 38,
    color: theme.colors.textPrimary,
    marginBottom: 20,
  },

  // Account Card
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface, // #2A2D29
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    gap: 16,
  },
  accountInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 17,
    lineHeight: 22,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  userEmail: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  signInButton: {
    height: 38,
    paddingHorizontal: 16,
  },

  // Section Wraps (24dp gap)
  sectionWrap: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  // List Cards
  menuCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    overflow: 'hidden',
  },
  menuRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  menuRowPressed: {
    backgroundColor: theme.colors.surfaceRaised,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  menuDivider: {
    height: 1,
    backgroundColor: theme.colors.line,
    marginLeft: 64,
  },

  // Bottom Area
  bottomArea: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
  },
  signOutPressable: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  signOutText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  versionWrap: {
    padding: 8,
  },
  versionText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  // Help Sheet
  sheetScroll: {
    maxHeight: 460,
  },
  topicList: {
    paddingVertical: 8,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  topicTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 15,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  topicDesc: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  topicDetailBox: {
    paddingVertical: 12,
  },
  topicDetailDesc: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 14,
    color: theme.colors.lime,
    marginBottom: 8,
  },
  topicDetailContent: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.textSecondary,
  },
  topNavRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  backCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTopBlock: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 16,
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
    width: 144,
    height: 144,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  avatarImage: {
    width: 144,
    height: 144,
    borderRadius: 72,
  },
  avatarInitials: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 48,
    color: theme.colors.lime,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.lime,
    borderWidth: 3,
    borderColor: theme.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameAndAccountType: {
    alignItems: 'center',
    gap: 6,
    maxWidth: '90%',
  },
  userNameDisplay: {
    fontFamily: theme.typography.fonts.display,
    fontSize: 24,
    lineHeight: 28,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  userAccountType: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  handlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  handleText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 14,
    color: theme.colors.lime,
  },
  photoSheetContent: {
    paddingVertical: theme.spacing.base,
    gap: theme.spacing.sm,
  },
});

function LogoMarkVector({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <G>
        <Path
          d="M 120 220 C 120 208, 128 200, 140 200 L 170 200 L 280 148 C 292 142, 306 151, 306 165 L 306 347 C 306 361, 292 370, 280 364 L 170 312 L 140 312 C 128 312, 120 304, 120 292 Z"
          fill={theme.colors.lime}
        />
        <Circle cx="213" cy="256" r="28" fill={theme.colors.bg} />
        <Path
          d="M 352 195 A 90 90 0 0 1 352 317"
          stroke={theme.colors.lime}
          strokeWidth="36"
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M 405 152 A 155 155 0 0 1 405 360"
          stroke={theme.colors.lime}
          strokeWidth="36"
          strokeLinecap="round"
          fill="none"
        />
      </G>
    </Svg>
  );
}
