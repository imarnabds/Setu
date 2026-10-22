import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { TextInputField, PasswordInputField } from '../../components/common/TextInputField';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { Icon } from '../../components/common/Icon';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

interface SignupScreenProps {
  onNavigateToLogin: () => void;
  onBack: () => void;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({
  onNavigateToLogin,
  onBack
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [primaryRole, setPrimaryRole] = useState<'investor' | 'demat_holder'>('investor');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [privacyAccepted, setPrivacyAccepted] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { setAuth } = useAuthStore();
  const { addToast } = useUIStore();

  const handleSignup = async () => {
    // Basic frontend checks
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!mobileNumber.trim() || mobileNumber.replace(/\D/g, '').length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (!termsAccepted || !privacyAccepted) {
      setErrorMessage('Please accept the Terms of Service and Privacy Policy.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.post('/auth/signup', {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        mobileNumber: mobileNumber.trim(),
        password,
        primaryRole,
        termsAccepted: true,
        privacyAccepted: true
      });

      if (res.data.success) {
        const { user, accessToken, refreshToken } = res.data.data;
        setAuth(user, accessToken, refreshToken);
        addToast(`Welcome to Setu, ${user.fullName}!`, 'success');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Registration failed. Please check your inputs.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Icon name="chevron-left" size={24} color={colors.primaryNavy} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Image
          source={require('../../../assets/setu-logo.png')}
          style={styles.logoImage}
          resizeMode="cover"
        />
        <Text style={styles.title}>Create Your Account</Text>
        <Text style={styles.subtitle}>
          Join Setu — India's premier investor networking & IPO assistance platform.
        </Text>
      </View>

      <View style={styles.formCard}>
        {errorMessage && (
          <View style={styles.errorBox}>
            <Icon name="alert-circle" size={16} color={colors.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Primary Role Selector */}
        <Text style={styles.roleLabel}>Select Primary Role</Text>
        <View style={styles.roleSelector}>
          <TouchableOpacity
            style={[
              styles.roleCard,
              primaryRole === 'investor' && styles.roleCardActive
            ]}
            onPress={() => setPrimaryRole('investor')}
          >
            <View style={styles.roleIcon}>
              <Icon
                name="user"
                size={20}
                color={primaryRole === 'investor' ? colors.primaryActionBlue : colors.secondaryText}
              />
            </View>
            <Text style={[styles.roleTitle, primaryRole === 'investor' && styles.roleTitleActive]}>
              Investor
            </Text>
            <Text style={styles.roleDesc}>Browse Demat holders & send Pokes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleCard,
              primaryRole === 'demat_holder' && styles.roleCardActive
            ]}
            onPress={() => setPrimaryRole('demat_holder')}
          >
            <View style={styles.roleIcon}>
              <Icon
                name="shield"
                size={20}
                color={primaryRole === 'demat_holder' ? colors.primaryActionBlue : colors.secondaryText}
              />
            </View>
            <Text style={[styles.roleTitle, primaryRole === 'demat_holder' && styles.roleTitleActive]}>
              Demat Holder
            </Text>
            <Text style={styles.roleDesc}>Receive Pokes & configure commission</Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <TextInputField
          label="Full Legal Name"
          value={fullName}
          onChangeText={setFullName}
          placeholder="e.g. Vikram Malhotra"
          leftIcon="user"
        />

        <TextInputField
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          placeholder="e.g. vikram@example.com"
          leftIcon="user"
          keyboardType="email-address"
        />

        <TextInputField
          label="Mobile Number (with Country Code)"
          value={mobileNumber}
          onChangeText={setMobileNumber}
          placeholder="+91 98200 12345"
          leftIcon="lock"
          keyboardType="phone-pad"
        />

        <PasswordInputField
          label="Password (min. 6 characters)"
          value={password}
          onChangeText={setPassword}
          placeholder="Create a strong password"
        />

        <PasswordInputField
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter your password"
        />

        {/* Checkbox Terms */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setTermsAccepted(!termsAccepted)}
        >
          <View style={[styles.checkbox, termsAccepted && styles.checkboxActive]}>
            {termsAccepted && <Icon name="check" size={12} color={colors.surface} strokeWidth={3} />}
          </View>
          <Text style={styles.checkboxText}>
            I accept the <Text style={styles.link}>Terms of Service</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setPrivacyAccepted(!privacyAccepted)}
        >
          <View style={[styles.checkbox, privacyAccepted && styles.checkboxActive]}>
            {privacyAccepted && <Icon name="check" size={12} color={colors.surface} strokeWidth={3} />}
          </View>
          <Text style={styles.checkboxText}>
            I agree to the <Text style={styles.link}>Privacy Policy & Legal Disclosures</Text>
          </Text>
        </TouchableOpacity>

        <PrimaryButton
          label="Create Account"
          onPress={handleSignup}
          loading={loading}
          style={styles.submitBtn}
        />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>Already have an account? </Text>
        <TouchableOpacity onPress={onNavigateToLogin}>
          <Text style={styles.switchLink}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  contentContainer: {
    padding: spacing.xl,
    paddingTop: spacing.lg
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  backText: {
    fontSize: typography.sizes.sm,
    color: colors.primaryNavy,
    fontWeight: typography.weights.medium
  },
  header: {
    marginBottom: spacing.xl
  },
  logoImage: {
    width: 48,
    height: 48,
    borderRadius: 14,
    marginBottom: spacing.sm,
    ...shadows.sm
  },
  title: {
    fontSize: 26,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    letterSpacing: -0.3
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.secondaryText,
    marginTop: spacing.xs,
    lineHeight: 20
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.cardLg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDEEED',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FBD4D3'
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sizes.xs,
    marginLeft: spacing.sm,
    flex: 1,
    fontWeight: typography.weights.medium
  },
  roleLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    marginBottom: spacing.xs + 2
  },
  roleSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg
  },
  roleCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 18,
    padding: spacing.md,
    backgroundColor: colors.surface
  },
  roleCardActive: {
    borderColor: colors.primaryActionBlue,
    backgroundColor: colors.subtleBlueBackground
  },
  roleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs + 2
  },
  roleTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy
  },
  roleTitleActive: {
    color: colors.primaryActionBlue
  },
  roleDesc: {
    fontSize: 10,
    color: colors.secondaryText,
    marginTop: 2,
    lineHeight: 14
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    backgroundColor: colors.surface
  },
  checkboxActive: {
    backgroundColor: colors.primaryActionBlue,
    borderColor: colors.primaryActionBlue
  },
  checkboxText: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText
  },
  link: {
    color: colors.primaryActionBlue,
    fontWeight: typography.weights.semibold
  },
  submitBtn: {
    height: 50,
    marginTop: spacing.sm
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xxl
  },
  switchText: {
    fontSize: typography.sizes.sm,
    color: colors.secondaryText
  },
  switchLink: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryActionBlue
  }
});
