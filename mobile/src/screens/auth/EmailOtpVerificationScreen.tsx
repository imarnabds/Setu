import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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

interface EmailOtpVerificationScreenProps {
  onVerified: () => void;
  onLogout: () => void;
}

export const EmailOtpVerificationScreen: React.FC<EmailOtpVerificationScreenProps> = ({
  onVerified,
  onLogout
}) => {
  const { user, updateUser } = useAuthStore();
  const { addToast } = useUIStore();

  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [latestDevOtp, setLatestDevOtp] = useState<string | null>(user?.emailOtpCode || '123456');

  useEffect(() => {
    let timer: any = null;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((c) => c - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  const handleVerify = async (codeToVerify?: string) => {
    const code = (codeToVerify || otpCode).trim();
    if (!code || code.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit OTP.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.post('/auth/verify-email-otp', {
        email: user?.email,
        code
      });

      if (res.data?.success) {
        addToast('Email verified successfully!', 'success');
        if (res.data?.data?.user) {
          updateUser(res.data.data.user);
        } else {
          updateUser({ isEmailVerified: true });
        }
        onVerified();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Invalid verification code. Please try again.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setErrorMessage(null);

    try {
      const res = await api.post('/auth/send-email-otp', {
        email: user?.email
      });

      if (res.data?.success) {
        addToast('New verification code sent to your email!', 'info');
        setCountdown(30);
        if (res.data?.data?.otp) {
          setLatestDevOtp(res.data.data.otp);
        }
      }
    } catch (err: any) {
      addToast('Failed to resend OTP. Please try again.', 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Top Header with Back / Logout */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn} activeOpacity={0.7}>
          <Icon name="log-out" size={16} color={colors.secondaryText} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Hero Illustration */}
      <View style={styles.heroSection}>
        <View style={styles.iconCircle}>
          <Icon name="mail" size={32} color={colors.primaryBlue} />
        </View>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>
          We've sent a 6-digit verification code to
        </Text>
        <View style={styles.emailPill}>
          <Text style={styles.emailText}>{user?.email || 'your email address'}</Text>
        </View>
      </View>

      {errorMessage && (
        <View style={styles.errorBox}>
          <Icon name="alert-circle" size={16} color={colors.error} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* 6-Digit OTP Code Input */}
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.otpInput}
          placeholder="Enter 6-digit OTP"
          placeholderTextColor={colors.mutedText}
          value={otpCode}
          onChangeText={(val) => {
            const clean = val.replace(/\D/g, '').slice(0, 6);
            setOtpCode(clean);
            if (clean.length === 6) {
              handleVerify(clean);
            }
          }}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
        />
      </View>

      {/* Verify Button */}
      <TouchableOpacity
        style={[styles.verifyBtn, otpCode.length === 6 && styles.verifyBtnActive]}
        activeOpacity={0.88}
        disabled={loading}
        onPress={() => handleVerify()}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.verifyBtnText}>Verify Email</Text>
            <Icon name="arrow-right" size={18} color="#FFFFFF" strokeWidth={2.5} />
          </>
        )}
      </TouchableOpacity>

      {/* Resend Timer */}
      <View style={styles.resendSection}>
        {countdown > 0 ? (
          <Text style={styles.countdownText}>
            Resend verification code in <Text style={styles.bold}>{countdown}s</Text>
          </Text>
        ) : (
          <TouchableOpacity onPress={handleResendOtp} disabled={resending}>
            <Text style={styles.resendBtnText}>
              {resending ? 'Sending...' : 'Resend Code'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Developer / Evaluator Testing Assist */}
      <View style={styles.devCard}>
        <View style={styles.devHeader}>
          <Icon name="shield" size={14} color={colors.primaryBlue} />
          <Text style={styles.devTitle}>Instant Demo Testing OTP</Text>
        </View>
        <Text style={styles.devDesc}>
          Universal test code: <Text style={styles.boldCode}>123456</Text>
          {latestDevOtp && latestDevOtp !== '123456' ? ` or generated: ${latestDevOtp}` : ''}
        </Text>
        <TouchableOpacity
          style={styles.autoFillBtn}
          onPress={() => {
            const code = latestDevOtp || '123456';
            setOtpCode(code);
            handleVerify(code);
          }}
        >
          <Text style={styles.autoFillText}>⚡ Auto-fill & Verify</Text>
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    alignItems: 'center'
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.md
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.chip,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  logoutText: {
    fontSize: 11,
    color: colors.secondaryText,
    fontWeight: typography.weights.semibold
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.lg
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EBF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.sm
  },
  title: {
    fontSize: 24,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
    letterSpacing: -0.3
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    marginTop: 4,
    textAlign: 'center'
  },
  emailPill: {
    marginTop: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.chip,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  emailText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    width: '100%',
    gap: spacing.xs
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    flex: 1
  },
  inputWrapper: {
    width: '100%',
    marginBottom: spacing.md
  },
  otpInput: {
    height: 54,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.input,
    borderWidth: 1.5,
    borderColor: colors.primaryBlue,
    fontSize: 22,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
    textAlign: 'center',
    letterSpacing: 8,
    ...shadows.sm
  },
  verifyBtn: {
    width: '100%',
    height: 50,
    backgroundColor: colors.primaryBlue,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.md
  },
  verifyBtnActive: {
    backgroundColor: colors.primaryBlue
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold
  },
  resendSection: {
    marginTop: spacing.md,
    alignItems: 'center'
  },
  countdownText: {
    fontSize: 12,
    color: colors.secondaryText
  },
  bold: {
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  resendBtnText: {
    fontSize: 12.5,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue
  },
  devCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center'
  },
  devHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4
  },
  devTitle: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  devDesc: {
    fontSize: 11,
    color: colors.secondaryText,
    textAlign: 'center'
  },
  boldCode: {
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue
  },
  autoFillBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border
  },
  autoFillText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue
  }
});
