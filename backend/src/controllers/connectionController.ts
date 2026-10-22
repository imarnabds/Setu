import { Response } from 'express';
import { storage } from '../services/storage.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export const getMyConnections = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const connections = storage.findConnectionsForUser(req.user.id);

    const populated = connections.map((conn) => {
      const partnerId = conn.userAId === req.user!.id ? conn.userBId : conn.userAId;
      const partner = storage.findUserById(partnerId);
      const messages = storage.getMessagesForConnection(conn.id);
      const lastMessage = messages[messages.length - 1] || null;
      const unreadCount = messages.filter(
        (m) => m.receiverId === req.user!.id && !m.readAt
      ).length;

      return {
        ...conn,
        partner: partner
          ? {
              id: partner.id,
              fullName: partner.fullName,
              avatarUrl: partner.avatarUrl,
              city: partner.city,
              region: partner.region,
              role: partner.primaryRole,
              isKycVerified: partner.isKycVerified,
              isAvailable: partner.isAvailable
            }
          : null,
        lastMessage,
        unreadCount
      };
    });

    // Sort by most recent interaction/message
    populated.sort((a, b) => {
      const timeA = a.lastMessage
        ? new Date(a.lastMessage.createdAt).getTime()
        : new Date(a.createdAt).getTime();
      const timeB = b.lastMessage
        ? new Date(b.lastMessage.createdAt).getTime()
        : new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    res.json({
      success: true,
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve connections' });
  }
};

export const getConnectionById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const connection = storage.findConnectionById(id);

    if (!connection) {
      res.status(404).json({ success: false, error: 'Connection not found' });
      return;
    }

    if (connection.userAId !== req.user.id && connection.userBId !== req.user.id) {
      res.status(403).json({ success: false, error: 'Access denied to this connection' });
      return;
    }

    const partnerId =
      connection.userAId === req.user.id ? connection.userBId : connection.userAId;
    const partner = storage.findUserById(partnerId);

    res.json({
      success: true,
      data: {
        ...connection,
        partner: partner
          ? {
              id: partner.id,
              fullName: partner.fullName,
              avatarUrl: partner.avatarUrl,
              city: partner.city,
              region: partner.region,
              role: partner.primaryRole,
              isKycVerified: partner.isKycVerified
            }
          : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch connection details' });
  }
};

export const disconnect = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const connection = storage.findConnectionById(id);

    if (!connection) {
      res.status(404).json({ success: false, error: 'Connection not found' });
      return;
    }

    if (connection.userAId !== req.user.id && connection.userBId !== req.user.id) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const updated = storage.updateConnection(id, {
      status: 'disconnected'
    });

    storage.createAuditLog({
      id: 'aud_' + Date.now().toString(36),
      actorId: req.user.id,
      action: 'CONNECTION_DISCONNECTED',
      details: { connectionId: id },
      ipAddress: req.ip,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Connection disconnected',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to disconnect' });
  }
};

export const blockUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const connection = storage.findConnectionById(id);

    if (!connection) {
      res.status(404).json({ success: false, error: 'Connection not found' });
      return;
    }

    if (connection.userAId !== req.user.id && connection.userBId !== req.user.id) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const updated = storage.updateConnection(id, {
      status: 'blocked',
      blockedById: req.user.id
    });

    storage.createAuditLog({
      id: 'aud_' + Date.now().toString(36),
      actorId: req.user.id,
      action: 'CONNECTION_BLOCKED',
      details: { connectionId: id, blockedBy: req.user.id },
      ipAddress: req.ip,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'User blocked',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to block user' });
  }
};
