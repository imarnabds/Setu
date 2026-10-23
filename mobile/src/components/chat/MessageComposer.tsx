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
  placeholder = 'Type a message...',
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
      {/* Paperclip Attachment Icon */}
      <TouchableOpacity
        style={styles.attachBtn}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <Icon name="paperclip" size={20} color={colors.secondaryText} />
      </TouchableOpacity>

      {/* Input Pill Container */}
      <View style={styles.inputWrapper}>
        <TextInput
          value={text}
          onChangeText={handleChangeText}
          placeholder={disabled ? 'Conversation unavailable' : placeholder}
          placeholderTextColor={colors.mutedText}
          editable={!disabled && !sending}
          multiline={false}
          maxLength={1000}
          style={styles.input}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
      </View>

      {/* Circular Blue Send Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleSend}
        disabled={!text.trim() || sending || disabled}
        style={[
          styles.sendButton,
          text.trim() && !disabled && !sending
            ? styles.sendButtonActive
            : styles.sendButtonDisabled
        ]}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Icon name="send" size={16} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight
  },
  attachBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center'
  },
  inputWrapper: {
    flex: 1,
    height: 44,
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    justifyContent: 'center'
  },
  input: {
    fontSize: typography.sizes.sm,
    color: colors.deepNavy,
    height: '100%',
    paddingVertical: 0
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryBlue,
    ...shadows.sm
  },
  sendButtonActive: {
    backgroundColor: colors.primaryBlue
  },
  sendButtonDisabled: {
    backgroundColor: '#93C5FD'
  }
});
