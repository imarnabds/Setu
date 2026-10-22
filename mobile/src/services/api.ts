import axios from 'axios';

// The backend runs on port 5000
const API_BASE_URL = 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// In-memory token storage for web & react-native sessions
let currentAccessToken: string | null = null;
let currentRefreshToken: string | null = null;

export const setAuthTokens = (access: string | null, refresh: string | null) => {
  currentAccessToken = access;
  currentRefreshToken = refresh;
  if (access) {
    localStorage.setItem('ipo_access_token', access);
  } else {
    localStorage.removeItem('ipo_access_token');
  }
  if (refresh) {
    localStorage.setItem('ipo_refresh_token', refresh);
  } else {
    localStorage.removeItem('ipo_refresh_token');
  }
};

export const getStoredTokens = () => {
  if (!currentAccessToken && typeof window !== 'undefined' && window.localStorage) {
    currentAccessToken = localStorage.getItem('ipo_access_token');
    currentRefreshToken = localStorage.getItem('ipo_refresh_token');
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
