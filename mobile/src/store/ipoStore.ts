import { create } from 'zustand';
import { api } from '../services/api';

export type IpoLifecycleStatus = 'Upcoming' | 'Open' | 'Closed' | 'Listed';

export interface IPO {
  id: string;
  name: string;
  status: IpoLifecycleStatus;
  lastUpdated: string;
  isStale?: boolean;
  isVerified?: boolean;
  source?: string;
}

export interface IpoSyncMeta {
  lastSyncedAt: string;
  isStale: boolean;
  syncStatus: 'synced' | 'stale' | 'failed' | 'unauthorized';
  syncError?: string | null;
  totalOfferings: number;
  insertedCount?: number;
  updatedCount?: number;
  archivedCount?: number;
}

interface IPOState {
  ipos: IPO[];
  selectedIpo: IPO | null;
  syncMeta: IpoSyncMeta | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  fetchIpos: () => Promise<IPO[]>;
  triggerManualSync: (force?: boolean) => Promise<void>;
  setSelectedIpo: (ipo: IPO | null) => void;
  selectIpoById: (id: string | null) => void;
}

export const useIpoStore = create<IPOState>((set, get) => ({
  ipos: [],
  selectedIpo: null,
  syncMeta: null,
  isLoading: false,
  isSyncing: false,
  error: null,

  fetchIpos: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/ipos');
      if (res.data?.data) {
        const ipos: IPO[] = res.data.data;
        const syncMeta: IpoSyncMeta = res.data.meta || null;
        set({ ipos, syncMeta, isLoading: false });

        // Maintain selection if still valid; if none selected, select the first offering
        const current = get().selectedIpo;
        if (current) {
          const updatedCurrent = ipos.find((i) => i.id === current.id);
          if (updatedCurrent) {
            set({ selectedIpo: updatedCurrent });
          } else if (ipos.length > 0) {
            set({ selectedIpo: ipos[0] });
          }
        } else if (ipos.length > 0) {
          set({ selectedIpo: ipos[0] });
        }
        return ipos;
      }
      set({ isLoading: false });
      return [];
    } catch (err: any) {
      console.error('Failed to load IPO offerings from backend:', err);
      set({ isLoading: false, error: 'Failed to fetch IPOs' });
      return [];
    }
  },

  triggerManualSync: async (force: boolean = true) => {
    set({ isSyncing: true });
    try {
      const res = await api.post('/ipos/sync', { force });
      if (res.data?.data) {
        const ipos: IPO[] = res.data.data;
        const syncMeta: IpoSyncMeta = res.data.meta || null;
        set({ ipos, syncMeta, isSyncing: false });

        const current = get().selectedIpo;
        if (current) {
          const updatedCurrent = ipos.find((i) => i.id === current.id);
          if (updatedCurrent) {
            set({ selectedIpo: updatedCurrent });
          } else if (ipos.length > 0) {
            set({ selectedIpo: ipos[0] });
          }
        } else if (ipos.length > 0) {
          set({ selectedIpo: ipos[0] });
        }
      }
    } catch (err: any) {
      console.error('Manual IPO synchronization failed:', err);
      set({ isSyncing: false });
    }
  },

  setSelectedIpo: (ipo) => set({ selectedIpo: ipo }),

  selectIpoById: (id) => {
    if (!id) {
      set({ selectedIpo: null });
      return;
    }
    const found = get().ipos.find((i) => i.id === id);
    if (found) {
      set({ selectedIpo: found });
    }
  }
}));
