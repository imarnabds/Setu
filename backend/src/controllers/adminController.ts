import { Response } from 'express';
import { storage } from '../services/storage.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { kycReviewSchema } from '../validators/schemas.js';

export const getAdminStats = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const users = storage.getAllUsers();
    const pokes = storage.getAllPokes();
    const connections = storage.getAllConnections();

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
    let users = storage.getAllUsers();

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
    const { userId } = req.params;
    const user = storage.findUserById(userId);

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

    const updated = storage.updateUser(userId, {
      isKycVerified: status === 'verified',
      kycDetails: {
        ...(user.kycDetails || {
          documentType: 'ID Document',
          documentNumberMasked: 'XXXX' + user.mobileNumber.slice(-4),
          submittedAt: now
        }),
        status,
        notes: notes || '',
        verifiedAt: status === 'verified' ? now : undefined
      }
    });

    // Notify user
    storage.createNotification({
      id: 'notif_' + Date.now().toString(36),
      userId,
      title: status === 'verified' ? 'Profile Verified!' : 'Verification Update',
      message:
        status === 'verified'
          ? 'Your Demat & identity verification has been approved by compliance.'
          : `Verification could not be completed: ${notes || 'Please resubmit documents.'}`,
      type: 'kyc_status',
      isRead: false,
      createdAt: now
    });

    storage.createAuditLog({
      id: 'aud_' + Date.now().toString(36),
      actorId: req.user?.id || 'admin',
      action: status === 'verified' ? 'KYC_APPROVED' : 'KYC_REJECTED',
      details: { userId, status, notes },
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
    const pokes = storage.getAllPokes().map((p) => {
      const sender = storage.findUserById(p.senderId);
      const recipient = storage.findUserById(p.recipientId);
      return {
        ...p,
        senderName: sender?.fullName || p.senderId,
        recipientName: recipient?.fullName || p.recipientId
      };
    });

    res.json({
      success: true,
      data: pokes
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
    const connections = storage.getAllConnections().map((c) => {
      const userA = storage.findUserById(c.userAId);
      const userB = storage.findUserById(c.userBId);
      return {
        ...c,
        userAName: userA?.fullName || c.userAId,
        userBName: userB?.fullName || c.userBId
      };
    });

    res.json({
      success: true,
      data: connections
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
    const logs = storage.getAuditLogs();
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve audit logs' });
  }
};
