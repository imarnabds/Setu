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
import { SocialAuthModal } from '../../components/auth/SocialAuthModal';

interface LoginScreenProps {
  onNavigateToSignup: () => void;
  onNavigateToForgotPassword: () => void;
  onBack: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onNavigateToSignup,
  onNavigateToForgotPassword,
  onBack
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [socialProvider, setSocialProvider] = useState<'google' | 'apple' | null>(null);

  const { setAuth } = useAuthStore();
  const { addToast } = useUIStore();

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter both your email/mobile and password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password
      });

      if (res.data.success) {
        const { user, accessToken, refreshToken } = res.data.data;
        setAuth(user, accessToken, refreshToken);
        addToast(`Welcome back, ${user.fullName}!`, 'success');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Invalid credentials. Please verify your details.';
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
        <Text style={styles.title}>Sign In to Setu</Text>
        <Text style={styles.subtitle}>
          Access your investor or Demat account networking dashboard.
        </Text>
      </View>

      <View style={styles.formCard}>
        {errorMessage && (
          <View style={styles.errorBox}>
            <Icon name="alert-circle" size={16} color={colors.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <TextInputField
          label="Email Address or Mobile Number"
          value={identifier}
          onChangeText={(val) => {
            setIdentifier(val);
            if (errorMessage) setErrorMessage(null);
          }}
          placeholder="e.g. yourname@gmail.com"
          leftIcon="user"
          keyboardType="email-address"
        />

        <PasswordInputField
          label="Password"
          value={password}
          onChangeText={(val) => {
            setPassword(val);
            if (errorMessage) setErrorMessage(null);
          }}
          placeholder="Enter your password"
        />

        <TouchableOpacity
          onPress={onNavigateToForgotPassword}
          style={styles.forgotBtn}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <PrimaryButton
          label="Sign In"
          onPress={handleLogin}
          loading={loading}
          style={styles.submitBtn}
        />

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
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>Don't have an account yet? </Text>
        <TouchableOpacity onPress={onNavigateToSignup}>
          <Text style={styles.switchLink}>Create Account</Text>
        </TouchableOpacity>
      </View>

      {/* Social Authentication Modal */}
      <SocialAuthModal
        visible={!!socialProvider}
        provider={socialProvider}
        onClose={() => setSocialProvider(null)}
        defaultRole="investor"
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
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg
  },
  forgotText: {
    fontSize: typography.sizes.xs,
    color: colors.primaryActionBlue,
    fontWeight: typography.weights.semibold
  },
  submitBtn: {
    height: 50
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl
  },
  switchText: {
    fontSize: typography.sizes.sm,
    color: colors.secondaryText
  },
  switchLink: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryActionBlue
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight
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
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
    ...shadows.sm
  },
  socialBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primaryNavy
  }
});
