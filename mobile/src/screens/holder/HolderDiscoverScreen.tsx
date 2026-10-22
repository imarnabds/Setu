import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { SearchBar } from '../../components/common/SearchBar';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSkeleton } from '../../components/common/EmptyState';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

export const HolderDiscoverScreen: React.FC = () => {
  const { user } = useAuthStore();
  const [investors, setInvestors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInvestors = async () => {
    try {
      const res = await api.get('/users/investors', {
        params: { q: searchQuery || undefined }
      });
      if (res.data?.data) {
        setInvestors(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch investors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestors();
  }, [searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInvestors();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search investors by name or city..."
        />
        <Text style={styles.countText}>
          {investors.length} Verified {investors.length === 1 ? 'Investor' : 'Investors'} Seeking Demat Assistance
        </Text>
      </View>

      <ScrollView
        style={styles.feed}
        contentContainerStyle={styles.feedContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <>
            <LoadingSkeleton />
            <LoadingSkeleton />
          </>
        ) : investors.length === 0 ? (
          <EmptyState
            icon="search"
            title="No Investors Found"
            description="Try modifying your search terms."
          />
        ) : (
          investors.map((inv) => (
            <View key={inv.id} style={styles.investorCard}>
              <View style={styles.topRow}>
                <ProfileAvatar
                  name={inv.fullName}
                  avatarUrl={inv.avatarUrl}
                  size={48}
                  isVerified={inv.isKycVerified}
                />
                <View style={styles.info}>
                  <Text style={styles.name}>{inv.fullName}</Text>
                  <Text style={styles.location}>
                    {inv.city ? `${inv.city}, ` : ''}{inv.region || 'India'}
                    {inv.investmentExperience ? ` • ${inv.investmentExperience}` : ''}
                  </Text>
                </View>
              </View>

              {inv.bio ? <Text style={styles.bio}>{inv.bio}</Text> : null}

              {inv.supportedCategories && inv.supportedCategories.length > 0 && (
                <View style={styles.cats}>
                  {inv.supportedCategories.map((c: string, idx: number) => (
                    <View key={idx} style={styles.chip}>
                      <Text style={styles.chipText}>{c}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
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
  searchContainer: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  countText: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    fontWeight: typography.weights.medium
  },
  feed: {
    flex: 1
  },
  feedContent: {
    padding: spacing.md,
    paddingBottom: 100
  },
  investorCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  info: {
    marginLeft: spacing.md,
    flex: 1
  },
  name: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    letterSpacing: -0.2
  },
  location: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    marginTop: 2
  },
  bio: {
    fontSize: typography.sizes.xs,
    color: colors.primaryText,
    marginVertical: spacing.sm,
    lineHeight: 18
  },
  cats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4
  },
  chip: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border
  },
  chipText: {
    fontSize: 10,
    color: colors.secondaryText,
    fontWeight: typography.weights.medium
  }
});
