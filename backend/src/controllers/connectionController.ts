import { Response } from 'express';
import { dbService } from '../services/dbService.js';
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

    const ipoId = (req.query.ipoId as string) || undefined;
    if (!ipoId) {
      // Per platform rule: connections can only be fetched when an IPO is selected from the dropdown
      res.json({
        success: true,
        data: [],
        message: 'Please select an IPO from the dropdown menu to fetch connections.'
      });
      return;
    }

    const connections = await dbService.findConnectionsForUser(req.user.id, ipoId);

    const populated = await Promise.all(
      connections.map(async (conn) => {
        const partnerId = conn.userAId === req.user!.id ? conn.userBId : conn.userAId;
        const partner = await dbService.findUserById(partnerId);
        const messages = await dbService.getMessagesForConnection(conn.id);
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
      })
    );

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

    const id = req.params.id as string;
    const connection = await dbService.findConnectionById(id);

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
    const partner = await dbService.findUserById(partnerId);

    // Verify whether UPI details can be exposed under strict conditions:
    // Connection must be active, Poke must be accepted
    let dematHolderUpi: {
      upiId: string | null;
      isUpiVerified: boolean;
      hasUpi: boolean;
      upiVerifiedAt?: string;
    } | null = null;

    if (connection.status === 'active') {
      const poke = await dbService.findPokeById(connection.pokeRequestId);
      if (poke && poke.status === 'accepted') {
        const dematHolder =
          partner?.primaryRole === 'demat_holder'
            ? partner
            : req.user.primaryRole === 'demat_holder'
            ? await dbService.findUserById(req.user.id)
            : null;

        if (dematHolder) {
          dematHolderUpi = {
            upiId: dematHolder.upiId || null,
            isUpiVerified: Boolean(dematHolder.isUpiVerified),
            hasUpi: Boolean(dematHolder.upiId),
            upiVerifiedAt: dematHolder.upiVerifiedAt
          };
        }
      }
    }

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
          : null,
        dematHolderUpi
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch connection details' });
  }
};

export const getConnectionUpi = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const id = req.params.id as string;
    const connection = await dbService.findConnectionById(id);

    if (!connection) {
      res.status(404).json({ success: false, error: 'Connection not found' });
      return;
    }

    // Ownership check: must be a participant in the connection
    if (connection.userAId !== req.user.id && connection.userBId !== req.user.id) {
      res.status(403).json({ success: false, error: 'Access denied to this connection' });
      return;
    }

    // Connection must be active
    if (connection.status !== 'active') {
      res.status(403).json({
        success: false,
        error: `UPI details are not accessible because the connection is ${connection.status}`
      });
      return;
    }

    // Poke request must be fully accepted
    const poke = await dbService.findPokeById(connection.pokeRequestId);
    if (!poke || poke.status !== 'accepted') {
      res.status(403).json({
        success: false,
        error: 'UPI details are not accessible until the Poke request has been mutually accepted'
      });
      return;
    }

    const partnerId =
      connection.userAId === req.user.id ? connection.userBId : connection.userAId;
    const partner = await dbService.findUserById(partnerId);
    const currentUser = await dbService.findUserById(req.user.id);

    // Identify Demat Account Holder
    const dematHolder =
      partner?.primaryRole === 'demat_holder'
        ? partner
        : currentUser?.primaryRole === 'demat_holder'
        ? currentUser
        : null;

    if (!dematHolder) {
      res.status(400).json({
        success: false,
        error: 'Neither participant is registered as a Demat Account Holder'
      });
      return;
    }

    // Audit log: sensitive payment access (WITHOUT logging the UPI ID itself!)
    await dbService.createAuditLog({
      id: 'aud_' + Date.now().toString(36),
      actorId: req.user.id,
      action: 'UPI_DETAILS_ACCESSED',
      details: {
        connectionId: connection.id,
        targetHolderId: dematHolder.id,
        ipoId: connection.ipoId
      },
      ipAddress: req.ip,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        connectionId: connection.id,
        holderId: dematHolder.id,
        holderName: dematHolder.fullName,
        upiId: dematHolder.upiId || null,
        isUpiVerified: Boolean(dematHolder.isUpiVerified),
        upiVerifiedAt: dematHolder.upiVerifiedAt || null,
        hasUpi: Boolean(dematHolder.upiId)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve UPI details' });
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

    const id = req.params.id as string;
    const connection = await dbService.findConnectionById(id);

    if (!connection) {
      res.status(404).json({ success: false, error: 'Connection not found' });
      return;
    }

    if (connection.userAId !== req.user.id && connection.userBId !== req.user.id) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const updated = await dbService.updateConnection(id, {
      status: 'disconnected'
    });

    await dbService.createAuditLog({
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

    const id = req.params.id as string;
    const connection = await dbService.findConnectionById(id);

    if (!connection) {
      res.status(404).json({ success: false, error: 'Connection not found' });
      return;
    }

    if (connection.userAId !== req.user.id && connection.userBId !== req.user.id) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const updated = await dbService.updateConnection(id, {
      status: 'blocked',
      blockedById: req.user.id
    });

    await dbService.createAuditLog({
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
