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
          { key: 'requests', label: 'Requests', icon: 'send', badge: unreadPokesCount },
          { key: 'chats', label: 'Connections', icon: 'users', badge: unreadChatsCount },
          { key: 'profile', label: 'Profile', icon: 'profile' }
        ]
      : role === 'demat_holder'
      ? [
          { key: 'home', label: 'Home', icon: 'home' },
          { key: 'pokes', label: 'Requests', icon: 'send', badge: unreadPokesCount },
          { key: 'chats', label: 'Connections', icon: 'users', badge: unreadChatsCount },
          { key: 'commission', label: 'Earnings', icon: 'award' },
          { key: 'profile', label: 'Profile', icon: 'profile' }
        ]
      : [
          { key: 'admin_dashboard', label: 'Dashboard', icon: 'home' },
          { key: 'admin_users', label: 'Users', icon: 'shield' },
          { key: 'admin_pokes', label: 'Pokes', icon: 'send' },
          { key: 'admin_logs', label: 'Audit', icon: 'filter' },
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
              style={styles.tabButton}
            >
              <View style={styles.iconContainer}>
                <Icon
                  name={tab.icon}
                  size={20}
                  color={isActive ? colors.primaryBlue : '#94A3B8'}
                  strokeWidth={isActive ? 2.3 : 1.8}
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
    paddingBottom: Platform.OS === 'ios' ? 16 : 8,
    paddingHorizontal: 12
  },
  navBar: {
    width: '100%',
    maxWidth: 420,
    height: 62,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xs,
    ...shadows.floating
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4
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
    right: -6,
    backgroundColor: colors.error,
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: typography.weights.bold
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2
  },
  tabLabelActive: {
    color: colors.primaryBlue,
    fontWeight: typography.weights.bold
  },
  tabLabelInactive: {
    color: '#94A3B8',
    fontWeight: typography.weights.medium
  }
});
