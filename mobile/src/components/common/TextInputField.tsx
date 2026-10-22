import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardTypeOptions,
  ViewStyle
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';
import { Icon } from './Icon';

export interface TextInputFieldProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export const TextInputField: React.FC<TextInputFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helperText,
  keyboardType = 'default',
  secureTextEntry = false,
  multiline = false,
  numberOfLines = 1,
  leftIcon,
  rightIcon,
  onRightIconPress,
  disabled = false,
  style
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          error ? styles.inputError : null,
          disabled ? styles.inputDisabled : null,
          multiline ? { height: 24 * numberOfLines + 20, alignItems: 'flex-start' } : null
        ]}
      >
        {leftIcon && (
          <View style={styles.leftIcon}>
            <Icon
              name={leftIcon}
              size={18}
              color={error ? colors.error : isFocused ? colors.primaryActionBlue : colors.secondaryText}
            />
          </View>
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.secondaryText}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[styles.input, multiline ? { textAlignVertical: 'top' } : null]}
        />
        {rightIcon && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onRightIconPress}
            style={styles.rightIcon}
          >
            <Icon name={rightIcon} size={18} color={colors.secondaryText} />
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

export const PasswordInputField: React.FC<Omit<TextInputFieldProps, 'secureTextEntry' | 'rightIcon' | 'onRightIconPress'>> = (
  props
) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <TextInputField
      {...props}
      secureTextEntry={!showPassword}
      leftIcon={props.leftIcon || 'lock'}
      rightIcon={showPassword ? 'eye-off' : 'eye'}
      onRightIconPress={() => setShowPassword(!showPassword)}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primaryNavy,
    marginBottom: spacing.xs
  },
  inputContainer: {
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md
  },
  inputFocused: {
    borderColor: colors.borderFocus,
    backgroundColor: colors.surface
  },
  inputError: {
    borderColor: colors.error
  },
  inputDisabled: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border
  },
  leftIcon: {
    marginRight: spacing.sm
  },
  rightIcon: {
    marginLeft: spacing.sm,
    padding: spacing.xs
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: typography.sizes.base,
    color: colors.primaryText
  },
  errorText: {
    fontSize: typography.sizes.xs,
    color: colors.error,
    marginTop: spacing.xs,
    fontWeight: typography.weights.medium
  },
  helperText: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    marginTop: spacing.xs
  }
});
