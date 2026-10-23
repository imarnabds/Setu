import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
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
import { useIpoStore, IPO } from '../../store/ipoStore';

export const ConnectionsListScreen: React.FC = () => {
  const { user } = useAuthStore();
  const { openChat, setActiveTab } = useUIStore();
  const { selectedIpo, ipos, setSelectedIpo } = useIpoStore();

  const [connections, setConnections] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConnections = async () => {
    // Platform rule: Connections can ONLY be fetched if the user has selected an IPO
    if (!selectedIpo) {
      setConnections([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get('/connections', {
        params: { ipoId: selectedIpo.id }
      });
      if (res.data?.data) {
        setConnections(res.data.data);
      } else {
        setConnections([]);
      }
    } catch (err) {
      console.error('Failed to fetch connections:', err);
      setConnections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [user, selectedIpo?.id]);

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
        {/* State 1: No IPO Selected -> Enforce Selection */}
        {!selectedIpo ? (
          <View style={styles.selectionRequiredCard}>
            <View style={styles.reqIconWrap}>
              <Icon name="filter" size={24} color={colors.primaryBlue} />
            </View>
            <Text style={styles.reqTitle}>Select an IPO to Fetch Connections</Text>
            <Text style={styles.reqDescription}>
              In accordance with platform guidelines, chat rooms and connections are strictly isolated per IPO.
              Please choose an active IPO offering from the dropdown menu above to access its dedicated panel.
            </Text>

            {/* Quick-Select Chips */}
            <View style={styles.quickChipsSection}>
              <Text style={styles.quickChipsLabel}>Quick Select Active Offerings:</Text>
              <View style={styles.chipsRow}>
                {ipos.slice(0, 3).map((ipo) => (
                  <TouchableOpacity
                    key={ipo.id}
                    style={styles.quickChip}
                    onPress={() => setSelectedIpo(ipo)}
                    activeOpacity={0.8}
                  >
                    <Icon name="trending-up" size={12} color={colors.primaryBlue} />
                    <Text style={styles.quickChipText}>{ipo.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <>
            {/* State 2: IPO Selected -> Show Dedicated Header & Stats */}
            <View style={styles.ipoPanelBanner}>
              <View style={styles.panelBannerTop}>
                <View style={styles.bannerBadge}>
                  <Icon name="trending-up" size={12} color={colors.primaryBlue} />
                  <Text style={styles.bannerBadgeText}>DEDICATED PANEL</Text>
                </View>
                <View style={[styles.bannerStatusPill, { backgroundColor: selectedIpo.status === 'Open' ? colors.successLight : colors.surfaceHighlight }]}>
                  <Text style={[styles.bannerStatusText, { color: selectedIpo.status === 'Open' ? colors.success : colors.primaryBlue }]}>
                    STATUS: {selectedIpo.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.panelIpoTitle}>{selectedIpo.name}</Text>
              <Text style={styles.panelIpoSubtitle}>
                Displaying connections & private chat threads strictly established for {selectedIpo.name}.
              </Text>
            </View>

            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color={colors.primaryBlue} />
                <Text style={styles.loadingText}>Fetching connections for {selectedIpo.name}...</Text>
              </View>
            ) : filteredConnections.length === 0 ? (
              <EmptyState
                icon="message"
                title={`No Active Connections for ${selectedIpo.name}`}
                description={`You do not have any established connections for ${selectedIpo.name} yet. Send a Poke request to a verified Demat holder to establish an assistance partnership.`}
                actionLabel={`Discover Demat Holders for ${selectedIpo.name}`}
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

                      {/* IPO Badge + Agreed Commission Tag */}
                      <View style={styles.tagsRow}>
                        <View style={styles.ipoTag}>
                          <Text style={styles.ipoTagText}>{conn.ipoName || selectedIpo.name}</Text>
                        </View>
                        <View style={styles.termsTag}>
                          <Text style={styles.termsTagText}>
                            Agreed: {conn.agreedCommissionRate?.toFixed(1)}%
                          </Text>
                        </View>
                      </View>

                      {/* Last message preview */}
                      <Text numberOfLines={1} style={styles.lastMsgText}>
                        {lastMsg ? lastMsg.content : 'Connection established. Tap to open chat.'}
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
          </>
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
    borderBottomColor: colors.borderLight
  },
  feed: {
    flex: 1
  },
  feedContent: {
    padding: spacing.md,
    paddingBottom: 100
  },
  selectionRequiredCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    alignItems: 'center',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm
  },
  reqIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md
  },
  reqTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
    textAlign: 'center',
    marginBottom: spacing.xs
  },
  reqDescription: {
    fontSize: typography.sizes.sm,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg
  },
  quickChipsSection: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
    alignItems: 'center'
  },
  quickChipsLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: '#D4E4FC',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    gap: 4
  },
  quickChipText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue
  },
  ipoPanelBanner: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#CFE0FD'
  },
  panelBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 4
  },
  bannerBadgeText: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue,
    letterSpacing: 0.5
  },
  bannerStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm
  },
  bannerStatusText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.3
  },
  panelIpoTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  panelIpoSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    marginTop: 2
  },
  loadingWrap: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm
  },
  loadingText: {
    fontSize: typography.sizes.sm,
    color: colors.secondaryText
  },
  conversationCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
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
    color: colors.primaryNavy,
    letterSpacing: -0.2
  },
  timeText: {
    fontSize: 11,
    color: colors.secondaryText,
    fontVariant: ['tabular-nums']
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4
  },
  ipoTag: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  ipoTagText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  termsTag: {
    backgroundColor: colors.subtleBlueBackground,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D4E4FC'
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
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: spacing.xs
  },
  unreadText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: typography.weights.bold
  }
});
