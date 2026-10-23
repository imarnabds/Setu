import { io, Socket } from 'socket.io-client';
import { getStoredTokens } from './api';

let socket: Socket | null = null;

const resolveSocketBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_SOCKET_URL) {
    return process.env.EXPO_PUBLIC_SOCKET_URL;
  }
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:5000`;
    }
  }
  return 'http://localhost:5000';
};

export const initializeSocket = (): Socket | null => {
  const { accessToken } = getStoredTokens();
  if (!accessToken) {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    return null;
  }

  if (socket && socket.connected) {
    return socket;
  }

  const socketUrl = resolveSocketBaseUrl();
  socket = io(socketUrl, {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    autoConnect: true
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected to real-time server with id:', socket?.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });

  return socket;
};

export const getSocket = (): Socket | null => {
  if (!socket) {
    return initializeSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
