import { io, Socket } from 'socket.io-client';
import { getStoredTokens } from './api';

let socket: Socket | null = null;

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

  socket = io('http://localhost:5000', {
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
