import React, { useState, useEffect } from 'react';
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
import { SearchBar } from '../../components/common/SearchBar';
import { ProfileCard } from '../../components/profile/ProfileCard';
import { LoadingSkeleton } from '../../components/common/EmptyState';
import { EmptyState } from '../../components/common/EmptyState';
import { HolderDetailsModal } from './HolderDetailsModal';
import { Icon } from '../../components/common/Icon';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { PokeButtonState } from '../../components/poke/PokeButton';

export const DiscoverHoldersScreen: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast, openChat } = useUIStore();

  const [holders, setHolders] = useState<any[]>([]);
  const [pokes, setPokes] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'commission_low' | 'commission_high'>('relevance');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedHolder, setSelectedHolder] = useState<any | null>(null);

  const fetchHoldersAndPokes = async () => {
    try {
      const [holdersRes, pokesRes, connsRes] = await Promise.all([
        api.get('/users/holders', {
          params: {
            q: searchQuery || undefined,
            verifiedOnly: selectedFilter === 'verified' ? 'true' : undefined,
            category: ['mainboard', 'sme'].includes(selectedFilter) ? selectedFilter : undefined,
            maxCommission: selectedFilter === 'low_comm' ? '5.0' : undefined,
            sortBy
          }
        }),
        api.get('/pokes').catch(() => ({ data: { data: [] } })),
        api.get('/connections').catch(() => ({ data: { data: [] } }))
      ]);

      if (holdersRes.data?.data) {
        setHolders(holdersRes.data.data);
      }
      if (pokesRes.data?.data) {
        setPokes(pokesRes.data.data);
      }
      if (connsRes.data?.data) {
        setConnections(connsRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching holders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHoldersAndPokes();
  }, [searchQuery, selectedFilter, sortBy]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHoldersAndPokes();
    setRefreshing(false);
  };

  // Determine user's poke state with a specific holder
  const getPokeStateForHolder = (holderId: string): PokeButtonState => {
    // Check if connected
    const conn = connections.find(
      (c) =>
        (c.userAId === holderId || c.userBId === holderId) &&
        (c.userAId === user?.id || c.userBId === user?.id) &&
        c.status === 'active'
    );
    if (conn) return 'accepted';

    // Check if poke exists
    const poke = pokes.find(
      (p) =>
        ((p.senderId === user?.id && p.recipientId === holderId) ||
          (p.senderId === holderId && p.recipientId === user?.id)) &&
        ['pending', 'accepted', 'rejected', 'blocked'].includes(p.status)
    );

    if (!poke) return 'not_connected';
    return poke.status as PokeButtonState;
  };

  const getPokeForHolder = (holderId: string) => {
    return pokes.find(
      (p) =>
        p.senderId === user?.id &&
        p.recipientId === holderId &&
        p.status === 'pending'
    );
  };

  const handleSendPoke = async (holder: any) => {
    try {
      const res = await api.post('/pokes', {
        recipientId: holder.id,
        proposedCommissionRate: holder.defaultCommissionRate,
        commissionBasis: holder.commissionBasis,
        message: `Hello ${holder.fullName}, I would like to connect and discuss IPO assistance.`
      });

      if (res.data.success) {
        addToast(`Poke sent to ${holder.fullName}! Awaiting acceptance.`, 'success');
        await fetchHoldersAndPokes();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to send Poke';
      addToast(msg, 'error');
    }
  };

  const handleCancelPoke = async (holderId: string) => {
    const poke = getPokeForHolder(holderId);
    if (!poke) return;

    try {
      const res = await api.put(`/pokes/${poke.id}/cancel`);
      if (res.data.success) {
        addToast('Poke request withdrawn.', 'info');
        await fetchHoldersAndPokes();
      }
    } catch (err: any) {
      addToast('Failed to cancel Poke.', 'error');
    }
  };

  const handleOpenChatForHolder = (holderId: string) => {
    const conn = connections.find(
      (c) =>
        (c.userAId === holderId || c.userBId === holderId) &&
        (c.userAId === user?.id || c.userBId === user?.id)
    );
    if (conn) {
      openChat(conn.id);
    }
  };

  const filters = [
    { key: 'all', label: 'All Holders' },
    { key: 'verified', label: 'Verified Only' },
    { key: 'mainboard', label: 'Mainboard IPO' },
    { key: 'sme', label: 'SME IPO' },
    { key: 'low_comm', label: 'Commission ≤ 5%' }
  ];

  return (
    <View style={styles.container}>
      {/* Top Search & Filter Bar */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search holders by name, region, or skills..."
        />

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {filters.map((filter) => {
            const isSelected = selectedFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                activeOpacity={0.7}
                onPress={() => setSelectedFilter(filter.key)}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextActive
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Sorting Row */}
        <View style={styles.sortRow}>
          <Text style={styles.resultCount}>
            {holders.length} Demat {holders.length === 1 ? 'Holder' : 'Holders'} Available
          </Text>
          <View style={styles.sortButtons}>
            <TouchableOpacity
              onPress={() => setSortBy('relevance')}
              style={[styles.sortBtn, sortBy === 'relevance' && styles.sortBtnActive]}
            >
              <Text style={[styles.sortBtnText, sortBy === 'relevance' && styles.sortBtnTextActive]}>
                Relevance
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSortBy('commission_low')}
              style={[styles.sortBtn, sortBy === 'commission_low' && styles.sortBtnActive]}
            >
              <Text style={[styles.sortBtnText, sortBy === 'commission_low' && styles.sortBtnTextActive]}>
                Lowest Fee
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Holder Cards Feed */}
      <ScrollView
        style={styles.cardFeed}
        contentContainerStyle={styles.cardFeedContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <>
            <LoadingSkeleton />
            <LoadingSkeleton />
            <LoadingSkeleton />
          </>
        ) : holders.length === 0 ? (
          <EmptyState
            icon="search"
            title="No Matching Demat Holders"
            description="Try adjusting your search criteria or removing filters to view more profiles."
            actionLabel="Reset Filters"
            onAction={() => {
              setSearchQuery('');
              setSelectedFilter('all');
            }}
          />
        ) : (
          holders.map((holder) => {
            const pokeState = getPokeStateForHolder(holder.id);
            return (
              <ProfileCard
                key={holder.id}
                user={holder}
                pokeState={pokeState}
                onSendPoke={() => handleSendPoke(holder)}
                onCancelPoke={() => handleCancelPoke(holder.id)}
                onOpenChat={() => handleOpenChatForHolder(holder.id)}
                onViewDetails={() => setSelectedHolder(holder)}
              />
            );
          })
        )}
      </ScrollView>

      {/* Details BottomSheet Modal */}
      {selectedHolder && (
        <HolderDetailsModal
          user={selectedHolder}
          visible={!!selectedHolder}
          pokeState={getPokeStateForHolder(selectedHolder.id)}
          onClose={() => setSelectedHolder(null)}
          onSendPoke={() => handleSendPoke(selectedHolder)}
          onCancelPoke={() => handleCancelPoke(selectedHolder.id)}
          onOpenChat={() => {
            setSelectedHolder(null);
            handleOpenChatForHolder(selectedHolder.id);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  searchSection: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  filterScroll: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingBottom: spacing.sm,
    marginTop: spacing.xs
  },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: borderRadius.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  filterChipActive: {
    backgroundColor: colors.primaryActionBlue,
    borderColor: colors.primaryActionBlue
  },
  filterChipText: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    fontWeight: typography.weights.medium
  },
  filterChipTextActive: {
    color: colors.surface,
    fontWeight: typography.weights.bold
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight
  },
  resultCount: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    fontWeight: typography.weights.medium
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 6
  },
  sortBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14
  },
  sortBtnActive: {
    backgroundColor: colors.subtleBlueBackground
  },
  sortBtnText: {
    fontSize: 11,
    color: colors.secondaryText,
    fontWeight: typography.weights.medium
  },
  sortBtnTextActive: {
    color: colors.primaryActionBlue,
    fontWeight: typography.weights.bold
  },
  cardFeed: {
    flex: 1
  },
  cardFeedContent: {
    padding: spacing.md,
    paddingBottom: 100
  }
});
