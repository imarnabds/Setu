import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

interface KycPendingReviewScreenProps {
  onRefreshStatus: () => Promise<void>;
  onOpenAdminDesk?: () => void;
  onLogout: () => void;
  onResubmit?: () => void;
}

export const KycPendingReviewScreen: React.FC<KycPendingReviewScreenProps> = ({
  onRefreshStatus,
  onOpenAdminDesk,
  onLogout,
  onResubmit
}) => {
  const { user, switchRole } = useAuthStore();
  const { addToast, setActiveTab } = useUIStore();

  const [checking, setChecking] = useState(false);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      await onRefreshStatus();
      addToast('Status refreshed from compliance server.', 'info');
    } catch (err) {
      addToast('Failed to check status. Please try again.', 'error');
    } finally {
      setChecking(false);
    }
  };

  const kyc = user?.kycDetails;
  const isRejected = kyc?.status === 'rejected';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header with Logout */}
      <View style={styles.topBar}>
        <View style={styles.roleTag}>
          <Text style={styles.roleTagText}>
            {user?.primaryRole === 'demat_holder' ? 'Demat Holder' : 'Individual Investor'}
          </Text>
        </View>

        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn} activeOpacity={0.7}>
          <Icon name="log-out" size={16} color={colors.secondaryText} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Hero Icon */}
      <View style={styles.heroSection}>
        <View style={[styles.clockCircle, isRejected && styles.rejectedCircle]}>
          <Icon
            name={isRejected ? 'alert-circle' : 'clock'}
            size={38}
            color={isRejected ? colors.error : '#F59E0B'}
            strokeWidth={2.2}
          />
        </View>

        <View style={[styles.statusPill, isRejected && styles.rejectedStatusPill]}>
          <View style={[styles.amberDot, isRejected && styles.redDot]} />
          <Text style={[styles.statusPillText, isRejected && styles.rejectedStatusPillText]}>
            {isRejected ? 'Verification Rejected by Compliance' : 'Under Compliance Review'}
          </Text>
        </View>

        <Text style={styles.title}>
          {isRejected ? 'Action Required on KYC' : 'Waiting for Verification'}
        </Text>
        <Text style={styles.subtitle}>
          {isRejected
            ? 'The compliance administrator has reviewed your submitted KYC documents and requested revisions.'
            : 'Your KYC documents have been submitted securely and are currently awaiting review by the admin/developer.'}
        </Text>
      </View>

      {/* If Rejected: Show Compliance Rejection Reason Note */}
      {isRejected && kyc?.notes && (
        <View style={styles.rejectionNoticeCard}>
          <View style={styles.rejectionHeader}>
            <Icon name="alert-circle" size={16} color={colors.error} />
            <Text style={styles.rejectionHeaderTitle}>Compliance Administrator Note:</Text>
          </View>
          <Text style={styles.rejectionNoteText}>"{kyc.notes}"</Text>
          {kyc.reviewedBy && (
            <Text style={styles.rejectionMeta}>
              Reviewed by: {kyc.reviewedBy}
              {kyc.reviewedAt ? ` • ${new Date(kyc.reviewedAt).toLocaleDateString()}` : ''}
            </Text>
          )}

          {onResubmit && (
            <TouchableOpacity
              style={styles.resubmitBtn}
              onPress={onResubmit}
              activeOpacity={0.88}
            >
              <Icon name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.resubmitBtnText}>Update & Resubmit Documents</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Submitted Verification Package Overview Card */}
      <View style={styles.detailsCard}>
        <Text style={styles.detailsHeader}>Submitted Verification Package</Text>

        {/* 1. Email OTP */}
        <View style={styles.detailRow}>
          <View style={styles.checkCircle}>
            <Icon name="check" size={12} color="#FFFFFF" strokeWidth={3} />
          </View>
          <View style={styles.detailTextCol}>
            <Text style={styles.detailTitle}>Email Verified via OTP</Text>
            <Text style={styles.detailSub}>{user?.email}</Text>
          </View>
        </View>

        {/* 2. Live Camera Photo */}
        <View style={styles.detailRow}>
          <View style={styles.checkCircle}>
            <Icon name="check" size={12} color="#FFFFFF" strokeWidth={3} />
          </View>
          <View style={styles.detailTextCol}>
            <Text style={styles.detailTitle}>Live Camera Photo</Text>
            <Text style={styles.detailSub}>Real-time biometric capture</Text>
          </View>
          {kyc?.livePhotoUrl && (
            <Image source={{ uri: kyc.livePhotoUrl }} style={styles.docThumb} />
          )}
        </View>

        {/* 3. Aadhaar Front & Back */}
        <View style={styles.detailRow}>
          <View style={styles.checkCircle}>
            <Icon name="check" size={12} color="#FFFFFF" strokeWidth={3} />
          </View>
          <View style={styles.detailTextCol}>
            <Text style={styles.detailTitle}>Aadhaar Card (Front & Back)</Text>
            <Text style={styles.detailSub}>
              {kyc?.aadhaarNumber ? `No: ${kyc.aadhaarNumber}` : 'Documents Attached'}
            </Text>
          </View>
          {kyc?.aadhaarFrontUrl && (
            <Image source={{ uri: kyc.aadhaarFrontUrl }} style={styles.docThumb} />
          )}
        </View>

        {/* 4. PAN Card */}
        <View style={styles.detailRow}>
          <View style={styles.checkCircle}>
            <Icon name="check" size={12} color="#FFFFFF" strokeWidth={3} />
          </View>
          <View style={styles.detailTextCol}>
            <Text style={styles.detailTitle}>PAN Card Attached</Text>
            <Text style={styles.detailSub}>
              {kyc?.panNumber ? `PAN: ${kyc.panNumber}` : 'Document Attached'}
            </Text>
          </View>
          {kyc?.panCardUrl && (
            <Image source={{ uri: kyc.panCardUrl }} style={styles.docThumb} />
          )}
        </View>
      </View>

      {/* Check Status Button */}
      <TouchableOpacity
        style={styles.refreshBtn}
        disabled={checking}
        onPress={handleCheckStatus}
        activeOpacity={0.88}
      >
        {checking ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Icon name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.refreshBtnText}>Check Verification Status</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Evaluator / Admin Quick Desk Option */}
      <View style={styles.evaluatorBox}>
        <View style={styles.evaluatorHeader}>
          <Icon name="shield" size={14} color={colors.primaryBlue} />
          <Text style={styles.evaluatorTitle}>Admin / Developer Review Desk</Text>
        </View>
        <Text style={styles.evaluatorDesc}>
          Simulate the compliance approval process by opening the Admin Verification Desk:
        </Text>
        <TouchableOpacity
          style={styles.adminDeskBtn}
          activeOpacity={0.85}
          onPress={() => {
            switchRole('admin');
            setActiveTab('kyc');
          }}
        >
          <Text style={styles.adminDeskBtnText}>⚡ Open Admin Desk to Approve KYC</Text>
        </TouchableOpacity>
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    alignItems: 'center'
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg
  },
  roleTag: {
    backgroundColor: '#EBF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.chip
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.chip,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  logoutText: {
    fontSize: 11,
    color: colors.secondaryText,
    fontWeight: typography.weights.semibold
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.lg
  },
  clockCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FDE68A',
    marginBottom: spacing.md,
    ...shadows.sm
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.chip,
    marginBottom: spacing.sm
  },
  amberDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#F59E0B'
  },
  statusPillText: {
    fontSize: 11.5,
    fontWeight: typography.weights.bold,
    color: '#B45309'
  },
  title: {
    fontSize: 22,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
    textAlign: 'center',
    letterSpacing: -0.3
  },
  subtitle: {
    fontSize: 12,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    paddingHorizontal: spacing.sm
  },
  detailsCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
    ...shadows.sm
  },
  detailsHeader: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
    marginBottom: spacing.sm,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC'
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm
  },
  detailTextCol: {
    flex: 1
  },
  detailTitle: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  detailSub: {
    fontSize: 10.5,
    color: colors.secondaryText,
    marginTop: 1
  },
  docThumb: {
    width: 34,
    height: 34,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border
  },
  refreshBtn: {
    width: '100%',
    height: 50,
    backgroundColor: colors.primaryBlue,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.md
  },
  refreshBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: typography.weights.bold
  },
  evaluatorBox: {
    width: '100%',
    backgroundColor: '#F0F5FF',
    borderRadius: 18,
    padding: spacing.md,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: '#D4E2FE',
    alignItems: 'center'
  },
  evaluatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4
  },
  evaluatorTitle: {
    fontSize: 11.5,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  evaluatorDesc: {
    fontSize: 11,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: spacing.sm
  },
  adminDeskBtn: {
    backgroundColor: colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primaryBlue,
    ...shadows.sm
  },
  adminDeskBtnText: {
    fontSize: 11.5,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue
  },
  rejectedCircle: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA'
  },
  rejectedStatusPill: {
    backgroundColor: '#FEE2E2'
  },
  redDot: {
    backgroundColor: colors.error
  },
  rejectedStatusPillText: {
    color: colors.error
  },
  rejectionNoticeCard: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    marginBottom: spacing.md
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4
  },
  rejectionHeaderTitle: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.error
  },
  rejectionNoteText: {
    fontSize: 12.5,
    color: colors.deepNavy,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 2
  },
  rejectionMeta: {
    fontSize: 10,
    color: colors.mutedText,
    marginTop: 4
  },
  resubmitBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.error,
    paddingVertical: 10,
    borderRadius: borderRadius.chip,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  resubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: typography.weights.bold
  }
});
