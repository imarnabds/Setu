import { create } from 'zustand';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface UIState {
  activeTab: string; // 'home' | 'discover' | 'requests' | 'pokes' | 'chats' | 'profile' | 'admin' | 'commission'
  activeChatConnectionId: string | null;
  activeHolderModalUser: any | null;
  isNotificationsOpen: boolean;
  isKycModalOpen: boolean;
  toasts: ToastMessage[];
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
  setActiveTab: (tab: string) => void;
  openChat: (connectionId: string) => void;
  closeChat: () => void;
  openHolderModal: (user: any) => void;
  closeHolderModal: () => void;
  setNotificationsOpen: (open: boolean) => void;
  setKycModalOpen: (open: boolean) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  setUnreadNotificationsCount: (count: number) => void;
  setUnreadMessagesCount: (count: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'home',
  activeChatConnectionId: null,
  activeHolderModalUser: null,
  isNotificationsOpen: false,
  isKycModalOpen: false,
  toasts: [],
  unreadNotificationsCount: 0,
  unreadMessagesCount: 0,

  setActiveTab: (tab) => set({ activeTab: tab }),
  openChat: (connectionId) => set({ activeChatConnectionId: connectionId }),
  closeChat: () => set({ activeChatConnectionId: null }),
  openHolderModal: (user) => set({ activeHolderModalUser: user }),
  closeHolderModal: () => set({ activeHolderModalUser: null }),
  setNotificationsOpen: (open) => set({ isNotificationsOpen: open }),
  setKycModalOpen: (open) => set({ isKycModalOpen: open }),

  addToast: (message, type = 'info') => {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, type, message }]
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }));
    }, 4000);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    })),

  setUnreadNotificationsCount: (count) => set({ unreadNotificationsCount: count }),
  setUnreadMessagesCount: (count) => set({ unreadMessagesCount: count })
}));
