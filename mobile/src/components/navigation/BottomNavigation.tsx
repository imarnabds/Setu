import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, shadows } from '../../theme/spacing';
import { Icon } from '../common/Icon';

interface BottomNavigationProps {
  role: 'investor' | 'demat_holder' | 'admin';
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadPokesCount?: number;
  unreadChatsCount?: number;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  role,
  activeTab,
  onTabChange,
  unreadPokesCount = 0,
  unreadChatsCount = 0
}) => {
  // Navigation tabs defined by product specification
  const tabs =
    role === 'investor'
      ? [
          { key: 'home', label: 'Home', icon: 'home' },
          { key: 'discover', label: 'Discover', icon: 'search' },
          { key: 'requests', label: 'Requests', icon: 'poke', badge: unreadPokesCount },
          { key: 'chats', label: 'Chats', icon: 'chats', badge: unreadChatsCount },
          { key: 'profile', label: 'Profile', icon: 'profile' }
        ]
      : role === 'demat_holder'
      ? [
          { key: 'home', label: 'Home', icon: 'home' },
          { key: 'discover', label: 'Discover', icon: 'search' },
          { key: 'pokes', label: 'Pokes', icon: 'poke', badge: unreadPokesCount },
          { key: 'chats', label: 'Chats', icon: 'chats', badge: unreadChatsCount },
          { key: 'profile', label: 'Profile', icon: 'profile' }
        ]
      : [
          // Admin tabs
          { key: 'admin_dashboard', label: 'Dashboard', icon: 'home' },
          { key: 'admin_users', label: 'Users & KYC', icon: 'shield' },
          { key: 'admin_pokes', label: 'Pokes Monitor', icon: 'poke' },
          { key: 'admin_logs', label: 'Audit Logs', icon: 'sliders' },
          { key: 'profile', label: 'Settings', icon: 'profile' }
        ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.7}
            onPress={() => onTabChange(tab.key)}
            style={styles.tabButton}
          >
            <View style={styles.iconContainer}>
              <Icon
                name={tab.icon}
                size={22}
                color={isActive ? colors.primaryActionBlue : colors.secondaryText}
                strokeWidth={isActive ? 2.4 : 1.8}
              />
              {tab.badge !== undefined && tab.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.tabLabel,
                isActive ? styles.tabLabelActive : styles.tabLabelInactive
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 64,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 4,
    ...shadows.md
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -8,
    backgroundColor: colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3
  },
  badgeText: {
    color: colors.surface,
    fontSize: 9,
    fontWeight: typography.weights.bold
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2
  },
  tabLabelActive: {
    color: colors.primaryActionBlue,
    fontWeight: typography.weights.bold
  },
  tabLabelInactive: {
    color: colors.secondaryText,
    fontWeight: typography.weights.medium
  }
});
