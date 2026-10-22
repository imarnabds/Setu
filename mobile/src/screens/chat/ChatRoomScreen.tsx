import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
import { ChatBubble } from '../../components/chat/ChatBubble';
import { MessageComposer } from '../../components/chat/MessageComposer';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { Icon } from '../../components/common/Icon';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

interface ChatRoomScreenProps {
  connectionId: string;
  onBack: () => void;
}

export const ChatRoomScreen: React.FC<ChatRoomScreenProps> = ({
  connectionId,
  onBack
}) => {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();

  const [connection, setConnection] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const scrollRef = useRef<any>(null);

  const fetchConnectionAndMessages = async () => {
    try {
      const [connRes, msgRes] = await Promise.all([
        api.get(`/connections/${connectionId}`),
        api.get(`/chat/${connectionId}`)
      ]);

      if (connRes.data?.data) {
        setConnection(connRes.data.data);
      }
      if (msgRes.data?.data) {
        setMessages(msgRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load chat data:', err);
    }
  };

  useEffect(() => {
    fetchConnectionAndMessages();

    const socket = getSocket();
    if (socket) {
      socket.emit('join_connection', connectionId);

      const handleNewMessage = (newMsg: any) => {
        if (newMsg.connectionId === connectionId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      };

      const handleUserTyping = (data: any) => {
        if (data.connectionId === connectionId && data.userId !== user?.id) {
          setPartnerTyping(data.isTyping);
        }
      };

      socket.on('message:new', handleNewMessage);
      socket.on('user_typing', handleUserTyping);

      return () => {
        socket.emit('leave_connection', connectionId);
        socket.off('message:new', handleNewMessage);
        socket.off('user_typing', handleUserTyping);
      };
    }
  }, [connectionId]);

  useEffect(() => {
    // Auto-scroll to bottom on message updates
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, partnerTyping]);

  const handleSendMessage = async (content: string) => {
    try {
      const res = await api.post('/chat', {
        connectionId,
        content
      });

      if (res.data?.success && res.data?.data) {
        setMessages((prev) => [...prev, res.data.data]);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to deliver message';
      addToast(errorMsg, 'error');
    }
  };

  const handleTypingStart = () => {
    const socket = getSocket();
    if (socket) {
      socket.emit('typing_start', { connectionId });
    }
  };

  const handleTypingStop = () => {
    const socket = getSocket();
    if (socket) {
      socket.emit('typing_stop', { connectionId });
    }
  };

  const handleDisconnect = async () => {
    setActionLoading(true);
    try {
      await api.put(`/connections/${connectionId}/disconnect`);
      addToast('Connection disconnected.', 'info');
      setDisconnectModalOpen(false);
      onBack();
    } catch (err) {
      addToast('Failed to disconnect.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlock = async () => {
    setActionLoading(true);
    try {
      await api.put(`/connections/${connectionId}/block`);
      addToast('User blocked.', 'info');
      setBlockModalOpen(false);
      onBack();
    } catch (err) {
      addToast('Failed to block user.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const partner = connection?.partner;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Icon name="chevron-left" size={24} color={colors.primaryNavy} />
        </TouchableOpacity>

        <View style={styles.partnerInfo}>
          <ProfileAvatar
            name={partner?.fullName || 'User'}
            avatarUrl={partner?.avatarUrl}
            size={38}
            isVerified={partner?.isKycVerified}
          />
          <View style={styles.nameCol}>
            <View style={styles.nameRow}>
              <Text style={styles.partnerName}>{partner?.fullName || 'User'}</Text>
              {partner?.isKycVerified && (
                <View style={styles.vBadge}>
                  <Icon name="check" size={10} color={colors.surface} strokeWidth={3} />
                </View>
              )}
            </View>
            <Text style={styles.partnerSub}>
              {partnerTyping ? 'typing...' : partner?.city || 'Online'}
            </Text>
          </View>
        </View>

        {/* Options Dropdown / Actions */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionIcon}
            onPress={() => setDisconnectModalOpen(true)}
          >
            <Icon name="log-out" size={18} color={colors.secondaryText} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionIcon}
            onPress={() => setBlockModalOpen(true)}
          >
            <Icon name="x-circle" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Pinned Agreed Commission Terms Banner */}
      <View style={styles.pinnedTermsBanner}>
        <Icon name="percent" size={14} color={colors.primaryActionBlue} />
        <Text style={styles.pinnedTermsText}>
          Agreed Terms: <Text style={styles.bold}>{connection?.agreedCommissionRate?.toFixed(1)}%</Text> on [{connection?.agreedCommissionBasis || 'Advisory Base Fee'}]
        </Text>
      </View>

      {/* Statutory Security Banner */}
      <View style={styles.securityBanner}>
        <Icon name="shield" size={12} color={colors.secondaryText} />
        <Text style={styles.securityText}>
          Compliance Reminder: All IPO bids must be placed via official ASBA/UPI channels. Never share Demat passwords or UPI PINs.
        </Text>
      </View>

      {/* Messages Stream */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
      >
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            content={msg.content}
            type={msg.type}
            isMe={msg.senderId === user?.id}
            timestamp={msg.createdAt}
            readAt={msg.readAt}
            metadata={msg.metadata}
          />
        ))}

        {partnerTyping && (
          <View style={styles.typingContainer}>
            <Text style={styles.typingText}>{partner?.fullName || 'Partner'} is typing...</Text>
          </View>
        )}
      </ScrollView>

      {/* Message Composer */}
      <MessageComposer
        onSend={handleSendMessage}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        disabled={connection?.status !== 'active'}
        placeholder={
          connection?.status !== 'active'
            ? `Connection is ${connection?.status}`
            : 'Type your message...'
        }
      />

      {/* Disconnect Modal */}
      <ConfirmationModal
        visible={disconnectModalOpen}
        title="Disconnect from User?"
        description="Disconnecting will end active messaging. Your agreed terms history will remain archived."
        confirmLabel="Disconnect"
        cancelLabel="Keep Connection"
        isDestructive
        loading={actionLoading}
        onConfirm={handleDisconnect}
        onCancel={() => setDisconnectModalOpen(false)}
      />

      {/* Block Modal */}
      <ConfirmationModal
        visible={blockModalOpen}
        title="Block User?"
        description="Blocked users will not be able to send you Pokes or messages. This action is auditable."
        confirmLabel="Block User"
        cancelLabel="Cancel"
        isDestructive
        loading={actionLoading}
        onConfirm={handleBlock}
        onCancel={() => setBlockModalOpen(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  topBar: {
    height: 64,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    ...shadows.sm
  },
  backBtn: {
    padding: spacing.xs,
    marginRight: spacing.xs
  },
  partnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  nameCol: {
    marginLeft: spacing.sm + 2,
    flex: 1
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  partnerName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    letterSpacing: -0.2
  },
  vBadge: {
    backgroundColor: colors.success,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5
  },
  partnerSub: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 1
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  pinnedTermsBanner: {
    backgroundColor: colors.subtleBlueBackground,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#D4E4FC'
  },
  pinnedTermsText: {
    fontSize: 11,
    color: colors.primaryNavy,
    marginLeft: 6
  },
  bold: {
    fontWeight: typography.weights.bold,
    color: colors.primaryActionBlue
  },
  securityBanner: {
    backgroundColor: colors.surfaceSubtle,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  securityText: {
    fontSize: 10,
    color: colors.secondaryText,
    marginLeft: 6,
    flex: 1
  },
  messageList: {
    flex: 1
  },
  messageContent: {
    paddingVertical: spacing.md
  },
  typingContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 4
  },
  typingText: {
    fontSize: 11,
    color: colors.secondaryText,
    fontStyle: 'italic'
  }
});
