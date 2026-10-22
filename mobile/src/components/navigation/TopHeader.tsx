import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { Icon } from '../common/Icon';
import { ProfileAvatar } from '../common/ProfileAvatar';
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

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getRoleBadge = () => {
    switch (activeRole) {
      case 'demat_holder':
        return { label: 'Holder', color: colors.deepNavy, bg: colors.surfaceHighlight };
      case 'admin':
        return { label: 'Admin', color: colors.error, bg: colors.errorLight };
      case 'investor':
      default:
        return { label: 'Investor', color: colors.primaryBlue, bg: colors.surfaceHighlight };
    }
  };

  const badge = getRoleBadge();

  return (
    <View style={styles.header}>
      <View style={styles.leftContainer}>
        {showBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="chevron-left" size={24} color={colors.deepNavy} />
          </TouchableOpacity>
        ) : (
          <View style={styles.userProfileRow}>
            <ProfileAvatar
              name={user?.fullName || 'User'}
              avatarUrl={user?.avatarUrl}
              size={40}
              isVerified={user?.isKycVerified}
            />
            <View style={styles.greetingCol}>
              <Text style={styles.greetingText}>{getGreeting()}</Text>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.fullName || 'IPO Connect'}
              </Text>
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
          <Icon name="sliders" size={11} color={badge.color} />
        </TouchableOpacity>

        {/* Circular Notification Bell */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setNotificationsOpen(true)}
          style={styles.notifCircle}
        >
          <Icon name="bell" size={18} color={colors.deepNavy} />
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
              Preview how IPO CONNECT functions across each user journey:
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
                <Icon name="user" size={18} color={colors.primaryBlue} />
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleOptionTitle}>Individual Investor</Text>
                <Text style={styles.roleOptionSub}>
                  Browse Demat holders, send Pokes, view published terms, chat upon acceptance.
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
                <Icon name="shield" size={18} color={colors.deepNavy} />
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleOptionTitle}>Demat Account Holder</Text>
                <Text style={styles.roleOptionSub}>
                  Configure 0–50% commission, receive & accept/reject Pokes, manage connections.
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
    height: 64,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 4
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  greetingCol: {
    marginLeft: spacing.sm,
    flex: 1
  },
  greetingText: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    fontWeight: typography.weights.medium
  },
  userName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
    letterSpacing: -0.2
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
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.chip,
    gap: 4
  },
  roleText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold
  },
  notifCircle: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...shadows.sm
  },
  notifBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
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
    borderRadius: borderRadius.cardLg,
    padding: spacing.xl,
    ...shadows.lg
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
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
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface
  },
  roleOptionActive: {
    borderColor: colors.primaryBlue,
    backgroundColor: colors.softBlueHighlight
  },
  roleIcon: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
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
    color: colors.deepNavy
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
