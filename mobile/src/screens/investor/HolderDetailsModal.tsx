import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { BottomSheet } from '../../components/common/BottomSheet';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PokeButton, PokeButtonState } from '../../components/poke/PokeButton';
import { Icon } from '../../components/common/Icon';

interface HolderDetailsModalProps {
  user: any | null;
  visible: boolean;
  pokeState?: PokeButtonState;
  onClose: () => void;
  onSendPoke: () => Promise<void>;
  onCancelPoke?: () => Promise<void>;
  onOpenChat?: () => void;
}

export const HolderDetailsModal: React.FC<HolderDetailsModalProps> = ({
  user,
  visible,
  pokeState = 'not_connected',
  onClose,
  onSendPoke,
  onCancelPoke,
  onOpenChat
}) => {
  if (!user) return null;

  return (
    <BottomSheet visible={visible} title="Account Holder Profile" onClose={onClose}>
      <View style={styles.container}>
        {/* Profile Card Header */}
        <View style={styles.profileHeader}>
          <ProfileAvatar
            name={user.fullName}
            avatarUrl={user.avatarUrl}
            size={68}
            isVerified={user.isKycVerified}
          />
          <View style={styles.headerText}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{user.fullName}</Text>
              {user.isKycVerified && (
                <View style={styles.verifiedBadge}>
                  <Icon name="check" size={12} color={colors.surface} strokeWidth={3} />
                </View>
              )}
            </View>
            <Text style={styles.location}>
              {user.city ? `${user.city}, ` : ''}{user.region || 'India'}
            </Text>
            <Text style={styles.experience}>{user.investmentExperience || 'Experienced Holder'}</Text>
          </View>
        </View>

        {/* Verification Status Card */}
        <View style={styles.verificationCard}>
          <View style={styles.vIcon}>
            <Icon
              name={user.isKycVerified ? 'shield' : 'info'}
              size={18}
              color={user.isKycVerified ? colors.success : colors.warning}
            />
          </View>
          <View style={styles.vTextContainer}>
            <Text style={styles.vTitle}>
              {user.isKycVerified ? 'Demat & KYC Verified' : 'Standard Verification Pending'}
            </Text>
            <Text style={styles.vDescription}>
              {user.isKycVerified
                ? 'Demat account holding credentials and PAN identity have been verified against compliance benchmark.'
                : 'Identity documents submitted and undergoing routine verification.'}
            </Text>
          </View>
        </View>

        {/* Published Commission Terms */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Published Commission Terms</Text>
          <View style={styles.termsBox}>
            <View style={styles.rateRow}>
              <Text style={styles.rateHighlight}>
                {user.defaultCommissionRate !== undefined
                  ? `${user.defaultCommissionRate.toFixed(1)}%`
                  : '5.0%'}
              </Text>
              <Text style={styles.rateUnit}>Commission Rate</Text>
            </View>
            <Text style={styles.basisText}>
              Calculation Basis: {user.commissionBasis || 'Documented Advisory & Technical Assistance Base Fee'}
            </Text>
            <Text style={styles.termsNotice}>
              Terms must be mutually agreed upon before any advisory interaction. No fees are charged on investment capital.
            </Text>
          </View>
        </View>

        {/* Introduction & Bio */}
        {user.bio ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>About & Background</Text>
            <Text style={styles.bioText}>{user.bio}</Text>
          </View>
        ) : null}

        {/* Supported Assistance Categories */}
        {user.supportedCategories && user.supportedCategories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Supported Assistance Categories</Text>
            <View style={styles.catGrid}>
              {user.supportedCategories.map((cat: string, idx: number) => (
                <View key={idx} style={styles.catChip}>
                  <Icon name="check" size={12} color={colors.primaryActionBlue} />
                  <Text style={styles.catChipText}>{cat}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Preferred Language */}
        {user.preferredLanguage ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Preferred Languages</Text>
            <Text style={styles.langText}>{user.preferredLanguage}</Text>
          </View>
        ) : null}

        {/* Regulatory & Safety Notice */}
        <View style={styles.safetyNotice}>
          <Text style={styles.safetyTitle}>Important Service Conditions:</Text>
          <Text style={styles.safetyBody}>
            • Actual IPO bids must be placed through your registered broker, ASBA bank, or authorized UPI app.{'\n'}
            • Demat account ownership does not authorize proxy applications on behalf of third parties.{'\n'}
            • Never disclose account passwords, OTPs, or UPI PINs to anyone on this platform.
          </Text>
        </View>

        {/* Primary CTA */}
        <View style={styles.ctaRow}>
          <PokeButton
            state={pokeState}
            recipientName={user.fullName}
            commissionRate={user.defaultCommissionRate}
            commissionBasis={user.commissionBasis}
            onSendPoke={onSendPoke}
            onCancelPoke={onCancelPoke}
            onOpenChat={onOpenChat}
            style={styles.pokeBtnLarge}
          />
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxl
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg
  },
  headerText: {
    marginLeft: spacing.lg,
    flex: 1
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  name: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy
  },
  verifiedBadge: {
    backgroundColor: colors.success,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6
  },
  location: {
    fontSize: typography.sizes.sm,
    color: colors.secondaryText,
    marginTop: 2
  },
  experience: {
    fontSize: typography.sizes.xs,
    color: colors.primaryActionBlue,
    fontWeight: typography.weights.semibold,
    marginTop: 2
  },
  verificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg
  },
  vIcon: {
    marginRight: spacing.sm,
    marginTop: 2
  },
  vTextContainer: {
    flex: 1
  },
  vTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy
  },
  vDescription: {
    fontSize: 11,
    color: colors.secondaryText,
    lineHeight: 16,
    marginTop: 2
  },
  section: {
    marginBottom: spacing.lg
  },
  sectionLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs
  },
  termsBox: {
    backgroundColor: colors.subtleBlueBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4
  },
  rateHighlight: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.primaryActionBlue
  },
  rateUnit: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primaryNavy,
    marginLeft: 6
  },
  basisText: {
    fontSize: typography.sizes.xs,
    color: colors.primaryNavy,
    fontWeight: typography.weights.medium
  },
  termsNotice: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 6,
    lineHeight: 15
  },
  bioText: {
    fontSize: typography.sizes.sm,
    color: colors.primaryText,
    lineHeight: 22
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  catChipText: {
    fontSize: typography.sizes.xs,
    color: colors.primaryNavy,
    fontWeight: typography.weights.medium,
    marginLeft: 4
  },
  langText: {
    fontSize: typography.sizes.sm,
    color: colors.secondaryText
  },
  safetyNotice: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl
  },
  safetyTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    marginBottom: 4
  },
  safetyBody: {
    fontSize: 11,
    color: colors.secondaryText,
    lineHeight: 18
  },
  ctaRow: {
    marginTop: spacing.sm
  },
  pokeBtnLarge: {
    height: 48
  }
});
