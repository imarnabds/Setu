import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Platform-aware Secure Storage Adapter for Setu
 * - Uses hardware-backed keychain/keystore (via expo-secure-store) on iOS and Android
 * - Uses memory cache + web storage fallback on web platforms
 */

// In-memory cache for ultra-fast synchronous lookup during Axios and Socket interceptors
const memoryCache: Record<string, string | null> = {};

export const SecureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    memoryCache[key] = value;
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } catch (e) {
        // Fallback to memory
      }
    } else {
      try {
        await SecureStore.setItemAsync(key, value);
      } catch (e) {
        console.warn(`[SecureStore] Error saving key ${key}:`, e);
      }
    }
  },

  async getItem(key: string): Promise<string | null> {
    if (memoryCache[key] !== undefined && memoryCache[key] !== null) {
      return memoryCache[key];
    }

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const val = window.localStorage.getItem(key);
          memoryCache[key] = val;
          return val;
        }
      } catch (e) {
        return null;
      }
    } else {
      try {
        const val = await SecureStore.getItemAsync(key);
        memoryCache[key] = val;
        return val;
      } catch (e) {
        console.warn(`[SecureStore] Error retrieving key ${key}:`, e);
        return null;
      }
    }
    return null;
  },

  getSync(key: string): string | null {
    if (memoryCache[key] !== undefined) {
      return memoryCache[key];
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem(key);
      memoryCache[key] = val;
      return val;
    }
    return null;
  },

  async removeItem(key: string): Promise<void> {
    delete memoryCache[key];
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch (e) {
        // Fallback
      }
    } else {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (e) {
        console.warn(`[SecureStore] Error deleting key ${key}:`, e);
      }
    }
  }
};
