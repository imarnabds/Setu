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

export const InvestorProfileScreen: React.FC = () => {
  const { user, updateUser, logout } = useAuthStore();
  const { addToast } = useUIStore();

  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [docType, setDocType] = useState('PAN & Aadhaar Identity');
  const [docNumber, setDocNumber] = useState('XXXX-XXXX-8822');
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
        addToast('KYC submitted for compliance review.', 'success');
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
          name={user?.fullName || 'Investor'}
          avatarUrl={user?.avatarUrl}
          size={64}
          isVerified={user?.isKycVerified}
        />
        <View style={styles.profileInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{user?.fullName || 'Investor'}</Text>
            {user?.isKycVerified && (
              <View style={styles.vBadge}>
                <Icon name="check" size={10} color={colors.surface} strokeWidth={3} />
              </View>
            )}
          </View>
          <Text style={styles.roleLabel}>Individual Investor</Text>
          <Text style={styles.locationText}>
            {user?.city ? `${user.city}, ` : ''}{user?.region || 'India'}
          </Text>
        </View>
      </View>

      {/* Verification Status Banner */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Icon name="shield" size={18} color={colors.primaryNavy} />
          <Text style={styles.sectionTitle}>Verification & Trust Status</Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Email Verification:</Text>
          <StatusBadge status={user?.isEmailVerified ? 'verified' : 'pending'} />
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Mobile Verification:</Text>
          <StatusBadge status={user?.isMobileVerified ? 'verified' : 'pending'} />
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Compliance KYC:</Text>
          <StatusBadge status={user?.isKycVerified ? 'verified' : user?.kycDetails?.status || 'none'} />
        </View>

        {!user?.isKycVerified && (
          <TouchableOpacity
            style={styles.submitKycBtn}
            onPress={() => setKycModalOpen(true)}
          >
            <Text style={styles.submitKycText}>
              {user?.kycDetails?.status === 'pending'
                ? 'Update Submitted KYC Documents'
                : 'Submit Verification Documents'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Account Details */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Icon name="user" size={18} color={colors.primaryNavy} />
          <Text style={styles.sectionTitle}>Account Information</Text>
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
          <Text style={styles.infoKey}>Experience Level:</Text>
          <Text style={styles.infoVal}>{user?.investmentExperience || '1-2 Years'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Preferred Languages:</Text>
          <Text style={styles.infoVal}>{user?.preferredLanguage || 'English, Hindi'}</Text>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Icon name="log-out" size={18} color={colors.error} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* KYC Submit Modal */}
      <ConfirmationModal
        visible={kycModalOpen}
        title="Submit Verification Document"
        description="Provide masked identity details for platform compliance verification."
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
            placeholder="e.g. PAN & Aadhaar"
          />
        </View>
        <View style={styles.modalField}>
          <Text style={styles.modalFieldLabel}>Masked Document Number</Text>
          <TextInput
            value={docNumber}
            onChangeText={setDocNumber}
            style={styles.modalInput}
            placeholder="e.g. XXXX-XXXX-4567"
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
    paddingBottom: spacing.huge
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.primaryNavy
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
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.sm
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
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle
  },
  statusLabel: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText
  },
  submitKycBtn: {
    backgroundColor: colors.subtleBlueBackground,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  submitKycText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primaryActionBlue
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle
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
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm
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
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    fontSize: typography.sizes.sm,
    color: colors.primaryText
  }
});
