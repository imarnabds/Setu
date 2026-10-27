import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { Icon } from '../../components/common/Icon';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { api } from '../../services/api';

export const HolderProfileScreen: React.FC = () => {
  const { user, updateUser, logout } = useAuthStore();
  const { addToast, setActiveTab } = useUIStore();

  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [docType, setDocType] = useState('PAN & Demat Statement');
  const [docNumber, setDocNumber] = useState('XXXX-XXXX-9911');
  const [submittingKyc, setSubmittingKyc] = useState(false);

  const handleKycSubmit = async () => {
    setSubmittingKyc(true);
    try {
      const res = await api.post('/users/kyc', {
        documentType: docType,
        documentNumberMasked: docNumber
      });
      if (res.data.success) {
        updateUser({
          isKycVerified: false,
          kycDetails: {
            documentType: docType,
            documentNumberMasked: docNumber,
            submittedAt: new Date().toISOString(),
            status: 'pending'
          }
        });
        addToast('Demat holding verification submitted for review.', 'success');
        setKycModalOpen(false);
      }
    } catch (err) {
      addToast('Failed to submit KYC.', 'error');
    } finally {
      setSubmittingKyc(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Profile Header */}
      <View style={styles.profileCard}>
        <ProfileAvatar
          name={user?.fullName || 'Holder'}
          avatarUrl={user?.avatarUrl}
          size={64}
          isVerified={user?.isKycVerified}
        />
        <View style={styles.profileInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{user?.fullName || 'Holder'}</Text>
            {user?.isKycVerified && (
              <View style={styles.vBadge}>
                <Icon name="check" size={10} color={colors.surface} strokeWidth={3} />
              </View>
            )}
          </View>
          <Text style={styles.roleLabel}>Demat Account Holder</Text>
          <Text style={styles.locationText}>
            {user?.city ? `${user.city}, ` : ''}{user?.region || 'India'}
          </Text>
        </View>
      </View>

      {/* Commission Configuration Shortcut */}
      <View style={styles.sectionCard}>
        <View style={styles.commHeader}>
          <View>
            <Text style={styles.commTitle}>Published Commission on Profit</Text>
            <Text style={styles.commRate}>
              {user?.defaultCommissionRate !== undefined
                ? `${user.defaultCommissionRate.toFixed(1)}%`
                : '5.0%'} on Listing Profit
            </Text>
            <Text style={styles.commBasis}>
              Basis: {user?.commissionBasis || 'Commission on Listing Profit'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.commConfigureBtn}
            onPress={() => setActiveTab('commission')}
          >
            <Icon name="percent" size={16} color={colors.surface} />
            <Text style={styles.commConfigureText}>Configure</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Verification & Trust */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Icon name="shield" size={18} color={colors.primaryNavy} />
          <Text style={styles.sectionTitle}>Verification & Trust Status</Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Email Verified:</Text>
          <StatusBadge status={user?.isEmailVerified ? 'verified' : 'pending'} />
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Mobile Verified:</Text>
          <StatusBadge status={user?.isMobileVerified ? 'verified' : 'pending'} />
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Demat & Identity KYC:</Text>
          <StatusBadge status={user?.isKycVerified ? 'verified' : user?.kycDetails?.status || 'none'} />
        </View>

        {!user?.isKycVerified && (
          <TouchableOpacity
            style={styles.submitKycBtn}
            onPress={() => setKycModalOpen(true)}
          >
            <Text style={styles.submitKycText}>
              {user?.kycDetails?.status === 'pending'
                ? 'Update Demat Holding Documents'
                : 'Submit Demat Verification'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Account Info */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Icon name="user" size={18} color={colors.primaryNavy} />
          <Text style={styles.sectionTitle}>Account Details</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Email Address:</Text>
          <Text style={styles.infoVal}>{user?.email}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Mobile Number:</Text>
          <Text style={styles.infoVal}>{user?.mobileNumber}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Experience:</Text>
          <Text style={styles.infoVal}>{user?.investmentExperience || '4+ Years'}</Text>
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Icon name="log-out" size={18} color={colors.error} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* KYC Submit Modal */}
      <ConfirmationModal
        visible={kycModalOpen}
        title="Submit Demat Holding Proof"
        description="Provide masked statement reference or Client Master Sheet (CMS) identifier for compliance review."
        confirmLabel="Submit for Review"
        cancelLabel="Cancel"
        loading={submittingKyc}
        onConfirm={handleKycSubmit}
        onCancel={() => setKycModalOpen(false)}
      >
        <View style={styles.modalField}>
          <Text style={styles.modalFieldLabel}>Document Type</Text>
          <TextInput
            value={docType}
            onChangeText={setDocType}
            style={styles.modalInput}
            placeholder="e.g. NSDL / CDSL Holding Statement"
          />
        </View>
        <View style={styles.modalField}>
          <Text style={styles.modalFieldLabel}>Masked Account Reference</Text>
          <TextInput
            value={docNumber}
            onChangeText={setDocNumber}
            style={styles.modalInput}
            placeholder="e.g. XXXX-XXXX-9911"
          />
        </View>
      </ConfirmationModal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: 100
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.cardLg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
    ...shadows.sm
  },
  profileInfo: {
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
    color: colors.primaryNavy,
    letterSpacing: -0.2
  },
  vBadge: {
    backgroundColor: colors.success,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6
  },
  roleLabel: {
    fontSize: typography.sizes.xs,
    color: colors.primaryActionBlue,
    fontWeight: typography.weights.semibold,
    marginTop: 2
  },
  locationText: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    marginTop: 2
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.cardLg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
    ...shadows.sm
  },
  commHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  commTitle: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  commRate: {
    fontSize: 24,
    fontWeight: typography.weights.bold,
    color: colors.primaryActionBlue,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
    marginVertical: 2
  },
  commBasis: {
    fontSize: 11,
    color: colors.secondaryText
  },
  commConfigureBtn: {
    backgroundColor: colors.primaryActionBlue,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md + 2,
    borderRadius: borderRadius.button,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    ...shadows.sm
  },
  commConfigureText: {
    color: colors.surface,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    marginLeft: spacing.sm
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  statusLabel: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText
  },
  submitKycBtn: {
    backgroundColor: colors.subtleBlueBackground,
    borderRadius: borderRadius.button,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#D4E4FC'
  },
  submitKycText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primaryActionBlue
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs + 3,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  infoKey: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText
  },
  infoVal: {
    fontSize: typography.sizes.xs,
    color: colors.primaryNavy,
    fontWeight: typography.weights.medium
  },
  logoutBtn: {
    backgroundColor: '#FDEEED',
    borderRadius: borderRadius.button,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: '#FBD4D3'
  },
  logoutText: {
    color: colors.error,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    marginLeft: 6
  },
  modalField: {
    marginBottom: spacing.md
  },
  modalFieldLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    marginBottom: 4
  },
  modalInput: {
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    fontSize: typography.sizes.sm,
    color: colors.primaryText
  }
});
