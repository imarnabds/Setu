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
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
import { SearchBar } from '../../components/common/SearchBar';
import { EmptyState } from '../../components/common/EmptyState';
import { Icon } from '../../components/common/Icon';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

export const ConnectionsListScreen: React.FC = () => {
  const { user } = useAuthStore();
  const { openChat, setActiveTab } = useUIStore();

  const [connections, setConnections] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConnections = async () => {
    try {
      const res = await api.get('/connections');
      if (res.data?.data) {
        setConnections(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConnections();
    setRefreshing(false);
  };

  const filteredConnections = connections.filter((c) => {
    if (!searchQuery) return true;
    const name = c.partner?.fullName?.toLowerCase() || '';
    return name.includes(searchQuery.toLowerCase());
  });

  return (
    <View style={styles.container}>
      {/* Top Search */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search conversations..."
        />
      </View>

      <ScrollView
        style={styles.feed}
        contentContainerStyle={styles.feedContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredConnections.length === 0 ? (
          <EmptyState
            icon="message"
            title="No Active Conversations"
            description="When you or another user accepts a Poke, private in-app conversations will appear here."
            actionLabel="Discover Network"
            onAction={() => setActiveTab('discover')}
          />
        ) : (
          filteredConnections.map((conn) => {
            const partner = conn.partner;
            const lastMsg = conn.lastMessage;
            const formattedTime = lastMsg
              ? new Date(lastMsg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : '';

            return (
              <TouchableOpacity
                key={conn.id}
                activeOpacity={0.8}
                onPress={() => openChat(conn.id)}
                style={styles.conversationCard}
              >
                <ProfileAvatar
                  name={partner?.fullName || 'User'}
                  avatarUrl={partner?.avatarUrl}
                  size={52}
                  isVerified={partner?.isKycVerified}
                />

                <View style={styles.cardInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.partnerName}>{partner?.fullName || 'User'}</Text>
                    {formattedTime ? (
                      <Text style={styles.timeText}>{formattedTime}</Text>
                    ) : null}
                  </View>

                  {/* Agreed Commission Tag */}
                  <View style={styles.termsTag}>
                    <Text style={styles.termsTagText}>
                      Agreed Terms: {conn.agreedCommissionRate?.toFixed(1)}% Advisory Base
                    </Text>
                  </View>

                  {/* Last message preview */}
                  <Text numberOfLines={1} style={styles.lastMsgText}>
                    {lastMsg ? lastMsg.content : 'Connection active. Tap to start chatting.'}
                  </Text>
                </View>

                {conn.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{conn.unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
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
  searchSection: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  feed: {
    flex: 1
  },
  feedContent: {
    padding: spacing.md,
    paddingBottom: spacing.huge
  },
  conversationCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm
  },
  cardInfo: {
    marginLeft: spacing.md,
    flex: 1
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  partnerName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy
  },
  timeText: {
    fontSize: 10,
    color: colors.secondaryText
  },
  termsTag: {
    backgroundColor: colors.subtleBlueBackground,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginVertical: 4
  },
  termsTagText: {
    fontSize: 10,
    color: colors.primaryActionBlue,
    fontWeight: typography.weights.semibold
  },
  lastMsgText: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    lineHeight: 16
  },
  unreadBadge: {
    backgroundColor: colors.primaryActionBlue,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs
  },
  unreadText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: typography.weights.bold
  }
});
