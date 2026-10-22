import React from 'react';
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
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { SecondaryButton } from '../../components/common/SecondaryButton';
import { Icon } from '../../components/common/Icon';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onGetStarted,
  onLogin
}) => {
  const { setAuth } = useAuthStore();
  const [demoLoading, setDemoLoading] = React.useState<string | null>(null);

  const handleQuickDemoLogin = async (identifier: string, role: string) => {
    setDemoLoading(role);
    try {
      const res = await api.post('/auth/login', {
        identifier,
        password: role === 'admin' ? 'AdminSecure2025!' : 'Password123!'
      });
      if (res.data.success) {
        const { user, accessToken, refreshToken } = res.data.data;
        setAuth(user, accessToken, refreshToken);
      }
    } catch (err: any) {
      console.error('Demo login error:', err);
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Brand Header */}
      <View style={styles.heroSection}>
        <Image
          source={require('../../../assets/setu-logo.png')}
          style={styles.logoImage}
          resizeMode="cover"
        />
        <Text style={styles.productTitle}>Setu</Text>
        <Text style={styles.tagline}>Two-Sided Investor Networking & IPO Assistance</Text>

        <Text style={styles.heroDescription}>
          Connect with verified Demat Account Holders through controlled <Text style={styles.highlight}>Poke</Text> requests. Discover lawful allocation insights, transparent advisory terms, and private communication.
        </Text>
      </View>

      {/* Feature Highlights */}
      <View style={styles.featuresCard}>
        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Icon name="poke" size={18} color={colors.primaryActionBlue} />
          </View>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Controlled Poke Introductions</Text>
            <Text style={styles.featureDesc}>
              Conversations open only when the recipient explicitly accepts your request.
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Icon name="percent" size={18} color={colors.success} />
          </View>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Transparent Commission Engine</Text>
            <Text style={styles.featureDesc}>
              Configurable 0% to 50% rates in exact 2.5% steps on documented advisory bases.
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Icon name="shield" size={18} color={colors.primaryNavy} />
          </View>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Lawful & Compliant</Text>
            <Text style={styles.featureDesc}>
              No credential sharing or proxy bidding. Applications use official ASBA/UPI channels.
            </Text>
          </View>
        </View>
      </View>

      {/* Primary Actions */}
      <View style={styles.actionSection}>
        <PrimaryButton
          label="Get Started (Create Account)"
          onPress={onGetStarted}
          style={styles.primaryBtn}
        />
        <SecondaryButton
          label="I already have an account"
          onPress={onLogin}
          style={styles.secondaryBtn}
        />
      </View>

      {/* Fast Demo Accounts for Evaluators */}
      <View style={styles.demoSection}>
        <Text style={styles.demoTitle}>Instant Demo Account Quick-Access</Text>
        <Text style={styles.demoSubtitle}>
          Select a role to test the full live application instantly:
        </Text>

        <View style={styles.demoButtonsRow}>
          <TouchableOpacity
            style={styles.demoBtn}
            disabled={!!demoLoading}
            onPress={() => handleQuickDemoLogin('arjun.kapoor@investor.in', 'investor')}
          >
            <Text style={styles.demoBtnTitle}>Investor</Text>
            <Text style={styles.demoBtnSub}>Arjun Kapoor</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.demoBtn, styles.demoBtnHolder]}
            disabled={!!demoLoading}
            onPress={() => handleQuickDemoLogin('rajesh.sharma@demat.in', 'holder')}
          >
            <Text style={styles.demoBtnTitle}>Demat Holder</Text>
            <Text style={styles.demoBtnSub}>Rajesh Sharma</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.demoBtn, styles.demoBtnAdmin]}
            disabled={!!demoLoading}
            onPress={() => handleQuickDemoLogin('compliance.admin@ipoconnect.in', 'admin')}
          >
            <Text style={styles.demoBtnTitle}>Admin Desk</Text>
            <Text style={styles.demoBtnSub}>Compliance</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Legal & Footer links */}
      <View style={styles.footer}>
        <Text style={styles.footerLegal}>
          By continuing, you agree to our Terms of Service & Privacy Policy. Setu is an introduction and technical advisory networking platform.
        </Text>
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
    paddingBottom: 40
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: spacing.lg
  },
  logoImage: {
    width: 76,
    height: 76,
    borderRadius: 22,
    marginBottom: spacing.md,
    ...shadows.md
  },
  productTitle: {
    fontSize: 28,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    letterSpacing: -0.5
  },
  tagline: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primaryActionBlue,
    marginTop: 4
  },
  heroDescription: {
    fontSize: typography.sizes.sm,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing.md,
    maxWidth: 380
  },
  highlight: {
    color: colors.primaryActionBlue,
    fontWeight: typography.weights.bold
  },
  featuresCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.cardLg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.xl,
    ...shadows.sm
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.subtleBlueBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: '#D4E4FC'
  },
  featureText: {
    flex: 1
  },
  featureTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy
  },
  featureDesc: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    lineHeight: 17,
    marginTop: 2
  },
  actionSection: {
    gap: spacing.md,
    marginBottom: spacing.xl
  },
  primaryBtn: {
    height: 50
  },
  secondaryBtn: {
    height: 50
  },
  demoSection: {
    backgroundColor: colors.subtleBlueBackground,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#D4E4FC',
    marginBottom: spacing.xl
  },
  demoTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    textAlign: 'center'
  },
  demoSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: spacing.md
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  demoBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm
  },
  demoBtnHolder: {
    borderTopWidth: 3,
    borderTopColor: colors.primaryActionBlue
  },
  demoBtnAdmin: {
    borderTopWidth: 3,
    borderTopColor: colors.error
  },
  demoBtnTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy
  },
  demoBtnSub: {
    fontSize: 10,
    color: colors.secondaryText,
    marginTop: 2
  },
  footer: {
    alignItems: 'center'
  },
  footerLegal: {
    fontSize: 11,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 340
  }
});
