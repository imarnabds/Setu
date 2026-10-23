import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator
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
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select IPO Offering</Text>
                <Text style={styles.modalSubtitle}>
                  Connections & chat are isolated strictly to the selected IPO
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
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

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {/* Option to clear selection */}
              <TouchableOpacity
                style={[styles.ipoOption, !selectedIpo && styles.ipoOptionSelected]}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedIpo(null);
                  setModalVisible(false);
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

              {/* List of IPO Offerings directly from MongoDB */}
              {ipos.map((ipo) => {
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
              })}

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
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    gap: 8
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
    backgroundColor: '#F8FAFD',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight
  },
  subStripStale: {
    backgroundColor: '#FFFBEB',
    borderTopColor: '#FEF3C7'
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
  }
});
