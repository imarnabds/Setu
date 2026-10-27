import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Image,
  Modal,
  ActivityIndicator,
  Platform
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
import { Icon } from '../../components/common/Icon';
import { api } from '../../services/api';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';

export const AdminConsoleScreen: React.FC = () => {
  const { addToast } = useUIStore();
  const { user: currentAdmin } = useAuthStore();

  const [stats, setStats] = useState<any | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [pokes, setPokes] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'kyc' | 'users' | 'pokes' | 'audit'>('kyc');
  const [kycFilter, setKycFilter] = useState<'pending' | 'verified' | 'rejected' | 'all'>('pending');
  const [refreshing, setRefreshing] = useState(false);

  // Review modal state
  const [selectedUserForKyc, setSelectedUserForKyc] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState<'verified' | 'rejected'>('verified');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Full-size image modal state
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const fetchAdminData = async () => {
    try {
      const [statsRes, usersRes, pokesRes, logsRes] = await Promise.all([
        api.get('/admin/stats').catch(() => ({ data: { data: null } })),
        api.get('/admin/users').catch(() => ({ data: { data: [] } })),
        api.get('/admin/pokes').catch(() => ({ data: { data: [] } })),
        api.get('/admin/audit-logs').catch(() => ({ data: { data: [] } }))
      ]);

      if (statsRes.data?.data) setStats(statsRes.data.data);
      if (usersRes.data?.data) setUsers(usersRes.data.data);
      if (pokesRes.data?.data) setPokes(pokesRes.data.data);
      if (logsRes.data?.data) setAuditLogs(logsRes.data.data);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAdminData();
    setRefreshing(false);
  };

  const handleOpenReview = (user: any, action: 'verified' | 'rejected') => {
    setSelectedUserForKyc(user);
    setReviewAction(action);
    setReviewNotes('');
    setNoteError(null);
  };

  const handleReviewKyc = async () => {
    if (!selectedUserForKyc) return;

    const trimmedNotes = reviewNotes.trim();
    if (!trimmedNotes || trimmedNotes.length < 3) {
      setNoteError(
        `A note explaining why you ${
          reviewAction === 'verified' ? 'approved' : 'rejected'
        } this customer's KYC is mandatory (minimum 3 characters).`
      );
      return;
    }

    setReviewLoading(true);
    setNoteError(null);

    try {
      const res = await api.put(`/admin/kyc/${selectedUserForKyc.id}`, {
        status: reviewAction,
        notes: trimmedNotes
      });

      if (res.data.success) {
        addToast(
          `KYC ${
            reviewAction === 'verified' ? 'Approved' : 'Rejected'
          } successfully with compliance note recorded.`,
          'success'
        );
        setSelectedUserForKyc(null);
        setReviewNotes('');
        await fetchAdminData();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to review KYC.';
      setNoteError(msg);
      addToast(msg, 'error');
    } finally {
      setReviewLoading(false);
    }
  };

  // Filter users based on KYC status
  const pendingKycUsers = users.filter((u) => u.kycDetails?.status === 'pending');
  const verifiedKycUsers = users.filter((u) => u.isKycVerified || u.kycDetails?.status === 'verified');
  const rejectedKycUsers = users.filter((u) => u.kycDetails?.status === 'rejected');
  const allKycUsers = users.filter((u) => u.kycDetails && u.kycDetails.status !== 'none');

  const displayedKycUsers =
    kycFilter === 'pending'
      ? pendingKycUsers
      : kycFilter === 'verified'
      ? verifiedKycUsers
      : kycFilter === 'rejected'
      ? rejectedKycUsers
      : allKycUsers;

  // Preset note helpers for rapid admin review
  const approvePresets = [
    'All identity and Demat credentials matched and verified successfully.',
    'Aadhaar & PAN verified against statutory UIDAI & ITD benchmarks.',
    'Clear biometric selfie & verified allocation history confirmed.'
  ];

  const rejectPresets = [
    'Aadhaar card image is blurred or illegible. Please retake photo clearly.',
    'Name on PAN card does not match the registered profile name.',
    'Aadhaar or PAN number mismatch with the uploaded card document.',
    'Live camera selfie does not clearly match the face on identity document.'
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Title Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleRow}>
            <Icon name="shield" size={24} color={colors.primaryNavy} />
            <Text style={styles.headerTitle}>Compliance & Verification Desk</Text>
          </View>
          <View style={styles.adminBadge}>
            <View style={styles.greenPulseDot} />
            <Text style={styles.adminBadgeText}>
              Admin: {currentAdmin?.email || 'kuchbhi0804@gmail.com'}
            </Text>
          </View>
        </View>
        <Text style={styles.headerSub}>
          Statutory oversight of user identity documents, live biometric photos, and KYC approvals/rejections with mandatory audit logging.
        </Text>
      </View>

      {/* High Level Stats Grid */}
      {stats && (
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{stats.users?.total || 0}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={[styles.statBox, pendingKycUsers.length > 0 && styles.statBoxAlert]}>
            <Text style={[styles.statVal, pendingKycUsers.length > 0 && styles.statValAlert]}>
              {pendingKycUsers.length}
            </Text>
            <Text style={styles.statLabel}>Pending KYC</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{verifiedKycUsers.length}</Text>
            <Text style={styles.statLabel}>Verified</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{stats.averageCommission?.toFixed(1) || '0.0'}%</Text>
            <Text style={styles.statLabel}>Avg Commission</Text>
          </View>
        </View>
      )}

      {/* Main Admin Navigation Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'kyc' && styles.tabActive]}
          onPress={() => setActiveTab('kyc')}
        >
          <Text style={[styles.tabText, activeTab === 'kyc' && styles.tabTextActive]}>
            KYC Queue ({pendingKycUsers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.tabActive]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
            Users ({users.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'pokes' && styles.tabActive]}
          onPress={() => setActiveTab('pokes')}
        >
          <Text style={[styles.tabText, activeTab === 'pokes' && styles.tabTextActive]}>
            Pokes ({pokes.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'audit' && styles.tabActive]}
          onPress={() => setActiveTab('audit')}
        >
          <Text style={[styles.tabText, activeTab === 'audit' && styles.tabTextActive]}>
            Audit Trail
          </Text>
        </TouchableOpacity>
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* TAB 1: KYC QUEUE & DOCUMENT INSPECTION */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'kyc' && (
        <View style={styles.sectionBody}>
          {/* Sub-Filter Chips */}
          <View style={styles.subFilterRow}>
            <TouchableOpacity
              style={[styles.subFilterChip, kycFilter === 'pending' && styles.subFilterChipActive]}
              onPress={() => setKycFilter('pending')}
            >
              <Text
                style={[
                  styles.subFilterChipText,
                  kycFilter === 'pending' && styles.subFilterChipTextActive
                ]}
              >
                Pending Review ({pendingKycUsers.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.subFilterChip, kycFilter === 'verified' && styles.subFilterChipActive]}
              onPress={() => setKycFilter('verified')}
            >
              <Text
                style={[
                  styles.subFilterChipText,
                  kycFilter === 'verified' && styles.subFilterChipTextActive
                ]}
              >
                Approved ({verifiedKycUsers.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.subFilterChip, kycFilter === 'rejected' && styles.subFilterChipActive]}
              onPress={() => setKycFilter('rejected')}
            >
              <Text
                style={[
                  styles.subFilterChipText,
                  kycFilter === 'rejected' && styles.subFilterChipTextActive
                ]}
              >
                Rejected ({rejectedKycUsers.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.subFilterChip, kycFilter === 'all' && styles.subFilterChipActive]}
              onPress={() => setKycFilter('all')}
            >
              <Text
                style={[
                  styles.subFilterChipText,
                  kycFilter === 'all' && styles.subFilterChipTextActive
                ]}
              >
                All ({allKycUsers.length})
              </Text>
            </TouchableOpacity>
          </View>

          {displayedKycUsers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Icon name="check-circle" size={36} color={colors.success} />
              <Text style={styles.emptyTitle}>
                {kycFilter === 'pending' ? 'KYC Queue Is Clear!' : 'No Applicants in this Filter'}
              </Text>
              <Text style={styles.emptySub}>
                {kycFilter === 'pending'
                  ? 'All pending customer KYC verification documents have been evaluated.'
                  : 'No customer verification records found matching the selected filter.'}
              </Text>
            </View>
          ) : (
            displayedKycUsers.map((u) => {
              const kyc = u.kycDetails;
              const isPending = kyc?.status === 'pending';
              const isVerified = u.isKycVerified || kyc?.status === 'verified';
              const isRejected = kyc?.status === 'rejected';

              return (
                <View key={u.id} style={styles.kycCard}>
                  {/* Top Row: User Avatar, Name, Role, Status */}
                  <View style={styles.kycCardHeader}>
                    <ProfileAvatar
                      name={u.fullName}
                      avatarUrl={u.avatarUrl}
                      size={48}
                      isVerified={isVerified}
                    />
                    <View style={styles.kycHeaderInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.applicantName}>{u.fullName}</Text>
                        <View
                          style={[
                            styles.rolePill,
                            u.primaryRole === 'demat_holder'
                              ? styles.rolePillHolder
                              : styles.rolePillInvestor
                          ]}
                        >
                          <Text style={styles.rolePillText}>
                            {u.primaryRole === 'demat_holder' ? 'Demat Holder' : 'Investor'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.applicantContact}>
                        {u.email} • {u.mobileNumber}
                      </Text>
                      {u.city && (
                        <Text style={styles.applicantLocation}>
                          {u.city}, {u.region || 'India'}
                        </Text>
                      )}
                    </View>
                    <StatusBadge
                      status={isVerified ? 'verified' : isRejected ? 'rejected' : 'pending'}
                    />
                  </View>

                  {/* Document Identifiers (Aadhaar & PAN) */}
                  <View style={styles.docNumbersContainer}>
                    <View style={styles.docNumberBox}>
                      <Text style={styles.docNumberLabel}>Aadhaar Number</Text>
                      <Text style={styles.docNumberVal}>
                        {kyc?.aadhaarNumber || kyc?.documentNumberMasked || 'Not provided'}
                      </Text>
                    </View>

                    <View style={styles.docNumberBox}>
                      <Text style={styles.docNumberLabel}>PAN Card Number</Text>
                      <Text style={styles.docNumberVal}>
                        {kyc?.panNumber || 'Submitted with application'}
                      </Text>
                    </View>
                  </View>

                  {/* Document Photos Grid (Click to enlarge) */}
                  <View style={styles.docThumbsSection}>
                    <Text style={styles.docThumbsTitle}>
                      Submitted Verification Documents (Tap image to inspect):
                    </Text>
                    <View style={styles.adminDocThumbsRow}>
                      {/* 1. Live Selfie */}
                      <TouchableOpacity
                        style={styles.adminDocThumbCol}
                        activeOpacity={0.8}
                        onPress={() =>
                          kyc?.livePhotoUrl &&
                          setPreviewImage({
                            url: kyc.livePhotoUrl,
                            title: `Live Camera Selfie - ${u.fullName}`
                          })
                        }
                      >
                        <Image
                          source={{
                            uri:
                              kyc?.livePhotoUrl ||
                              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80'
                          }}
                          style={styles.adminDocThumb}
                          resizeMode="cover"
                        />
                        <View style={styles.thumbLabelBox}>
                          <Icon name="camera" size={11} color={colors.primaryBlue} />
                          <Text style={styles.adminDocLabel}>Live Selfie</Text>
                        </View>
                      </TouchableOpacity>

                      {/* 2. Aadhaar Front */}
                      <TouchableOpacity
                        style={styles.adminDocThumbCol}
                        activeOpacity={0.8}
                        onPress={() =>
                          kyc?.aadhaarFrontUrl &&
                          setPreviewImage({
                            url: kyc.aadhaarFrontUrl,
                            title: `Aadhaar Front - ${u.fullName}`
                          })
                        }
                      >
                        <Image
                          source={{
                            uri:
                              kyc?.aadhaarFrontUrl ||
                              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80'
                          }}
                          style={styles.adminDocThumb}
                          resizeMode="cover"
                        />
                        <View style={styles.thumbLabelBox}>
                          <Icon name="credit-card" size={11} color={colors.primaryBlue} />
                          <Text style={styles.adminDocLabel}>Aadhaar Front</Text>
                        </View>
                      </TouchableOpacity>

                      {/* 3. Aadhaar Back */}
                      <TouchableOpacity
                        style={styles.adminDocThumbCol}
                        activeOpacity={0.8}
                        onPress={() =>
                          kyc?.aadhaarBackUrl &&
                          setPreviewImage({
                            url: kyc.aadhaarBackUrl,
                            title: `Aadhaar Back - ${u.fullName}`
                          })
                        }
                      >
                        <Image
                          source={{
                            uri:
                              kyc?.aadhaarBackUrl ||
                              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80'
                          }}
                          style={styles.adminDocThumb}
                          resizeMode="cover"
                        />
                        <View style={styles.thumbLabelBox}>
                          <Icon name="credit-card" size={11} color={colors.primaryBlue} />
                          <Text style={styles.adminDocLabel}>Aadhaar Back</Text>
                        </View>
                      </TouchableOpacity>

                      {/* 4. PAN Card */}
                      <TouchableOpacity
                        style={styles.adminDocThumbCol}
                        activeOpacity={0.8}
                        onPress={() =>
                          kyc?.panCardUrl &&
                          setPreviewImage({
                            url: kyc.panCardUrl,
                            title: `PAN Card - ${u.fullName}`
                          })
                        }
                      >
                        <Image
                          source={{
                            uri:
                              kyc?.panCardUrl ||
                              'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80'
                          }}
                          style={styles.adminDocThumb}
                          resizeMode="cover"
                        />
                        <View style={styles.thumbLabelBox}>
                          <Icon name="award" size={11} color={colors.primaryBlue} />
                          <Text style={styles.adminDocLabel}>PAN Card</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Previous Review Note History (if present) */}
                  {kyc?.notes && (
                    <View
                      style={[
                        styles.reviewHistoryBox,
                        isVerified && styles.reviewHistoryVerified,
                        isRejected && styles.reviewHistoryRejected
                      ]}
                    >
                      <View style={styles.reviewHistoryHeader}>
                        <Icon
                          name={isVerified ? 'check-circle' : 'alert-circle'}
                          size={13}
                          color={isVerified ? colors.success : colors.error}
                        />
                        <Text
                          style={[
                            styles.reviewHistoryTitle,
                            isVerified && { color: colors.success },
                            isRejected && { color: colors.error }
                          ]}
                        >
                          Compliance {isVerified ? 'Approval' : 'Rejection'} Note:
                        </Text>
                      </View>
                      <Text style={styles.reviewHistoryNoteText}>"{kyc.notes}"</Text>
                      {kyc.reviewedBy && (
                        <Text style={styles.reviewerMeta}>
                          Reviewed by: {kyc.reviewedBy}
                          {kyc.reviewedAt ? ` • ${new Date(kyc.reviewedAt).toLocaleDateString()}` : ''}
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Authority Actions: Approve & Reject */}
                  <View style={styles.kycActionsRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnReject]}
                      onPress={() => handleOpenReview(u, 'rejected')}
                      activeOpacity={0.85}
                    >
                      <Icon name="x-circle" size={16} color={colors.error} />
                      <Text style={styles.btnRejectText}>
                        {isRejected ? 'Re-Reject KYC' : 'Reject KYC'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnApprove]}
                      onPress={() => handleOpenReview(u, 'verified')}
                      activeOpacity={0.85}
                    >
                      <Icon name="check-circle" size={16} color="#FFFFFF" />
                      <Text style={styles.btnApproveText}>
                        {isVerified ? 'Re-Approve KYC' : 'Approve & Verify'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 2: ALL REGISTERED USERS */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'users' && (
        <View style={styles.sectionBody}>
          {users.map((u) => (
            <View key={u.id} style={styles.userCard}>
              <View style={styles.userTop}>
                <ProfileAvatar
                  name={u.fullName}
                  avatarUrl={u.avatarUrl}
                  size={44}
                  isVerified={u.isKycVerified}
                />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{u.fullName}</Text>
                  <Text style={styles.userRole}>
                    {u.primaryRole} • {u.email}
                  </Text>
                </View>
                <StatusBadge status={u.isKycVerified ? 'verified' : 'pending'} />
              </View>
              <View style={styles.userDetailsRow}>
                <Text style={styles.userDetailText}>Mobile: {u.mobileNumber}</Text>
                {u.primaryRole === 'demat_holder' && (
                  <Text style={styles.userDetailText}>
                    Commission: {u.defaultCommissionRate}%
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 3: PLATFORM POKES & COMMISSION INBOX */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'pokes' && (
        <View style={styles.sectionBody}>
          {pokes.map((p) => (
            <View key={p.id} style={styles.userCard}>
              <View style={styles.pokeRow}>
                <View style={styles.pokeUsers}>
                  <Text style={styles.pokeSender}>{p.senderName || p.senderId}</Text>
                  <Text style={styles.pokeArrow}>→</Text>
                  <Text style={styles.pokeRecipient}>{p.recipientName || p.recipientId}</Text>
                </View>
                <StatusBadge status={p.status} />
              </View>
              <Text style={styles.pokeTerms}>
                Rate: {p.proposedCommissionRate !== undefined ? `${p.proposedCommissionRate}%` : 'Standard'} • Basis:{' '}
                {p.commissionBasis || 'Commission on Profit'}
              </Text>
              {p.message ? <Text style={styles.pokeMsg}>"{p.message}"</Text> : null}
            </View>
          ))}
        </View>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 4: STATUTORY AUDIT TRAIL */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'audit' && (
        <View style={styles.sectionBody}>
          {auditLogs.map((log) => {
            const time = new Date(log.timestamp).toLocaleDateString('en-IN', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            return (
              <View key={log.id} style={styles.auditCard}>
                <View style={styles.auditHeader}>
                  <Text style={styles.auditAction}>{log.action}</Text>
                  <Text style={styles.auditTime}>{time}</Text>
                </View>
                <Text style={styles.auditDetails}>{JSON.stringify(log.details || {})}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MANDATORY COMPLIANCE REVIEW MODAL (APPROVE / REJECT) */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        visible={!!selectedUserForKyc}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedUserForKyc(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Icon
                  name={reviewAction === 'verified' ? 'check-circle' : 'alert-circle'}
                  size={22}
                  color={reviewAction === 'verified' ? colors.success : colors.error}
                />
                <Text style={styles.modalTitle}>
                  {reviewAction === 'verified' ? 'Approve' : 'Reject'} Verification
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedUserForKyc(null)}
                style={styles.closeBtn}
              >
                <Icon name="x" size={18} color={colors.secondaryText} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Evaluating statutory submission for{' '}
              <Text style={{ fontWeight: 'bold', color: colors.deepNavy }}>
                {selectedUserForKyc?.fullName}
              </Text>{' '}
              ({selectedUserForKyc?.email})
            </Text>

            {/* Decision Toggle */}
            <View style={styles.decisionToggleRow}>
              <TouchableOpacity
                style={[
                  styles.decisionChip,
                  reviewAction === 'verified' && styles.decisionChipApproveActive
                ]}
                onPress={() => {
                  setReviewAction('verified');
                  setNoteError(null);
                }}
              >
                <Icon
                  name="check-circle"
                  size={16}
                  color={reviewAction === 'verified' ? '#FFFFFF' : colors.secondaryText}
                />
                <Text
                  style={[
                    styles.decisionChipText,
                    reviewAction === 'verified' && styles.decisionChipTextActive
                  ]}
                >
                  Approve KYC
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.decisionChip,
                  reviewAction === 'rejected' && styles.decisionChipRejectActive
                ]}
                onPress={() => {
                  setReviewAction('rejected');
                  setNoteError(null);
                }}
              >
                <Icon
                  name="x-circle"
                  size={16}
                  color={reviewAction === 'rejected' ? '#FFFFFF' : colors.secondaryText}
                />
                <Text
                  style={[
                    styles.decisionChipText,
                    reviewAction === 'rejected' && styles.decisionChipTextActive
                  ]}
                >
                  Reject KYC
                </Text>
              </TouchableOpacity>
            </View>

            {/* Note Error Alert */}
            {noteError && (
              <View style={styles.errorAlert}>
                <Icon name="alert-circle" size={14} color={colors.error} />
                <Text style={styles.errorAlertText}>{noteError}</Text>
              </View>
            )}

            {/* Mandatory Note Section */}
            <View style={styles.noteInputSection}>
              <View style={styles.noteLabelRow}>
                <Text style={styles.noteLabel}>
                  Reason / Compliance Note <Text style={styles.requiredAsterisk}>* (Mandatory)</Text>
                </Text>
                <Text style={styles.charCount}>{reviewNotes.trim().length}/500</Text>
              </View>

              <TextInput
                multiline
                numberOfLines={3}
                placeholder={
                  reviewAction === 'verified'
                    ? 'State reasons for approval (e.g. Identity matched with PAN/Aadhaar databases and valid Demat verification)...'
                    : 'State reasons for rejection (e.g. Aadhaar card image is blurred, name mismatch with PAN)...'
                }
                placeholderTextColor={colors.mutedText}
                value={reviewNotes}
                onChangeText={(val) => {
                  setReviewNotes(val);
                  if (noteError) setNoteError(null);
                }}
                style={[styles.noteTextInput, noteError && styles.noteInputError]}
              />

              {/* Quick preset chips */}
              <Text style={styles.presetHeading}>Quick Preset Notes (Tap to fill):</Text>
              <View style={styles.presetChipsRow}>
                {(reviewAction === 'verified' ? approvePresets : rejectPresets).map(
                  (preset, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.presetChip}
                      onPress={() => {
                        setReviewNotes(preset);
                        if (noteError) setNoteError(null);
                      }}
                    >
                      <Text style={styles.presetChipText} numberOfLines={1}>
                        + {preset}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            {/* Submit / Cancel Buttons */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setSelectedUserForKyc(null)}
                disabled={reviewLoading}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  reviewAction === 'verified' ? styles.btnApproveSubmit : styles.btnRejectSubmit,
                  reviewNotes.trim().length < 3 && styles.btnDisabled
                ]}
                onPress={handleReviewKyc}
                disabled={reviewLoading}
                activeOpacity={0.88}
              >
                {reviewLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Icon
                      name={reviewAction === 'verified' ? 'check' : 'x'}
                      size={16}
                      color="#FFFFFF"
                    />
                    <Text style={styles.modalSubmitBtnText}>
                      Confirm {reviewAction === 'verified' ? 'Approval' : 'Rejection'} with Note
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ------------------------------------------------------------------ */}
      {/* FULL-SIZE DOCUMENT IMAGE VIEWER MODAL */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        visible={!!previewImage}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <View style={styles.imageViewerOverlay}>
          <View style={styles.imageViewerContainer}>
            <View style={styles.imageViewerHeader}>
              <Text style={styles.imageViewerTitle}>{previewImage?.title}</Text>
              <TouchableOpacity
                onPress={() => setPreviewImage(null)}
                style={styles.imageViewerCloseBtn}
              >
                <Icon name="x" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            {previewImage && (
              <Image
                source={{ uri: previewImage.url }}
                style={styles.imageViewerFull}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>
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
    paddingBottom: 110
  },
  header: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.cardLg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
    ...shadows.sm
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 8
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  headerTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    letterSpacing: -0.2
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.chip,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 6
  },
  greenPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.success
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue
  },
  headerSub: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    lineHeight: 18
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    ...shadows.sm
  },
  statBoxAlert: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB'
  },
  statVal: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy
  },
  statValAlert: {
    color: '#D97706'
  },
  statLabel: {
    fontSize: 10,
    color: colors.secondaryText,
    marginTop: 2,
    textAlign: 'center'
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    padding: 3,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8
  },
  tabActive: {
    backgroundColor: colors.primaryBlue
  },
  tabText: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: colors.secondaryText
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold
  },
  sectionBody: {
    gap: spacing.md
  },

  // Sub-filter chips in KYC Queue
  subFilterRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: spacing.xs
  },
  subFilterChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.chip,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  subFilterChipActive: {
    backgroundColor: colors.deepNavy,
    borderColor: colors.deepNavy
  },
  subFilterChipText: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: colors.secondaryText
  },
  subFilterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold
  },

  // KYC Card
  kycCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm
  },
  kycCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm
  },
  kycHeaderInfo: {
    flex: 1
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap'
  },
  applicantName: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy
  },
  rolePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.chip
  },
  rolePillInvestor: {
    backgroundColor: '#EFF6FF'
  },
  rolePillHolder: {
    backgroundColor: '#F3E8FF'
  },
  rolePillText: {
    fontSize: 9.5,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue
  },
  applicantContact: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 2
  },
  applicantLocation: {
    fontSize: 10.5,
    color: colors.mutedText,
    marginTop: 1
  },
  docNumbersContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: spacing.sm,
    gap: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  docNumberBox: {
    flex: 1
  },
  docNumberLabel: {
    fontSize: 9.5,
    color: colors.mutedText,
    fontWeight: typography.weights.semibold
  },
  docNumberVal: {
    fontSize: 11.5,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
    marginTop: 2
  },

  // Document Thumbnails
  docThumbsSection: {
    marginBottom: spacing.sm
  },
  docThumbsTitle: {
    fontSize: 10.5,
    fontWeight: typography.weights.semibold,
    color: colors.secondaryText,
    marginBottom: 6
  },
  adminDocThumbsRow: {
    flexDirection: 'row',
    gap: 8
  },
  adminDocThumbCol: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 4,
    backgroundColor: '#FFFFFF',
    ...shadows.sm
  },
  adminDocThumb: {
    width: '100%',
    height: 52,
    borderRadius: 6
  },
  thumbLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4
  },
  adminDocLabel: {
    fontSize: 9.5,
    fontWeight: typography.weights.medium,
    color: colors.primaryNavy
  },

  // Review History Box
  reviewHistoryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm
  },
  reviewHistoryVerified: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0'
  },
  reviewHistoryRejected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA'
  },
  reviewHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2
  },
  reviewHistoryTitle: {
    fontSize: 11,
    fontWeight: typography.weights.bold
  },
  reviewHistoryNoteText: {
    fontSize: 11,
    color: colors.deepNavy,
    fontStyle: 'italic',
    lineHeight: 15,
    marginTop: 2
  },
  reviewerMeta: {
    fontSize: 9.5,
    color: colors.mutedText,
    marginTop: 4
  },

  // Actions
  kycActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 4
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12
  },
  btnReject: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA'
  },
  btnRejectText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.error
  },
  btnApprove: {
    backgroundColor: colors.success,
    ...shadows.sm
  },
  btnApproveText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF'
  },

  // Empty Card
  emptyCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: borderRadius.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    marginTop: spacing.sm
  },
  emptySub: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18
  },

  // Users tab
  userCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm
  },
  userTop: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.sm
  },
  userName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy
  },
  userRole: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    marginTop: 1
  },
  userDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  userDetailText: {
    fontSize: typography.sizes.xs,
    color: colors.mutedText
  },

  // Pokes tab
  pokeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs
  },
  pokeUsers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  pokeSender: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy
  },
  pokeArrow: {
    color: colors.primaryBlue,
    fontWeight: 'bold'
  },
  pokeRecipient: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy
  },
  pokeTerms: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    marginBottom: 4
  },
  pokeMsg: {
    fontSize: typography.sizes.xs,
    color: colors.mutedText,
    fontStyle: 'italic'
  },

  // Audit Tab
  auditCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  auditAction: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue
  },
  auditTime: {
    fontSize: 10,
    color: colors.mutedText
  },
  auditDetails: {
    fontSize: 10,
    color: colors.secondaryText,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },

  // Review Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg
  },
  modalContainer: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: spacing.lg,
    ...shadows.lg
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalSub: {
    fontSize: 12,
    color: colors.secondaryText,
    marginBottom: spacing.md,
    lineHeight: 17
  },
  decisionToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md
  },
  decisionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF'
  },
  decisionChipApproveActive: {
    borderColor: colors.success,
    backgroundColor: colors.success
  },
  decisionChipRejectActive: {
    borderColor: colors.error,
    backgroundColor: colors.error
  },
  decisionChipText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.secondaryText
  },
  decisionChipTextActive: {
    color: '#FFFFFF'
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.sm
  },
  errorAlertText: {
    fontSize: 11,
    color: colors.error,
    fontWeight: typography.weights.medium,
    flex: 1
  },
  noteInputSection: {
    marginBottom: spacing.md
  },
  noteLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  noteLabel: {
    fontSize: 11.5,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  requiredAsterisk: {
    color: colors.error,
    fontWeight: 'bold'
  },
  charCount: {
    fontSize: 10.5,
    color: colors.mutedText
  },
  noteTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.sm,
    fontSize: 12,
    color: colors.deepNavy,
    minHeight: 70,
    textAlignVertical: 'top'
  },
  noteInputError: {
    borderColor: colors.error,
    backgroundColor: '#FEF2F2'
  },
  presetHeading: {
    fontSize: 10,
    fontWeight: typography.weights.semibold,
    color: colors.mutedText,
    marginTop: 8,
    marginBottom: 4
  },
  presetChipsRow: {
    gap: 4
  },
  presetChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  presetChipText: {
    fontSize: 10,
    color: colors.primaryNavy
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs
  },
  modalCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: borderRadius.chip,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.secondaryText
  },
  modalSubmitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: borderRadius.chip
  },
  btnApproveSubmit: {
    backgroundColor: colors.success
  },
  btnRejectSubmit: {
    backgroundColor: colors.error
  },
  btnDisabled: {
    opacity: 0.45
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: typography.weights.bold
  },

  // Full-size image viewer modal
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md
  },
  imageViewerContainer: {
    width: '100%',
    maxWidth: 550,
    height: '80%',
    alignItems: 'center'
  },
  imageViewerHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  imageViewerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: typography.weights.bold
  },
  imageViewerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  imageViewerFull: {
    width: '100%',
    flex: 1,
    borderRadius: 12
  }
});
