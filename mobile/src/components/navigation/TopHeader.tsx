import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { Icon } from '../common/Icon';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

interface TopHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  title,
  showBack = false,
  onBack
}) => {
  const { user, activeRole, switchRole } = useAuthStore();
  const {
    unreadNotificationsCount,
    setNotificationsOpen,
    setActiveTab
  } = useUIStore();
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  const getRoleBadge = () => {
    switch (activeRole) {
      case 'demat_holder':
        return { label: 'Holder View', color: colors.primaryNavy, bg: colors.surfaceSubtle };
      case 'admin':
        return { label: 'Compliance Admin', color: colors.error, bg: colors.errorLight };
      case 'investor':
      default:
        return { label: 'Investor View', color: colors.primaryActionBlue, bg: colors.subtleBlueBackground };
    }
  };

  const badge = getRoleBadge();

  return (
    <View style={styles.header}>
      <View style={styles.leftContainer}>
        {showBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="chevron-left" size={24} color={colors.primaryNavy} />
          </TouchableOpacity>
        ) : (
          <View style={styles.brandRow}>
            <View style={styles.brandLogo}>
              <Text style={styles.brandLetter}>I</Text>
            </View>
            <View>
              <Text style={styles.brandName}>IPO CONNECT</Text>
              <Text style={styles.brandTagline}>Investor & Demat Network</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.rightContainer}>
        {/* Role Pill Switcher */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setRoleSwitcherOpen(true)}
          style={[styles.rolePill, { backgroundColor: badge.bg }]}
        >
          <Text style={[styles.roleText, { color: badge.color }]}>{badge.label}</Text>
          <Icon name="sliders" size={12} color={badge.color} />
        </TouchableOpacity>

        {/* Notifications Icon */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setNotificationsOpen(true)}
          style={styles.notifBtn}
        >
          <Icon name="bell" size={20} color={colors.primaryNavy} />
          {unreadNotificationsCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Role Switcher Modal */}
      <Modal
        visible={roleSwitcherOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRoleSwitcherOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setRoleSwitcherOpen(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Role & Experience Switcher</Text>
            <Text style={styles.modalDesc}>
              Preview and evaluate how IPO CONNECT looks and behaves for each platform role:
            </Text>

            <TouchableOpacity
              style={[
                styles.roleOption,
                activeRole === 'investor' && styles.roleOptionActive
              ]}
              onPress={() => {
                switchRole('investor');
                setActiveTab('home');
                setRoleSwitcherOpen(false);
              }}
            >
              <View style={styles.roleIcon}>
                <Icon name="user" size={18} color={colors.primaryActionBlue} />
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleOptionTitle}>Individual Investor</Text>
                <Text style={styles.roleOptionSub}>
                  Browse Demat holders, send Pokes, view published terms, chat after acceptance.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleOption,
                activeRole === 'demat_holder' && styles.roleOptionActive
              ]}
              onPress={() => {
                switchRole('demat_holder');
                setActiveTab('home');
                setRoleSwitcherOpen(false);
              }}
            >
              <View style={styles.roleIcon}>
                <Icon name="shield" size={18} color={colors.primaryNavy} />
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleOptionTitle}>Demat Account Holder</Text>
                <Text style={styles.roleOptionSub}>
                  Configure 0-50% commission, receive & accept/reject Pokes, manage connections.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleOption,
                activeRole === 'admin' && styles.roleOptionActive
              ]}
              onPress={() => {
                switchRole('admin');
                setActiveTab('admin_dashboard');
                setRoleSwitcherOpen(false);
              }}
            >
              <View style={styles.roleIcon}>
                <Icon name="award" size={18} color={colors.error} />
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleOptionTitle}>Compliance Admin Desk</Text>
                <Text style={styles.roleOptionSub}>
                  Review KYC documents, monitor Pokes, connections, and system audit logs.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setRoleSwitcherOpen(false)}
            >
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 58,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    ...shadows.sm
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.xs
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  brandLogo: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryNavy,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm
  },
  brandLetter: {
    color: colors.surface,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold
  },
  brandName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    letterSpacing: 0.5
  },
  brandTagline: {
    fontSize: 9,
    color: colors.secondaryText,
    fontWeight: typography.weights.medium
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    gap: 4
  },
  roleText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold
  },
  notifBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.error,
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2
  },
  notifBadgeText: {
    color: colors.surface,
    fontSize: 8,
    fontWeight: typography.weights.bold
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    ...shadows.lg
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    marginBottom: spacing.xs
  },
  modalDesc: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    lineHeight: 18,
    marginBottom: spacing.md
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface
  },
  roleOptionActive: {
    borderColor: colors.primaryActionBlue,
    backgroundColor: colors.subtleBlueBackground
  },
  roleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md
  },
  roleInfo: {
    flex: 1
  },
  roleOptionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy
  },
  roleOptionSub: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 2,
    lineHeight: 15
  },
  closeBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center'
  },
  closeBtnText: {
    fontSize: typography.sizes.sm,
    color: colors.secondaryText,
    fontWeight: typography.weights.semibold
  }
});
