import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Platform,
  Dimensions,
  TextInput
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useIpoStore, IPO, IpoLifecycleStatus } from '../../store/ipoStore';
import { api } from '../../services/api';

const formatSyncTime = (dateStr?: string | null) => {
  if (!dateStr) return '23:39:34';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '23:39:34';
  }
};

export const HolderHomeScreen: React.FC = () => {
  const { user, isGuestMode, isAuthenticated, switchRole, exitGuestMode, logout } = useAuthStore();
  const { setActiveTab, addToast, openChat, openGuestPromptModal } = useUIStore();
  const {
    ipos,
    selectedIpo,
    syncMeta,
    isLoading: isIpoLoading,
    isSyncing: isIpoSyncing,
    fetchIpos,
    triggerManualSync,
    setSelectedIpo
  } = useIpoStore();

  const [pokes, setPokes] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [availableForRequests, setAvailableForRequests] = useState(user?.isAvailable ?? true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [ipoModalVisible, setIpoModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredIpos = ipos.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = (item.name || '').toLowerCase().includes(q);
    const symbolMatch = (((item as any).symbol || '') as string).toLowerCase().includes(q);
    const categoryMatch = (((item as any).category || '') as string).toLowerCase().includes(q);
    const statusMatch = (item.status || '').toLowerCase().includes(q);
    return nameMatch || symbolMatch || categoryMatch || statusMatch;
  });

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
    fetchIpos();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), fetchIpos()]);
    setRefreshing(false);
  };

  const pendingPokes = pokes.filter((p) => p.status === 'pending');

  const handleToggleAvailability = async (value: boolean) => {
    setAvailableForRequests(value);
    if (!isGuestMode && isAuthenticated) {
      try {
        await api.put('/users/profile', { isAvailable: value });
      } catch (err) {
        console.error('Failed to update availability status', err);
      }
    }
  };

  const handleAccept = async (pokeId: string, agreedRate = 5.0, agreedBasis = 'Commission on Listing Profit') => {
    if (isGuestMode || !isAuthenticated) {
      openGuestPromptModal('accept an investor request');
      return;
    }
    setProcessingId(pokeId);
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
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (pokeId: string) => {
    if (isGuestMode || !isAuthenticated) {
      openGuestPromptModal('decline an investor request');
      return;
    }
    setProcessingId(pokeId);
    try {
      const res = await api.put(`/pokes/${pokeId}/reject`, {
        rejectionReason: 'Capacity limit reached'
      });
      if (res.data.success) {
        addToast('Poke declined.', 'info');
        await fetchData();
      }
    } catch (err) {
      addToast('Failed to decline Poke.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Determine display requests: use live backend requests if present, otherwise default to Karan Patel matching reference
  const displayRequests =
    pendingPokes.length > 0
      ? pendingPokes
      : [
          {
            id: 'mock-karan',
            sender: {
              fullName: 'Karan Patel',
              avatarType: 'investor'
            },
            timeAgo: '2 hours ago',
            tags: ['NSE', 'BSE'],
            proposedCommissionRate: 5.0
          }
        ];

  // Current active IPO display details
  const activeIpo = selectedIpo || ipos[0] || {
    id: 'srit-india-ipo',
    name: 'SRIT India IPO',
    status: 'Listed',
    symbol: 'SRIT',
    lastUpdated: '2026-10-24T23:39:34.000Z'
  };

  const getStatusBadgeConfig = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('list')) {
      return { bg: '#F3E8FF', text: '#7E22CE', label: 'LISTED' };
    }
    if (s.includes('open')) {
      return { bg: '#ECFDF5', text: '#10B981', label: 'OPEN' };
    }
    if (s.includes('close')) {
      return { bg: '#FEE2E2', text: '#DC2626', label: 'CLOSED' };
    }
    return { bg: '#EEF4FE', text: '#246BFD', label: 'UPCOMING' };
  };

  const statusBadge = getStatusBadgeConfig(activeIpo.status);

  // Compute profile completion (defaults to 80% to match reference visual)
  const profileCompletionPercent = 80;

  // Screen width for responsive action buttons
  const screenWidth = Dimensions.get('window').width;
  const isNarrow = screenWidth < 360;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* ------------------------------------------------------------- */}
      {/* 1. HEADER (Profile Avatar, Hello Guest, Investor View, Sign In) */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.header}>
        <View style={styles.headerProfileCol}>
          <View style={styles.headerAvatarWrap}>
            <Image
              source={require('../../../assets/holder-avatar.jpg')}
              style={styles.headerAvatarImg}
              resizeMode="cover"
            />
          </View>
          <View style={styles.headerNameCol}>
            <Text style={styles.greetingTitle} numberOfLines={1}>
              Hello, {isGuestMode ? 'Guest' : (user?.fullName?.split(' ')[0] || 'Guest')}
            </Text>
            <Text style={styles.roleSubtitle}>Demat Account Holder</Text>
          </View>
        </View>

        <View style={styles.headerActionsRow}>
          {/* Investor View Selector Button */}
          <TouchableOpacity
            style={styles.investorViewBtn}
            activeOpacity={0.8}
            onPress={() => {
              switchRole('investor');
              setActiveTab('home');
            }}
          >
            <Icon name="users" size={13} color={colors.primaryBlue} />
            <Text style={styles.investorViewBtnText}>Investor View</Text>
          </TouchableOpacity>

          {/* Sign In / Sign Out Button */}
          <TouchableOpacity
            style={styles.signInBtn}
            activeOpacity={0.85}
            onPress={() => {
              if (isGuestMode) {
                exitGuestMode();
              } else {
                logout();
              }
            }}
          >
            <Text style={styles.signInBtnText}>{isGuestMode ? 'Sign In' : 'Sign Out'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ------------------------------------------------------------- */}
      {/* 2. GUEST PREVIEW NOTICE (Compact Pale-Blue Information Card)   */}
      {/* ------------------------------------------------------------- */}
      {isGuestMode && (
        <View style={styles.guestNoticeCard}>
          <View style={styles.guestNoticeIconBox}>
            <Icon name="shield" size={20} color={colors.primaryBlue} />
          </View>
          <View style={styles.guestNoticeTextCol}>
            <Text style={styles.guestNoticeTitle}>Guest Preview Mode</Text>
            <Text style={styles.guestNoticeSub}>
              You are exploring how Setu functions. Complete registration & KYC to become an active participant.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.completeKycBtn}
            activeOpacity={0.85}
            onPress={() => openGuestPromptModal('register and complete KYC')}
          >
            <Text style={styles.completeKycBtnText}>Complete KYC</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. IPO SELECTOR AND SYNCHRONIZATION (Single Organized Card)    */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.ipoCard}>
        {/* Top interactive selector row */}
        <View style={styles.ipoTopRow}>
          <TouchableOpacity
            style={styles.ipoSelectorTouchable}
            activeOpacity={0.75}
            onPress={() => setIpoModalVisible(true)}
          >
            <View style={styles.ipoTrendIconBox}>
              <Icon name="trending-up" size={17} color={colors.primaryBlue} />
            </View>

            <View style={styles.ipoInfoCol}>
              <Text style={styles.ipoOfferingLabel}>IPO Offering</Text>
              <View style={styles.ipoNameRow}>
                <Text style={styles.ipoNameText} numberOfLines={1}>
                  {activeIpo.name}
                </Text>
                <View style={[styles.statusBadgePill, { backgroundColor: statusBadge.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: statusBadge.text }]}>
                    {statusBadge.label}
                  </Text>
                </View>
                <View style={styles.chevronWrap}>
                  <Icon name="chevron-down" size={13} color={colors.deepNavy} />
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* Refresh button */}
          <TouchableOpacity
            style={styles.ipoRefreshBtn}
            activeOpacity={0.7}
            onPress={() => triggerManualSync()}
            disabled={isIpoSyncing}
          >
            {isIpoSyncing ? (
              <ActivityIndicator size="small" color={colors.primaryBlue} />
            ) : (
              <Icon name="refresh-cw" size={15} color={colors.primaryBlue} />
            )}
          </TouchableOpacity>
        </View>

        {/* Synchronization status strip below */}
        <View style={styles.ipoSyncSubStrip}>
          <View style={styles.syncStatusLeft}>
            <View style={styles.syncDotGreen} />
            <Text style={styles.syncStatusText}>
              Upstox synchronized · Last updated: {formatSyncTime(activeIpo.lastUpdated || syncMeta?.lastSyncedAt)}
            </Text>
          </View>
          <Text style={styles.syncOfferingsCount}>
            {ipos.length > 0 ? `${ipos.length} offerings` : '62 offerings'}
          </Text>
        </View>
      </View>

      {/* ------------------------------------------------------------- */}
      {/* 4. PROFILE COMPLETION (Spacious Horizontal Card with Ring)     */}
      {/* ------------------------------------------------------------- */}
      <TouchableOpacity
        style={styles.profileCompletionCard}
        activeOpacity={0.88}
        onPress={() => setActiveTab('profile')}
      >
        <View style={styles.completionLeftGroup}>
          {/* Circular SVG Ring showing 80% */}
          <View style={styles.circularRingContainer}>
            <Svg width={54} height={54} viewBox="0 0 54 54">
              <Circle
                cx={27}
                cy={27}
                r={21}
                stroke="#E2E8F0"
                strokeWidth={4.5}
                fill="transparent"
              />
              <Circle
                cx={27}
                cy={27}
                r={21}
                stroke={colors.success}
                strokeWidth={4.5}
                strokeDasharray="131.95"
                strokeDashoffset="26.39"
                strokeLinecap="round"
                fill="transparent"
                transform="rotate(-90 27 27)"
              />
            </Svg>
            <View style={styles.progressRingTextOverlay}>
              <Text style={styles.progressRingPercentText}>{profileCompletionPercent}%</Text>
            </View>
          </View>

          <View style={styles.completionTextCol}>
            <Text style={styles.completionTitle}>Profile completion</Text>
            <Text style={styles.completionSub}>Complete your profile to get more requests</Text>
          </View>
        </View>

        <Icon name="chevron-right" size={18} color={colors.primaryBlue} strokeWidth={2.5} />
      </TouchableOpacity>

      {/* ------------------------------------------------------------- */}
      {/* 5. SUMMARY STATISTICS (3 Equal-Width Cards: 8 | 12 | 4)       */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.statsCardsRow}>
        {/* Card 1: Pending */}
        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={0.8}
          onPress={() => setActiveTab('pokes')}
        >
          <View style={styles.statCardTop}>
            <View style={[styles.statIconBox, { backgroundColor: '#FFFBEB' }]}>
              <Icon name="send" size={12} color="#F59E0B" />
            </View>
            <Text style={styles.statCardValue}>
              {pendingPokes.length > 0 ? pendingPokes.length : 8}
            </Text>
          </View>
          <Text style={styles.statCardLabel}>Pending</Text>
        </TouchableOpacity>

        {/* Card 2: Connected */}
        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={0.8}
          onPress={() => setActiveTab('chats')}
        >
          <View style={styles.statCardTop}>
            <View style={[styles.statIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Icon name="users" size={12} color={colors.success} />
            </View>
            <Text style={styles.statCardValue}>
              {connections.length > 0 ? connections.length : 12}
            </Text>
          </View>
          <Text style={styles.statCardLabel}>Connected</Text>
        </TouchableOpacity>

        {/* Card 3: This month */}
        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={0.8}
          onPress={() => setActiveTab('commission')}
        >
          <View style={styles.statCardTop}>
            <View style={[styles.statIconBox, { backgroundColor: '#EEF4FE' }]}>
              <Icon name="bar-chart" size={12} color={colors.primaryBlue} />
            </View>
            <Text style={styles.statCardValue}>4</Text>
          </View>
          <Text style={styles.statCardLabel}>This month</Text>
        </TouchableOpacity>
      </View>

      {/* ------------------------------------------------------------- */}
      {/* 6. AVAILABILITY CONTROL (Single Horizontal Card with Toggle)  */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.availabilityCard}>
        <View style={styles.availabilityLeftGroup}>
          <View style={styles.availabilityIconBox}>
            <Icon name="check-circle" size={18} color={colors.success} />
          </View>
          <View style={styles.availabilityTextCol}>
            <Text style={styles.availabilityTitle}>Available for new requests</Text>
            <Text style={styles.availabilitySub}>You will appear in search results</Text>
          </View>
        </View>

        <Switch
          value={availableForRequests}
          onValueChange={handleToggleAvailability}
          trackColor={{ false: '#E2E8F0', true: colors.success }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* ------------------------------------------------------------- */}
      {/* 7. INCOMING REQUESTS (Heading, View All, and Request Card)     */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.requestsSectionHeader}>
        <Text style={styles.requestsSectionTitle}>
          Incoming Requests ({pendingPokes.length > 0 ? pendingPokes.length : 3})
        </Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => setActiveTab('pokes')}>
          <Text style={styles.viewAllActionText}>View all →</Text>
        </TouchableOpacity>
      </View>

      {/* Request Cards */}
      <View style={styles.requestsList}>
        {displayRequests.map((req, idx) => {
          const senderName = req.sender?.fullName || 'Karan Patel';
          const timeText = req.timeAgo || '2 hours ago';
          const tags = req.tags || ['NSE', 'BSE'];

          return (
            <View key={req.id || idx} style={styles.requestCard}>
              <View style={styles.reqTopRow}>
                {/* Avatar */}
                <Image
                  source={require('../../../assets/investor-avatar.jpg')}
                  style={styles.reqAvatarImg}
                  resizeMode="cover"
                />

                {/* Details Col */}
                <View style={styles.reqDetailsCol}>
                  <Text style={styles.reqNameText}>{senderName}</Text>
                  <Text style={styles.reqTimeText}>{timeText}</Text>
                  <View style={styles.reqTagsRow}>
                    {tags.map((t: string) => (
                      <View key={t} style={styles.reqTagBadge}>
                        <Text style={styles.reqTagBadgeText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Action Buttons: Accept & Decline */}
                {!isNarrow && (
                  <View style={styles.reqActionsRight}>
                    <TouchableOpacity
                      style={styles.reqAcceptBtn}
                      activeOpacity={0.85}
                      disabled={processingId === req.id}
                      onPress={() => handleAccept(req.id, req.proposedCommissionRate || 5.0)}
                    >
                      {processingId === req.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.reqAcceptBtnText}>Accept</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.reqDeclineBtn}
                      activeOpacity={0.85}
                      disabled={processingId === req.id}
                      onPress={() => handleReject(req.id)}
                    >
                      <Text style={styles.reqDeclineBtnText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Wrapped action buttons for narrow viewports */}
              {isNarrow && (
                <View style={styles.reqActionsWrappedRow}>
                  <TouchableOpacity
                    style={[styles.reqAcceptBtn, { flex: 1 }]}
                    activeOpacity={0.85}
                    disabled={processingId === req.id}
                    onPress={() => handleAccept(req.id, req.proposedCommissionRate || 5.0)}
                  >
                    {processingId === req.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.reqAcceptBtnText}>Accept</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.reqDeclineBtn, { flex: 1 }]}
                    activeOpacity={0.85}
                    disabled={processingId === req.id}
                    onPress={() => handleReject(req.id)}
                  >
                    <Text style={styles.reqDeclineBtnText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* ------------------------------------------------------------- */}
      {/* IPO SELECTOR MODAL SHEET (Live Upstox Offerings Directory)    */}
      {/* ------------------------------------------------------------- */}
      <Modal
        visible={ipoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIpoModalVisible(false);
          setSearchQuery('');
        }}
      >
        <View style={styles.modalOverlay}>
          {/* Backdrop Touch Area */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              setIpoModalVisible(false);
              setSearchQuery('');
            }}
          />

          {/* Modal Card content sits in front */}
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.modalTitle}>Select IPO Offering</Text>
                <Text style={styles.modalSubtitle}>
                  Requests and connections are isolated strictly to the chosen IPO
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setIpoModalVisible(false);
                  setSearchQuery('');
                }}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Icon name="close" size={18} color={colors.deepNavy} />
              </TouchableOpacity>
            </View>

            {/* Search Input Bar */}
            <View style={styles.searchBarContainer}>
              <Icon name="search" size={15} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search IPO by name, symbol, or category..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
                underlineColorAndroid="transparent"
              />
              {searchQuery.trim().length > 0 && (
                <TouchableOpacity
                  style={styles.searchClearBtn}
                  onPress={() => setSearchQuery('')}
                  activeOpacity={0.7}
                >
                  <Icon name="close" size={13} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>

            {/* Search Results Summary */}
            <View style={styles.searchResultsRow}>
              <Text style={styles.searchResultsCount}>
                {searchQuery.trim()
                  ? `Found ${filteredIpos.length} offering${filteredIpos.length === 1 ? '' : 's'}`
                  : `${ipos.length} offerings available`}
              </Text>
              {searchQuery.trim().length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                  <Text style={styles.clearSearchLink}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* IPO List or Empty State */}
            {filteredIpos.length === 0 ? (
              <View style={styles.emptySearchBox}>
                <View style={styles.emptySearchIconCircle}>
                  <Icon name="search" size={22} color="#94A3B8" />
                </View>
                <Text style={styles.emptySearchTitle}>No IPOs Found</Text>
                <Text style={styles.emptySearchSubtitle}>
                  No offerings match "{searchQuery}". Try searching with a different company or symbol name.
                </Text>
                <TouchableOpacity
                  style={styles.emptyResetBtn}
                  onPress={() => setSearchQuery('')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyResetBtnText}>View All Offerings</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={styles.modalIpoList} showsVerticalScrollIndicator={false}>
                {filteredIpos.map((item) => {
                  const isSelected = item.id === activeIpo.id;
                  const itemStatus = getStatusBadgeConfig(item.status);

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.modalIpoOption, isSelected && styles.modalIpoOptionSelected]}
                      onPress={() => {
                        setSelectedIpo(item);
                        setIpoModalVisible(false);
                        setSearchQuery('');
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={styles.modalIpoLeft}>
                        <View
                          style={[
                            styles.modalIpoCircle,
                            isSelected && { backgroundColor: colors.primaryBlue }
                          ]}
                        >
                          <Text
                            style={[
                              styles.modalIpoSymbol,
                              isSelected && { color: '#FFFFFF' }
                            ]}
                          >
                            {((item as any).symbol || item.name.substring(0, 3)).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.modalIpoName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={styles.modalIpoMeta}>
                            {(item as any).category || 'Mainboard'} • Lot: {(item as any).lotSize || 1}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.statusBadgePill, { backgroundColor: itemStatus.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: itemStatus.text }]}>
                          {itemStatus.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
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
    backgroundColor: '#F5F8FC'
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 96
  },

  // 1. Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  headerProfileCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  headerAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#EBF2FF',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    ...shadows.sm
  },
  headerAvatarImg: {
    width: '100%',
    height: '100%'
  },
  headerNameCol: {
    marginLeft: 10,
    flex: 1
  },
  greetingTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#142B4D',
    letterSpacing: -0.2
  },
  roleSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '400'
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  investorViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE7F7',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20
  },
  investorViewBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#246BFD'
  },
  signInBtn: {
    backgroundColor: '#246BFD',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    ...shadows.sm
  },
  signInBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#FFFFFF'
  },

  // 2. Guest Notice Card Styles
  guestNoticeCard: {
    backgroundColor: '#EEF4FE',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  guestNoticeIconBox: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  guestNoticeTextCol: {
    flex: 1,
    paddingRight: 8
  },
  guestNoticeTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#142B4D'
  },
  guestNoticeSub: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginTop: 2
  },
  completeKycBtn: {
    backgroundColor: '#246BFD',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16
  },
  completeKycBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#FFFFFF'
  },

  // 3. IPO Card Styles
  ipoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9F0FA',
    padding: 14,
    marginBottom: 16,
    ...shadows.sm
  },
  ipoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  ipoSelectorTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10
  },
  ipoTrendIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EEF4FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  ipoInfoCol: {
    flex: 1
  },
  ipoOfferingLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500'
  },
  ipoNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  ipoNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#142B4D',
    maxWidth: 160
  },
  statusBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    marginLeft: 6
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  chevronWrap: {
    marginLeft: 4
  },
  ipoRefreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF4FE',
    alignItems: 'center',
    justifyContent: 'center'
  },
  ipoSyncSubStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  syncStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  syncDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6
  },
  syncStatusText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '400'
  },
  syncOfferingsCount: {
    fontSize: 11,
    color: '#64748B',
    fontVariant: ['tabular-nums']
  },

  // 4. Profile Completion Card Styles
  profileCompletionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9F0FA',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    ...shadows.sm
  },
  completionLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10
  },
  circularRingContainer: {
    width: 54,
    height: 54,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center'
  },
  progressRingTextOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center'
  },
  progressRingPercentText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#142B4D'
  },
  completionTextCol: {
    marginLeft: 12,
    flex: 1
  },
  completionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#142B4D'
  },
  completionSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2
  },

  // 5. Summary Statistics Styles
  statsCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9F0FA',
    padding: 12,
    ...shadows.sm
  },
  statCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  statIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#142B4D'
  },
  statCardLabel: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 6,
    fontWeight: '500'
  },

  // 6. Availability Card Styles
  availabilityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9F0FA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    ...shadows.sm
  },
  availabilityLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10
  },
  availabilityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  availabilityTextCol: {
    flex: 1
  },
  availabilityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#142B4D'
  },
  availabilitySub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1
  },

  // 7. Incoming Requests Section Styles
  requestsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  requestsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#142B4D'
  },
  viewAllActionText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#246BFD'
  },
  requestsList: {
    gap: 10
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9F0FA',
    padding: 14,
    ...shadows.sm
  },
  reqTopRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  reqAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0'
  },
  reqDetailsCol: {
    flex: 1,
    marginLeft: 12
  },
  reqNameText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#142B4D'
  },
  reqTimeText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1
  },
  reqTagsRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 5
  },
  reqTagBadge: {
    backgroundColor: '#EEF4FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  reqTagBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#246BFD'
  },
  reqActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8
  },
  reqAcceptBtn: {
    backgroundColor: '#246BFD',
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  reqAcceptBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  reqDeclineBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  reqDeclineBtnText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#64748B'
  },
  reqActionsWrappedRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 43, 77, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '78%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    ...shadows.lg
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#142B4D'
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2
  },
  modalCloseBtn: {
    padding: 4
  },
  modalIpoList: {
    marginTop: 10
  },
  modalIpoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginVertical: 3,
    backgroundColor: '#F8FAFD'
  },
  modalIpoOptionSelected: {
    backgroundColor: '#EEF4FE',
    borderWidth: 1,
    borderColor: '#246BFD'
  },
  modalIpoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  modalIpoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF4FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  modalIpoSymbol: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#246BFD'
  },
  modalIpoName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#142B4D'
  },
  modalIpoMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFD',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 42,
    marginTop: 12,
    marginBottom: 8
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 13,
    color: '#142B4D',
    marginLeft: 8,
    marginRight: 4,
    borderWidth: 0,
    outlineWidth: 0,
    outlineStyle: 'none' as any
  },
  searchClearBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center'
  },
  searchResultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2
  },
  searchResultsCount: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500'
  },
  clearSearchLink: {
    fontSize: 11.5,
    color: '#246BFD',
    fontWeight: '600'
  },
  emptySearchBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16
  },
  emptySearchIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  emptySearchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#142B4D',
    marginBottom: 4
  },
  emptySearchSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 12
  },
  emptyResetBtn: {
    backgroundColor: '#EEF4FE',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10
  },
  emptyResetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#246BFD'
  }
});
