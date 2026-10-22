import { Response } from 'express';
import { storage } from '../services/storage.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import {
  pokeCreateSchema,
  pokeAcceptSchema,
  pokeRejectSchema
} from '../validators/schemas.js';
import { socketService } from '../services/socketService.js';
import { PokeRequest, Connection, Message } from '../models/types.js';

const createId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).substring(2, 9)}${Date.now().toString(36)}`;

export const sendPoke = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const parseResult = pokeCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors
      });
      return;
    }

    const { recipientId, message, proposedCommissionRate, commissionBasis } =
      parseResult.data;

    // Disallow self-poke
    if (recipientId === req.user.id) {
      res.status(400).json({ success: false, error: 'You cannot send a Poke to yourself' });
      return;
    }

    // Verify recipient exists
    const recipient = storage.findUserById(recipientId);
    if (!recipient) {
      res.status(404).json({ success: false, error: 'Recipient user not found' });
      return;
    }

    // Check if active pending request already exists
    const existingActivePoke = storage.findActivePokeBetween(req.user.id, recipientId);
    if (existingActivePoke) {
      res.status(409).json({
        success: false,
        error: 'A pending Poke request already exists between you and this user',
        data: existingActivePoke
      });
      return;
    }

    // Check if users already have an active connection
    const existingConnection = storage.findConnectionBetweenUsers(req.user.id, recipientId);
    if (existingConnection && existingConnection.status === 'active') {
      res.status(409).json({
        success: false,
        error: 'You already have an active connection with this user'
      });
      return;
    }

    const now = new Date().toISOString();
    const newPoke: PokeRequest = {
      id: createId('poke'),
      senderId: req.user.id,
      recipientId,
      senderRole: req.user.primaryRole,
      recipientRole: recipient.primaryRole,
      status: 'pending',
      proposedCommissionRate:
        proposedCommissionRate !== undefined
          ? proposedCommissionRate
          : recipient.primaryRole === 'demat_holder'
          ? recipient.defaultCommissionRate
          : req.user.defaultCommissionRate,
      commissionBasis:
        commissionBasis ||
        (recipient.primaryRole === 'demat_holder'
          ? recipient.commissionBasis
          : req.user.commissionBasis),
      message: message || '',
      createdAt: now,
      updatedAt: now
    };

    storage.createPoke(newPoke);

    // Create recipient notification
    storage.createNotification({
      id: createId('notif'),
      userId: recipientId,
      title: 'New Poke Received',
      message: `${req.user.fullName} sent you a Poke request. Review their profile to accept or decline.`,
      type: 'poke_received',
      referenceId: newPoke.id,
      isRead: false,
      createdAt: now
    });

    // Real-time socket notification
    socketService.sendToUser(recipientId, 'poke:received', {
      poke: newPoke,
      sender: {
        id: req.user.id,
        fullName: req.user.fullName,
        avatarUrl: req.user.avatarUrl,
        city: req.user.city,
        role: req.user.primaryRole
      }
    });

    // Audit log
    storage.createAuditLog({
      id: createId('aud'),
      actorId: req.user.id,
      action: 'POKE_SENT',
      details: { recipientId, proposedRate: newPoke.proposedCommissionRate },
      ipAddress: req.ip,
      timestamp: now
    });

    res.status(201).json({
      success: true,
      message: 'Poke sent successfully! Awaiting acceptance.',
      data: newPoke
    });
  } catch (error) {
    console.error('sendPoke error:', error);
    res.status(500).json({ success: false, error: 'Failed to send Poke' });
  }
};

export const cancelPoke = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const poke = storage.findPokeById(id);

    if (!poke) {
      res.status(404).json({ success: false, error: 'Poke request not found' });
      return;
    }

    if (poke.senderId !== req.user.id) {
      res.status(403).json({ success: false, error: 'Only the sender can cancel this Poke' });
      return;
    }

    if (poke.status !== 'pending') {
      res.status(400).json({
        success: false,
        error: `Cannot cancel a Poke that is already ${poke.status}`
      });
      return;
    }

    const now = new Date().toISOString();
    const updated = storage.updatePoke(id, {
      status: 'cancelled',
      cancelledAt: now
    });

    socketService.sendToUser(poke.recipientId, 'poke:cancelled', { pokeId: id });

    storage.createAuditLog({
      id: createId('aud'),
      actorId: req.user.id,
      action: 'POKE_CANCELLED',
      details: { pokeId: id, recipientId: poke.recipientId },
      ipAddress: req.ip,
      timestamp: now
    });

    res.json({
      success: true,
      message: 'Poke request cancelled',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to cancel Poke' });
  }
};

export const acceptPoke = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const poke = storage.findPokeById(id);

    if (!poke) {
      res.status(404).json({ success: false, error: 'Poke request not found' });
      return;
    }

    if (poke.recipientId !== req.user.id) {
      res.status(403).json({ success: false, error: 'Only the recipient can accept this Poke' });
      return;
    }

    if (poke.status !== 'pending') {
      res.status(400).json({
        success: false,
        error: `This Poke request is already ${poke.status}`
      });
      return;
    }

    const parseResult = pokeAcceptSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors
      });
      return;
    }

    const { agreedCommissionRate, agreedCommissionBasis } = parseResult.data;
    const now = new Date().toISOString();

    // Update poke
    const updatedPoke = storage.updatePoke(id, {
      status: 'accepted',
      agreedCommissionRate,
      agreedCommissionBasis,
      acceptedAt: now
    });

    // Check or create connection
    let connection = storage.findConnectionBetweenUsers(poke.senderId, poke.recipientId);
    if (connection) {
      connection = storage.updateConnection(connection.id, {
        status: 'active',
        agreedCommissionRate,
        agreedCommissionBasis,
        pokeRequestId: id
      });
    } else {
      const newConnection: Connection = {
        id: createId('conn'),
        userAId: req.user.primaryRole === 'demat_holder' ? req.user.id : poke.senderId,
        userBId: req.user.primaryRole === 'demat_holder' ? poke.senderId : req.user.id,
        pokeRequestId: id,
        agreedCommissionRate,
        agreedCommissionBasis,
        status: 'active',
        createdAt: now,
        updatedAt: now
      };
      connection = storage.createConnection(newConnection);
    }

    // Insert initial legal & terms notice system message
    const systemNotice: Message = {
      id: createId('msg'),
      connectionId: connection!.id,
      senderId: 'system',
      receiverId: poke.senderId,
      content: `🤝 Connection established! Agreed terms: ${agreedCommissionRate}% on [${agreedCommissionBasis}]. Compliance Reminder: All IPO applications must use authorized channels (ASBA/UPI/Broker). Never share trading credentials, bank OTPs, or UPI PINs.`,
      type: 'system',
      metadata: {
        agreedRate: agreedCommissionRate,
        basis: agreedCommissionBasis,
        acceptedAt: now
      },
      createdAt: now
    };
    storage.createMessage(systemNotice);

    // Create sender notification
    storage.createNotification({
      id: createId('notif'),
      userId: poke.senderId,
      title: 'Poke Accepted!',
      message: `${req.user.fullName} accepted your Poke! Agreed rate: ${agreedCommissionRate}%. Private chat is now open.`,
      type: 'poke_accepted',
      referenceId: connection!.id,
      isRead: false,
      createdAt: now
    });

    // Emit real-time events
    socketService.sendToUser(poke.senderId, 'poke:accepted', {
      pokeId: id,
      connection,
      partner: {
        id: req.user.id,
        fullName: req.user.fullName,
        avatarUrl: req.user.avatarUrl,
        role: req.user.primaryRole
      }
    });

    socketService.sendToConnection(connection!.id, 'message:new', systemNotice);

    storage.createAuditLog({
      id: createId('aud'),
      actorId: req.user.id,
      action: 'POKE_ACCEPTED',
      details: {
        pokeId: id,
        senderId: poke.senderId,
        connectionId: connection!.id,
        agreedRate: agreedCommissionRate
      },
      ipAddress: req.ip,
      timestamp: now
    });

    res.json({
      success: true,
      message: 'Poke accepted! Connection established.',
      data: {
        poke: updatedPoke,
        connection
      }
    });
  } catch (error) {
    console.error('acceptPoke error:', error);
    res.status(500).json({ success: false, error: 'Failed to accept Poke' });
  }
};

export const rejectPoke = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const poke = storage.findPokeById(id);

    if (!poke) {
      res.status(404).json({ success: false, error: 'Poke request not found' });
      return;
    }

    if (poke.recipientId !== req.user.id) {
      res.status(403).json({ success: false, error: 'Only the recipient can decline this Poke' });
      return;
    }

    if (poke.status !== 'pending') {
      res.status(400).json({
        success: false,
        error: `This Poke request is already ${poke.status}`
      });
      return;
    }

    const parseResult = pokeRejectSchema.safeParse(req.body);
    const rejectionReason = parseResult.success ? parseResult.data.rejectionReason : undefined;
    const now = new Date().toISOString();

    const updated = storage.updatePoke(id, {
      status: 'rejected',
      rejectionReason,
      rejectedAt: now
    });

    // Notify sender respectfully without leaking sensitive internal notes
    storage.createNotification({
      id: createId('notif'),
      userId: poke.senderId,
      title: 'Poke Declined',
      message: `${req.user.fullName} is currently unable to accept your Poke request.`,
      type: 'poke_rejected',
      referenceId: id,
      isRead: false,
      createdAt: now
    });

    socketService.sendToUser(poke.senderId, 'poke:rejected', { pokeId: id });

    storage.createAuditLog({
      id: createId('aud'),
      actorId: req.user.id,
      action: 'POKE_REJECTED',
      details: { pokeId: id, senderId: poke.senderId },
      ipAddress: req.ip,
      timestamp: now
    });

    res.json({
      success: true,
      message: 'Poke request declined',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to decline Poke' });
  }
};

export const getMyPokes = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const pokes = storage.findPokesForUser(req.user.id);

    // Populate sender and recipient
    const populated = pokes.map((p) => {
      const sender = storage.findUserById(p.senderId);
      const recipient = storage.findUserById(p.recipientId);

      return {
        ...p,
        sender: sender
          ? {
              id: sender.id,
              fullName: sender.fullName,
              avatarUrl: sender.avatarUrl,
              city: sender.city,
              region: sender.region,
              role: sender.primaryRole,
              isKycVerified: sender.isKycVerified
            }
          : null,
        recipient: recipient
          ? {
              id: recipient.id,
              fullName: recipient.fullName,
              avatarUrl: recipient.avatarUrl,
              city: recipient.city,
              region: recipient.region,
              role: recipient.primaryRole,
              isKycVerified: recipient.isKycVerified
            }
          : null
      };
    });

    // Sort by newest
    populated.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json({
      success: true,
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve Pokes' });
  }
};
