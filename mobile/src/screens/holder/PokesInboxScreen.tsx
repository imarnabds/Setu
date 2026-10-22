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

export const PokesInboxScreen: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast, openChat } = useUIStore();

  const [pokes, setPokes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [refreshing, setRefreshing] = useState(false);

  const fetchPokes = async () => {
    try {
      const res = await api.get('/pokes');
      if (res.data?.data) {
        // Filter incoming pokes
        setPokes(res.data.data.filter((p: any) => p.recipientId === user?.id));
      }
    } catch (err) {
      console.error('Failed to fetch pokes inbox:', err);
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

  const handleAccept = async (pokeId: string, agreedRate: number, agreedBasis: string) => {
    try {
      const res = await api.put(`/pokes/${pokeId}/accept`, {
        agreedCommissionRate: agreedRate,
        agreedCommissionBasis: agreedBasis
      });
      if (res.data.success) {
        addToast('Poke accepted! Connection established.', 'success');
        await fetchPokes();
        if (res.data.data?.connection) {
          openChat(res.data.data.connection.id);
        }
      }
    } catch (err) {
      addToast('Failed to accept Poke.', 'error');
    }
  };

  const handleReject = async (pokeId: string, reason?: string) => {
    try {
      const res = await api.put(`/pokes/${pokeId}/reject`, {
        rejectionReason: reason
      });
      if (res.data.success) {
        addToast('Poke request declined.', 'info');
        await fetchPokes();
      }
    } catch (err) {
      addToast('Failed to decline Poke.', 'error');
    }
  };

  const pendingList = pokes.filter((p) => p.status === 'pending');
  const historyList = pokes.filter((p) => p.status !== 'pending');
  const displayedList = activeTab === 'pending' ? pendingList : historyList;

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pending Review ({pendingList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            History ({historyList.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.feed}
        contentContainerStyle={styles.feedContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {displayedList.length === 0 ? (
          <EmptyState
            icon="poke"
            title={activeTab === 'pending' ? 'No Pending Pokes' : 'No Closed Requests'}
            description={
              activeTab === 'pending'
                ? 'You have reviewed all incoming investor Poke requests.'
                : 'Your accepted or closed Poke requests will be archived here.'
            }
          />
        ) : (
          displayedList.map((poke) => (
            <RequestCard
              key={poke.id}
              poke={poke}
              currentUserId={user?.id || ''}
              onAccept={handleAccept}
              onReject={handleReject}
              onOpenChat={() => {
                // If accepted, find connection and open
                // UIStore opens chat via connections or chats tab
              }}
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
    borderBottomColor: colors.border
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
    paddingBottom: spacing.huge
  }
});
