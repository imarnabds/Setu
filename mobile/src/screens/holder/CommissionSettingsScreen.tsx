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
  const { user, updateUser } = useAuthStore();
  const { addToast } = useUIStore();

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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Screen Title & Introduction */}
      <View style={styles.header}>
        <Text style={styles.title}>Commission Configuration Engine</Text>
        <Text style={styles.subtitle}>
          Configure your published rate from 0% to 50% in exact 2.5% increments. All rates apply solely to documented advisory or technical assistance service bases.
        </Text>
      </View>

      {/* Main Commission Selector Engine */}
      <CommissionSelector
        initialRate={user?.defaultCommissionRate || 5.0}
        initialBasis={user?.commissionBasis || 'Documented Advisory & Technical Assistance Base Fee'}
        onSave={handleSaveCommission}
      />

      {/* Auditable Change History */}
      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <Icon name="sliders" size={16} color={colors.primaryNavy} />
          <Text style={styles.historyTitle}>Auditable Rate Change History</Text>
        </View>

        {history.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Text style={styles.emptyHistoryText}>No rate changes recorded yet.</Text>
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
                    <Icon name="arrow-right" size={12} color={colors.secondaryText} />
                    <Text style={styles.newRate}>{entry.newRate?.toFixed(1)}%</Text>
                  </View>
                  <Text style={styles.historyDate}>{formattedDate}</Text>
                </View>

                <Text style={styles.historyBasis}>Basis: {entry.basis}</Text>
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
        <Text style={styles.statutoryTitle}>Statutory & Compliance Rules:</Text>
        <Text style={styles.statutoryBody}>
          1. Rates can only be set in strict 2.5% increments (21 discrete steps between 0% and 50%).{'\n'}
          2. Under SEBI guidelines, performance fees, allotment guarantees, or profit-sharing percentages on IPO capital are prohibited.{'\n'}
          3. Rate revisions apply to future Poke requests and do not silently alter already accepted connection agreements without mutual consent.
        </Text>
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
    padding: spacing.md,
    paddingBottom: 100
  },
  header: {
    marginBottom: spacing.md
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    letterSpacing: -0.2
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    lineHeight: 18,
    marginTop: 4
  },
  historySection: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.cardLg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  historyTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    marginLeft: 6
  },
  emptyHistory: {
    paddingVertical: spacing.md,
    alignItems: 'center'
  },
  emptyHistoryText: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText
  },
  historyCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm
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
    fontSize: typography.sizes.sm,
    color: colors.secondaryText,
    fontWeight: typography.weights.semibold,
    textDecorationLine: 'line-through'
  },
  newRate: {
    fontSize: typography.sizes.sm,
    color: colors.primaryActionBlue,
    fontWeight: typography.weights.bold
  },
  historyDate: {
    fontSize: 10,
    color: colors.secondaryText
  },
  historyBasis: {
    fontSize: 11,
    color: colors.primaryNavy,
    marginTop: 2
  },
  historyReason: {
    fontSize: 11,
    color: colors.secondaryText,
    fontStyle: 'italic',
    marginTop: 2
  },
  statutoryBox: {
    backgroundColor: colors.subtleBlueBackground,
    borderRadius: 20,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: '#D4E4FC',
    marginTop: spacing.lg
  },
  statutoryTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    marginBottom: 4
  },
  statutoryBody: {
    fontSize: 11,
    color: colors.secondaryText,
    lineHeight: 18
  }
});
