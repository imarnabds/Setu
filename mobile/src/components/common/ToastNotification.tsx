import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { Icon } from './Icon';
import { useUIStore, ToastMessage } from '../../store/uiStore';

export const ToastNotificationContainer: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <View style={styles.toastContainer} pointerEvents="box-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </View>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: () => void }> = ({
  toast,
  onDismiss
}) => {
  const getColors = () => {
    switch (toast.type) {
      case 'success':
        return { bg: colors.success, icon: 'check-circle' };
      case 'error':
        return { bg: colors.error, icon: 'alert-circle' };
      case 'info':
      default:
        return { bg: colors.primaryNavy, icon: 'info' };
    }
  };

  const { bg, icon } = getColors();

  return (
    <View style={[styles.toastCard, { backgroundColor: bg }]}>
      <Icon name={icon} size={18} color={colors.surface} />
      <Text style={styles.toastText}>{toast.message}</Text>
      <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
        <Icon name="x" size={16} color={colors.surface} />
      </TouchableOpacity>
    </View>
  );
};

export const OfflineBanner: React.FC<{ isOffline?: boolean }> = ({ isOffline = false }) => {
  if (!isOffline) return null;

  return (
    <View style={styles.offlineBanner}>
      <Icon name="alert-circle" size={16} color={colors.warning} />
      <Text style={styles.offlineText}>
        Working in development offline mode. Changes are persisted locally.
      </Text>
    </View>
  );
};

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry
}) => {
  return (
    <View style={styles.errorContainer}>
      <Icon name="alert-circle" size={32} color={colors.error} />
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 50,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    alignItems: 'center'
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    width: '100%',
    maxWidth: 420,
    ...shadows.md
  },
  toastText: {
    flex: 1,
    color: colors.surface,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    marginLeft: spacing.sm,
    marginRight: spacing.sm
  },
  dismissBtn: {
    padding: spacing.xs
  },
  offlineBanner: {
    backgroundColor: colors.warningLight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  offlineText: {
    fontSize: typography.sizes.xs,
    color: colors.warning,
    fontWeight: typography.weights.medium,
    marginLeft: spacing.xs
  },
  errorContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center'
  },
  errorTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    marginTop: spacing.sm
  },
  errorMessage: {
    fontSize: typography.sizes.sm,
    color: colors.secondaryText,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md
  },
  retryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primaryActionBlue,
    borderRadius: borderRadius.sm
  },
  retryText: {
    color: colors.surface,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold
  }
});
