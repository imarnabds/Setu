import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onExploreAsGuest?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onGetStarted,
  onLogin,
  onExploreAsGuest
}) => {
  const { enterGuestMode } = useAuthStore();

  const handleGuestExplore = () => {
    if (onExploreAsGuest) {
      onExploreAsGuest();
    } else {
      enterGuestMode('investor');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Brand Logo */}
      <View style={styles.brandHeader}>
        <View style={styles.logoIconContainer}>
          <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
            <Circle cx="8" cy="8" r="4" fill="#FFFFFF" />
            <Circle cx="24" cy="8" r="4" fill="#FFFFFF" />
            <Circle cx="16" cy="24" r="4" fill="#FFFFFF" />
            <Path
              d="M8 8 C 8 20, 24 20, 24 8"
              stroke="#FFFFFF"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <Path
              d="M16 17 L 16 24"
              stroke="#FFFFFF"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </Svg>
        </View>
        <Text style={styles.brandTitle}>Setu</Text>
        <Text style={styles.brandSubtitle}>Connecting Investors.</Text>
      </View>

      {/* Hero Title */}
      <View style={styles.heroTextSection}>
        <Text style={styles.heroTitle}>Connections,{'\n'}made simpler.</Text>
        <Text style={styles.heroSubtitle}>Discover. Connect. Communicate.</Text>
      </View>

      {/* 3D Connected Character Avatars Illustration */}
      <View style={styles.avatarsSection}>
        {/* Investor Side */}
        <View style={styles.avatarCard}>
          <Image
            source={require('../../../assets/investor-avatar.jpg')}
            style={styles.avatarImage}
            resizeMode="cover"
          />
          <View style={styles.avatarBadge}>
            <Icon name="bar-chart" size={12} color={colors.primaryBlue} />
            <Text style={styles.avatarBadgeText}>Investor</Text>
          </View>
        </View>

        {/* Connecting Curved Arc & Center Shield */}
        <View style={styles.connectionArcContainer}>
          <Svg width={110} height={40} viewBox="0 0 110 40" fill="none">
            <Path
              d="M 5 20 Q 55 -5 105 20"
              stroke={colors.primaryBlue}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </Svg>
          <View style={styles.centerShield}>
            <Icon name="shield" size={14} color="#FFFFFF" />
          </View>
        </View>

        {/* Demat Holder Side */}
        <View style={styles.avatarCard}>
          <Image
            source={require('../../../assets/holder-avatar.jpg')}
            style={styles.avatarImage}
            resizeMode="cover"
          />
          <View style={styles.avatarBadge}>
            <Icon name="user" size={12} color={colors.primaryBlue} />
            <Text style={styles.avatarBadgeText}>Demat Holder</Text>
          </View>
        </View>
      </View>

      {/* 3 Benefit Feature Cards in a Row */}
      <View style={styles.featuresRow}>
        {/* Benefit 1 */}
        <View style={styles.featureBox}>
          <View style={styles.featureIconCircle}>
            <Icon name="handshake" size={18} color={colors.primaryBlue} />
          </View>
          <Text style={styles.featureBoxTitle}>Controlled{'\n'}Introductions</Text>
          <Text style={styles.featureBoxSub}>Connect by{'\n'}consent</Text>
        </View>

        {/* Benefit 2 */}
        <View style={styles.featureBox}>
          <View style={styles.featureIconCircle}>
            <Icon name="percent" size={18} color={colors.primaryBlue} />
          </View>
          <Text style={styles.featureBoxTitle}>Clear{'\n'}Terms</Text>
          <Text style={styles.featureBoxSub}>Transparent{'\n'}rates</Text>
        </View>

        {/* Benefit 3 */}
        <View style={styles.featureBox}>
          <View style={styles.featureIconCircle}>
            <Icon name="shield" size={18} color={colors.primaryBlue} />
          </View>
          <Text style={styles.featureBoxTitle}>Privacy{'\n'}First</Text>
          <Text style={styles.featureBoxSub}>Your details{'\n'}stay protected</Text>
        </View>
      </View>

      {/* Workflow Steps: Discover -> Request -> Connect */}
      <View style={styles.workflowSection}>
        <View style={styles.workflowRow}>
          <View style={styles.workflowItem}>
            <View style={styles.workflowIconCircle}>
              <Icon name="search" size={18} color={colors.primaryBlue} />
            </View>
            <Text style={styles.workflowLabel}>Discover</Text>
          </View>

          <Icon name="chevron-right" size={16} color={colors.mutedText} />

          <View style={styles.workflowItem}>
            <View style={styles.workflowIconCircle}>
              <Icon name="send" size={16} color={colors.primaryBlue} />
            </View>
            <Text style={styles.workflowLabel}>Request</Text>
          </View>

          <Icon name="chevron-right" size={16} color={colors.mutedText} />

          <View style={styles.workflowItem}>
            <View style={styles.workflowIconCircle}>
              <Icon name="users" size={18} color={colors.primaryBlue} />
            </View>
            <Text style={styles.workflowLabel}>Connect</Text>
          </View>
        </View>

        {/* Carousel Pagination Dots */}
        <View style={styles.dotsRow}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>

      {/* Main Call to Action Button */}
      <TouchableOpacity
        style={styles.getStartedButton}
        activeOpacity={0.88}
        onPress={onGetStarted}
      >
        <Text style={styles.getStartedText}>Get started</Text>
        <Icon name="arrow-right" size={18} color="#FFFFFF" strokeWidth={2.5} />
      </TouchableOpacity>

      {/* Explore App as Guest Button */}
      <TouchableOpacity
        style={styles.exploreGuestButton}
        activeOpacity={0.85}
        onPress={handleGuestExplore}
      >
        <Icon name="search" size={16} color={colors.primaryBlue} />
        <Text style={styles.exploreGuestText}>Explore App as Guest</Text>
      </TouchableOpacity>
      <Text style={styles.exploreGuestSub}>
        Preview live IPOs, Demat holders & see how Setu works without login
      </Text>

      {/* Login Navigation Link */}
      <View style={styles.loginRow}>
        <Text style={styles.loginPrompt}>Already have an account? </Text>
        <TouchableOpacity onPress={onLogin}>
          <Text style={styles.loginLink}>Log in</Text>
        </TouchableOpacity>
      </View>

      {/* Statutory Footer */}
      <View style={styles.statutoryFooter}>
        <Icon name="shield" size={14} color={colors.secondaryText} />
        <Text style={styles.statutoryText}>Use official ASBA/UPI channels.</Text>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    alignItems: 'center'
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: spacing.md
  },
  logoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    ...shadows.sm
  },
  brandTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
    letterSpacing: -0.3
  },
  brandSubtitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primaryBlue,
    marginTop: 1
  },
  heroTextSection: {
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.5
  },
  heroSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.secondaryText,
    textAlign: 'center',
    marginTop: spacing.xs,
    fontWeight: typography.weights.medium
  },
  avatarsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginVertical: spacing.sm,
    position: 'relative'
  },
  avatarCard: {
    width: 96,
    height: 96,
    borderRadius: 22,
    backgroundColor: '#EBF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
    position: 'relative',
    ...shadows.sm
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.chip,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm
  },
  avatarBadgeText: {
    fontSize: 9.5,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  connectionArcContainer: {
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 40
  },
  centerShield: {
    position: 'absolute',
    top: 3,
    width: 26,
    height: 26,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...shadows.sm
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    gap: spacing.xs
  },
  featureBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm
  },
  featureIconCircle: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs
  },
  featureBoxTitle: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 2
  },
  featureBoxSub: {
    fontSize: 9,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 12
  },
  workflowSection: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
    ...shadows.sm
  },
  workflowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm
  },
  workflowItem: {
    alignItems: 'center'
  },
  workflowIconCircle: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  workflowLabel: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1'
  },
  dotActive: {
    backgroundColor: colors.primaryBlue,
    width: 16
  },
  getStartedButton: {
    width: '100%',
    height: 52,
    backgroundColor: colors.primaryBlue,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.md
  },
  getStartedText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm
  },
  loginPrompt: {
    fontSize: typography.sizes.sm,
    color: colors.secondaryText
  },
  loginLink: {
    fontSize: typography.sizes.sm,
    color: colors.primaryBlue,
    fontWeight: typography.weights.bold
  },
  exploreGuestButton: {
    width: '100%',
    height: 48,
    borderRadius: borderRadius.button,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.sm,
    ...shadows.sm
  },
  exploreGuestText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue
  },
  exploreGuestSub: {
    fontSize: 11,
    color: colors.secondaryText,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md
  },
  statutoryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xs,
    marginBottom: spacing.md
  },
  statutoryText: {
    fontSize: 11,
    color: colors.secondaryText,
    fontWeight: typography.weights.medium
  },
  demoToggleSection: {
    width: '100%',
    marginTop: spacing.xs,
    alignItems: 'center'
  },
  demoToggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12
  },
  demoToggleText: {
    fontSize: 11,
    color: colors.mutedText,
    fontWeight: typography.weights.semibold
  },
  demoCardsContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
    width: '100%'
  },
  demoPill: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center'
  },
  demoPillHolder: {
    borderColor: '#93C5FD'
  },
  demoPillAdmin: {
    borderColor: '#FCA5A5'
  },
  demoPillRole: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue
  },
  demoPillName: {
    fontSize: 9,
    color: colors.secondaryText,
    marginTop: 2
  }
});
