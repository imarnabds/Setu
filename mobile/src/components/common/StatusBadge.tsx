import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';
import { Icon } from './Icon';

export type BadgeStatus =
  | 'verified'
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'active'
  | 'disconnected'
  | 'blocked';

interface StatusBadgeProps {
  status: BadgeStatus | string;
  label?: string;
  showIcon?: boolean;
  style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  showIcon = true,
  style
}) => {
  const getBadgeConfig = () => {
    switch (status.toLowerCase()) {
      case 'verified':
      case 'active':
      case 'accepted':
        return {
          bg: colors.badgeVerifiedBg,
          text: colors.badgeVerifiedText,
          icon: 'check',
          display: label || (status === 'verified' ? 'Verified' : status === 'active' ? 'Active' : 'Accepted')
        };
      case 'pending':
        return {
          bg: colors.badgePendingBg,
          text: colors.badgePendingText,
          icon: 'warning',
          display: label || 'Pending'
        };
      case 'rejected':
      case 'blocked':
        return {
          bg: colors.errorLight,
          text: colors.error,
          icon: 'x',
          display: label || (status === 'rejected' ? 'Declined' : 'Blocked')
        };
      case 'cancelled':
      case 'disconnected':
      default:
        return {
          bg: colors.surfaceSubtle,
          text: colors.secondaryText,
          icon: 'info',
          display: label || (status === 'cancelled' ? 'Cancelled' : 'Disconnected')
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, style]}>
      {showIcon && (
        <View style={styles.iconContainer}>
          <Icon name={config.icon} size={12} color={config.text} strokeWidth={2.5} />
        </View>
      )}
      <Text style={[styles.text, { color: config.text }]}>{config.display}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 1,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start'
  },
  iconContainer: {
    marginRight: 4
  },
  text: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'capitalize'
  }
});
