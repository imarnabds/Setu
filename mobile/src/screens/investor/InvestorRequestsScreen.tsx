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
import { borderRadius, spacing } from '../../theme/spacing';
import { RequestCard } from '../../components/poke/RequestCard';
import { EmptyState } from '../../components/common/EmptyState';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

export const InvestorRequestsScreen: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast, openChat, setActiveTab } = useUIStore();

  const [pokes, setPokes] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'history'>('pending');
  const [refreshing, setRefreshing] = useState(false);

  const fetchPokes = async () => {
    try {
      const res = await api.get('/pokes');
      if (res.data?.data) {
        // Filter pokes where current user is sender
        setPokes(res.data.data.filter((p: any) => p.senderId === user?.id));
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    }
  };

  useEffect(() => {
    fetchPokes();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPokes();
    setRefreshing(false);
  };

  const handleCancel = async (pokeId: string) => {
    try {
      const res = await api.put(`/pokes/${pokeId}/cancel`);
      if (res.data.success) {
        addToast('Poke request cancelled.', 'info');
        await fetchPokes();
      }
    } catch (err) {
      addToast('Failed to cancel Poke.', 'error');
    }
  };

  const handleOpenChat = (poke: any) => {
    // If accepted, find connection or open chats tab
    setActiveTab('chats');
  };

  const pendingList = pokes.filter((p) => p.status === 'pending');
  const historyList = pokes.filter((p) => p.status !== 'pending');

  const displayedList = activeSubTab === 'pending' ? pendingList : historyList;

  return (
    <View style={styles.container}>
      {/* Sub Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeSubTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveSubTab('pending')}
        >
          <Text style={[styles.tabText, activeSubTab === 'pending' && styles.tabTextActive]}>
            Pending Pokes ({pendingList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeSubTab === 'history' && styles.tabActive]}
          onPress={() => setActiveSubTab('history')}
        >
          <Text style={[styles.tabText, activeSubTab === 'history' && styles.tabTextActive]}>
            History ({historyList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Requests Feed */}
      <ScrollView
        style={styles.feed}
        contentContainerStyle={styles.feedContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {displayedList.length === 0 ? (
          <EmptyState
            icon="poke"
            title={activeSubTab === 'pending' ? 'No Pending Requests' : 'No Request History'}
            description={
              activeSubTab === 'pending'
                ? 'You have no outstanding Poke requests. Explore Demat holders to request an introduction.'
                : 'Your previous accepted or closed requests will appear here.'
            }
            actionLabel="Discover Account Holders"
            onAction={() => setActiveTab('discover')}
          />
        ) : (
          displayedList.map((poke) => (
            <RequestCard
              key={poke.id}
              poke={poke}
              currentUserId={user?.id || ''}
              onCancel={handleCancel}
              onOpenChat={() => handleOpenChat(poke)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  tabActive: {
    borderBottomColor: colors.primaryActionBlue
  },
  tabText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.secondaryText
  },
  tabTextActive: {
    color: colors.primaryActionBlue,
    fontWeight: typography.weights.bold
  },
  feed: {
    flex: 1
  },
  feedContent: {
    padding: spacing.md,
    paddingBottom: 100
  }
});
