import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { Icon } from './Icon';

interface SecondaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  label,
  onPress,
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.button, disabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={colors.primaryBlue} size="small" />
      ) : (
        <>
          {icon && (
            <Icon
              name={icon}
              size={18}
              color={disabled ? colors.secondaryText : colors.deepNavy}
            />
          )}
          <Text
            style={[
              styles.text,
              icon ? { marginLeft: spacing.sm } : null,
              disabled && { color: colors.secondaryText },
              textStyle
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    ...shadows.sm
  },
  disabled: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle
  },
  text: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.deepNavy
  }
});
