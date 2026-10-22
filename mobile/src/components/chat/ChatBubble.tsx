import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';
import { Icon } from '../common/Icon';

interface ChatBubbleProps {
  content: string;
  type?: 'text' | 'system' | 'commission_proposal';
  isMe: boolean;
  timestamp: string;
  readAt?: string;
  metadata?: any;
  style?: ViewStyle;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  content,
  type = 'text',
  isMe,
  timestamp,
  readAt,
  metadata,
  style
}) => {
  const formattedTime = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  if (type === 'system') {
    return (
      <View style={[styles.systemContainer, style]}>
        <View style={styles.systemIcon}>
          <Icon name="shield" size={14} color={colors.primaryActionBlue} />
        </View>
        <Text style={styles.systemText}>{content}</Text>
        <Text style={styles.systemTime}>{formattedTime}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.row,
        isMe ? styles.rowMe : styles.rowThem,
        style
      ]}
    >
      <View
        style={[
          styles.bubble,
          isMe ? styles.bubbleMe : styles.bubbleThem
        ]}
      >
        <Text style={[styles.messageText, isMe ? styles.textMe : styles.textThem]}>
          {content}
        </Text>
        <View style={styles.footerRow}>
          <Text style={[styles.timeText, isMe ? styles.timeMe : styles.timeThem]}>
            {formattedTime}
          </Text>
          {isMe && (
            <View style={styles.readIcon}>
              <Icon
                name={readAt ? 'check-circle' : 'check'}
                size={12}
                color={readAt ? colors.success : 'rgba(255,255,255,0.7)'}
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  systemContainer: {
    backgroundColor: colors.subtleBlueBackground,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginVertical: spacing.sm,
    marginHorizontal: spacing.md,
    alignItems: 'center'
  },
  systemIcon: {
    marginBottom: 4
  },
  systemText: {
    fontSize: typography.sizes.xs,
    color: colors.primaryNavy,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: typography.weights.medium
  },
  systemTime: {
    fontSize: 10,
    color: colors.secondaryText,
    marginTop: 4
  },
  row: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: spacing.md
  },
  rowMe: {
    justifyContent: 'flex-end'
  },
  rowThem: {
    justifyContent: 'flex-start'
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg
  },
  bubbleMe: {
    backgroundColor: colors.primaryActionBlue,
    borderBottomRightRadius: 2
  },
  bubbleThem: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 2
  },
  messageText: {
    fontSize: typography.sizes.sm,
    lineHeight: 20
  },
  textMe: {
    color: colors.surface
  },
  textThem: {
    color: colors.primaryText
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2
  },
  timeText: {
    fontSize: 10,
    marginRight: 2
  },
  timeMe: {
    color: 'rgba(255,255,255,0.75)'
  },
  timeThem: {
    color: colors.secondaryText
  },
  readIcon: {
    marginLeft: 2
  }
});
