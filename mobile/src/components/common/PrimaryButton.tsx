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

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  variant?: 'blue' | 'navy' | 'danger' | 'success';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label,
  onPress,
  loading = false,
  disabled = false,
  icon,
  variant = 'blue',
  style,
  textStyle
}) => {
  const getBackgroundColor = () => {
    if (disabled) return colors.border;
    switch (variant) {
      case 'navy':
        return colors.deepNavy;
      case 'danger':
        return colors.error;
      case 'success':
        return colors.success;
      case 'blue':
      default:
        return colors.primaryBlue;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        !disabled && styles.buttonShadow,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.surface} size="small" />
      ) : (
        <>
          {icon && (
            <Icon
              name={icon}
              size={18}
              color={disabled ? colors.secondaryText : colors.surface}
            />
          )}
          <Text
            style={[
              styles.text,
              { color: disabled ? colors.secondaryText : colors.surface },
              icon ? { marginLeft: spacing.sm } : null,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl
  },
  buttonShadow: {
    ...shadows.sm
  },
  text: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.1
  }
});
