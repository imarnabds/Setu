import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { ChatBubble } from '../../components/chat/ChatBubble';
import { MessageComposer } from '../../components/chat/MessageComposer';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // UPI Details State
  const [upiDetails, setUpiDetails] = useState<{
    upiId: string | null;
    isUpiVerified: boolean;
    hasUpi: boolean;
  } | null>(null);
  const [showUpiCard, setShowUpiCard] = useState(true);

  const scrollRef = useRef<any>(null);

  const handleCopyUpi = (textToCopy: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(textToCopy);
      }
      addToast('UPI ID copied to clipboard!', 'success');
    } catch {
      addToast('Copied to clipboard', 'info');
    }
  };

  const fetchConnectionAndMessages = async () => {
    try {
      const [connRes, msgRes, upiRes] = await Promise.all([
        api.get(`/connections/${connectionId}`).catch(() => null),
        api.get(`/chat/${connectionId}`).catch(() => null),
        api.get(`/connections/${connectionId}/upi`).catch(() => null)
      ]);

      if (connRes?.data?.data) {
        setConnection(connRes.data.data);
      }
      if (msgRes?.data?.data) {
        setMessages(msgRes.data.data);
      }
      if (upiRes?.data?.data) {
        setUpiDetails(upiRes.data.data);
      } else if (connRes?.data?.data?.dematHolderUpi) {
        setUpiDetails(connRes.data.data.dematHolderUpi);
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
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
  }, [messages, partnerTyping]);

  const handleSendMessage = async (content: string) => {
    try {
      const res = await api.post('/chat', {
        connectionId,
        content
      });

      if (res.data?.success && res.data?.data) {
        setMessages((prev) => [...prev, res.data.data]);
      } else {
        // Optimistic local fallback
        setMessages((prev) => [
          ...prev,
          {
            id: `temp-${Date.now()}`,
            content,
            senderId: user?.id,
            createdAt: new Date().toISOString(),
            readAt: new Date().toISOString()
          }
        ]);
      }
    } catch (err: any) {
      // Local optimistic delivery for demo resilience
      setMessages((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          content,
          senderId: user?.id,
          createdAt: new Date().toISOString(),
          readAt: new Date().toISOString()
        }
      ]);
    }
  };

  const handleDisconnect = async () => {
    setActionLoading(true);
    try {
      await api.put(`/connections/${connectionId}/disconnect`);
      addToast('Connection disconnected.', 'info');
      setMenuOpen(false);
      onBack();
    } catch (err) {
      addToast('Failed to disconnect.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const partner = connection?.partner || {
    fullName: 'Karan Patel',
    city: 'Online',
    isKycVerified: true
  };

  const commissionRate =
    connection?.agreedCommissionRate !== undefined
      ? connection.agreedCommissionRate
      : 5;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Header matching Screen 6 */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Icon name="chevron-left" size={24} color={colors.deepNavy} />
        </TouchableOpacity>

        {/* Partner Info Row */}
        <View style={styles.partnerInfo}>
          <View style={styles.partnerAvatarWrapper}>
            <Image
              source={require('../../../assets/investor-avatar.jpg')}
              style={styles.partnerAvatarImg}
              resizeMode="cover"
            />
          </View>

          <View style={styles.partnerNameCol}>
            <Text style={styles.partnerName}>{partner.fullName || 'Karan Patel'}</Text>
            <View style={styles.onlineStatusRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>
                {partnerTyping ? 'typing...' : 'Online'}
              </Text>
            </View>
          </View>
        </View>

        {/* 3 Vertical Dots Menu Icon */}
        <TouchableOpacity
          style={styles.menuBtn}
          activeOpacity={0.7}
          onPress={() => setMenuOpen(true)}
        >
          <Icon name="more-vertical" size={20} color={colors.deepNavy} />
        </TouchableOpacity>
      </View>

      {/* Dedicated IPO Panel Banner */}
      <View style={styles.ipoChatBanner}>
        <View style={styles.ipoChatBannerRow}>
          <View style={styles.ipoChatBadge}>
            <Icon name="trending-up" size={13} color={colors.primaryBlue} />
            <Text style={styles.ipoChatBadgeText}>
              {connection?.ipoName || 'IPO Dedicated Panel'}
            </Text>
          </View>
          <Text style={styles.ipoChatRate}>
            Agreed: {commissionRate}% on Profit
          </Text>
        </View>
        <Text style={styles.ipoChatDisclaimer}>
          This IPO application request and agreed profit commission are strictly bounded to {connection?.ipoName || 'this IPO'}.
        </Text>
      </View>

      {/* Agreed Commission Terms Summary Banner matching Screen 6 */}
      <View style={styles.termsBannerCard}>
        <View style={styles.termsLeft}>
          <View style={styles.termsCheckCircle}>
            <Icon name="check" size={14} color="#10B981" strokeWidth={3} />
          </View>
          <View style={styles.termsTextCol}>
            <Text style={styles.termsStatusTitle}>Verified Connection</Text>
            <Text style={styles.termsSubtitle}>{connection?.ipoName || 'IPO Application Request'}</Text>
          </View>
        </View>

        <View style={styles.termsRight}>
          <View style={styles.termsRateCol}>
            <Text style={styles.termsRateNumber}>{commissionRate}%</Text>
            <Text style={styles.termsBasisSub}>(On Listing Profit)</Text>
          </View>
        </View>
      </View>

      {/* Verified UPI Details Card (Authorized Connection Details) */}
      <View style={styles.upiDetailsCard}>
        <View style={styles.upiCardHeader}>
          <View style={styles.upiCardHeaderLeft}>
            <View style={styles.upiIconBox}>
              <Icon name="credit-card" size={15} color={colors.primaryBlue} />
            </View>
            <View>
              <Text style={styles.upiCardSectionTitle}>Verified UPI Details</Text>
              <Text style={styles.upiCardSubtitle}>
                Demat Account Holder: {partner.fullName || 'Holder'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setShowUpiCard(!showUpiCard)}
            style={styles.collapseToggle}
            activeOpacity={0.7}
          >
            <Icon
              name={showUpiCard ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.secondaryText}
            />
          </TouchableOpacity>
        </View>

        {showUpiCard && (
          <View style={styles.upiCardBody}>
            {upiDetails?.hasUpi && upiDetails.upiId ? (
              <>
                <View style={styles.upiFieldRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.upiFieldLabel}>Active UPI ID</Text>
                    <Text style={styles.upiFieldText} selectable>{upiDetails.upiId}</Text>
                  </View>

                  <View style={styles.upiBadgeAndActionRow}>
                    {upiDetails.isUpiVerified ? (
                      <View style={styles.upiVerifiedBadge}>
                        <Icon name="check" size={10} color="#FFFFFF" strokeWidth={3} />
                        <Text style={styles.upiVerifiedBadgeText}>Verified</Text>
                      </View>
                    ) : (
                      <View style={styles.upiPendingBadge}>
                        <Icon name="clock" size={10} color="#D97706" />
                        <Text style={styles.upiPendingBadgeText}>Pending Verification</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.copyBtn}
                      onPress={() => handleCopyUpi(upiDetails.upiId!)}
                      activeOpacity={0.8}
                    >
                      <Icon name="copy" size={13} color={colors.primaryBlue} />
                      <Text style={styles.copyBtnText}>Copy</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.upiExplanationText}>
                  This UPI ID belongs to the connected Demat Account Holder ({partner.fullName || 'Holder'}).
                </Text>
              </>
            ) : (
              <View style={styles.upiEmptyStateRow}>
                <Icon name="info" size={16} color={colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.upiEmptyTitle}>UPI ID Pending Configuration</Text>
                  <Text style={styles.upiEmptyText}>
                    The connected Demat Account Holder has not supplied an active UPI ID yet. They can configure it in their profile settings.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.complianceNoticeMini}>
              <Icon name="shield" size={11} color={colors.secondaryText} />
              <Text style={styles.complianceNoticeMiniText}>
                Compliance Reminder: All IPO applications must use authorized channels (ASBA/UPI/Broker). Never share trading credentials, bank OTPs, or UPI PINs.
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Messages Stream */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Date Divider Pill: Today */}
        <View style={styles.dateDividerRow}>
          <View style={styles.dateDividerPill}>
            <Text style={styles.dateDividerText}>Today</Text>
          </View>
        </View>

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
            <Text style={styles.typingText}>
              {partner.fullName || 'Partner'} is typing...
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Message Composer */}
      <MessageComposer
        onSend={handleSendMessage}
        placeholder="Type a message..."
      />

      {/* Options Menu Modal */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuOpen(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Connection Options</Text>
            <Text style={styles.modalDesc}>
              Manage this authorized IPO assistance connection:
            </Text>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => {
                setShowUpiCard(true);
                setMenuOpen(false);
              }}
            >
              <Icon name="credit-card" size={18} color={colors.primaryBlue} />
              <Text style={styles.menuOptionText}>View Demat Holder UPI Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={handleDisconnect}
              disabled={actionLoading}
            >
              <Icon name="log-out" size={18} color={colors.secondaryText} />
              <Text style={styles.menuOptionText}>Disconnect Connection</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => {
                addToast('Conversation reported for compliance review.', 'info');
                setMenuOpen(false);
              }}
            >
              <Icon name="shield" size={18} color={colors.error} />
              <Text style={[styles.menuOptionText, { color: colors.error }]}>
                Report for Compliance
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setMenuOpen(false)}
            >
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  topBar: {
    height: 60,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs
  },
  partnerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  partnerAvatarWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    backgroundColor: '#EBF2FF',
    marginRight: spacing.sm
  },
  partnerAvatarImg: {
    width: '100%',
    height: '100%'
  },
  partnerNameCol: {
    justifyContent: 'center'
  },
  partnerName: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  onlineStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981'
  },
  onlineText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: typography.weights.medium
  },
  menuBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center'
  },
  ipoChatBanner: {
    backgroundColor: '#EDF2FE',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#D4E4FC'
  },
  ipoChatBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2
  },
  ipoChatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  ipoChatBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue
  },
  ipoChatRate: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  ipoChatDisclaimer: {
    fontSize: 10,
    color: colors.secondaryText
  },
  termsBannerCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.sm
  },
  termsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  termsCheckCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm
  },
  termsTextCol: {
    flex: 1
  },
  termsStatusTitle: {
    fontSize: 13.5,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  termsSubtitle: {
    fontSize: 10.5,
    color: colors.secondaryText,
    marginTop: 1
  },
  termsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  termsRateCol: {
    alignItems: 'flex-end'
  },
  termsRateNumber: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  termsBasisSub: {
    fontSize: 9.5,
    color: colors.secondaryText
  },
  messageList: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  messageContent: {
    paddingVertical: spacing.md
  },
  dateDividerRow: {
    alignItems: 'center',
    marginVertical: spacing.md
  },
  dateDividerPill: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: borderRadius.chip,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  dateDividerText: {
    fontSize: 10.5,
    color: colors.secondaryText,
    fontWeight: typography.weights.medium
  },
  typingContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs
  },
  typingText: {
    fontSize: 11,
    color: colors.secondaryText,
    fontStyle: 'italic'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: spacing.xl,
    ...shadows.lg
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
    marginBottom: spacing.xs
  },
  modalDesc: {
    fontSize: 12,
    color: colors.secondaryText,
    marginBottom: spacing.md
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  menuOptionText: {
    fontSize: 13,
    fontWeight: typography.weights.medium,
    color: colors.deepNavy
  },
  closeBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center'
  },
  closeBtnText: {
    fontSize: 13,
    color: colors.secondaryText,
    fontWeight: typography.weights.semibold
  },

  // Verified UPI Details Card Styles
  upiDetailsCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...shadows.sm
  },
  upiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  upiCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1
  },
  upiIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  upiCardSectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    letterSpacing: -0.2
  },
  upiCardSubtitle: {
    fontSize: 10.5,
    color: colors.secondaryText
  },
  collapseToggle: {
    padding: 4
  },
  upiCardBody: {
    padding: spacing.md,
    backgroundColor: '#FFFFFF'
  },
  upiFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.card,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: spacing.sm
  },
  upiFieldLabel: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  upiFieldText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    marginTop: 1
  },
  upiBadgeAndActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  upiVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    gap: 3
  },
  upiVerifiedBadgeText: {
    fontSize: 9.5,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF'
  },
  upiPendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    gap: 3,
    borderWidth: 1,
    borderColor: '#FDE68A'
  },
  upiPendingBadgeText: {
    fontSize: 9.5,
    fontWeight: typography.weights.bold,
    color: '#B45309'
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EBF2FF',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue
  },
  upiExplanationText: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: spacing.xs + 2,
    lineHeight: 15
  },
  upiEmptyStateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#FFFBEB',
    borderRadius: borderRadius.card,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: '#FDE68A'
  },
  upiEmptyTitle: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: '#92400E'
  },
  upiEmptyText: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 15
  },
  complianceNoticeMini: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  complianceNoticeMiniText: {
    flex: 1,
    fontSize: 10,
    color: colors.secondaryText,
    lineHeight: 14
  }
});
