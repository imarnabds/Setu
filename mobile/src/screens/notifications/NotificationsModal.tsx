import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { api } from '../../services/api';
import { useUIStore } from '../../store/uiStore';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose
}) => {
  const { setUnreadNotificationsCount, setActiveTab, openChat } = useUIStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      if (res.data?.data) {
        setNotifications(res.data.data.notifications || []);
        setUnreadNotificationsCount(res.data.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchNotifications();
    }
  }, [visible]);

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotificationsCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationPress = async (notif: any) => {
    if (!notif.isRead) {
      await api.put(`/notifications/${notif.id}/read`).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
    }

    onClose();

    // Navigate to context
    if (notif.type === 'poke_received') {
      setActiveTab('pokes');
    } else if (notif.type === 'poke_accepted' && notif.referenceId) {
      openChat(notif.referenceId);
    } else if (notif.type === 'message_received' && notif.referenceId) {
      openChat(notif.referenceId);
    } else if (notif.type === 'poke_rejected') {
      setActiveTab('requests');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'poke_received':
        return { name: 'poke', color: colors.primaryActionBlue };
      case 'poke_accepted':
        return { name: 'check-circle', color: colors.success };
      case 'poke_rejected':
        return { name: 'x-circle', color: colors.error };
      case 'message_received':
        return { name: 'message', color: colors.primaryNavy };
      case 'kyc_status':
        return { name: 'shield', color: colors.primaryActionBlue };
      default:
        return { name: 'bell', color: colors.secondaryText };
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Icon name="bell" size={20} color={colors.primaryNavy} />
              <Text style={styles.title}>Notifications</Text>
            </View>
            <View style={styles.actionsRow}>
              <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
                <Text style={styles.markAllText}>Mark all as read</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Icon name="x" size={20} color={colors.secondaryText} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.feed} contentContainerStyle={styles.feedContent}>
            {notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="bell" size={32} color={colors.secondaryText} />
                <Text style={styles.emptyTitle}>No Notifications</Text>
                <Text style={styles.emptySubtitle}>You're all caught up on alerts and updates.</Text>
              </View>
            ) : (
              notifications.map((notif) => {
                const iconConfig = getNotificationIcon(notif.type);
                const formattedDate = new Date(notif.createdAt).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <TouchableOpacity
                    key={notif.id}
                    activeOpacity={0.8}
                    onPress={() => handleNotificationPress(notif)}
                    style={[
                      styles.notifItem,
                      !notif.isRead && styles.notifItemUnread
                    ]}
                  >
                    <View style={styles.notifIconWrapper}>
                      <Icon name={iconConfig.name} size={18} color={iconConfig.color} />
                    </View>
                    <View style={styles.notifContent}>
                      <View style={styles.notifHeader}>
                        <Text style={styles.notifTitle}>{notif.title}</Text>
                        <Text style={styles.notifTime}>{formattedDate}</Text>
                      </View>
                      <Text style={styles.notifMessage}>{notif.message}</Text>
                    </View>
                    {!notif.isRead && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end'
  },
  backdrop: {
    flex: 1
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.cardLg,
    borderTopRightRadius: borderRadius.cardLg,
    maxHeight: '80%',
    ...shadows.floating
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    letterSpacing: -0.2
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  markAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm
  },
  markAllText: {
    fontSize: typography.sizes.xs,
    color: colors.primaryActionBlue,
    fontWeight: typography.weights.semibold
  },
  closeBtn: {
    padding: spacing.xs
  },
  feed: {
    maxHeight: 500
  },
  feedContent: {
    padding: spacing.md
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center'
  },
  emptyTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    marginTop: spacing.sm
  },
  emptySubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    marginTop: 2
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
    ...shadows.sm
  },
  notifItemUnread: {
    backgroundColor: colors.subtleBlueBackground,
    borderColor: '#D4E4FC'
  },
  notifIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 2
  },
  notifContent: {
    flex: 1
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2
  },
  notifTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy
  },
  notifTime: {
    fontSize: 10,
    color: colors.secondaryText
  },
  notifMessage: {
    fontSize: typography.sizes.xs,
    color: colors.primaryText,
    lineHeight: 16
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryActionBlue,
    alignSelf: 'center',
    marginLeft: spacing.xs
  }
});
