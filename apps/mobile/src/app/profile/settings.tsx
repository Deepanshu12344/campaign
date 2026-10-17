import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../theme';
import { SharedHeader } from '../../components/layout/SharedHeader';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api/client';
import { UserProfile } from '@campaigns/shared';
import { Lock, Bell, LogOut, Trash2, KeyRound, CheckCircle2, AlertTriangle, X } from 'lucide-react-native';

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { user, isAuthenticated, signOut, setUser } = useAuthStore();

  // Name editing
  const [name, setName] = useState(user?.name || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Delete account confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sign out confirmation modal
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const hasNameChanged = user && name.trim() !== user.name && name.trim().length >= 2;

  const handleSaveName = async () => {
    if (!name.trim() || name.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      return;
    }
    setIsSavingName(true);
    setNameError(null);
    setNameSuccess(false);
    try {
      const updated = await apiClient.patch<UserProfile>('/me', { name: name.trim() });
      setUser(updated);
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update name';
      setNameError(msg);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    if (!currentPassword) {
      setPasswordError('Please enter your current password');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setPasswordSuccess(true);
      setTimeout(() => {
        setPasswordSuccess(false);
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password';
      setPasswordError(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleConfirmSignOut = async () => {
    setShowSignOutModal(false);
    await signOut();
    router.replace('/(tabs)/profile');
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await signOut();
      setShowDeleteModal(false);
      router.replace('/(tabs)/profile');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.container}>
        <SharedHeader title="Account Settings" fallbackRoute="/(tabs)/profile" />
        <View style={styles.signedOutContainer}>
          <Text style={styles.signedOutTitle}>Sign in to view account settings</Text>
          <Text style={styles.signedOutText}>
            You need to be signed in to manage your name, password, or security preferences.
          </Text>
          <Button
            label="Sign In"
            variant="primary"
            onPress={() => router.push('/auth/sign-in')}
            style={styles.signInButton}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SharedHeader title="Account Settings" fallbackRoute="/(tabs)/profile" />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Profile Information</Text>
          <View style={styles.avatarRow}>
            <Avatar name={user.name} size="lg" imageUrl={user.avatarUrl} />
            <View style={styles.avatarMeta}>
              <Text style={styles.userRoleBadge}>{user.role} ACCOUNT</Text>
              <Text style={styles.avatarSubtext}>Profile photo updates via upload service</Text>
            </View>
          </View>

          <TextField
            label="Display Name"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (nameError) setNameError(null);
            }}
            placeholder="Your full name or organization"
            error={nameError || undefined}
            helperText="Visible on campaigns you create and updates you post"
            maxLength={60}
          />

          {nameSuccess && (
            <View style={styles.inlineSuccess}>
              <CheckCircle2 size={16} color={theme.colors.emerald600} />
              <Text style={styles.inlineSuccessText}>Name updated successfully</Text>
            </View>
          )}

          <Button
            label="Save Changes"
            variant="primary"
            size="md"
            disabled={!hasNameChanged || isSavingName}
            loading={isSavingName}
            onPress={handleSaveName}
            style={styles.actionRowButton}
          />

          <View style={styles.divider} />

          <TextField
            label="Email Address"
            value={user.email}
            editable={false}
            helperText="Primary contact and login identifier (read-only)"
            rightAccessory={<Lock size={16} color={theme.colors.ink400} />}
          />
        </Card>

        {/* Security & Password Card */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Security & Password</Text>
          <Text style={styles.sectionDescription}>
            Keep your account secure with a strong password of at least 8 characters.
          </Text>

          <Button
            label="Change Password"
            variant="secondary"
            size="md"
            icon={<KeyRound size={16} color={theme.colors.ink800} />}
            onPress={() => {
              setPasswordError(null);
              setPasswordSuccess(false);
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              setShowPasswordModal(true);
            }}
            style={styles.actionRowButton}
          />
        </Card>

        {/* Preferences Link Card */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Notification Preferences</Text>
          <Text style={styles.sectionDescription}>
            Control email and mobile alert channels for campaigns you follow and back.
          </Text>

          <Button
            label="Manage Notifications"
            variant="secondary"
            size="md"
            icon={<Bell size={16} color={theme.colors.ink800} />}
            onPress={() => router.push('/profile/notifications-settings')}
            style={styles.actionRowButton}
          />
        </Card>

        {/* Account Management Card */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Account Actions</Text>

          <View style={styles.dangerRow}>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Sign Out</Text>
              <Text style={styles.actionDescription}>
                End your active session on this device.
              </Text>
            </View>
            <Button
              label="Sign Out"
              variant="secondary"
              size="sm"
              icon={<LogOut size={16} color={theme.colors.ink800} />}
              onPress={() => setShowSignOutModal(true)}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.dangerRow}>
            <View style={styles.actionTextContainer}>
              <Text style={[styles.actionTitle, { color: theme.colors.red600 }]}>
                Delete Account
              </Text>
              <Text style={styles.actionDescription}>
                Demo mode: clears saved sessions and tokens from this device.
              </Text>
            </View>
            <Button
              label="Delete"
              variant="danger"
              size="sm"
              icon={<Trash2 size={16} color={theme.colors.white} />}
              onPress={() => setShowDeleteModal(true)}
            />
          </View>
        </Card>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <Pressable
                onPress={() => setShowPasswordModal(false)}
                hitSlop={8}
                style={styles.modalCloseButton}
              >
                <X size={20} color={theme.colors.ink700} />
              </Pressable>
            </View>

            {passwordSuccess ? (
              <View style={styles.modalSuccessBox}>
                <CheckCircle2 size={40} color={theme.colors.emerald600} />
                <Text style={styles.modalSuccessText}>Password updated successfully!</Text>
              </View>
            ) : (
              <View>
                <TextField
                  label="Current Password"
                  secureTextEntry
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                />

                <TextField
                  label="New Password"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="At least 8 characters"
                  helperText="Use letters, numbers, and symbols"
                />

                <TextField
                  label="Confirm New Password"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter new password"
                />

                {passwordError && (
                  <View style={styles.modalErrorBox}>
                    <AlertTriangle size={16} color={theme.colors.red600} />
                    <Text style={styles.modalErrorText}>{passwordError}</Text>
                  </View>
                )}

                <View style={styles.modalButtonRow}>
                  <Button
                    label="Cancel"
                    variant="ghost"
                    size="md"
                    onPress={() => setShowPasswordModal(false)}
                    style={{ flex: 1, marginRight: theme.spacing.sm }}
                  />
                  <Button
                    label="Update"
                    variant="primary"
                    size="md"
                    loading={isChangingPassword}
                    onPress={handleChangePassword}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Sign Out Modal */}
      <Modal
        visible={showSignOutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalBody}>
              Are you sure you want to sign out? You can sign back in anytime.
            </Text>
            <View style={styles.modalButtonRow}>
              <Button
                label="Cancel"
                variant="ghost"
                size="md"
                onPress={() => setShowSignOutModal(false)}
                style={{ flex: 1, marginRight: theme.spacing.sm }}
              />
              <Button
                label="Sign Out"
                variant="primary"
                size="md"
                onPress={handleConfirmSignOut}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal (Demo Confirmation) */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.alertIconCircle}>
              <AlertTriangle size={28} color={theme.colors.red600} />
            </View>
            <Text style={[styles.modalTitle, { textAlign: 'center', marginTop: theme.spacing.sm }]}>
              Delete Account (Demo)
            </Text>
            <Text style={[styles.modalBody, { textAlign: 'center' }]}>
              This is a prototype sandbox demonstration. Confirming will clear your local tokens and sign you out back to guest mode. Your demo campaigns will remain in the shared database.
            </Text>
            <View style={styles.modalButtonRow}>
              <Button
                label="Cancel"
                variant="ghost"
                size="md"
                onPress={() => setShowDeleteModal(false)}
                style={{ flex: 1, marginRight: theme.spacing.sm }}
              />
              <Button
                label="Confirm Delete"
                variant="danger"
                size="md"
                loading={isDeleting}
                onPress={handleConfirmDelete}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgMuted,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: theme.spacing['4xl'],
    gap: theme.spacing.base,
  },
  sectionCard: {
    padding: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  sectionHeader: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: theme.typography.styles.h4.fontSize,
    lineHeight: theme.typography.styles.h4.lineHeight,
    color: theme.colors.ink900,
  },
  sectionDescription: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.bodySm.fontSize,
    lineHeight: theme.typography.styles.bodySm.lineHeight,
    color: theme.colors.ink600,
    marginBottom: theme.spacing.xs,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.base,
    marginBottom: theme.spacing.sm,
  },
  avatarMeta: {
    flex: 1,
  },
  userRoleBadge: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 11,
    color: theme.colors.primary700,
    backgroundColor: theme.colors.primary50,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  avatarSubtext: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.ink500,
  },
  inlineSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: theme.spacing.xs,
  },
  inlineSuccessText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.emerald600,
  },
  actionRowButton: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.line,
    marginVertical: theme.spacing.md,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.base,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 15,
    color: theme.colors.ink900,
  },
  actionDescription: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.ink500,
    marginTop: 2,
  },
  signedOutContainer: {
    flex: 1,
    padding: theme.spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signedOutTitle: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: theme.typography.styles.h3.fontSize,
    color: theme.colors.ink900,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  signedOutText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.body.fontSize,
    color: theme.colors.ink600,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  signInButton: {
    minWidth: 160,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.base,
  },
  modalTitle: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 18,
    color: theme.colors.ink900,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    color: theme.colors.ink600,
    lineHeight: 20,
    marginVertical: theme.spacing.base,
  },
  modalSuccessBox: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  modalSuccessText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 16,
    color: theme.colors.emerald600,
  },
  modalErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.red50,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  modalErrorText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    color: theme.colors.red600,
    flex: 1,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.base,
  },
  alertIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.red50,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
