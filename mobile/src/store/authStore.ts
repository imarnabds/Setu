import { create } from 'zustand';
import { api, setAuthTokens, getStoredTokens } from '../services/api';
import { initializeSocket, disconnectSocket } from '../services/socket';

export interface User {
  id: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  primaryRole: 'investor' | 'demat_holder' | 'admin';
  isEmailVerified: boolean;
  isMobileVerified: boolean;
  isKycVerified: boolean;
  kycDetails?: {
    documentType: string;
    documentNumberMasked: string;
    submittedAt: string;
    status: 'none' | 'pending' | 'verified' | 'rejected';
    notes?: string;
  };
  avatarUrl?: string;
  city?: string;
  region?: string;
  bio?: string;
  investmentExperience?: string;
  preferredLanguage?: string;
  supportedCategories: string[];
  defaultCommissionRate: number;
  commissionBasis: string;
  isAvailable: boolean;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  activeRole: 'investor' | 'demat_holder' | 'admin';
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  updateUser: (updates: Partial<User>) => void;
  switchRole: (newRole: 'investor' | 'demat_holder' | 'admin') => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  activeRole: 'investor',
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setAuth: (user, accessToken, refreshToken) => {
    setAuthTokens(accessToken, refreshToken);
    initializeSocket();
    set({
      user,
      activeRole: user.primaryRole,
      isAuthenticated: true,
      isLoading: false,
      error: null
    });
  },

  updateUser: (updates) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...updates } });
    }
  },

  switchRole: (newRole) => {
    // Allows switching for demo / role-testing if user is authorized
    set({ activeRole: newRole });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout').catch(() => {});
    } finally {
      setAuthTokens(null, null);
      disconnectSocket();
      set({
        user: null,
        activeRole: 'investor',
        isAuthenticated: false,
        isLoading: false
      });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    const { accessToken, refreshToken } = getStoredTokens();
    if (!accessToken && !refreshToken) {
      set({ isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const res = await api.get('/auth/me');
      if (res.data.success && res.data.data) {
        const user = res.data.data;
        initializeSocket();
        set({
          user,
          activeRole: user.primaryRole,
          isAuthenticated: true,
          isLoading: false
        });
        return;
      }
    } catch (err) {
      // If token expired or failed
      setAuthTokens(null, null);
      disconnectSocket();
      set({ isAuthenticated: false, user: null, isLoading: false });
    }
  }
}));
