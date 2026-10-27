import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  ViewStyle
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { Icon } from '../common/Icon';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

export type PokeButtonState =
  | 'not_connected'
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'blocked';

interface PokeButtonProps {
  state: PokeButtonState;
  recipientName: string;
  commissionRate?: number;
  commissionBasis?: string;
  onSendPoke: () => Promise<void>;
  onCancelPoke?: () => Promise<void>;
  onOpenChat?: () => void;
  style?: ViewStyle;
}

export const PokeButton: React.FC<PokeButtonProps> = ({
  state,
  recipientName,
  commissionRate,
  commissionBasis,
  onSendPoke,
  onCancelPoke,
  onOpenChat,
  style
}) => {
  const { isGuestMode, isAuthenticated } = useAuthStore();
  const { openGuestPromptModal } = useUIStore();

  const [loading, setLoading] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);

  const handlePress = () => {
    if (isGuestMode || !isAuthenticated) {
      openGuestPromptModal(`request ${recipientName} to apply for an IPO on your behalf`);
      return;
    }
    if (state === 'not_connected') {
      setConfirmModalVisible(true);
    } else if (state === 'pending' && onCancelPoke) {
      setCancelModalVisible(true);
    } else if (state === 'accepted' && onOpenChat) {
      onOpenChat();
    }
  };

  const handleConfirmSend = async () => {
    setLoading(true);
    try {
      await onSendPoke();
      setConfirmModalVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!onCancelPoke) return;
    setLoading(true);
    try {
      await onCancelPoke();
      setCancelModalVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="small" color={colors.surface} />;
    }

    switch (state) {
      case 'not_connected':
        return (
          <>
            <Icon name="poke" size={15} color={colors.surface} />
            <Text style={[styles.text, styles.textWhite]}>Poke</Text>
          </>
        );
      case 'pending':
        return (
          <>
            <Icon name="warning" size={14} color={colors.warning} />
            <Text style={[styles.text, styles.textWarning]}>Poke Sent</Text>
          </>
        );
      case 'accepted':
        return (
          <>
            <Icon name="message" size={14} color={colors.success} />
            <Text style={[styles.text, styles.textSuccess]}>Chat</Text>
          </>
        );
      case 'rejected':
        return (
          <Text style={[styles.text, styles.textMuted]}>Declined</Text>
        );
      case 'blocked':
        return (
          <Text style={[styles.text, styles.textMuted]}>Unavailable</Text>
        );
      default:
        return (
          <>
            <Icon name="poke" size={15} color={colors.surface} />
            <Text style={[styles.text, styles.textWhite]}>Poke</Text>
          </>
        );
    }
  };

  const getButtonStyle = () => {
    switch (state) {
      case 'not_connected':
        return styles.btnPrimary;
      case 'pending':
        return styles.btnPending;
      case 'accepted':
        return styles.btnAccepted;
      case 'rejected':
      case 'blocked':
        return styles.btnDisabled;
      default:
        return styles.btnPrimary;
    }
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        disabled={loading || state === 'rejected' || state === 'blocked'}
        style={[styles.button, getButtonStyle(), style]}
      >
        {renderContent()}
      </TouchableOpacity>

      {/* Confirmation sheet before sending Poke */}
      <ConfirmationModal
        visible={confirmModalVisible}
        title={`Request ${recipientName} to Apply for IPO?`}
        description={`This requests ${recipientName} to apply for the selected IPO on your behalf. Direct messaging unlocks once ${recipientName} accepts your request.`}
        confirmLabel="Send Application Request"
        cancelLabel="Cancel"
        loading={loading}
        onConfirm={handleConfirmSend}
        onCancel={() => setConfirmModalVisible(false)}
      >
        <View style={styles.termsBox}>
          <Text style={styles.termsTitle}>Agreed Profit Terms:</Text>
          <Text style={styles.termsRate}>
            {commissionRate !== undefined ? `${commissionRate.toFixed(1)}% Commission on Profit` : 'Standard Terms'}
          </Text>
          <Text style={styles.termsBasis}>
            Basis: {commissionBasis || 'Commission on Listing Profit'}
          </Text>
          <Text style={styles.complianceDisclaimer}>
            Notice: If shares are allotted, the agreed commission percentage applies strictly to realized listing profits. Never share bank passwords, trading PINs, or OTPs.
          </Text>
        </View>
      </ConfirmationModal>

      {/* Confirmation modal before cancelling Poke */}
      <ConfirmationModal
        visible={cancelModalVisible}
        title="Cancel Poke Request?"
        description={`Are you sure you want to withdraw your pending Poke to ${recipientName}?`}
        confirmLabel="Yes, Cancel Poke"
        cancelLabel="Keep Pending"
        isDestructive
        loading={loading}
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelModalVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 38,
    borderRadius: borderRadius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    ...shadows.sm
  },
  btnPrimary: {
    backgroundColor: colors.primaryBlue
  },
  btnPending: {
    backgroundColor: colors.badgePendingBg,
    borderWidth: 1,
    borderColor: colors.warning
  },
  btnAccepted: {
    backgroundColor: colors.badgeVerifiedBg,
    borderWidth: 1,
    borderColor: colors.success
  },
  btnDisabled: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border
  },
  text: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    marginLeft: 6
  },
  textWhite: {
    color: colors.surface
  },
  textWarning: {
    color: colors.warning
  },
  textSuccess: {
    color: colors.success
  },
  textMuted: {
    color: colors.secondaryText,
    marginLeft: 0
  },
  termsBox: {
    backgroundColor: colors.softBlueHighlight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  termsTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  termsRate: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue,
    marginTop: 2
  },
  termsBasis: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    marginTop: 2
  },
  complianceDisclaimer: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 8,
    lineHeight: 15,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6
  }
});
