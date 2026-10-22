import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
import { RequestCard } from '../../components/poke/RequestCard';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { api } from '../../services/api';

export const HolderHomeScreen: React.FC = () => {
  const { user } = useAuthStore();
  const { setActiveTab, addToast, openChat } = useUIStore();

  const [pokes, setPokes] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [pokesRes, connsRes] = await Promise.all([
        api.get('/pokes').catch(() => ({ data: { data: [] } })),
        api.get('/connections').catch(() => ({ data: { data: [] } }))
      ]);

      if (pokesRes.data?.data) {
        setPokes(pokesRes.data.data.filter((p: any) => p.recipientId === user?.id));
      }
      if (connsRes.data?.data) {
        setConnections(connsRes.data.data.filter((c: any) => c.status === 'active'));
      }
    } catch (err) {
      console.error('Error fetching holder dashboard:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const pendingPokes = pokes.filter((p) => p.status === 'pending');
  const acceptedPokes = pokes.filter((p) => p.status === 'accepted');

  const handleAccept = async (pokeId: string, agreedRate: number, agreedBasis: string) => {
    try {
      const res = await api.put(`/pokes/${pokeId}/accept`, {
        agreedCommissionRate: agreedRate,
        agreedCommissionBasis: agreedBasis
      });
      if (res.data.success) {
        addToast('Poke accepted! Connection established.', 'success');
        await fetchData();
        if (res.data.data?.connection) {
          openChat(res.data.data.connection.id);
        }
      }
    } catch (err: any) {
      addToast('Failed to accept Poke.', 'error');
    }
  };

  const handleReject = async (pokeId: string, reason?: string) => {
    try {
      const res = await api.put(`/pokes/${pokeId}/reject`, { rejectionReason: reason });
      if (res.data.success) {
        addToast('Poke declined.', 'info');
        await fetchData();
      }
    } catch (err) {
      addToast('Failed to decline Poke.', 'error');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header Profile Summary */}
      <View style={styles.headerCard}>
        <View style={styles.profileRow}>
          <ProfileAvatar
            name={user?.fullName || 'Holder'}
            avatarUrl={user?.avatarUrl}
            size={52}
            isVerified={user?.isKycVerified}
          />
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.holderName}>{user?.fullName || 'Account Holder'}</Text>
              {user?.isKycVerified && (
                <View style={styles.vBadge}>
                  <Icon name="check" size={10} color={colors.surface} strokeWidth={3} />
                </View>
              )}
            </View>
            <Text style={styles.holderRole}>
              Demat Account Holder • {user?.isKycVerified ? 'Verified' : 'Pending Verification'}
            </Text>
          </View>
        </View>

        {/* Current Commission Rate Banner */}
        <TouchableOpacity
          style={styles.commBanner}
          activeOpacity={0.85}
          onPress={() => setActiveTab('commission')}
        >
          <View style={styles.commLeft}>
            <Icon name="percent" size={20} color={colors.primaryActionBlue} />
            <View style={styles.commTextContainer}>
              <Text style={styles.commTitle}>Current Default Commission</Text>
              <Text style={styles.commBasis} numberOfLines={1}>
                {user?.commissionBasis || 'Advisory Base Fee'}
              </Text>
            </View>
          </View>
          <View style={styles.commRight}>
            <Text style={styles.commRate}>
              {user?.defaultCommissionRate !== undefined
                ? `${user.defaultCommissionRate.toFixed(1)}%`
                : '5.0%'}
            </Text>
            <Text style={styles.commEdit}>Configure →</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Metrics Summary Grid */}
      <View style={styles.metricsGrid}>
        <TouchableOpacity
          style={styles.metricCard}
          activeOpacity={0.8}
          onPress={() => setActiveTab('pokes')}
        >
          <Text style={styles.metricValue}>{pokes.length}</Text>
          <Text style={styles.metricLabel}>Total Pokes Received</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.metricCard, pendingPokes.length > 0 && styles.metricCardAlert]}
          activeOpacity={0.8}
          onPress={() => setActiveTab('pokes')}
        >
          <Text style={[styles.metricValue, pendingPokes.length > 0 && styles.metricValueAlert]}>
            {pendingPokes.length}
          </Text>
          <Text style={styles.metricLabel}>Pending Review</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.metricCard}
          activeOpacity={0.8}
          onPress={() => setActiveTab('chats')}
        >
          <Text style={styles.metricValue}>{connections.length}</Text>
          <Text style={styles.metricLabel}>Active Connections</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.metricCard}
          activeOpacity={0.8}
          onPress={() => setActiveTab('commission')}
        >
          <Text style={styles.metricValue}>
            {user?.defaultCommissionRate !== undefined ? `${user.defaultCommissionRate}%` : '5%'}
          </Text>
          <Text style={styles.metricLabel}>Published Rate</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setActiveTab('commission')}
        >
          <Icon name="percent" size={18} color={colors.primaryActionBlue} />
          <Text style={styles.actionBtnText}>Commission Engine</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setActiveTab('discover')}
        >
          <Icon name="search" size={18} color={colors.primaryActionBlue} />
          <Text style={styles.actionBtnText}>Discover Investors</Text>
        </TouchableOpacity>
      </View>

      {/* Incoming Requests Feed Preview */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Incoming Poke Requests ({pendingPokes.length} Pending)
        </Text>
        <TouchableOpacity onPress={() => setActiveTab('pokes')}>
          <Text style={styles.sectionLink}>View Inbox</Text>
        </TouchableOpacity>
      </View>

      {pendingPokes.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Your Inbox is Clear</Text>
          <Text style={styles.emptyDesc}>
            When investors send you Poke requests for IPO assistance, they will appear here.
          </Text>
        </View>
      ) : (
        pendingPokes.slice(0, 3).map((poke) => (
          <RequestCard
            key={poke.id}
            poke={poke}
            currentUserId={user?.id || ''}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        ))
      )}
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
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.sm
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  profileInfo: {
    marginLeft: spacing.md,
    flex: 1
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  holderName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy
  },
  vBadge: {
    backgroundColor: colors.success,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6
  },
  holderRole: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    marginTop: 2
  },
  commBanner: {
    backgroundColor: colors.subtleBlueBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  commLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  commTextContainer: {
    marginLeft: spacing.sm,
    flex: 1
  },
  commTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy
  },
  commBasis: {
    fontSize: 10,
    color: colors.secondaryText,
    marginTop: 1
  },
  commRight: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm
  },
  commRate: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primaryActionBlue,
    fontVariant: ['tabular-nums']
  },
  commEdit: {
    fontSize: 10,
    color: colors.primaryActionBlue,
    fontWeight: typography.weights.semibold
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  metricCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm
  },
  metricCardAlert: {
    borderColor: colors.warning,
    backgroundColor: colors.badgePendingBg
  },
  metricValue: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    fontVariant: ['tabular-nums']
  },
  metricValueAlert: {
    color: colors.warning
  },
  metricLabel: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 2,
    fontWeight: typography.weights.medium
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm
  },
  actionBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    marginLeft: 6
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy
  },
  sectionLink: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primaryActionBlue
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
    color: colors.primaryNavy
  },
  emptyDesc: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18
  }
});
