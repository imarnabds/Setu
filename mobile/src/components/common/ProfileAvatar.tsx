import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { Icon } from './Icon';

interface ProfileAvatarProps {
  name: string;
  avatarUrl?: string;
  size?: number;
  isVerified?: boolean;
  style?: ViewStyle;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  name,
  avatarUrl,
  size = 48,
  isVerified = false,
  style
}) => {
  const getInitials = (n: string) => {
    if (!n) return 'U';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.substring(0, 2).toUpperCase();
  };

  const badgeSize = Math.max(13, Math.round(size * 0.3));

  return (
    <View style={[{ width: size, height: size }, style]}>
      <View
        style={[
          styles.avatarContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2
          }
        ]}
      >
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            resizeMode="cover"
          />
        ) : (
          <Text
            style={[
              styles.initials,
              {
                fontSize: Math.round(size * 0.38)
              }
            ]}
          >
            {getInitials(name)}
          </Text>
        )}
      </View>
      {isVerified && (
        <View
          style={[
            styles.verifiedBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              bottom: 0,
              right: 0
            }
          ]}
        >
          <Icon name="check" size={badgeSize * 0.65} color={colors.surface} strokeWidth={3} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  initials: {
    color: colors.deepNavy,
    fontWeight: typography.weights.bold
  },
  verifiedBadge: {
    position: 'absolute',
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface
  }
});
