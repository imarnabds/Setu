import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Platform
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { Icon } from '../common/Icon';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

export interface SocialAuthModalProps {
  visible: boolean;
  provider: 'google' | 'apple' | null;
  onClose: () => void;
  defaultRole?: 'investor' | 'demat_holder';
}

export const SocialAuthModal: React.FC<SocialAuthModalProps> = ({
  visible,
  provider,
  onClose,
  defaultRole = 'investor'
}) => {
  const { setAuth } = useAuthStore();
  const { addToast } = useUIStore();

  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'investor' | 'demat_holder'>(defaultRole);
  const [showCustomInput, setShowCustomInput] = useState(true);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [appleHideEmail, setAppleHideEmail] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!visible || !provider) return null;

  const handleAuthenticate = async (
    email: string,
    fullName: string,
    avatarUrl?: string
  ) => {
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.post('/auth/social', {
        provider,
        email: email.trim().toLowerCase(),
        fullName: fullName.trim() || (provider === 'google' ? 'Google User' : 'Apple User'),
        avatarUrl,
        primaryRole: selectedRole
      });

      if (res.data.success) {
        const { user, accessToken, refreshToken, isNewUser } = res.data.data;
        setAuth(user, accessToken, refreshToken);
        addToast(
          isNewUser
            ? `Welcome to Setu, ${user.fullName}!`
            : `Welcome back, ${user.fullName}!`,
          'success'
        );
        onClose();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || `Failed to sign in with ${provider === 'google' ? 'Google' : 'Apple'}.`;
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.providerBrandRow}>
              <Icon name={provider} size={24} color={provider === 'apple' ? '#000000' : undefined} />
              <Text style={styles.modalTitle}>
                {provider === 'google' ? 'Sign in with Google' : 'Sign in with Apple ID'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Icon name="x" size={20} color={colors.secondaryText} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            {provider === 'google'
              ? 'Choose an account to continue to Setu'
              : 'Setu will use your Apple ID to sign you in securely'}
          </Text>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Icon name="alert-circle" size={14} color={colors.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Role Selection for social account registration */}
          <View style={styles.roleSelectionBox}>
            <Text style={styles.roleLabel}>I want to use Setu as:</Text>
            <View style={styles.roleChipsRow}>
              <TouchableOpacity
                style={[
                  styles.roleChip,
                  selectedRole === 'investor' && styles.roleChipActive
                ]}
                onPress={() => setSelectedRole('investor')}
                activeOpacity={0.8}
              >
                <Icon
                  name="bar-chart"
                  size={14}
                  color={selectedRole === 'investor' ? colors.primaryBlue : colors.secondaryText}
                />
                <Text
                  style={[
                    styles.roleChipText,
                    selectedRole === 'investor' && styles.roleChipTextActive
                  ]}
                >
                  Individual Investor
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleChip,
                  selectedRole === 'demat_holder' && styles.roleChipActive
                ]}
                onPress={() => setSelectedRole('demat_holder')}
                activeOpacity={0.8}
              >
                <Icon
                  name="user"
                  size={14}
                  color={selectedRole === 'demat_holder' ? colors.primaryBlue : colors.secondaryText}
                />
                <Text
                  style={[
                    styles.roleChipText,
                    selectedRole === 'demat_holder' && styles.roleChipTextActive
                  ]}
                >
                  Demat Holder
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Mandatory KYC Notice */}
          <View style={styles.kycWarningCard}>
            <Icon name="shield" size={14} color="#D97706" />
            <Text style={styles.kycWarningText}>
              <Text style={{ fontWeight: '700' }}>Mandatory Next Step:</Text> After signing in, you will be directed immediately to complete KYC verification. You must be verified before login to active networking is permitted.
            </Text>
          </View>

          {/* Provider Specific Interface */}
          {provider === 'google' ? (
            <View style={styles.accountList}>

              {/* Custom Google Account Toggle */}
              {showCustomInput ? (
                <View style={styles.customInputBox}>
                  <Text style={styles.inputLabel}>Enter Custom Google Account Details</Text>
                  <TextInput
                    style={styles.customTextInput}
                    placeholder="Full Name (e.g. Anand Mahindra)"
                    placeholderTextColor={colors.mutedText}
                    value={customName}
                    onChangeText={setCustomName}
                  />
                  <TextInput
                    style={styles.customTextInput}
                    placeholder="Gmail Address (e.g. anand@gmail.com)"
                    placeholderTextColor={colors.mutedText}
                    value={customEmail}
                    onChangeText={setCustomEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.customSubmitBtn}
                    onPress={() => handleAuthenticate(customEmail, customName)}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.customSubmitBtnText}>Sign In with This Account</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.useAnotherAccountBtn}
                  onPress={() => setShowCustomInput(true)}
                  activeOpacity={0.8}
                >
                  <Icon name="plus" size={16} color={colors.primaryBlue} />
                  <Text style={styles.useAnotherAccountText}>Use another Google account</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            /* Apple ID Interface */
            <View style={styles.appleContainer}>
              <View style={styles.customInputBox}>
                <Text style={styles.inputLabel}>Enter Apple ID Account Details</Text>
                <TextInput
                  style={styles.customTextInput}
                  placeholder="Full Name (e.g. Rahul Sharma)"
                  placeholderTextColor={colors.mutedText}
                  value={customName}
                  onChangeText={setCustomName}
                />
                <TextInput
                  style={styles.customTextInput}
                  placeholder="Apple ID Email (e.g. user@icloud.com)"
                  placeholderTextColor={colors.mutedText}
                  value={customEmail}
                  onChangeText={setCustomEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.appleAuthBtn}
                  onPress={() => handleAuthenticate(customEmail, customName)}
                  disabled={loading}
                  activeOpacity={0.88}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Icon name="apple" size={18} color="#FFFFFF" />
                      <Text style={styles.appleAuthBtnText}>
                        Continue with Apple ID
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Privacy Note */}
          <Text style={styles.privacyNote}>
            {provider === 'google'
              ? 'By continuing, Google will share your verified name, email address, and language preference with Setu.'
              : 'Sign in securely with Touch ID, Face ID, or your Apple device passcode.'}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: spacing.xl,
    ...shadows.lg
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs
  },
  providerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: colors.secondaryText,
    marginBottom: spacing.md,
    lineHeight: 18
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: spacing.sm,
    borderRadius: 10,
    marginBottom: spacing.md
  },
  errorText: {
    fontSize: 11,
    color: colors.error,
    fontWeight: typography.weights.medium,
    flex: 1
  },
  roleSelectionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
    marginBottom: 8
  },
  roleChipsRow: {
    flexDirection: 'row',
    gap: spacing.xs
  },
  roleChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF'
  },
  roleChipActive: {
    borderColor: colors.primaryBlue,
    backgroundColor: '#EBF2FF'
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.secondaryText
  },
  roleChipTextActive: {
    color: colors.primaryBlue,
    fontWeight: typography.weights.bold
  },
  accountList: {
    gap: spacing.xs,
    marginBottom: spacing.md
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: '#FFFFFF',
    gap: spacing.sm
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18
  },
  accountInfo: {
    flex: 1
  },
  accountName: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  accountEmail: {
    fontSize: 11,
    color: colors.secondaryText
  },
  useAnotherAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primaryBlue,
    backgroundColor: '#F0F5FF',
    marginTop: 4
  },
  useAnotherAccountText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue
  },
  customInputBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.xs,
    marginTop: 4
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
    marginBottom: 4
  },
  customTextInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.deepNavy
  },
  customSubmitBtn: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4
  },
  customSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: typography.weights.bold
  },
  appleContainer: {
    marginBottom: spacing.md
  },
  appleCardBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md
  },
  appleProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  appleAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center'
  },
  appleAccountInfo: {
    flex: 1
  },
  appleName: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  appleIdTag: {
    fontSize: 11,
    color: colors.secondaryText
  },
  appleEmailOptionsBox: {
    gap: spacing.xs
  },
  appleRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: '#FFFFFF',
    gap: spacing.sm
  },
  appleRadioRowActive: {
    borderColor: '#000000',
    backgroundColor: '#F8FAFC'
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center'
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#000000'
  },
  radioTextCol: {
    flex: 1
  },
  radioTitle: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  radioSub: {
    fontSize: 10.5,
    color: colors.secondaryText
  },
  appleAuthBtn: {
    backgroundColor: '#000000',
    borderRadius: borderRadius.full,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadows.sm
  },
  appleAuthBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: typography.weights.bold
  },
  privacyNote: {
    fontSize: 10,
    color: colors.mutedText,
    textAlign: 'center',
    lineHeight: 14
  },
  kycWarningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: 8,
    marginBottom: spacing.md
  },
  kycWarningText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16
  }
});
