import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { Icon } from '../../components/common/Icon';
import { api } from '../../services/api';
import { useUIStore } from '../../store/uiStore';

export const AdminConsoleScreen: React.FC = () => {
  const { addToast } = useUIStore();

  const [stats, setStats] = useState<any | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [pokes, setPokes] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'kyc' | 'users' | 'pokes' | 'audit'>('kyc');
  const [refreshing, setRefreshing] = useState(false);

  // Review modal state
  const [selectedUserForKyc, setSelectedUserForKyc] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState<'verified' | 'rejected'>('verified');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

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

  const handleReviewKyc = async () => {
    if (!selectedUserForKyc) return;
    setReviewLoading(true);

    try {
      const res = await api.put(`/admin/kyc/${selectedUserForKyc.id}`, {
        status: reviewAction,
        notes: reviewNotes
      });

      if (res.data.success) {
        addToast(`KYC status updated to ${reviewAction}!`, 'success');
        setSelectedUserForKyc(null);
        setReviewNotes('');
        await fetchAdminData();
      }
    } catch (err) {
      addToast('Failed to review KYC.', 'error');
    } finally {
      setReviewLoading(false);
    }
  };

  const pendingKycUsers = users.filter((u) => u.kycDetails?.status === 'pending');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Title Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Icon name="shield" size={24} color={colors.primaryNavy} />
          <Text style={styles.headerTitle}>Compliance & Platform Desk</Text>
        </View>
        <Text style={styles.headerSub}>
          Oversight of user registrations, KYC integrity, active Pokes, and statutory commission compliance.
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
            <Text style={styles.statVal}>{stats.pokes?.total || 0}</Text>
            <Text style={styles.statLabel}>Total Pokes</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{stats.averageCommission?.toFixed(1) || '0.0'}%</Text>
            <Text style={styles.statLabel}>Avg Commission</Text>
          </View>
        </View>
      )}

      {/* Admin Tabs */}
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

      {/* Tab Content */}
      {activeTab === 'kyc' && (
        <View style={styles.sectionBody}>
          {pendingKycUsers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Icon name="check-circle" size={32} color={colors.success} />
              <Text style={styles.emptyTitle}>KYC Queue Clear</Text>
              <Text style={styles.emptySub}>All user verification documents have been processed.</Text>
            </View>
          ) : (
            pendingKycUsers.map((u) => (
              <View key={u.id} style={styles.userCard}>
                <View style={styles.userTop}>
                  <ProfileAvatar name={u.fullName} avatarUrl={u.avatarUrl} size={44} />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{u.fullName}</Text>
                    <Text style={styles.userRole}>
                      {u.primaryRole === 'demat_holder' ? 'Demat Account Holder' : 'Investor'} • {u.city}
                    </Text>
                  </View>
                  <StatusBadge status="pending" />
                </View>

                <View style={styles.kycDocBox}>
                  <Text style={styles.kycDocType}>
                    Document: {u.kycDetails?.documentType || 'ID Document'}
                  </Text>
                  <Text style={styles.kycDocNum}>
                    Reference: {u.kycDetails?.documentNumberMasked || 'XXXX-XXXX-XXXX'}
                  </Text>
                </View>

                <View style={styles.kycActionsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.btnReject]}
                    onPress={() => {
                      setSelectedUserForKyc(u);
                      setReviewAction('rejected');
                    }}
                  >
                    <Text style={styles.btnRejectText}>Reject Document</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.btnApprove]}
                    onPress={() => {
                      setSelectedUserForKyc(u);
                      setReviewAction('verified');
                    }}
                  >
                    <Text style={styles.btnApproveText}>Approve & Verify</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {activeTab === 'users' && (
        <View style={styles.sectionBody}>
          {users.map((u) => (
            <View key={u.id} style={styles.userCard}>
              <View style={styles.userTop}>
                <ProfileAvatar name={u.fullName} avatarUrl={u.avatarUrl} size={44} isVerified={u.isKycVerified} />
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
                Rate: {p.proposedCommissionRate !== undefined ? `${p.proposedCommissionRate}%` : 'Standard'} • Basis: {p.commissionBasis || 'Advisory Base'}
              </Text>
              {p.message ? <Text style={styles.pokeMsg}>"{p.message}"</Text> : null}
            </View>
          ))}
        </View>
      )}

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
                <Text style={styles.auditDetails}>
                  {JSON.stringify(log.details || {})}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* KYC Review Confirmation Modal */}
      <ConfirmationModal
        visible={!!selectedUserForKyc}
        title={`${reviewAction === 'verified' ? 'Approve' : 'Reject'} Verification for ${selectedUserForKyc?.fullName}?`}
        description={
          reviewAction === 'verified'
            ? 'Approving marks this user as Verified Demat/Investor with a green verified badge.'
            : 'Rejecting will require the user to resubmit compliant documents.'
        }
        confirmLabel={reviewAction === 'verified' ? 'Approve KYC' : 'Reject KYC'}
        cancelLabel="Cancel"
        isDestructive={reviewAction === 'rejected'}
        loading={reviewLoading}
        onConfirm={handleReviewKyc}
        onCancel={() => setSelectedUserForKyc(null)}
      >
        <TextInput
          placeholder="Compliance review note (e.g. Verified against NSDL benchmark)"
          placeholderTextColor={colors.secondaryText}
          value={reviewNotes}
          onChangeText={setReviewNotes}
          style={styles.reviewInput}
        />
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
  header: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.sm
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    marginLeft: spacing.sm
  },
  headerSub: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    lineHeight: 18
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  statBox: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm
  },
  statBoxAlert: {
    backgroundColor: colors.badgePendingBg,
    borderColor: colors.warning
  },
  statVal: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    fontVariant: ['tabular-nums']
  },
  statValAlert: {
    color: colors.warning
  },
  statLabel: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 2
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden'
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surface
  },
  tabActive: {
    backgroundColor: colors.primaryNavy
  },
  tabText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.secondaryText
  },
  tabTextActive: {
    color: colors.surface
  },
  sectionBody: {
    gap: spacing.sm
  },
  userCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm
  },
  userTop: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  userInfo: {
    marginLeft: spacing.sm,
    flex: 1
  },
  userName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy
  },
  userRole: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 2
  },
  kycDocBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm
  },
  kycDocType: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy
  },
  kycDocNum: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 2
  },
  kycActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  actionBtn: {
    flex: 1,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnReject: {
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.error
  },
  btnRejectText: {
    color: colors.error,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold
  },
  btnApprove: {
    backgroundColor: colors.success
  },
  btnApproveText: {
    color: colors.surface,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold
  },
  userDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6
  },
  userDetailText: {
    fontSize: 11,
    color: colors.secondaryText
  },
  pokeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  pokeUsers: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  pokeSender: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy
  },
  pokeArrow: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    marginHorizontal: 4
  },
  pokeRecipient: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primaryActionBlue
  },
  pokeTerms: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 4
  },
  pokeMsg: {
    fontSize: 11,
    color: colors.primaryText,
    fontStyle: 'italic',
    marginTop: 2
  },
  auditCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  auditAction: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.primaryActionBlue
  },
  auditTime: {
    fontSize: 10,
    color: colors.secondaryText
  },
  auditDetails: {
    fontSize: 10,
    color: colors.secondaryText,
    fontFamily: 'monospace'
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  emptyTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    marginTop: spacing.xs
  },
  emptySub: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    marginTop: 2
  },
  reviewInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.primaryText,
    backgroundColor: colors.surface
  }
});
