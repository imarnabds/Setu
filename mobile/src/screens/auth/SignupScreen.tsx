import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { SocialAuthModal } from '../../components/auth/SocialAuthModal';

interface SignupScreenProps {
  onNavigateToLogin: () => void;
  onBack: () => void;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({
  onNavigateToLogin,
  onBack
}) => {
  // Step 1: Form details (Screen 2), Step 2: Role selection (Screen 3)
  const [step, setStep] = useState<1 | 2>(1);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Role State
  const [selectedRole, setSelectedRole] = useState<'investor' | 'demat_holder' | null>(null);

  // Social Auth Modal State
  const [socialProvider, setSocialProvider] = useState<'google' | 'apple' | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { setAuth } = useAuthStore();
  const { addToast } = useUIStore();

  const handleValidateStep1 = () => {
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
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setErrorMessage(null);
    setStep(2);
  };

  const handleFinalSignup = async (role: 'investor' | 'demat_holder') => {
    setSelectedRole(role);
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.post('/auth/signup', {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        mobileNumber: mobileNumber.trim(),
        password,
        primaryRole: role,
        termsAccepted: true,
        privacyAccepted: true
      });

      if (res.data.success) {
        const { user, accessToken, refreshToken } = res.data.data;
        setAuth(user, accessToken, refreshToken);
        addToast(`Welcome to Setu, ${user.fullName}!`, 'success');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Account creation failed. Please check your credentials.';
      setErrorMessage(msg);
      // If error is related to existing email/phone, jump back to step 1
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // SCREEN 3: CHOOSE YOUR ROLE
  // -------------------------------------------------------------
  if (step === 2) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.roleContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Back Nav */}
        <TouchableOpacity
          onPress={() => setStep(1)}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Icon name="chevron-left" size={24} color={colors.deepNavy} />
        </TouchableOpacity>

        {/* Screen 3 Title & Subtitle */}
        <View style={styles.roleHeaderSection}>
          <Text style={styles.screenTitle}>Choose your role</Text>
          <Text style={styles.screenSubtitle}>Select how you want to use Setu</Text>
        </View>

        {errorMessage && (
          <View style={styles.errorBox}>
            <Icon name="alert-circle" size={16} color={colors.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Role Cards */}
        <View style={styles.roleCardsContainer}>
          {/* Card 1: Individual Investor */}
          <TouchableOpacity
            style={[
              styles.roleSelectCard,
              styles.investorCardBg,
              selectedRole === 'investor' && styles.roleCardActive
            ]}
            activeOpacity={0.85}
            disabled={loading}
            onPress={() => handleFinalSignup('investor')}
          >
            <View style={styles.roleAvatarWrapper}>
              <Image
                source={require('../../../assets/investor-avatar.jpg')}
                style={styles.roleAvatarImg}
                resizeMode="cover"
              />
              <View style={styles.roleAvatarBadge}>
                <Icon name="bar-chart" size={12} color={colors.primaryBlue} />
              </View>
            </View>

            <View style={styles.roleTextCol}>
              <Text style={styles.roleCardTitle}>Individual Investor</Text>
              <Text style={styles.roleCardDesc}>
                Discover verified Demat account holders and get IPO guidance.
              </Text>
            </View>

            <View style={styles.roleArrowCircle}>
              {loading && selectedRole === 'investor' ? (
                <ActivityIndicator size="small" color={colors.primaryBlue} />
              ) : (
                <Icon name="chevron-right" size={20} color={colors.primaryBlue} strokeWidth={2.5} />
              )}
            </View>
          </TouchableOpacity>

          {/* Card 2: Demat Account Holder */}
          <TouchableOpacity
            style={[
              styles.roleSelectCard,
              styles.holderCardBg,
              selectedRole === 'demat_holder' && styles.roleCardActive
            ]}
            activeOpacity={0.85}
            disabled={loading}
            onPress={() => handleFinalSignup('demat_holder')}
          >
            <View style={styles.roleAvatarWrapper}>
              <Image
                source={require('../../../assets/holder-avatar.jpg')}
                style={styles.roleAvatarImg}
                resizeMode="cover"
              />
              <View style={styles.roleAvatarBadge}>
                <Icon name="user" size={12} color={colors.primaryBlue} />
              </View>
            </View>

            <View style={styles.roleTextCol}>
              <Text style={styles.roleCardTitle}>Demat Account Holder</Text>
              <Text style={styles.roleCardDesc}>
                Receive requests from investors and provide guidance for a commission.
              </Text>
            </View>

            <View style={styles.roleArrowCircle}>
              {loading && selectedRole === 'demat_holder' ? (
                <ActivityIndicator size="small" color={colors.primaryBlue} />
              ) : (
                <Icon name="chevron-right" size={20} color={colors.primaryBlue} strokeWidth={2.5} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom Graphic: 3D bar chart pillars rising on soft wave curves */}
        <View style={styles.roleBottomGraphicContainer}>
          <Image
            source={require('../../../assets/role-waves.jpg')}
            style={styles.roleBottomGraphic}
            resizeMode="contain"
          />
        </View>
      </ScrollView>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 2: CREATE YOUR ACCOUNT
  // -------------------------------------------------------------
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Top Back Nav */}
      <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
        <Icon name="chevron-left" size={24} color={colors.deepNavy} />
      </TouchableOpacity>

      {/* Screen 2 Header with Floating Card Illustration */}
      <View style={styles.headerRow}>
        <View style={styles.headerTextCol}>
          <Text style={styles.screenTitle}>Create your account</Text>
          <Text style={styles.screenSubtitle}>
            Join Setu and start building meaningful connections.
          </Text>
        </View>
        <Image
          source={require('../../../assets/signup-badge.jpg')}
          style={styles.floatingBadgeImg}
          resizeMode="cover"
        />
      </View>

      {errorMessage && (
        <View style={styles.errorBox}>
          <Icon name="alert-circle" size={16} color={colors.error} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* Form Fields */}
      <View style={styles.formSection}>
        {/* Full Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Full name</Text>
          <View style={styles.inputContainer}>
            <View style={styles.inputIconBox}>
              <Icon name="user" size={18} color={colors.mutedText} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor={colors.mutedText}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Email Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email address</Text>
          <View style={styles.inputContainer}>
            <View style={styles.inputIconBox}>
              <Icon name="mail" size={18} color={colors.mutedText} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={colors.mutedText}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Mobile Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Mobile number</Text>
          <View style={styles.inputContainer}>
            <View style={styles.inputIconBox}>
              <Icon name="phone" size={18} color={colors.mutedText} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter your mobile number"
              placeholderTextColor={colors.mutedText}
              value={mobileNumber}
              onChangeText={setMobileNumber}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.inputContainer}>
            <View style={styles.inputIconBox}>
              <Icon name="lock" size={18} color={colors.mutedText} />
            </View>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Create a strong password"
              placeholderTextColor={colors.mutedText}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
            >
              <Icon
                name={showPassword ? 'eye-off' : 'eye'}
                size={18}
                color={colors.mutedText}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.createAccountBtn}
          activeOpacity={0.88}
          onPress={handleValidateStep1}
        >
          <Text style={styles.createAccountText}>Create account</Text>
          <Icon name="arrow-right" size={18} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>

        {/* OR Divider */}
        <View style={styles.orDividerRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.orLine} />
        </View>

        {/* Social Buttons */}
        <TouchableOpacity
          style={styles.socialBtn}
          activeOpacity={0.8}
          onPress={() => setSocialProvider('google')}
        >
          <Icon name="google" size={18} />
          <Text style={styles.socialBtnText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.socialBtn}
          activeOpacity={0.8}
          onPress={() => setSocialProvider('apple')}
        >
          <Icon name="apple" size={18} color="#000000" />
          <Text style={styles.socialBtnText}>Continue with Apple</Text>
        </TouchableOpacity>

        {/* Terms Disclaimer */}
        <Text style={styles.termsDisclaimer}>
          By creating an account, you agree to our{' '}
          <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>.
        </Text>
      </View>

      {/* Social Authentication Modal */}
      <SocialAuthModal
        visible={!!socialProvider}
        provider={socialProvider}
        onClose={() => setSocialProvider(null)}
        defaultRole={selectedRole || 'investor'}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl
  },
  roleContentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    flexGrow: 1,
    justifyContent: 'space-between'
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md
  },
  headerTextCol: {
    flex: 1,
    paddingRight: spacing.sm
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
    letterSpacing: -0.3
  },
  screenSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    marginTop: 4,
    lineHeight: 18
  },
  floatingBadgeImg: {
    width: 54,
    height: 60,
    borderRadius: 14,
    ...shadows.sm
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.xs
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    flex: 1
  },
  formSection: {
    width: '100%'
  },
  inputGroup: {
    marginBottom: spacing.md
  },
  inputLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
    marginBottom: 6
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.input,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
    ...shadows.sm
  },
  inputIconBox: {
    marginRight: spacing.sm
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.deepNavy,
    height: '100%'
  },
  eyeBtn: {
    padding: 6
  },
  createAccountBtn: {
    width: '100%',
    height: 50,
    backgroundColor: colors.primaryBlue,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    ...shadows.md
  },
  createAccountText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border
  },
  orText: {
    paddingHorizontal: spacing.md,
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.mutedText
  },
  socialBtn: {
    width: '100%',
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    ...shadows.sm
  },
  socialBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.deepNavy
  },
  termsDisclaimer: {
    fontSize: 11,
    color: colors.secondaryText,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 16
  },
  termsLink: {
    color: colors.primaryBlue,
    fontWeight: typography.weights.medium
  },

  // Role Selection Styles
  roleHeaderSection: {
    marginBottom: spacing.xl
  },
  roleCardsContainer: {
    width: '100%',
    gap: spacing.md
  },
  roleSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm
  },
  investorCardBg: {
    backgroundColor: '#F0F5FF',
    borderColor: '#D4E2FE'
  },
  holderCardBg: {
    backgroundColor: colors.surface,
    borderColor: colors.border
  },
  roleCardActive: {
    borderColor: colors.primaryBlue
  },
  roleAvatarWrapper: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#EBF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  roleAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 18
  },
  roleAvatarBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm
  },
  roleTextCol: {
    flex: 1,
    paddingHorizontal: spacing.md
  },
  roleCardTitle: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
    marginBottom: 4
  },
  roleCardDesc: {
    fontSize: 11.5,
    color: colors.secondaryText,
    lineHeight: 16
  },
  roleArrowCircle: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  roleBottomGraphicContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.xl
  },
  roleBottomGraphic: {
    width: '100%',
    height: 120
  }
});
