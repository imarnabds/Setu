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
import { borderRadius, spacing } from '../../theme/spacing';
import { Icon } from '../common/Icon';
import { ConfirmationModal } from '../common/ConfirmationModal';

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
  const [loading, setLoading] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);

  const handlePress = () => {
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
            <Icon name="poke" size={16} color={colors.surface} />
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
            <Icon name="poke" size={16} color={colors.surface} />
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
        activeOpacity={0.8}
        onPress={handlePress}
        disabled={loading || state === 'rejected' || state === 'blocked'}
        style={[styles.button, getButtonStyle(), style]}
      >
        {renderContent()}
      </TouchableOpacity>

      {/* Confirmation sheet before sending Poke */}
      <ConfirmationModal
        visible={confirmModalVisible}
        title={`Send Poke to ${recipientName}?`}
        description={`Poking requests an introduction. A private chat and service discussion will only be enabled after ${recipientName} accepts your request.`}
        confirmLabel="Send Poke"
        cancelLabel="Cancel"
        loading={loading}
        onConfirm={handleConfirmSend}
        onCancel={() => setConfirmModalVisible(false)}
      >
        <View style={styles.termsBox}>
          <Text style={styles.termsTitle}>Published Service Terms:</Text>
          <Text style={styles.termsRate}>
            {commissionRate !== undefined ? `${commissionRate.toFixed(1)}% Commission` : 'Standard Terms'}
          </Text>
          <Text style={styles.termsBasis}>
            Basis: {commissionBasis || 'Documented Advisory Service Fee Base'}
          </Text>
          <Text style={styles.complianceDisclaimer}>
            Important: The app facilitates lawful introductions. Actual IPO applications must use authorized channels (ASBA/UPI) in accordance with SEBI guidelines. Never share login passwords or OTPs.
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
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md
  },
  btnPrimary: {
    backgroundColor: colors.primaryActionBlue
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
    backgroundColor: colors.subtleBlueBackground,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  termsTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  termsRate: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primaryActionBlue,
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
