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
import { StatusBadge } from '../../components/common/StatusBadge';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { api } from '../../services/api';

export const InvestorHomeScreen: React.FC = () => {
  const { user } = useAuthStore();
  const { setActiveTab, openChat } = useUIStore();

  const [pendingPokes, setPendingPokes] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [pokesRes, connsRes] = await Promise.all([
        api.get('/pokes').catch(() => ({ data: { data: [] } })),
        api.get('/connections').catch(() => ({ data: { data: [] } }))
      ]);

      if (pokesRes.data?.data) {
        const pokes = pokesRes.data.data;
        setPendingPokes(pokes.filter((p: any) => p.status === 'pending' && p.senderId === user?.id));
      }

      if (connsRes.data?.data) {
        setConnections(connsRes.data.data.filter((c: any) => c.status === 'active'));
      }
    } catch (err) {
      console.error('Error fetching investor dashboard data:', err);
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Greeting Banner */}
      <View style={styles.greetingCard}>
        <View style={styles.greetingHeader}>
          <View>
            <Text style={styles.greetingTitle}>Hello, {user?.fullName || 'Investor'} 👋</Text>
            <Text style={styles.greetingSub}>Ready to explore upcoming IPO allocations?</Text>
          </View>
          <ProfileAvatar
            name={user?.fullName || 'Investor'}
            avatarUrl={user?.avatarUrl}
            size={48}
            isVerified={user?.isKycVerified}
          />
        </View>

        {/* Big Action Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setActiveTab('discover')}
          style={styles.findHoldersBtn}
        >
          <Icon name="search" size={20} color={colors.surface} />
          <Text style={styles.findHoldersText}>Find Demat Account Holders</Text>
          <Icon name="arrow-right" size={18} color={colors.surface} />
        </TouchableOpacity>
      </View>

      {/* How Poke Works Explainer */}
      <View style={styles.explainerCard}>
        <View style={styles.explainerHeader}>
          <Icon name="info" size={16} color={colors.primaryActionBlue} />
          <Text style={styles.explainerTitle}>How Poke Works</Text>
        </View>
        <Text style={styles.explainerBody}>
          Send a <Text style={styles.bold}>Poke</Text> to request an introduction. When the Demat Account Holder accepts, agreed service terms are locked and a private in-app chat opens instantly.
        </Text>
      </View>

      {/* Pending Requests Preview */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Pending Pokes ({pendingPokes.length})</Text>
        <TouchableOpacity onPress={() => setActiveTab('requests')}>
          <Text style={styles.sectionLink}>View All</Text>
        </TouchableOpacity>
      </View>

      {pendingPokes.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No pending Pokes right now.</Text>
          <TouchableOpacity onPress={() => setActiveTab('discover')}>
            <Text style={styles.emptyAction}>Explore Account Holders</Text>
          </TouchableOpacity>
        </View>
      ) : (
        pendingPokes.slice(0, 2).map((poke) => {
          const recipient = poke.recipient;
          return (
            <View key={poke.id} style={styles.previewCard}>
              <ProfileAvatar
                name={recipient?.fullName || 'Holder'}
                avatarUrl={recipient?.avatarUrl}
                size={40}
                isVerified={recipient?.isKycVerified}
              />
              <View style={styles.previewInfo}>
                <Text style={styles.previewName}>{recipient?.fullName || 'Holder'}</Text>
                <Text style={styles.previewSub}>
                  {poke.proposedCommissionRate !== undefined
                    ? `${poke.proposedCommissionRate.toFixed(1)}% Commission Proposed`
                    : 'Standard Terms'}
                </Text>
              </View>
              <StatusBadge status="pending" />
            </View>
          );
        })
      )}

      {/* Active Connections */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Active Connections ({connections.length})</Text>
        <TouchableOpacity onPress={() => setActiveTab('chats')}>
          <Text style={styles.sectionLink}>Open Chats</Text>
        </TouchableOpacity>
      </View>

      {connections.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>You haven't connected with any Demat holders yet.</Text>
        </View>
      ) : (
        connections.slice(0, 3).map((conn) => {
          const partner = conn.partner;
          return (
            <TouchableOpacity
              key={conn.id}
              activeOpacity={0.8}
              onPress={() => openChat(conn.id)}
              style={styles.connectionCard}
            >
              <ProfileAvatar
                name={partner?.fullName || 'Partner'}
                avatarUrl={partner?.avatarUrl}
                size={44}
                isVerified={partner?.isKycVerified}
              />
              <View style={styles.connInfo}>
                <Text style={styles.connName}>{partner?.fullName || 'Partner'}</Text>
                <Text style={styles.connTerms}>
                  Agreed Terms: {conn.agreedCommissionRate?.toFixed(1)}% Advisory Base
                </Text>
              </View>
              <View style={styles.chatActionBtn}>
                <Icon name="message" size={16} color={colors.primaryActionBlue} />
                <Text style={styles.chatActionText}>Chat</Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {/* Responsible Usage Notice */}
      <View style={styles.complianceNotice}>
        <View style={styles.noticeIconRow}>
          <Icon name="shield" size={16} color={colors.primaryNavy} />
          <Text style={styles.noticeTitle}>Responsible Platform Usage</Text>
        </View>
        <Text style={styles.noticeBody}>
          IPO CONNECT connects investors with experienced Demat holders for lawful guidance and application strategies. Never share trading passwords, bank OTPs, or UPI PINs. Always execute bids through authorized exchange channels.
        </Text>
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
    padding: spacing.md,
    paddingBottom: spacing.huge
  },
  greetingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.sm
  },
  greetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  greetingTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy
  },
  greetingSub: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    marginTop: 2
  },
  findHoldersBtn: {
    backgroundColor: colors.primaryActionBlue,
    borderRadius: borderRadius.md,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg
  },
  findHoldersText: {
    color: colors.surface,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold
  },
  explainerCard: {
    backgroundColor: colors.subtleBlueBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg
  },
  explainerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  explainerTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    marginLeft: 6
  },
  explainerBody: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    lineHeight: 18
  },
  bold: {
    color: colors.primaryActionBlue,
    fontWeight: typography.weights.bold
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.xs
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
  emptyBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md
  },
  emptyText: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText
  },
  emptyAction: {
    fontSize: typography.sizes.xs,
    color: colors.primaryActionBlue,
    fontWeight: typography.weights.semibold,
    marginTop: 6
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm
  },
  previewInfo: {
    marginLeft: spacing.sm,
    flex: 1
  },
  previewName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy
  },
  previewSub: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 2
  },
  connectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    ...shadows.sm
  },
  connInfo: {
    marginLeft: spacing.sm,
    flex: 1
  },
  connName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy
  },
  connTerms: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 2
  },
  chatActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.subtleBlueBackground
  },
  chatActionText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primaryActionBlue,
    marginLeft: 4
  },
  complianceNotice: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md
  },
  noticeIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  noticeTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    marginLeft: 6
  },
  noticeBody: {
    fontSize: 11,
    color: colors.secondaryText,
    lineHeight: 16
  }
});
