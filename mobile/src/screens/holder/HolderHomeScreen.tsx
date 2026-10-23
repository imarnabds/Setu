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
  ActivityIndicator
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { api } from '../../services/api';

export const HolderHomeScreen: React.FC = () => {
  const { user } = useAuthStore();
  const { setActiveTab, addToast, openChat } = useUIStore();

  const [pokes, setPokes] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [availableForRequests, setAvailableForRequests] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

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
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const pendingPokes = pokes.filter((p) => p.status === 'pending');

  const handleAccept = async (pokeId: string, agreedRate = 5.0, agreedBasis = 'Advisory Base Fee') => {
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

  // Mock incoming requests matching the reference image if backend is empty
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
          },
          {
            id: 'mock-sneha',
            sender: {
              fullName: 'Sneha Iyer',
              avatarType: 'holder'
            },
            timeAgo: '5 hours ago',
            tags: ['IPO'],
            proposedCommissionRate: 5.0
          }
        ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Profile Completion Card with Circular Ring */}
      <TouchableOpacity
        style={styles.profileCompletionCard}
        activeOpacity={0.88}
        onPress={() => setActiveTab('profile')}
      >
        <View style={styles.completionLeft}>
          {/* Circular SVG Ring showing 80% */}
          <View style={styles.circularProgressContainer}>
            <Svg width={54} height={54} viewBox="0 0 54 54">
              {/* Background Track */}
              <Circle
                cx={27}
                cy={27}
                r={22}
                stroke="#E2E8F0"
                strokeWidth={4.5}
                fill="transparent"
              />
              {/* Progress Track (80% of 2*pi*22 = 138.2 -> strokeDashoffset = 27.6) */}
              <Circle
                cx={27}
                cy={27}
                r={22}
                stroke="#10B981"
                strokeWidth={4.5}
                strokeDasharray="138.2"
                strokeDashoffset="27.6"
                strokeLinecap="round"
                fill="transparent"
                transform="rotate(-90 27 27)"
              />
            </Svg>
            <View style={styles.progressTextOverlay}>
              <Text style={styles.progressPercentText}>80%</Text>
            </View>
          </View>

          <View style={styles.completionTextCol}>
            <Text style={styles.completionTitle}>Profile completion</Text>
            <Text style={styles.completionSub}>
              Complete your profile to get more requests
            </Text>
          </View>
        </View>

        <Icon name="chevron-right" size={20} color={colors.primaryBlue} strokeWidth={2.5} />
      </TouchableOpacity>

      {/* 3 Stat Cards Row: 8 Pending | 12 Connected | 4 This month */}
      <View style={styles.statsCardsRow}>
        {/* Card 1: Pending */}
        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={0.8}
          onPress={() => setActiveTab('requests')}
        >
          <View style={styles.statTopRow}>
            <View style={[styles.statIconBox, { backgroundColor: '#FFFBEB' }]}>
              <Icon name="send" size={13} color="#F59E0B" />
            </View>
            <Text style={styles.statNumber}>
              {pendingPokes.length > 0 ? pendingPokes.length : 8}
            </Text>
          </View>
          <Text style={styles.statLabel}>Pending</Text>
        </TouchableOpacity>

        {/* Card 2: Connected */}
        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={0.8}
          onPress={() => setActiveTab('chats')}
        >
          <View style={styles.statTopRow}>
            <View style={[styles.statIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Icon name="users" size={13} color="#10B981" />
            </View>
            <Text style={styles.statNumber}>
              {connections.length > 0 ? connections.length : 12}
            </Text>
          </View>
          <Text style={styles.statLabel}>Connected</Text>
        </TouchableOpacity>

        {/* Card 3: This month */}
        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={0.8}
          onPress={() => setActiveTab('commission')}
        >
          <View style={styles.statTopRow}>
            <View style={[styles.statIconBox, { backgroundColor: '#EBF2FF' }]}>
              <Icon name="bar-chart" size={13} color={colors.primaryBlue} />
            </View>
            <Text style={styles.statNumber}>4</Text>
          </View>
          <Text style={styles.statLabel}>This month</Text>
        </TouchableOpacity>
      </View>

      {/* "Available for new requests" Toggle Card */}
      <View style={styles.availableToggleCard}>
        <View style={styles.availableLeft}>
          <View style={styles.availableIconBox}>
            <Icon name="check-circle" size={18} color="#10B981" />
          </View>
          <View style={styles.availableTextCol}>
            <Text style={styles.availableTitle}>Available for new requests</Text>
            <Text style={styles.availableSub}>You will appear in search results</Text>
          </View>
        </View>

        <Switch
          value={availableForRequests}
          onValueChange={setAvailableForRequests}
          trackColor={{ false: '#CBD5E1', true: '#10B981' }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* Section: Incoming Requests (3) */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Incoming Requests ({pendingPokes.length > 0 ? pendingPokes.length : 3})
        </Text>
        <TouchableOpacity onPress={() => setActiveTab('requests')}>
          <Text style={styles.viewAllLink}>View all →</Text>
        </TouchableOpacity>
      </View>

      {/* Requests List */}
      <View style={styles.requestsList}>
        {displayRequests.map((req, idx) => {
          const sender = req.sender || { fullName: 'Investor' };
          const avatarSource =
            idx % 2 === 0
              ? require('../../../assets/investor-avatar.jpg')
              : require('../../../assets/holder-avatar.jpg');

          return (
            <View key={req.id || idx} style={styles.requestCard}>
              {/* Left Avatar */}
              <View style={styles.reqAvatarContainer}>
                <Image source={avatarSource} style={styles.reqAvatarImg} resizeMode="cover" />
              </View>

              {/* Middle Info */}
              <View style={styles.reqInfoCol}>
                <Text style={styles.reqSenderName}>{sender.fullName}</Text>
                <Text style={styles.reqTimeAgo}>{req.timeAgo || 'Recently'}</Text>
                <View style={styles.reqTagsRow}>
                  {(req.tags || ['NSE', 'BSE']).map((t: string) => (
                    <View key={t} style={styles.reqTagPill}>
                      <Text style={styles.reqTagText}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Right Action Buttons: Accept & Decline */}
              <View style={styles.reqActionButtons}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  activeOpacity={0.85}
                  disabled={processingId === req.id}
                  onPress={() => handleAccept(req.id, req.proposedCommissionRate || 5.0)}
                >
                  {processingId === req.id ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.acceptBtnText}>Accept</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.declineBtn}
                  activeOpacity={0.85}
                  disabled={processingId === req.id}
                  onPress={() => handleReject(req.id)}
                >
                  <Text style={styles.declineBtnText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: 90
  },
  profileCompletionCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
    ...shadows.sm
  },
  completionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  circularProgressContainer: {
    width: 54,
    height: 54,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center'
  },
  progressTextOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center'
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  completionTextCol: {
    marginLeft: spacing.md,
    flex: 1
  },
  completionTitle: {
    fontSize: 14.5,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  completionSub: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 2
  },
  statsCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginBottom: spacing.md
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm
  },
  statTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  statIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statNumber: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: typography.weights.medium,
    color: colors.secondaryText,
    marginTop: 2
  },
  availableToggleCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
    ...shadows.sm
  },
  availableLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  availableIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm
  },
  availableTextCol: {
    flex: 1
  },
  availableTitle: {
    fontSize: 13.5,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  availableSub: {
    fontSize: 10.5,
    color: colors.secondaryText,
    marginTop: 1
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  viewAllLink: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue
  },
  requestsList: {
    gap: spacing.sm
  },
  requestCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm
  },
  reqAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#EBF2FF',
    overflow: 'hidden'
  },
  reqAvatarImg: {
    width: '100%',
    height: '100%'
  },
  reqInfoCol: {
    flex: 1,
    marginLeft: spacing.md
  },
  reqSenderName: {
    fontSize: 14.5,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  reqTimeAgo: {
    fontSize: 10.5,
    color: colors.secondaryText,
    marginTop: 1
  },
  reqTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4
  },
  reqTagPill: {
    backgroundColor: '#F0F5FF',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: borderRadius.chip
  },
  reqTagText: {
    fontSize: 9.5,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue
  },
  reqActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  acceptBtn: {
    backgroundColor: colors.primaryBlue,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: borderRadius.full,
    ...shadows.sm
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: typography.weights.bold
  },
  declineBtn: {
    backgroundColor: colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border
  },
  declineBtnText: {
    color: colors.secondaryText,
    fontSize: 12,
    fontWeight: typography.weights.medium
  }
});
