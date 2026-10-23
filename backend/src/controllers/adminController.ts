import { Response } from 'express';
import { dbService } from '../services/dbService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { kycReviewSchema } from '../validators/schemas.js';

export const getAdminStats = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const users = await dbService.getAllUsers();
    const pokes = await dbService.getAllPokes();
    const connections = await dbService.getAllConnections();

    const totalUsers = users.length;
    const investorsCount = users.filter((u) => u.primaryRole === 'investor').length;
    const holdersCount = users.filter((u) => u.primaryRole === 'demat_holder').length;
    const pendingKycCount = users.filter((u) => u.kycDetails?.status === 'pending').length;
    const verifiedUsersCount = users.filter((u) => u.isKycVerified).length;

    const totalPokes = pokes.length;
    const pendingPokes = pokes.filter((p) => p.status === 'pending').length;
    const acceptedPokes = pokes.filter((p) => p.status === 'accepted').length;
    const rejectedPokes = pokes.filter((p) => p.status === 'rejected').length;

    const activeConnections = connections.filter((c) => c.status === 'active').length;

    const holdersWithComm = users.filter(
      (u) => u.primaryRole === 'demat_holder' && typeof u.defaultCommissionRate === 'number'
    );
    const avgCommission =
      holdersWithComm.length > 0
        ? (
            holdersWithComm.reduce((sum, u) => sum + u.defaultCommissionRate, 0) /
            holdersWithComm.length
          ).toFixed(1)
        : '0.0';

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          investors: investorsCount,
          holders: holdersCount,
          pendingKyc: pendingKycCount,
          verified: verifiedUsersCount
        },
        pokes: {
          total: totalPokes,
          pending: pendingPokes,
          accepted: acceptedPokes,
          rejected: rejectedPokes
        },
        connections: {
          total: connections.length,
          active: activeConnections
        },
        averageCommission: parseFloat(avgCommission)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve admin stats' });
  }
};

export const getAdminUsers = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { role, kycStatus, q } = req.query;
    let users = await dbService.getAllUsers();

    if (role && typeof role === 'string' && role !== 'all') {
      users = users.filter((u) => u.primaryRole === role);
    }

    if (kycStatus && typeof kycStatus === 'string' && kycStatus !== 'all') {
      users = users.filter((u) => u.kycDetails?.status === kycStatus);
    }

    if (q && typeof q === 'string') {
      const query = q.toLowerCase().trim();
      users = users.filter(
        (u) =>
          u.fullName.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.mobileNumber.includes(query)
      );
    }

    const safeUsers = users.map(({ password, refreshToken, ...rest }) => rest);

    res.json({
      success: true,
      data: safeUsers
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve users' });
  }
};

export const reviewKyc = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.params.userId as string;
    const user = await dbService.findUserById(userId);

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const parseResult = kycReviewSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors
      });
      return;
    }

    const { status, notes } = parseResult.data;
    const now = new Date().toISOString();
    const reviewerIdentifier = req.user?.email || req.user?.id || 'kuchbhi0804@gmail.com';

    const updated = await dbService.updateUser(userId, {
      isKycVerified: status === 'verified',
      kycDetails: {
        ...(user.kycDetails || {
          documentType: 'ID Document',
          documentNumberMasked: 'XXXX' + user.mobileNumber.slice(-4),
          submittedAt: now
        }),
        status,
        notes: notes.trim(),
        verifiedAt: status === 'verified' ? now : undefined,
        reviewedBy: reviewerIdentifier,
        reviewedAt: now
      }
    });

    // Notify user with the mandatory compliance note
    await dbService.createNotification({
      id: 'notif_' + Date.now().toString(36),
      userId,
      title: status === 'verified' ? 'KYC Verification Approved!' : 'KYC Verification Rejected',
      message:
        status === 'verified'
          ? `Your verification has been approved by compliance. Note: "${notes.trim()}"`
          : `Your verification submission was rejected. Reason: "${notes.trim()}". Please re-upload clear documents.`,
      type: 'kyc_status',
      isRead: false,
      createdAt: now
    });

    await dbService.createAuditLog({
      id: 'aud_' + Date.now().toString(36),
      actorId: req.user?.id || 'admin',
      action: status === 'verified' ? 'KYC_APPROVED' : 'KYC_REJECTED',
      details: { userId, status, notes: notes.trim(), reviewer: reviewerIdentifier },
      ipAddress: req.ip,
      timestamp: now
    });

    res.json({
      success: true,
      message: `KYC status updated to ${status}`,
      data: updated?.kycDetails
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to review KYC' });
  }
};

export const getAllPokes = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const pokes = await dbService.getAllPokes();
    const populated = await Promise.all(
      pokes.map(async (p) => {
        const sender = await dbService.findUserById(p.senderId);
        const recipient = await dbService.findUserById(p.recipientId);
        return {
          ...p,
          senderName: sender?.fullName || p.senderId,
          recipientName: recipient?.fullName || p.recipientId
        };
      })
    );

    res.json({
      success: true,
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve pokes' });
  }
};

export const getAllConnections = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const connections = await dbService.getAllConnections();
    const populated = await Promise.all(
      connections.map(async (c) => {
        const userA = await dbService.findUserById(c.userAId);
        const userB = await dbService.findUserById(c.userBId);
        return {
          ...c,
          userAName: userA?.fullName || c.userAId,
          userBName: userB?.fullName || c.userBId
        };
      })
    );

    res.json({
      success: true,
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve connections' });
  }
};

export const getAuditLogs = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const logs = await dbService.getAuditLogs();
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve audit logs' });
  }
};

export const getConnectionMessagesForAdmin = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.primaryRole !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Administrative message review requires elevated admin role.'
      });
      return;
    }

    const connectionId = req.params.connectionId as string;
    const { reason } = req.query;

    const connection = await dbService.findConnectionById(connectionId);
    if (!connection) {
      res.status(404).json({ success: false, error: 'Connection not found' });
      return;
    }

    // Mandatory audit log record for message inspection
    await dbService.createAuditLog({
      id: 'aud_' + Date.now().toString(36),
      actorId: req.user.id,
      action: 'ADMIN_CHAT_INSPECTED',
      details: {
        connectionId,
        adminEmail: req.user.email,
        reason: typeof reason === 'string' ? reason : 'Compliance audit review',
        timestamp: new Date().toISOString()
      },
      ipAddress: req.ip,
      timestamp: new Date().toISOString()
    });

    const messages = await dbService.getMessagesForConnection(connectionId);
    res.json({
      success: true,
      data: {
        connection,
        messages
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to review messages' });
  }
};
