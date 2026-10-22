import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, shadows, borderRadius } from '../../theme/spacing';
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
          { key: 'admin_dashboard', label: 'Dashboard', icon: 'home' },
          { key: 'admin_users', label: 'Users', icon: 'shield' },
          { key: 'admin_pokes', label: 'Pokes', icon: 'poke' },
          { key: 'admin_logs', label: 'Audit', icon: 'sliders' },
          { key: 'profile', label: 'Settings', icon: 'profile' }
        ];

  return (
    <View style={styles.floatingContainer} pointerEvents="box-none">
      <View style={styles.navBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.8}
              onPress={() => onTabChange(tab.key)}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
            >
              <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
                <Icon
                  name={tab.icon}
                  size={20}
                  color={isActive ? colors.primaryBlue : colors.secondaryText}
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
    </View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    paddingHorizontal: 16
  },
  navBar: {
    width: '100%',
    maxWidth: 420,
    height: 64,
    backgroundColor: colors.surfaceNav,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.sm,
    ...shadows.floating
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: borderRadius.md
  },
  tabButtonActive: {
    backgroundColor: 'transparent'
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: borderRadius.full
  },
  iconContainerActive: {
    backgroundColor: colors.softBlueHighlight
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -6,
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
    fontSize: 10.5,
    marginTop: 2
  },
  tabLabelActive: {
    color: colors.primaryBlue,
    fontWeight: typography.weights.bold
  },
  tabLabelInactive: {
    color: colors.secondaryText,
    fontWeight: typography.weights.medium
  }
});
