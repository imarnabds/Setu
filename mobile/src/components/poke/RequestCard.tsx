import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ViewStyle
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { ProfileAvatar } from '../common/ProfileAvatar';
import { StatusBadge } from '../common/StatusBadge';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { Icon } from '../common/Icon';

interface RequestCardProps {
  poke: any;
  currentUserId: string;
  onAccept?: (pokeId: string, agreedRate: number, agreedBasis: string) => Promise<void>;
  onReject?: (pokeId: string, reason?: string) => Promise<void>;
  onCancel?: (pokeId: string) => Promise<void>;
  onOpenChat?: (connectionId?: string) => void;
  onViewProfile?: (userId: string) => void;
  style?: ViewStyle;
}

export const RequestCard: React.FC<RequestCardProps> = ({
  poke,
  currentUserId,
  onAccept,
  onReject,
  onCancel,
  onOpenChat,
  onViewProfile,
  style
}) => {
  const isIncoming = poke.recipientId === currentUserId;
  const counterpart = isIncoming ? poke.sender : poke.recipient;
  const counterpartName = counterpart?.fullName || 'User';

  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);

  // Proposed terms
  const rate = poke.proposedCommissionRate !== undefined ? poke.proposedCommissionRate : 5.0;
  const basis = poke.commissionBasis || 'Documented Advisory Service Fee Base';

  const handleAcceptConfirm = async () => {
    if (!onAccept) return;
    setLoading(true);
    try {
      await onAccept(poke.id, rate, basis);
      setAcceptModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!onReject) return;
    setLoading(true);
    try {
      await onReject(poke.id, rejectionReason);
      setRejectModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!onCancel) return;
    setLoading(true);
    try {
      await onCancel(poke.id);
      setCancelModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = new Date(poke.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short'
  });

  return (
    <View style={[styles.card, style]}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.userInfo}
          activeOpacity={0.8}
          onPress={() => onViewProfile && counterpart && onViewProfile(counterpart.id)}
        >
          <ProfileAvatar
            name={counterpartName}
            avatarUrl={counterpart?.avatarUrl}
            size={44}
            isVerified={counterpart?.isKycVerified}
          />
          <View style={styles.nameContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.nameText}>{counterpartName}</Text>
              {counterpart?.isKycVerified && (
                <View style={styles.verifiedIcon}>
                  <Icon name="check" size={12} color={colors.success} strokeWidth={3} />
                </View>
              )}
            </View>
            <Text style={styles.metaText}>
              {counterpart?.city ? `${counterpart.city} • ` : ''}
              {formattedDate}
            </Text>
          </View>
        </TouchableOpacity>

        <StatusBadge status={poke.status} />
      </View>

      {/* Target IPO Badge */}
      {poke.ipoName && (
        <View style={styles.ipoBadgeRow}>
          <Icon name="trending-up" size={11} color={colors.primaryBlue} />
          <Text style={styles.ipoBadgeText}>{poke.ipoName}</Text>
        </View>
      )}

      {/* Message / Purpose */}
      {poke.message ? (
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>"{poke.message}"</Text>
        </View>
      ) : null}

      {/* Proposed Terms Box */}
      <View style={styles.termsBox}>
        <View style={styles.termsRow}>
          <Icon name="percent" size={14} color={colors.primaryActionBlue} />
          <Text style={styles.termsLabel}>Proposed Commission:</Text>
          <Text style={styles.termsValue}>{rate.toFixed(1)}%</Text>
        </View>
        <Text style={styles.termsBasisText}>Basis: {basis}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        {isIncoming && poke.status === 'pending' && (
          <>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setRejectModalOpen(true)}
              style={[styles.btn, styles.btnDecline]}
            >
              <Text style={styles.btnDeclineText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setAcceptModalOpen(true)}
              style={[styles.btn, styles.btnAccept]}
            >
              <Text style={styles.btnAcceptText}>Accept Poke</Text>
            </TouchableOpacity>
          </>
        )}

        {!isIncoming && poke.status === 'pending' && onCancel && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setCancelModalOpen(true)}
            style={[styles.btn, styles.btnOutline]}
          >
            <Text style={styles.btnOutlineText}>Withdraw Poke</Text>
          </TouchableOpacity>
        )}

        {poke.status === 'accepted' && onOpenChat && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onOpenChat()}
            style={[styles.btn, styles.btnChat]}
          >
            <Icon name="message" size={16} color={colors.surface} />
            <Text style={styles.btnChatText}>Open Chat</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Accept Confirmation Modal */}
      <ConfirmationModal
        visible={acceptModalOpen}
        title={`Accept Poke from ${counterpartName}?`}
        description="Accepting this request will create an active connection and unlock a private in-app conversation."
        confirmLabel="Confirm & Accept"
        cancelLabel="Back"
        loading={loading}
        onConfirm={handleAcceptConfirm}
        onCancel={() => setAcceptModalOpen(false)}
      >
        <View style={styles.modalTermsBox}>
          <Text style={styles.modalTermsTitle}>Agreed Terms on Acceptance:</Text>
          <Text style={styles.modalTermsHighlight}>{rate.toFixed(1)}% Commission</Text>
          <Text style={styles.modalTermsSub}>Basis: {basis}</Text>
          <Text style={styles.modalNotice}>
            These terms will be recorded and pinned inside your private chat. You can discuss procedural steps lawfully.
          </Text>
        </View>
      </ConfirmationModal>

      {/* Reject Modal */}
      <ConfirmationModal
        visible={rejectModalOpen}
        title={`Decline Poke from ${counterpartName}?`}
        description="The investor will be politely notified that you are unable to connect at this time."
        confirmLabel="Decline Request"
        cancelLabel="Keep Pending"
        isDestructive
        loading={loading}
        onConfirm={handleRejectConfirm}
        onCancel={() => setRejectModalOpen(false)}
      >
        <TextInput
          placeholder="Optional polite reason (e.g. at capacity for current IPO cycle)"
          placeholderTextColor={colors.secondaryText}
          value={rejectionReason}
          onChangeText={setRejectionReason}
          style={styles.reasonInput}
        />
      </ConfirmationModal>

      {/* Cancel Modal */}
      <ConfirmationModal
        visible={cancelModalOpen}
        title="Withdraw Poke Request?"
        description="Are you sure you want to withdraw this request before the Demat holder reviews it?"
        confirmLabel="Withdraw"
        cancelLabel="Keep Request"
        isDestructive
        loading={loading}
        onConfirm={handleCancelConfirm}
        onCancel={() => setCancelModalOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  ipoBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF2FE',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D4E4FC',
    gap: 4,
    marginTop: 6
  },
  ipoBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  nameContainer: {
    marginLeft: spacing.md,
    flex: 1
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  nameText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    letterSpacing: -0.2
  },
  verifiedIcon: {
    marginLeft: 5
  },
  metaText: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    marginTop: 2
  },
  messageContainer: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.sm + 2,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  messageText: {
    fontSize: typography.sizes.sm,
    color: colors.primaryText,
    fontStyle: 'italic',
    lineHeight: 19
  },
  termsBox: {
    backgroundColor: colors.subtleBlueBackground,
    padding: spacing.sm + 2,
    borderRadius: 16,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: '#D4E4FC'
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  termsLabel: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    marginLeft: 6,
    fontWeight: typography.weights.medium
  },
  termsValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryActionBlue,
    marginLeft: 4,
    fontVariant: ['tabular-nums']
  },
  termsBasisText: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 3,
    lineHeight: 15
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm + 2
  },
  btn: {
    height: 38,
    borderRadius: borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg
  },
  btnDecline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  btnDeclineText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.secondaryText
  },
  btnAccept: {
    backgroundColor: colors.primaryActionBlue,
    ...shadows.sm
  },
  btnAcceptText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.surface
  },
  btnOutline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  btnOutlineText: {
    fontSize: typography.sizes.sm,
    color: colors.secondaryText,
    fontWeight: typography.weights.medium
  },
  btnChat: {
    backgroundColor: colors.primaryActionBlue,
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    ...shadows.sm
  },
  btnChatText: {
    color: colors.surface,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    marginLeft: 6
  },
  modalTermsBox: {
    backgroundColor: colors.subtleBlueBackground,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D4E4FC'
  },
  modalTermsTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  modalTermsHighlight: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.primaryActionBlue,
    marginTop: 4,
    fontVariant: ['tabular-nums']
  },
  modalTermsSub: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    marginTop: 2
  },
  modalNotice: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 8,
    lineHeight: 16
  },
  reasonInput: {
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.primaryText,
    backgroundColor: colors.surface
  }
});
