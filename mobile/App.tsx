import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Dimensions,
  Text,
  TouchableOpacity
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { colors } from './src/theme/colors';
import { typography } from './src/theme/typography';
import { shadows, borderRadius, spacing } from './src/theme/spacing';
import { useAuthStore } from './src/store/authStore';
import { useUIStore } from './src/store/uiStore';

// Common Components
import { TopHeader } from './src/components/navigation/TopHeader';
import { IpoDropdownBar } from './src/components/navigation/IpoDropdownBar';
import { BottomNavigation } from './src/components/navigation/BottomNavigation';
import { ToastNotificationContainer } from './src/components/common/ToastNotification';

// Auth & Verification Screens
import { WelcomeScreen } from './src/screens/auth/WelcomeScreen';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { SignupScreen } from './src/screens/auth/SignupScreen';
import { EmailOtpVerificationScreen } from './src/screens/auth/EmailOtpVerificationScreen';
import { KycOnboardingScreen } from './src/screens/auth/KycOnboardingScreen';
import { KycPendingReviewScreen } from './src/screens/auth/KycPendingReviewScreen';

// Investor Screens
import { InvestorHomeScreen } from './src/screens/investor/InvestorHomeScreen';
import { DiscoverHoldersScreen } from './src/screens/investor/DiscoverHoldersScreen';
import { InvestorRequestsScreen } from './src/screens/investor/InvestorRequestsScreen';
import { InvestorProfileScreen } from './src/screens/investor/InvestorProfileScreen';

// Holder Screens
import { HolderHomeScreen } from './src/screens/holder/HolderHomeScreen';
import { PokesInboxScreen } from './src/screens/holder/PokesInboxScreen';
import { HolderDiscoverScreen } from './src/screens/holder/HolderDiscoverScreen';
import { CommissionSettingsScreen } from './src/screens/holder/CommissionSettingsScreen';
import { HolderProfileScreen } from './src/screens/holder/HolderProfileScreen';

// Chat & Notifications & Admin
import { ConnectionsListScreen } from './src/screens/chat/ConnectionsListScreen';
import { ChatRoomScreen } from './src/screens/chat/ChatRoomScreen';
import { NotificationsModal } from './src/screens/notifications/NotificationsModal';
import { AdminConsoleScreen } from './src/screens/admin/AdminConsoleScreen';
import { GuestRegistrationPromptModal } from './src/components/common/GuestRegistrationPromptModal';
import { SocialAuthModal } from './src/components/auth/SocialAuthModal';

const queryClient = new QueryClient();

// Suppress default web browser focus outline rectangles on inputs
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'rn-web-suppress-focus-outline';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = `
      input:focus, textarea:focus, select:focus, [contenteditable]:focus {
        outline: none !important;
        box-shadow: none !important;
      }
      input, textarea {
        outline: none !important;
      }
    `;
    document.head.appendChild(styleEl);
  }
}

export default function App() {
  const {
    user,
    isAuthenticated,
    isGuestMode,
    isLoading,
    activeRole,
    checkAuth,
    logout,
    switchRole,
    enterGuestMode,
    exitGuestMode
  } = useAuthStore();
  const {
    activeTab,
    setActiveTab,
    activeChatConnectionId,
    closeChat,
    isNotificationsOpen,
    setNotificationsOpen,
    unreadNotificationsCount,
    isGuestPromptModalOpen,
    guestPromptAction,
    closeGuestPromptModal
  } = useUIStore();

  const [authView, setAuthView] = useState<'welcome' | 'login' | 'signup'>('welcome');
  const [guestSocialProvider, setGuestSocialProvider] = useState<'google' | 'apple' | null>(null);
  const [deviceFrameMode, setDeviceFrameMode] = useState(true);
  const [isResubmittingKyc, setIsResubmittingKyc] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primaryActionBlue} />
        <Text style={styles.loadingText}>Initializing Setu...</Text>
      </View>
    );
  }

  // Render Auth Views if not logged in
  const renderAuthContent = () => {
    switch (authView) {
      case 'login':
        return (
          <LoginScreen
            onNavigateToSignup={() => setAuthView('signup')}
            onNavigateToForgotPassword={() => setAuthView('login')}
            onBack={() => setAuthView('welcome')}
          />
        );
      case 'signup':
        return (
          <SignupScreen
            onNavigateToLogin={() => setAuthView('login')}
            onBack={() => setAuthView('welcome')}
          />
        );
      case 'welcome':
      default:
        return (
          <WelcomeScreen
            onGetStarted={() => setAuthView('signup')}
            onLogin={() => setAuthView('login')}
            onExploreAsGuest={() => enterGuestMode('investor')}
          />
        );
    }
  };

  // Render Authenticated Tab Content
  const renderTabContent = () => {
    // If active chat room is open, render full chat room
    if (activeChatConnectionId) {
      return (
        <ChatRoomScreen
          connectionId={activeChatConnectionId}
          onBack={closeChat}
        />
      );
    }

    if (activeRole === 'investor') {
      switch (activeTab) {
        case 'discover':
          return <DiscoverHoldersScreen />;
        case 'requests':
          return <InvestorRequestsScreen />;
        case 'chats':
          return <ConnectionsListScreen />;
        case 'profile':
          return <InvestorProfileScreen />;
        case 'home':
        default:
          return <InvestorHomeScreen />;
      }
    } else if (activeRole === 'demat_holder') {
      switch (activeTab) {
        case 'discover':
          return <HolderDiscoverScreen />;
        case 'pokes':
          return <PokesInboxScreen />;
        case 'chats':
          return <ConnectionsListScreen />;
        case 'commission':
          return <CommissionSettingsScreen />;
        case 'profile':
          return <HolderProfileScreen />;
        case 'home':
        default:
          return <HolderHomeScreen />;
      }
    } else {
      // Admin Role
      switch (activeTab) {
        case 'profile':
          return <HolderProfileScreen />;
        case 'admin_dashboard':
        case 'admin_users':
        case 'admin_pokes':
        case 'admin_logs':
        default:
          return <AdminConsoleScreen />;
      }
    }
  };

  // Web simulator container wrapper for preview on desktop browsers
  const isWeb = Platform.OS === 'web';

  const appBody = (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ToastNotificationContainer />

      {!isAuthenticated && !isGuestMode ? (
        renderAuthContent()
      ) : activeRole !== 'admin' && isAuthenticated && !user?.isEmailVerified ? (
        <EmailOtpVerificationScreen
          onVerified={() => checkAuth()}
          onLogout={logout}
        />
      ) : activeRole !== 'admin' && isAuthenticated && !user?.isKycVerified ? (
        user?.kycDetails?.status === 'pending' ||
        (user?.kycDetails?.status === 'rejected' && !isResubmittingKyc) ? (
          <KycPendingReviewScreen
            onRefreshStatus={checkAuth}
            onOpenAdminDesk={() => {
              switchRole('admin');
              setActiveTab('admin');
            }}
            onLogout={logout}
            onResubmit={() => setIsResubmittingKyc(true)}
          />
        ) : (
          <KycOnboardingScreen
            onSubmitted={() => {
              setIsResubmittingKyc(false);
              checkAuth();
            }}
            onLogout={logout}
          />
        )
      ) : (
        <View style={styles.mainContainer}>
          {/* Top Header unless inside active full-screen chat or Holder Home where it is integrated */}
          {!activeChatConnectionId && !(activeRole === 'demat_holder' && activeTab === 'home') && (
            <>
              <TopHeader />
              <IpoDropdownBar />
            </>
          )}

          {/* Main Tab Screen */}
          <View style={styles.screenWrapper}>{renderTabContent()}</View>

          {/* Bottom Navigation unless inside active chat */}
          {!activeChatConnectionId && (
            <BottomNavigation
              role={activeRole}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          )}

          {/* Notifications Slide-over Modal */}
          <NotificationsModal
            visible={isNotificationsOpen}
            onClose={() => setNotificationsOpen(false)}
          />
        </View>
      )}

      {/* Guest Mode Restriction & Registration Modal */}
      <GuestRegistrationPromptModal
        visible={isGuestPromptModalOpen}
        actionName={guestPromptAction}
        onClose={closeGuestPromptModal}
        onSelectSocial={(provider) => {
          closeGuestPromptModal();
          setGuestSocialProvider(provider);
        }}
        onSelectStandardSignup={() => {
          closeGuestPromptModal();
          exitGuestMode();
          setAuthView('signup');
        }}
      />

      {/* Social Auth Modal triggered from Guest Mode */}
      <SocialAuthModal
        visible={!!guestSocialProvider}
        provider={guestSocialProvider}
        onClose={() => setGuestSocialProvider(null)}
        defaultRole={activeRole === 'demat_holder' ? 'demat_holder' : 'investor'}
      />
    </SafeAreaView>
  );

  return (
    <QueryClientProvider client={queryClient}>
      {isWeb && deviceFrameMode ? (
        <View style={styles.webDesktopBackground}>
          <View style={styles.deviceFrame}>
            <View style={styles.phoneSpeakerBar} />
            <View style={styles.phoneInner}>{appBody}</View>
          </View>
        </View>
      ) : (
        appBody
      )}
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    fontSize: typography.sizes.sm,
    color: colors.primaryNavy,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.md
  },
  mainContainer: {
    flex: 1,
    backgroundColor: colors.background
  },
  screenWrapper: {
    flex: 1
  },
  webDesktopBackground: {
    flex: 1,
    backgroundColor: '#E4E9F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16
  },
  deviceFrame: {
    width: '100%',
    maxWidth: 440,
    height: '96%',
    maxHeight: 900,
    backgroundColor: '#FFFFFF',
    borderRadius: 48,
    borderWidth: 6,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    position: 'relative',
    ...shadows.floating
  },
  phoneSpeakerBar: {
    position: 'absolute',
    top: 8,
    left: '50%',
    transform: [{ translateX: -40 }],
    width: 80,
    height: 16,
    backgroundColor: '#172C49',
    borderRadius: 8,
    zIndex: 9999
  },
  phoneInner: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden'
  }
});
