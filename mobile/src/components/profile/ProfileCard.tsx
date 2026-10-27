import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { ProfileAvatar } from '../common/ProfileAvatar';
import { StatusBadge } from '../common/StatusBadge';
import { PokeButton, PokeButtonState } from '../poke/PokeButton';
import { Icon } from '../common/Icon';

interface ProfileCardProps {
  user: any;
  pokeState?: PokeButtonState;
  onSendPoke: () => Promise<void>;
  onCancelPoke?: () => Promise<void>;
  onOpenChat?: () => void;
  onViewDetails?: () => void;
  style?: ViewStyle;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  user,
  pokeState = 'not_connected',
  onSendPoke,
  onCancelPoke,
  onOpenChat,
  onViewDetails,
  style
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onViewDetails}
      style={[styles.card, style]}
    >
      {/* Header */}
      <View style={styles.header}>
        <ProfileAvatar
          name={user.fullName}
          avatarUrl={user.avatarUrl}
          size={52}
          isVerified={user.isKycVerified}
        />
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{user.fullName}</Text>
            {user.isKycVerified && (
              <View style={styles.verifiedBadge}>
                <Icon name="check" size={10} color={colors.surface} strokeWidth={3} />
              </View>
            )}
          </View>
          <Text style={styles.location}>
            {user.city ? `${user.city}, ` : ''}{user.region || 'India'}
            {user.investmentExperience ? ` • ${user.investmentExperience}` : ''}
          </Text>
        </View>

        {user.defaultCommissionRate !== undefined && user.primaryRole === 'demat_holder' && (
          <View style={styles.rateBadge}>
            <Text style={styles.rateText}>{user.defaultCommissionRate.toFixed(1)}%</Text>
            <Text style={styles.rateSub}>Commission</Text>
          </View>
        )}
      </View>

      {/* Bio / Intro */}
      {user.bio ? (
        <Text numberOfLines={2} style={styles.bio}>
          {user.bio}
        </Text>
      ) : null}

      {/* Category Chips */}
      {user.supportedCategories && user.supportedCategories.length > 0 && (
        <View style={styles.categories}>
          {user.supportedCategories.slice(0, 3).map((cat: string, idx: number) => (
            <View key={idx} style={styles.catChip}>
              <Text style={styles.catText}>{cat}</Text>
            </View>
          ))}
          {user.supportedCategories.length > 3 && (
            <View style={styles.catMore}>
              <Text style={styles.catMoreText}>+{user.supportedCategories.length - 3}</Text>
            </View>
          )}
        </View>
      )}

      {/* Footer with Service Terms note & Poke Button */}
      <View style={styles.footer}>
        <View style={styles.basisContainer}>
          <Icon name="shield" size={12} color={colors.secondaryText} />
          <Text numberOfLines={1} style={styles.basisText}>
            {user.primaryRole === 'demat_holder'
              ? user.commissionBasis || 'Commission on Profit'
              : 'Verified Active Investor'}
          </Text>
        </View>

        <PokeButton
          state={pokeState}
          recipientName={user.fullName}
          commissionRate={user.defaultCommissionRate}
          commissionBasis={user.commissionBasis}
          onSendPoke={onSendPoke}
          onCancelPoke={onCancelPoke}
          onOpenChat={onOpenChat}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerInfo: {
    marginLeft: spacing.md,
    flex: 1
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  name: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    letterSpacing: -0.2
  },
  verifiedBadge: {
    backgroundColor: colors.success,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6
  },
  location: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    marginTop: 2,
    fontWeight: typography.weights.normal
  },
  rateBadge: {
    backgroundColor: colors.subtleBlueBackground,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.chip,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4E4FC'
  },
  rateText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.primaryActionBlue,
    fontVariant: ['tabular-nums']
  },
  rateSub: {
    fontSize: 9,
    color: colors.secondaryBlue,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1
  },
  bio: {
    fontSize: typography.sizes.xs,
    color: colors.primaryText,
    lineHeight: 19,
    marginVertical: spacing.sm,
    fontWeight: typography.weights.normal
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.md
  },
  catChip: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border
  },
  catText: {
    fontSize: 11,
    color: colors.secondaryText,
    fontWeight: typography.weights.medium
  },
  catMore: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border
  },
  catMoreText: {
    fontSize: 11,
    color: colors.secondaryText,
    fontWeight: typography.weights.bold
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm + 2
  },
  basisContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm
  },
  basisText: {
    fontSize: 11,
    color: colors.secondaryText,
    marginLeft: 6,
    flex: 1,
    fontWeight: typography.weights.medium
  }
});
