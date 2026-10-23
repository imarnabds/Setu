import axios from 'axios';
import { SecureStorage } from './storageAdapter';

// Dynamic API URL resolution supporting env, physical mobile LAN devices, and production
const resolveApiBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:5000/api`;
    }
  }
  return 'http://localhost:5000/api';
};

export const API_BASE_URL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Keys for secure token persistence
const ACCESS_TOKEN_KEY = 'setu_access_token';
const REFRESH_TOKEN_KEY = 'setu_refresh_token';

let currentAccessToken: string | null = null;
let currentRefreshToken: string | null = null;

// Initialize tokens from secure storage
(async () => {
  try {
    currentAccessToken = await SecureStorage.getItem(ACCESS_TOKEN_KEY);
    currentRefreshToken = await SecureStorage.getItem(REFRESH_TOKEN_KEY);
  } catch (e) {
    // Ignore init error
  }
})();

export const setAuthTokens = (access: string | null, refresh: string | null) => {
  currentAccessToken = access;
  currentRefreshToken = refresh;
  if (access) {
    SecureStorage.setItem(ACCESS_TOKEN_KEY, access);
  } else {
    SecureStorage.removeItem(ACCESS_TOKEN_KEY);
  }
  if (refresh) {
    SecureStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  } else {
    SecureStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

export const getStoredTokens = () => {
  if (!currentAccessToken) {
    currentAccessToken = SecureStorage.getSync(ACCESS_TOKEN_KEY);
    currentRefreshToken = SecureStorage.getSync(REFRESH_TOKEN_KEY);
  }
  return {
    accessToken: currentAccessToken,
    refreshToken: currentRefreshToken
  };
};

// Request interceptor to attach Bearer token
api.interceptors.request.use(
  (config) => {
    const { accessToken } = getStoredTokens();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh if 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      currentRefreshToken
    ) {
      originalRequest._retry = true;
      try {
        const refreshRes = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken: currentRefreshToken
        });
        if (refreshRes.data.success) {
          const { accessToken, refreshToken: newRefresh } = refreshRes.data.data;
          setAuthTokens(accessToken, newRefresh);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshErr) {
        setAuthTokens(null, null);
      }
    }
    return Promise.reject(error);
  }
);
