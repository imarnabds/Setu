import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/security.js';
import { dbService } from './dbService.js';

class SocketService {
  private io: Server | null = null;
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  initialize(io: Server) {
    this.io = io;

    io.use((socket: Socket, next) => {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = verifyAccessToken(token);
      if (!decoded || !decoded.userId) {
        return next(new Error('Invalid token'));
      }

      (socket as any).userId = decoded.userId;
      (socket as any).userRole = decoded.role;
      next();
    });

    io.on('connection', (socket: Socket) => {
      const userId = (socket as any).userId;

      // Track socket
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      // Join user personal room
      socket.join(`user:${userId}`);
      console.log(`[Socket] User ${userId} connected on socket ${socket.id}`);

      // Handle joining a connection room for real-time chat with database authorization
      socket.on('join_connection', async (connectionId: string) => {
        try {
          const conn = await dbService.findConnectionById(connectionId);
          if (conn && (conn.userAId === userId || conn.userBId === userId)) {
            socket.join(`connection:${connectionId}`);
            console.log(`[Socket] User ${userId} joined connection room: ${connectionId}`);
          } else {
            console.warn(`[Socket Security] User ${userId} denied access to connection room: ${connectionId}`);
          }
        } catch (err: any) {
          console.error('[Socket Error] join_connection error:', err.message);
        }
      });

      // Handle leaving connection room
      socket.on('leave_connection', (connectionId: string) => {
        socket.leave(`connection:${connectionId}`);
      });

      // Typing indicators
      socket.on('typing_start', ({ connectionId }: { connectionId: string }) => {
        socket.to(`connection:${connectionId}`).emit('user_typing', {
          connectionId,
          userId,
          isTyping: true
        });
      });

      socket.on('typing_stop', ({ connectionId }: { connectionId: string }) => {
        socket.to(`connection:${connectionId}`).emit('user_typing', {
          connectionId,
          userId,
          isTyping: false
        });
      });

      socket.on('disconnect', () => {
        console.log(`[Socket] User ${userId} disconnected from socket ${socket.id}`);
        const userSet = this.userSockets.get(userId);
        if (userSet) {
          userSet.delete(socket.id);
          if (userSet.size === 0) {
            this.userSockets.delete(userId);
          }
        }
      });
    });
  }

  sendToUser(userId: string, event: string, payload: any) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, payload);
    }
  }

  sendToConnection(connectionId: string, event: string, payload: any) {
    if (this.io) {
      this.io.to(`connection:${connectionId}`).emit(event, payload);
    }
  }

  broadcast(event: string, payload: any) {
    if (this.io) {
      this.io.emit(event, payload);
    }
  }
}

export const socketService = new SocketService();
