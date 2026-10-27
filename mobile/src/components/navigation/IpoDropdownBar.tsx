import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { Icon } from '../common/Icon';
import { useIpoStore, IPO, IpoLifecycleStatus } from '../../store/ipoStore';

const formatSyncTime = (dateStr?: string | null) => {
  if (!dateStr) return 'Not yet synced';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return String(dateStr);
  }
};

export const IpoDropdownBar: React.FC = () => {
  const {
    ipos,
    selectedIpo,
    syncMeta,
    isLoading,
    isSyncing,
    fetchIpos,
    triggerManualSync,
    setSelectedIpo
  } = useIpoStore();
  const [modalVisible, setModalVisible] = useState(false);
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

  useEffect(() => {
    fetchIpos();
  }, []);

  const getStatusBadgeStyle = (status: IpoLifecycleStatus | string) => {
    switch (status) {
      case 'Open':
        return { bg: colors.successLight, text: colors.success, label: 'OPEN' };
      case 'Closed':
        return { bg: '#FEE2E2', text: '#B91C1C', label: 'CLOSED' };
      case 'Listed':
        return { bg: '#F3E8FF', text: '#7E22CE', label: 'LISTED' };
      case 'Upcoming':
      default:
        return { bg: colors.surfaceHighlight, text: colors.primaryBlue, label: 'UPCOMING' };
    }
  };

  const isStale = Boolean(selectedIpo?.isStale || syncMeta?.isStale);

  return (
    <View style={styles.outerContainer}>
      <View style={styles.bar}>
        {/* Left: Indicator & Icon */}
        <View style={styles.labelSection}>
          <View style={styles.iconCircle}>
            <Icon name="trending-up" size={14} color={colors.primaryBlue} />
          </View>
          <Text style={styles.panelLabel}>IPO Offering:</Text>
        </View>

        {/* Center: Dropdown Trigger */}
        <TouchableOpacity
          style={[styles.dropdownButton, !selectedIpo && styles.dropdownButtonPrompt]}
          activeOpacity={0.8}
          onPress={() => setModalVisible(true)}
        >
          {isLoading && ipos.length === 0 ? (
            <ActivityIndicator size="small" color={colors.primaryBlue} />
          ) : selectedIpo ? (
            <View style={styles.selectedContent}>
              <Text style={styles.selectedIpoName} numberOfLines={1}>
                {selectedIpo.name}
              </Text>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: getStatusBadgeStyle(selectedIpo.status).bg }
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    { color: getStatusBadgeStyle(selectedIpo.status).text }
                  ]}
                >
                  {getStatusBadgeStyle(selectedIpo.status).label}
                </Text>
              </View>
              {isStale && (
                <View style={styles.staleBadge}>
                  <Text style={styles.staleBadgeText}>STALE</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.selectedContent}>
              <Text style={styles.placeholderText}>Select IPO Offering (Filters Panel)...</Text>
            </View>
          )}

          <View style={styles.chevronWrap}>
            <Icon name="chevron-down" size={14} color={colors.deepNavy} />
          </View>
        </TouchableOpacity>

        {/* Manual Refresh Button */}
        <TouchableOpacity
          style={styles.refreshBtn}
          activeOpacity={0.7}
          onPress={() => triggerManualSync()}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color={colors.primaryBlue} />
          ) : (
            <Icon name="refresh-cw" size={14} color={colors.primaryBlue} />
          )}
        </TouchableOpacity>

        {/* Clear Selection */}
        {selectedIpo && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => setSelectedIpo(null)}
          >
            <Icon name="close" size={13} color={colors.mutedText} />
          </TouchableOpacity>
        )}
      </View>

      {/* Honest Status Sub-Strip with Last-Updated Timestamp */}
      <View style={[styles.subStrip, isStale && styles.subStripStale]}>
        <View style={styles.subStripLeft}>
          <Icon
            name={isStale ? 'alert-triangle' : 'check'}
            size={11}
            color={isStale ? '#B45309' : colors.secondaryText}
          />
          <Text style={[styles.subStripText, isStale && styles.subStripTextStale]}>
            {isStale
              ? `Provider data may be stale • Last updated: ${formatSyncTime(
                  selectedIpo?.lastUpdated || syncMeta?.lastSyncedAt
                )}`
              : `Upstox synchronized • Last updated: ${formatSyncTime(
                  selectedIpo?.lastUpdated || syncMeta?.lastSyncedAt
                )}`}
          </Text>
        </View>
        <Text style={styles.subStripCount}>{ipos.length} offerings</Text>
      </View>

      {/* Modal Dropdown Selection Sheet */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setModalVisible(false);
          setSearchQuery('');
        }}
      >
        <View style={styles.modalOverlay}>
          {/* Backdrop Touch Area */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              setModalVisible(false);
              setSearchQuery('');
            }}
          />

          {/* Modal Card content sits in front */}
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.modalTitle}>Select IPO Offering</Text>
                <Text style={styles.modalSubtitle}>
                  Connections & chat are isolated strictly to the selected IPO
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setSearchQuery('');
                }}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Icon name="close" size={18} color={colors.deepNavy} />
              </TouchableOpacity>
            </View>

            {/* Sync State Banner & Manual Sync Action */}
            <View style={styles.syncStateCard}>
              <View style={styles.syncStateInfo}>
                <Text style={styles.syncStateTitle}>
                  Upstox Provider Status:{' '}
                  <Text
                    style={{
                      color:
                        syncMeta?.syncStatus === 'synced'
                          ? colors.success
                          : colors.warning
                    }}
                  >
                    {syncMeta?.syncStatus === 'synced'
                      ? 'Connected (Live API)'
                      : syncMeta?.syncStatus === 'unauthorized'
                      ? 'No Credentials (Cached)'
                      : 'Offline (Cached)'}
                  </Text>
                </Text>
                <Text style={styles.syncStateSubtitle}>
                  Last synced: {formatSyncTime(syncMeta?.lastSyncedAt)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalSyncBtn}
                onPress={() => triggerManualSync()}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color={colors.primaryBlue} />
                ) : (
                  <>
                    <Icon name="refresh-cw" size={12} color={colors.primaryBlue} />
                    <Text style={styles.modalSyncBtnText}>Sync Now</Text>
                  </>
                )}
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

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {/* Option to clear selection when not actively filtering */}
              {!searchQuery.trim() && (
                <TouchableOpacity
                  style={[styles.ipoOption, !selectedIpo && styles.ipoOptionSelected]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedIpo(null);
                    setModalVisible(false);
                    setSearchQuery('');
                  }}
                >
                  <View style={styles.ipoOptionLeft}>
                    <View style={styles.noneCircle}>
                      <Icon name="filter" size={14} color={colors.secondaryText} />
                    </View>
                    <View style={styles.ipoOptionInfo}>
                      <Text style={styles.noneTitle}>No IPO Selected (Prompt State)</Text>
                      <Text style={styles.noneSubtitle}>
                        Require explicit selection before fetching connections
                      </Text>
                    </View>
                  </View>
                  {!selectedIpo && (
                    <View style={styles.checkCircle}>
                      <Icon name="check" size={14} color={colors.surface} strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {/* Empty state when searching and no results */}
              {filteredIpos.length === 0 && searchQuery.trim().length > 0 ? (
                <View style={styles.emptySearchBox}>
                  <View style={styles.emptySearchIconCircle}>
                    <Icon name="search" size={22} color="#94A3B8" />
                  </View>
                  <Text style={styles.emptySearchTitle}>No IPOs Found</Text>
                  <Text style={styles.emptySearchSubtitle}>
                    No offerings match "{searchQuery}". Try searching with another name or symbol.
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
                /* List of filtered IPO Offerings */
                filteredIpos.map((ipo) => {
                  const isSelected = selectedIpo?.id === ipo.id;
                  const statusStyle = getStatusBadgeStyle(ipo.status);

                  return (
                    <TouchableOpacity
                      key={ipo.id}
                      style={[styles.ipoOption, isSelected && styles.ipoOptionSelected]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedIpo(ipo);
                        setModalVisible(false);
                        setSearchQuery('');
                      }}
                    >
                      <View style={styles.ipoOptionLeft}>
                        <View
                          style={[
                            styles.ipoSymbolCircle,
                            isSelected && styles.ipoSymbolCircleSelected
                          ]}
                        >
                          <Text
                            style={[
                              styles.ipoSymbolText,
                              isSelected && styles.ipoSymbolTextSelected
                            ]}
                          >
                            {ipo.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>

                        <View style={styles.ipoOptionInfo}>
                          <View style={styles.ipoNameRow}>
                            <Text style={styles.ipoName}>{ipo.name}</Text>
                            <View
                              style={[
                                styles.statusPill,
                                { backgroundColor: statusStyle.bg, marginLeft: 6 }
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusPillText,
                                  { color: statusStyle.text }
                                ]}
                              >
                                {statusStyle.label}
                              </Text>
                            </View>
                            {ipo.isStale ? (
                              <View style={[styles.staleBadge, { marginLeft: 4 }]}>
                                <Text style={styles.staleBadgeText}>STALE</Text>
                              </View>
                            ) : ipo.isVerified ? (
                              <View style={[styles.liveBadge, { marginLeft: 4 }]}>
                                <Text style={styles.liveBadgeText}>LIVE</Text>
                              </View>
                            ) : null}
                            {ipo.source === 'demo_preserved' && (
                              <View style={[styles.demoBadge, { marginLeft: 4 }]}>
                                <Text style={styles.demoBadgeText}>PRESERVED</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.ipoTimestamp}>
                            Last updated: {formatSyncTime(ipo.lastUpdated)}
                          </Text>
                        </View>
                      </View>

                      {isSelected && (
                        <View style={styles.checkCircle}>
                          <Icon name="check" size={14} color={colors.surface} strokeWidth={3} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}

              {ipos.length === 0 && !isLoading && (
                <View style={styles.emptyStateWrap}>
                  <Text style={styles.emptyStateTitle}>No Verified IPO Offerings</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Click 'Sync Now' above to retrieve current live offerings from Upstox.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: '#F5F8FC',
    borderBottomWidth: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: 6,
    zIndex: 10
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9F0FA',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    ...shadows.sm
  },
  labelSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center'
  },
  panelLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.secondaryText,
    letterSpacing: 0.2
  },
  dropdownButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  dropdownButtonPrompt: {
    borderColor: colors.primaryBlue,
    backgroundColor: colors.surfaceHighlight
  },
  selectedContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
    flexWrap: 'nowrap'
  },
  selectedIpoName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
    marginRight: 6
  },
  placeholderText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.primaryBlue
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.3
  },
  staleBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginLeft: 4
  },
  staleBadgeText: {
    fontSize: 8,
    fontWeight: typography.weights.bold,
    color: '#92400E'
  },
  chevronWrap: {
    paddingLeft: 4
  },
  refreshBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D4E4FC'
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center'
  },
  subStrip: {
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 0
  },
  subStripStale: {
    backgroundColor: 'transparent'
  },
  subStripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  subStripText: {
    fontSize: 10,
    color: colors.secondaryText,
    fontWeight: typography.weights.medium
  },
  subStripTextStale: {
    color: '#92400E'
  },
  subStripCount: {
    fontSize: 10,
    color: colors.mutedText,
    fontVariant: ['tabular-nums']
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.cardLg,
    padding: spacing.lg,
    ...shadows.lg
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  modalTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  modalSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    marginTop: 2
  },
  modalCloseBtn: {
    padding: 4
  },
  syncStateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  syncStateInfo: {
    flex: 1,
    marginRight: 8
  },
  syncStateTitle: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  syncStateSubtitle: {
    fontSize: 10,
    color: colors.mutedText,
    marginTop: 1
  },
  modalSyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#D4E4FC'
  },
  modalSyncBtnText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue
  },
  modalList: {
    marginTop: 4
  },
  ipoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    marginVertical: 4,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  ipoOptionSelected: {
    backgroundColor: colors.surfaceHighlight,
    borderColor: colors.primaryBlue
  },
  ipoOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8
  },
  noneCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm
  },
  noneTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.secondaryText
  },
  noneSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.mutedText,
    marginTop: 2
  },
  ipoSymbolCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EDF2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm
  },
  ipoSymbolCircleSelected: {
    backgroundColor: colors.primaryBlue
  },
  ipoSymbolText: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue
  },
  ipoSymbolTextSelected: {
    color: colors.surface
  },
  ipoOptionInfo: {
    flex: 1
  },
  ipoNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  ipoName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  ipoTimestamp: {
    fontSize: 10,
    color: colors.mutedText,
    marginTop: 2
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center'
  },
  liveBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginLeft: 4
  },
  liveBadgeText: {
    fontSize: 8,
    fontWeight: typography.weights.bold,
    color: colors.success
  },
  demoBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: 4
  },
  demoBadgeText: {
    fontSize: 8,
    fontWeight: typography.weights.bold,
    color: colors.secondaryText
  },
  emptyStateWrap: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyStateTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
    marginBottom: 4
  },
  emptyStateSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    textAlign: 'center'
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
    marginTop: 10,
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
