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
          <Icon name="shield" size={14} color={colors.primaryBlue} />
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
                name="check-double"
                size={13}
                color="#93C5FD"
                strokeWidth={2}
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
    backgroundColor: '#F0F5FF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.sm,
    marginVertical: spacing.xs,
    marginHorizontal: spacing.md,
    alignItems: 'center'
  },
  systemIcon: {
    marginBottom: 2
  },
  systemText: {
    fontSize: 11,
    color: colors.deepNavy,
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: typography.weights.medium
  },
  systemTime: {
    fontSize: 9.5,
    color: colors.secondaryText,
    marginTop: 2
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
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18
  },
  bubbleMe: {
    backgroundColor: colors.primaryBlue,
    borderBottomRightRadius: 4
  },
  bubbleThem: {
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 4
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 19
  },
  textMe: {
    color: '#FFFFFF',
    fontWeight: typography.weights.normal
  },
  textThem: {
    color: colors.deepNavy,
    fontWeight: typography.weights.normal
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 3
  },
  timeText: {
    fontSize: 10,
    fontVariant: ['tabular-nums']
  },
  timeMe: {
    color: 'rgba(255, 255, 255, 0.85)'
  },
  timeThem: {
    color: colors.secondaryText
  },
  readIcon: {
    marginLeft: 1
  }
});
