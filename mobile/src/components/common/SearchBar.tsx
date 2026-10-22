import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';
import { Icon } from './Icon';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  onFilterPress?: () => void;
  hasActiveFilters?: boolean;
  style?: ViewStyle;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search by name, city, or IPO expertise...',
  onClear,
  onFilterPress,
  hasActiveFilters = false,
  style
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.searchBox}>
        <Icon name="search" size={18} color={colors.secondaryText} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.secondaryText}
          style={styles.input}
        />
        {value.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClear || (() => onChangeText(''))}
            style={styles.clearButton}
          >
            <Icon name="x" size={16} color={colors.secondaryText} />
          </TouchableOpacity>
        )}
      </View>
      {onFilterPress && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onFilterPress}
          style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
        >
          <Icon
            name="filter"
            size={18}
            color={hasActiveFilters ? colors.surface : colors.primaryNavy}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  searchBox: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.primaryText,
    marginLeft: spacing.sm,
    height: '100%'
  },
  clearButton: {
    padding: spacing.xs
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm
  },
  filterButtonActive: {
    backgroundColor: colors.primaryActionBlue,
    borderColor: colors.primaryActionBlue
  }
});
