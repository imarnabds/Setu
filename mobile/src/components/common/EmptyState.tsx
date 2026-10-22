import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';
import { Icon } from './Icon';
import { PrimaryButton } from './PrimaryButton';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'search',
  title,
  description,
  actionLabel,
  onAction,
  style
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <Icon name={icon} size={32} color={colors.primaryActionBlue} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction && (
        <PrimaryButton
          label={actionLabel}
          onPress={onAction}
          style={styles.actionButton}
        />
      )}
    </View>
  );
};

export const LoadingSkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  return (
    <View style={[styles.skeletonContainer, style]}>
      <View style={styles.skeletonRow}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonTextContainer}>
          <View style={[styles.skeletonLine, { width: '60%' }]} />
          <View style={[styles.skeletonLine, { width: '40%', marginTop: 6 }]} />
        </View>
      </View>
      <View style={[styles.skeletonLine, { width: '90%', marginTop: 12 }]} />
      <View style={[styles.skeletonLine, { width: '75%', marginTop: 6 }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.subtleBlueBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    textAlign: 'center',
    marginBottom: spacing.xs
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: spacing.lg
  },
  actionButton: {
    minWidth: 160
  },
  skeletonContainer: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceSubtle
  },
  skeletonTextContainer: {
    marginLeft: spacing.md,
    flex: 1
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surfaceSubtle
  }
});
