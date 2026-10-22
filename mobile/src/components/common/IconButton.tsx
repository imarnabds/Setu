import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from './Icon';

interface TextButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const TextButton: React.FC<TextButtonProps> = ({
  label,
  onPress,
  disabled = false,
  color = colors.primaryActionBlue,
  icon,
  style,
  textStyle
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled}
      style={[styles.container, style]}
    >
      {icon && <Icon name={icon} size={16} color={disabled ? colors.secondaryText : color} />}
      <Text
        style={[
          styles.text,
          { color: disabled ? colors.secondaryText : color },
          icon ? { marginLeft: spacing.xs } : null,
          textStyle
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

interface IconButtonProps {
  name: string;
  onPress: () => void;
  size?: number;
  iconSize?: number;
  color?: string;
  backgroundColor?: string;
  badge?: number;
  style?: ViewStyle;
}

export const IconButton: React.FC<IconButtonProps> = ({
  name,
  onPress,
  size = 40,
  iconSize = 20,
  color = colors.primaryNavy,
  backgroundColor = 'transparent',
  badge,
  style
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.iconButton,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor
        },
        style
      ]}
    >
      <Icon name={name} size={iconSize} color={color} />
      {badge !== undefined && badge > 0 && (
        <TouchableOpacity style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs
  },
  text: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.error,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  badgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: typography.weights.bold
  }
});
