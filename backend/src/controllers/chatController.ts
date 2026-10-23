import { Response } from 'express';
import { dbService } from '../services/dbService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { sendMessageSchema } from '../validators/schemas.js';
import { socketService } from '../services/socketService.js';
import { Message } from '../models/types.js';

const createId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).substring(2, 9)}${Date.now().toString(36)}`;

export const getMessages = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const connectionId = req.params.connectionId as string;
    const connection = await dbService.findConnectionById(connectionId);

    if (!connection) {
      res.status(404).json({ success: false, error: 'Connection not found' });
      return;
    }

    if (connection.userAId !== req.user.id && connection.userBId !== req.user.id) {
      res.status(403).json({ success: false, error: 'Access denied to this conversation' });
      return;
    }

    // Auto mark incoming messages as read
    await dbService.markMessagesAsRead(connectionId, req.user.id);

    const messages = await dbService.getMessagesForConnection(connectionId);

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
};

export const sendMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const parseResult = sendMessageSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors
      });
      return;
    }

    const { connectionId, content } = parseResult.data;
    const connection = await dbService.findConnectionById(connectionId);

    if (!connection) {
      res.status(404).json({ success: false, error: 'Connection not found' });
      return;
    }

    if (connection.userAId !== req.user.id && connection.userBId !== req.user.id) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    if (connection.status !== 'active') {
      res.status(403).json({
        success: false,
        error: `Cannot send message. Connection is currently ${connection.status}.`
      });
      return;
    }

    const receiverId =
      connection.userAId === req.user.id ? connection.userBId : connection.userAId;
    const now = new Date().toISOString();

    const newMessage: Message = {
      id: createId('msg'),
      connectionId,
      senderId: req.user.id,
      receiverId,
      content,
      type: 'text',
      createdAt: now
    };

    await dbService.createMessage(newMessage);

    // Update connection touch
    await dbService.updateConnection(connectionId, { updatedAt: now });

    // Real-time broadcast to room and receiver
    socketService.sendToConnection(connectionId, 'message:new', newMessage);
    socketService.sendToUser(receiverId, 'message:received', {
      message: newMessage,
      sender: {
        id: req.user.id,
        fullName: req.user.fullName,
        avatarUrl: req.user.avatarUrl
      }
    });

    // Create notification for receiver
    const preview = content.length > 60 ? content.substring(0, 57) + '...' : content;
    await dbService.createNotification({
      id: createId('notif'),
      userId: receiverId,
      title: req.user.fullName,
      message: preview,
      type: 'message_received',
      referenceId: connectionId,
      isRead: false,
      createdAt: now
    });

    res.status(201).json({
      success: true,
      data: newMessage
    });
  } catch (error) {
    console.error('sendMessage error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
};

export const markAsRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const connectionId = req.params.connectionId as string;
    await dbService.markMessagesAsRead(connectionId, req.user.id);

    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update read status' });
  }
};
