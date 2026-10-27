import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Image } from 'react-native';
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
  const { user, activeRole, switchRole, isGuestMode, exitGuestMode } = useAuthStore();
  const {
    unreadNotificationsCount,
    setNotificationsOpen,
    setActiveTab,
    openGuestPromptModal
  } = useUIStore();
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  const getFirstName = () => {
    if (isGuestMode) return 'Guest';
    if (!user?.fullName) return 'Friend';
    return user.fullName.trim().split(' ')[0];
  };

  const getSubtext = () => {
    if (isGuestMode) {
      return `Previewing as ${activeRole === 'investor' ? 'Individual Investor' : 'Demat Account Holder'}`;
    }
    if (activeRole === 'investor') {
      return "Let's find the right connections";
    }
    if (activeRole === 'demat_holder') {
      return 'Manage your requests and connections';
    }
    return 'Compliance Oversight & Audits';
  };

  const avatarSource =
    activeRole === 'demat_holder'
      ? require('../../../assets/holder-avatar.jpg')
      : require('../../../assets/investor-avatar.jpg');

  return (
    <View style={styles.outerContainer}>
      <View style={styles.header}>
        <View style={styles.leftContainer}>
          {showBack ? (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Icon name="chevron-left" size={24} color={colors.deepNavy} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.userProfileRow}
              activeOpacity={0.85}
              onPress={() => setRoleSwitcherOpen(true)}
            >
              {/* 3D Character Avatar matching reference */}
              <View style={styles.avatarWrapper}>
                <Image source={avatarSource} style={styles.avatarImg} resizeMode="cover" />
              </View>

              <View style={styles.greetingCol}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName}>Hello, {getFirstName()}</Text>
                  {isGuestMode && (
                    <View style={styles.guestBadge}>
                      <Text style={styles.guestBadgeText}>GUEST</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.greetingSub}>{getSubtext()}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.rightContainer}>
          {isGuestMode ? (
            <View style={styles.guestActionsRow}>
              {/* Quick Role Toggle for Guest */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => switchRole(activeRole === 'investor' ? 'demat_holder' : 'investor')}
                style={styles.guestRoleToggle}
              >
                <Icon name="users" size={13} color={colors.primaryBlue} />
                <Text style={styles.guestRoleToggleText}>
                  {activeRole === 'investor' ? 'Holder View' : 'Investor View'}
                </Text>
              </TouchableOpacity>

              {/* Sign In / Register CTA */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={exitGuestMode}
                style={styles.guestRegisterCta}
              >
                <Text style={styles.guestRegisterCtaText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Subtle Role Switcher Pill */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setRoleSwitcherOpen(true)}
                style={styles.rolePill}
              >
                <Text style={styles.rolePillText}>
                  {activeRole === 'investor' ? 'Investor' : activeRole === 'demat_holder' ? 'Holder' : 'Admin'}
                </Text>
              </TouchableOpacity>

              {/* Notification Bell with Red Dot Badge */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setNotificationsOpen(true)}
                style={styles.notifCircle}
              >
                <Icon name="bell" size={20} color={colors.deepNavy} strokeWidth={1.8} />
                <View style={styles.redDot} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Guest Mode Explanatory Banner */}
      {isGuestMode && (
        <View style={styles.guestBanner}>
          <View style={styles.guestBannerLeft}>
            <Icon name="shield" size={13} color="#2563EB" />
            <Text style={styles.guestBannerText}>
              <Text style={{ fontWeight: '700' }}>Guest Preview Mode:</Text> You are exploring how Setu functions. Complete registration & KYC to become an active participant.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.guestBannerAction}
            onPress={() => openGuestPromptModal('register and complete KYC')}
          >
            <Text style={styles.guestBannerActionText}>Complete KYC</Text>
          </TouchableOpacity>
        </View>
      )}

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
            <Text style={styles.modalTitle}>Switch Experience</Text>
            <Text style={styles.modalDesc}>
              Preview and interact as either an Investor, Demat Holder, or Compliance Admin:
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
    paddingTop: 8,
    paddingBottom: 4
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  backButton: {
    width: 38,
    height: 38,
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
  avatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#EBF2FF',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    ...shadows.sm
  },
  avatarImg: {
    width: '100%',
    height: '100%'
  },
  greetingCol: {
    marginLeft: spacing.sm,
    flex: 1
  },
  userName: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
    letterSpacing: -0.2
  },
  greetingSub: {
    fontSize: 11,
    color: colors.secondaryText,
    fontWeight: typography.weights.medium,
    marginTop: 1
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  rolePill: {
    backgroundColor: colors.surfaceHighlight,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.chip
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue
  },
  notifCircle: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...shadows.sm
  },
  redDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#FFFFFF'
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
  },
  outerContainer: {
    backgroundColor: '#F5F8FC',
    borderBottomWidth: 0
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  guestBadge: {
    backgroundColor: '#EEF4FE',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.chip,
    borderWidth: 1,
    borderColor: '#DCE7F7'
  },
  guestBadgeText: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: '#246BFD'
  },
  guestActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  guestRoleToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DCE7F7'
  },
  guestRoleToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryBlue
  },
  guestRegisterCta: {
    backgroundColor: colors.primaryBlue,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    ...shadows.sm
  },
  guestRegisterCtaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  guestBanner: {
    backgroundColor: '#EEF4FE',
    borderRadius: 16,
    marginHorizontal: spacing.lg,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  guestBannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  guestBannerText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    flex: 1
  },
  guestBannerAction: {
    backgroundColor: '#246BFD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  guestBannerActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF'
  }
});
