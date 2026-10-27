import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { CommissionSelector } from '../../components/commission/CommissionSelector';
import { Icon } from '../../components/common/Icon';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

export const CommissionSettingsScreen: React.FC = () => {
  const { user, updateUser, isGuestMode, isAuthenticated } = useAuthStore();
  const { addToast, openGuestPromptModal } = useUIStore();

  const [history, setHistory] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/commission/history');
      if (res.data?.data) {
        setHistory(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching commission history:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  const handleSaveCommission = async (rate: number, basis: string, reason?: string) => {
    if (isGuestMode || !isAuthenticated) {
      openGuestPromptModal('publish your profit commission rate');
      return;
    }
    try {
      const res = await api.put('/commission', {
        rate,
        basis,
        reason
      });

      if (res.data.success) {
        updateUser({
          defaultCommissionRate: rate,
          commissionBasis: basis
        });
        addToast(`Commission rate updated to ${rate.toFixed(1)}%!`, 'success');
        await fetchHistory();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to update commission rate';
      addToast(msg, 'error');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Screen Title & Introduction */}
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <View style={styles.headerBadge}>
            <Icon name="percent" size={12} color="#246BFD" />
            <Text style={styles.headerBadgeText}>DEMAT HOLDER SETTINGS</Text>
          </View>
        </View>
        <Text style={styles.title}>Commission on Profit</Text>
        <Text style={styles.subtitle}>
          Configure your published profit commission margin from 0% to 50% in 2.5% increments. When an investor requests you to apply on their behalf, this rate applies strictly to realized listing profit upon allotment.
        </Text>
      </View>

      {/* Main Commission Selector Engine */}
      <CommissionSelector
        initialRate={user?.defaultCommissionRate || 5.0}
        initialBasis={user?.commissionBasis || 'Commission on Listing Profit'}
        onSave={handleSaveCommission}
      />

      {/* Auditable Change History */}
      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <View style={styles.historyIconBox}>
            <Icon name="sliders" size={15} color="#246BFD" />
          </View>
          <View style={styles.historyHeaderInfo}>
            <Text style={styles.historyTitle}>Auditable Rate Change History</Text>
            <Text style={styles.historySubtitle}>Timestamped log of published commission revisions</Text>
          </View>
        </View>

        {history.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Icon name="clock" size={24} color="#94A3B8" />
            <Text style={styles.emptyHistoryText}>No rate changes recorded yet</Text>
            <Text style={styles.emptyHistorySubtext}>Your default published rate is 5.0%</Text>
          </View>
        ) : (
          history.map((entry) => {
            const formattedDate = new Date(entry.timestamp).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <View key={entry.id} style={styles.historyCard}>
                <View style={styles.historyRow}>
                  <View style={styles.rateChangeBadge}>
                    <Text style={styles.prevRate}>{entry.previousRate?.toFixed(1)}%</Text>
                    <Icon name="arrow-right" size={12} color="#94A3B8" />
                    <Text style={styles.newRate}>{entry.newRate?.toFixed(1)}%</Text>
                  </View>
                  <Text style={styles.historyDate}>{formattedDate}</Text>
                </View>

                <Text style={styles.historyBasis}>{entry.basis}</Text>
                {entry.reason ? (
                  <Text style={styles.historyReason}>"{entry.reason}"</Text>
                ) : null}
              </View>
            );
          })
        )}
      </View>

      {/* Statutory Disclosures */}
      <View style={styles.statutoryBox}>
        <View style={styles.statutoryHeaderRow}>
          <View style={styles.statutoryIconBox}>
            <Icon name="shield" size={15} color="#246BFD" />
          </View>
          <Text style={styles.statutoryTitle}>Statutory & Compliance Guidelines</Text>
        </View>

        <View style={styles.statutoryList}>
          <View style={styles.statutoryItem}>
            <View style={styles.statutoryBullet}>
              <Text style={styles.statutoryBulletText}>1</Text>
            </View>
            <Text style={styles.statutoryItemText}>
              <Text style={styles.statutoryItemStrong}>Strict 2.5% Increments:</Text> Rates step deterministically across 21 increments from 0.0% to 50.0% to ensure transparent, predictable quoting.
            </Text>
          </View>

          <View style={styles.statutoryItem}>
            <View style={styles.statutoryBullet}>
              <Text style={styles.statutoryBulletText}>2</Text>
            </View>
            <Text style={styles.statutoryItemText}>
              <Text style={styles.statutoryItemStrong}>Listing Profit Basis Only:</Text> Under SEBI guidelines, upfront consultation fees or allotment guarantees are prohibited. Zero profit or listing discount equals ₹0 commission.
            </Text>
          </View>

          <View style={styles.statutoryItem}>
            <View style={styles.statutoryBullet}>
              <Text style={styles.statutoryBulletText}>3</Text>
            </View>
            <Text style={styles.statutoryItemText}>
              <Text style={styles.statutoryItemStrong}>Non-Retroactive:</Text> Rate revisions apply only to subsequent connection requests and never alter already agreed allocations without explicit consent.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FC'
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 110
  },
  header: {
    marginBottom: 16
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 8
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF4FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#246BFD',
    letterSpacing: 0.5
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#142B4D',
    letterSpacing: -0.4,
    marginBottom: 4
  },
  subtitle: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18
  },
  historySection: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E9F0FA',
    ...shadows.sm
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14
  },
  historyIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EEF4FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  historyHeaderInfo: {
    flex: 1
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#142B4D'
  },
  historySubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1
  },
  emptyHistory: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFD',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    borderStyle: 'dashed'
  },
  emptyHistoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#142B4D',
    marginTop: 8
  },
  emptyHistorySubtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  historyCard: {
    backgroundColor: '#F8FAFD',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E9F0FA',
    marginBottom: 10
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  rateChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  prevRate: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    textDecorationLine: 'line-through'
  },
  newRate: {
    fontSize: 13.5,
    color: '#246BFD',
    fontWeight: '800'
  },
  historyDate: {
    fontSize: 10.5,
    color: '#94A3B8'
  },
  historyBasis: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#142B4D',
    marginTop: 2
  },
  historyReason: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 2
  },
  statutoryBox: {
    backgroundColor: '#EEF4FE',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#D8E6FC',
    marginTop: 16
  },
  statutoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  statutoryIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9
  },
  statutoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#142B4D'
  },
  statutoryList: {
    gap: 10
  },
  statutoryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9
  },
  statutoryBullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1
  },
  statutoryBulletText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#246BFD'
  },
  statutoryItemText: {
    flex: 1,
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 17
  },
  statutoryItemStrong: {
    fontWeight: '700',
    color: '#142B4D'
  }
});
