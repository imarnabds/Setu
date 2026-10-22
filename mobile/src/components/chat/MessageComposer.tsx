import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { Icon } from '../common/Icon';

interface MessageComposerProps {
  onSend: (text: string) => Promise<void>;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
  style?: ViewStyle;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSend,
  onTypingStart,
  onTypingStop,
  disabled = false,
  placeholder = 'Type a message to discuss IPO assistance...',
  style
}) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const handleChangeText = (val: string) => {
    setText(val);
    if (!isTyping && val.length > 0 && onTypingStart) {
      setIsTyping(true);
      onTypingStart();
    } else if (isTyping && val.length === 0 && onTypingStop) {
      setIsTyping(false);
      onTypingStop();
    }
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;

    setSending(true);
    if (isTyping && onTypingStop) {
      setIsTyping(false);
      onTypingStop();
    }

    try {
      await onSend(trimmed);
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputWrapper}>
        <TextInput
          value={text}
          onChangeText={handleChangeText}
          placeholder={disabled ? 'Conversation unavailable' : placeholder}
          placeholderTextColor={colors.secondaryText}
          editable={!disabled && !sending}
          multiline
          maxLength={1000}
          style={styles.input}
        />
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSend}
          disabled={!text.trim() || sending || disabled}
          style={[
            styles.sendButton,
            text.trim() && !disabled && !sending ? styles.sendButtonActive : styles.sendButtonDisabled
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <Icon
              name="send"
              size={18}
              color={text.trim() && !disabled ? colors.surface : colors.secondaryText}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 4
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    fontSize: typography.sizes.sm,
    color: colors.primaryText,
    paddingVertical: 6
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm
  },
  sendButtonActive: {
    backgroundColor: colors.primaryActionBlue,
    ...shadows.sm
  },
  sendButtonDisabled: {
    backgroundColor: colors.borderLight
  }
});
