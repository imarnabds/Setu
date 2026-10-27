import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { Icon } from './Icon';

interface GuestRegistrationPromptModalProps {
  visible: boolean;
  actionName: string;
  onClose: () => void;
  onSelectSocial: (provider: 'google' | 'apple') => void;
  onSelectStandardSignup: () => void;
}

export const GuestRegistrationPromptModal: React.FC<GuestRegistrationPromptModalProps> = ({
  visible,
  actionName,
  onClose,
  onSelectSocial,
  onSelectStandardSignup
}) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header with shield badge */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Icon name="shield" size={24} color="#FFFFFF" strokeWidth={2.5} />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={18} color={colors.secondaryText} />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Registration & KYC Required</Text>
          <Text style={styles.subtitle}>
            To <Text style={styles.highlightText}>{actionName}</Text>, you must create an account and complete KYC verification.
          </Text>

          {/* Value Props / Why Verification is Mandatory */}
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <View style={styles.benefitCheck}>
                <Icon name="check" size={12} color="#10B981" strokeWidth={3} />
              </View>
              <Text style={styles.benefitText}>
                <Text style={styles.boldText}>Verified Identity:</Text> Demat holders and investors undergo 3-tier KYC verification for complete trust.
              </Text>
            </View>

            <View style={styles.benefitItem}>
              <View style={styles.benefitCheck}>
                <Icon name="check" size={12} color="#10B981" strokeWidth={3} />
              </View>
              <Text style={styles.benefitText}>
                <Text style={styles.boldText}>Profit Commission:</Text> Transparent profit sharing agreed before Demat holders apply on your behalf.
              </Text>
            </View>

            <View style={styles.benefitItem}>
              <View style={styles.benefitCheck}>
                <Icon name="check" size={12} color="#10B981" strokeWidth={3} />
              </View>
              <Text style={styles.benefitText}>
                <Text style={styles.boldText}>Isolated Chat:</Text> Dedicated IPO-scoped communication channels with pinned compliance safeguards.
              </Text>
            </View>
          </View>

          {/* Social Sign Up Options */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.googleBtn}
              activeOpacity={0.85}
              onPress={() => {
                onClose();
                onSelectSocial('google');
              }}
            >
              <Icon name="google" size={18} />
              <Text style={styles.googleBtnText}>Sign up with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.appleBtn}
              activeOpacity={0.85}
              onPress={() => {
                onClose();
                onSelectSocial('apple');
              }}
            >
              <Icon name="apple" size={18} color="#000000" />
              <Text style={styles.appleBtnText}>Sign up with Apple</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.standardSignupBtn}
              activeOpacity={0.85}
              onPress={() => {
                onClose();
                onSelectStandardSignup();
              }}
            >
              <Text style={styles.standardSignupText}>Create Standard Account (Email / Mobile)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.continueExploringBtn}
              activeOpacity={0.7}
              onPress={onClose}
            >
              <Text style={styles.continueExploringText}>Continue Exploring as Guest</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.cardLg,
    padding: spacing.xl,
    ...shadows.lg
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceHighlight
  },
  title: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
    marginBottom: 4
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.secondaryText,
    lineHeight: 20,
    marginBottom: spacing.lg
  },
  highlightText: {
    color: colors.primaryBlue,
    fontWeight: typography.weights.bold
  },
  benefitsList: {
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: 10
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  benefitCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2
  },
  benefitText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.primaryText,
    lineHeight: 18
  },
  boldText: {
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  actionsContainer: {
    gap: 10
  },
  googleBtn: {
    height: 46,
    borderRadius: borderRadius.button,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...shadows.sm
  },
  googleBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  appleBtn: {
    height: 46,
    borderRadius: borderRadius.button,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  appleBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#000000'
  },
  standardSignupBtn: {
    height: 44,
    borderRadius: borderRadius.button,
    backgroundColor: colors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center'
  },
  standardSignupText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF'
  },
  continueExploringBtn: {
    height: 38,
    alignItems: 'center',
    justifyContent: 'center'
  },
  continueExploringText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.secondaryText
  }
});
