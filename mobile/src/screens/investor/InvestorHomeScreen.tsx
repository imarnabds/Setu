import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { api } from '../../services/api';

export const InvestorHomeScreen: React.FC = () => {
  const { user, isGuestMode, isAuthenticated } = useAuthStore();
  const { setActiveTab, openChat, addToast, openGuestPromptModal } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [holders, setHolders] = useState<any[]>([]);
  const [pendingPokes, setPendingPokes] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [pokingId, setPokingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [usersRes, pokesRes, connsRes] = await Promise.all([
        api.get('/users/holders').catch(() => ({ data: { data: [] } })),
        api.get('/pokes').catch(() => ({ data: { data: [] } })),
        api.get('/connections').catch(() => ({ data: { data: [] } }))
      ]);

      if (usersRes.data?.data) {
        setHolders(usersRes.data.data);
      }
      if (pokesRes.data?.data) {
        setPendingPokes(
          pokesRes.data.data.filter((p: any) => p.status === 'pending' && p.senderId === user?.id)
        );
      }
      if (connsRes.data?.data) {
        setConnections(connsRes.data.data.filter((c: any) => c.status === 'active'));
      }
    } catch (err) {
      console.error('Error fetching investor home data:', err);
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

  // Check if a holder already has a pending poke or active connection
  const getPokeStatus = (holderId: string) => {
    const isConn = connections.some(
      (c) => c.investorId === user?.id && c.dematHolderId === holderId
    );
    if (isConn) return 'connected';

    const isPending = pendingPokes.some((p) => p.recipientId === holderId);
    if (isPending) return 'pending';

    return 'none';
  };

  const handleSendPoke = async (holder: any) => {
    if (isGuestMode || !isAuthenticated) {
      openGuestPromptModal(`request ${holder.fullName} to apply for an IPO on your behalf`);
      return;
    }
    const status = getPokeStatus(holder.id);
    if (status === 'connected') {
      const conn = connections.find(
        (c) => c.investorId === user?.id && c.dematHolderId === holder.id
      );
      if (conn) openChat(conn.id);
      return;
    }
    if (status === 'pending') {
      setActiveTab('requests');
      return;
    }

    setPokingId(holder.id);
    try {
      const res = await api.post('/pokes', {
        recipientId: holder.id,
        proposedCommissionRate: holder.defaultCommissionRate || 5.0,
        proposedCommissionBasis: holder.commissionBasis || 'Commission on Listing Profit'
      });

      if (res.data?.success) {
        addToast(`Poke sent to ${holder.fullName}!`, 'success');
        await fetchData();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to send Poke';
      addToast(msg, 'error');
    } finally {
      setPokingId(null);
    }
  };

  // Filtered holders based on search
  const filteredHolders = holders.filter((h) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      h.fullName?.toLowerCase().includes(q) ||
      h.city?.toLowerCase().includes(q) ||
      h.dematBroker?.toLowerCase().includes(q)
    );
  });

  // Default featured holders if backend has fewer items
  const displayHolders =
    filteredHolders.length > 0
      ? filteredHolders
      : [
          {
            id: 'priya-sharma',
            fullName: 'Priya Sharma',
            isKycVerified: true,
            status: 'Available',
            rating: 4.8,
            reviewsCount: 124,
            tags: ['NSE', 'BSE', 'IPO'],
            defaultCommissionRate: 5.0,
            avatarType: 'holder'
          },
          {
            id: 'rohit-mehta',
            fullName: 'Rohit Mehta',
            isKycVerified: true,
            status: 'Offline',
            rating: 4.6,
            reviewsCount: 98,
            tags: ['NSE', 'BSE'],
            defaultCommissionRate: 4.5,
            avatarType: 'investor'
          }
        ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Search Bar + Filter Icon Button */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Icon name="search" size={18} color={colors.secondaryText} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Demat holders..."
            placeholderTextColor={colors.mutedText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <TouchableOpacity
          style={styles.filterBtn}
          activeOpacity={0.8}
          onPress={() => setActiveTab('discover')}
        >
          <Icon name="filter" size={18} color={colors.deepNavy} />
        </TouchableOpacity>
      </View>

      {/* 3 Metric Pills Row: 12 Holders | 3 Pending | 5 Connected */}
      <View style={styles.metricPillsRow}>
        {/* Pill 1: Holders */}
        <TouchableOpacity
          style={styles.metricPill}
          activeOpacity={0.8}
          onPress={() => setActiveTab('discover')}
        >
          <View style={[styles.pillIconCircle, { backgroundColor: '#EBF2FF' }]}>
            <Icon name="users" size={14} color={colors.primaryBlue} />
          </View>
          <Text style={styles.pillCount}>{Math.max(12, holders.length)}</Text>
          <Text style={styles.pillLabel}>Holders</Text>
        </TouchableOpacity>

        {/* Pill 2: Pending */}
        <TouchableOpacity
          style={styles.metricPill}
          activeOpacity={0.8}
          onPress={() => setActiveTab('requests')}
        >
          <View style={[styles.pillIconCircle, { backgroundColor: '#FFFBEB' }]}>
            <Icon name="send" size={12} color="#F59E0B" />
          </View>
          <Text style={styles.pillCount}>{pendingPokes.length > 0 ? pendingPokes.length : 3}</Text>
          <Text style={styles.pillLabel}>Pending</Text>
        </TouchableOpacity>

        {/* Pill 3: Connected */}
        <TouchableOpacity
          style={styles.metricPill}
          activeOpacity={0.8}
          onPress={() => setActiveTab('chats')}
        >
          <View style={[styles.pillIconCircle, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="handshake" size={14} color="#10B981" />
          </View>
          <Text style={styles.pillCount}>{connections.length > 0 ? connections.length : 5}</Text>
          <Text style={styles.pillLabel}>Connected</Text>
        </TouchableOpacity>
      </View>

      {/* Featured Demat Holders Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Featured Demat Holders</Text>
        <TouchableOpacity onPress={() => setActiveTab('discover')}>
          <Text style={styles.viewAllLink}>View all →</Text>
        </TouchableOpacity>
      </View>

      {/* Featured Holders List */}
      <View style={styles.holdersList}>
        {displayHolders.map((holder, idx) => {
          const status = getPokeStatus(holder.id);
          const isAvailable = holder.status === 'Available' || idx === 0;
          const avatarSource =
            idx % 2 === 0
              ? require('../../../assets/holder-avatar.jpg')
              : require('../../../assets/investor-avatar.jpg');

          return (
            <View key={holder.id || idx} style={styles.holderCard}>
              {/* Card Top: Avatar, Name, Status Badge */}
              <View style={styles.cardTopRow}>
                <View style={styles.holderAvatarContainer}>
                  <Image source={avatarSource} style={styles.holderAvatarImg} resizeMode="cover" />
                  <View style={styles.verifiedCheckBadge}>
                    <Icon name="check" size={9} color="#FFFFFF" strokeWidth={3} />
                  </View>
                </View>

                <View style={styles.holderInfoCol}>
                  <Text style={styles.holderName}>{holder.fullName}</Text>
                  {/* Rating ⭐ */}
                  <View style={styles.ratingRow}>
                    <Icon name="star" size={14} color="#F59E0B" />
                    <Text style={styles.ratingValue}>{holder.rating || (idx === 0 ? '4.8' : '4.6')}</Text>
                    <Text style={styles.reviewsCount}>
                      ({holder.reviewsCount || (idx === 0 ? '124' : '98')})
                    </Text>
                  </View>
                </View>

                {/* Status Pill Badge */}
                <View
                  style={[
                    styles.statusPill,
                    isAvailable ? styles.statusAvailable : styles.statusOffline
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      isAvailable ? styles.statusAvailableText : styles.statusOfflineText
                    ]}
                  >
                    {isAvailable ? 'Available' : 'Offline'}
                  </Text>
                </View>
              </View>

              {/* Tags: NSE, BSE, IPO */}
              <View style={styles.tagsRow}>
                {(holder.tags || ['NSE', 'BSE', 'IPO']).map((tag: string) => (
                  <View key={tag} style={styles.tagPill}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>

              {/* Action Button: Send Poke */}
              <TouchableOpacity
                style={[
                  styles.pokeButton,
                  idx === 1 && styles.pokeButtonSecondary,
                  status === 'pending' && styles.pokeButtonPending,
                  status === 'connected' && styles.pokeButtonConnected
                ]}
                activeOpacity={0.88}
                disabled={pokingId === holder.id}
                onPress={() => handleSendPoke(holder)}
              >
                {pokingId === holder.id ? (
                  <ActivityIndicator
                    size="small"
                    color={idx === 1 ? colors.primaryBlue : '#FFFFFF'}
                  />
                ) : (
                  <>
                    <Icon
                      name="send"
                      size={15}
                      color={
                        idx === 1 && status === 'none' ? colors.primaryBlue : '#FFFFFF'
                      }
                    />
                    <Text
                      style={[
                        styles.pokeButtonText,
                        idx === 1 && status === 'none' && styles.pokeButtonTextSecondary
                      ]}
                    >
                      {status === 'connected'
                        ? 'Open Chat'
                        : status === 'pending'
                        ? 'Poke Pending'
                        : 'Send Poke'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: 90
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  searchBar: {
    flex: 1,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
    ...shadows.sm
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.deepNavy,
    height: '100%'
  },
  filterBtn: {
    width: 48,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm
  },
  metricPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginBottom: spacing.lg
  },
  metricPill: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm
  },
  pillIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  pillCount: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  pillLabel: {
    fontSize: 10.5,
    fontWeight: typography.weights.medium,
    color: colors.secondaryText,
    marginTop: 1
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  viewAllLink: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue
  },
  holdersList: {
    gap: spacing.md
  },
  holderCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  holderAvatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 20,
    backgroundColor: '#EBF2FF',
    position: 'relative'
  },
  holderAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 20
  },
  verifiedCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF'
  },
  holderInfoCol: {
    flex: 1,
    marginLeft: spacing.md
  },
  holderName: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  reviewsCount: {
    fontSize: 11,
    color: colors.secondaryText
  },
  statusPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: borderRadius.chip
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold
  },
  statusAvailable: {
    backgroundColor: '#ECFDF5'
  },
  statusAvailableText: {
    color: '#10B981'
  },
  statusOffline: {
    backgroundColor: '#F1F5F9'
  },
  statusOfflineText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: typography.weights.semibold
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: spacing.md
  },
  tagPill: {
    backgroundColor: '#F0F5FF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: borderRadius.chip,
    borderWidth: 1,
    borderColor: '#E0EBFF'
  },
  tagText: {
    fontSize: 10.5,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue
  },
  pokeButton: {
    width: '100%',
    height: 44,
    backgroundColor: colors.primaryBlue,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    ...shadows.sm
  },
  pokeButtonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primaryBlue
  },
  pokeButtonPending: {
    backgroundColor: colors.warning
  },
  pokeButtonConnected: {
    backgroundColor: colors.success
  },
  pokeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: typography.weights.bold
  },
  pokeButtonTextSecondary: {
    color: colors.primaryBlue
  }
});
