import { Request, Response } from 'express';
import { storage } from '../services/storage.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { profileUpdateSchema, kycSubmitSchema } from '../validators/schemas.js';

export const getHolders = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      q,
      region,
      category,
      minCommission,
      maxCommission,
      verifiedOnly,
      sortBy
    } = req.query;

    let holders = storage.getAllUsers().filter((u) => u.primaryRole === 'demat_holder');

    // Query search
    if (q && typeof q === 'string') {
      const query = q.toLowerCase().trim();
      holders = holders.filter(
        (h) =>
          h.fullName.toLowerCase().includes(query) ||
          (h.bio && h.bio.toLowerCase().includes(query)) ||
          (h.city && h.city.toLowerCase().includes(query)) ||
          (h.region && h.region.toLowerCase().includes(query)) ||
          h.supportedCategories.some((cat) => cat.toLowerCase().includes(query))
      );
    }

    // Region filter
    if (region && typeof region === 'string' && region !== 'all') {
      holders = holders.filter(
        (h) => h.region?.toLowerCase() === region.toLowerCase() || h.city?.toLowerCase() === region.toLowerCase()
      );
    }

    // Category filter
    if (category && typeof category === 'string' && category !== 'all') {
      holders = holders.filter((h) =>
        h.supportedCategories.some((cat) => cat.toLowerCase() === category.toLowerCase())
      );
    }

    // Commission range filter
    if (minCommission !== undefined) {
      const min = parseFloat(minCommission as string);
      if (!isNaN(min)) {
        holders = holders.filter((h) => h.defaultCommissionRate >= min);
      }
    }
    if (maxCommission !== undefined) {
      const max = parseFloat(maxCommission as string);
      if (!isNaN(max)) {
        holders = holders.filter((h) => h.defaultCommissionRate <= max);
      }
    }

    // Verified filter
    if (verifiedOnly === 'true') {
      holders = holders.filter((h) => h.isKycVerified);
    }

    // Sorting
    if (sortBy === 'commission_low') {
      holders.sort((a, b) => a.defaultCommissionRate - b.defaultCommissionRate);
    } else if (sortBy === 'commission_high') {
      holders.sort((a, b) => b.defaultCommissionRate - a.defaultCommissionRate);
    } else {
      // Default: verified first, then newest
      holders.sort((a, b) => {
        if (a.isKycVerified !== b.isKycVerified) {
          return a.isKycVerified ? -1 : 1;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    // Strip passwords and sensitive internal fields
    const safeHolders = holders.map(({ password, refreshToken, ...rest }) => rest);

    res.json({
      success: true,
      data: safeHolders
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve Demat Account Holders' });
  }
};

export const getInvestors = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, region } = req.query;
    let investors = storage.getAllUsers().filter((u) => u.primaryRole === 'investor');

    if (q && typeof q === 'string') {
      const query = q.toLowerCase().trim();
      investors = investors.filter(
        (inv) =>
          inv.fullName.toLowerCase().includes(query) ||
          (inv.bio && inv.bio.toLowerCase().includes(query)) ||
          (inv.city && inv.city.toLowerCase().includes(query))
      );
    }

    if (region && typeof region === 'string' && region !== 'all') {
      investors = investors.filter(
        (inv) => inv.region?.toLowerCase() === region.toLowerCase() || inv.city?.toLowerCase() === region.toLowerCase()
      );
    }

    const safeInvestors = investors.map(({ password, refreshToken, ...rest }) => rest);
    res.json({
      success: true,
      data: safeInvestors
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve investors' });
  }
};

export const getProfileById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = storage.findUserById(id);
    if (!user) {
      res.status(404).json({ success: false, error: 'User profile not found' });
      return;
    }

    const { password, refreshToken, ...safeProfile } = user;
    res.json({
      success: true,
      data: safeProfile
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
  }
};

export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const parseResult = profileUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors
      });
      return;
    }

    const updated = storage.updateUser(req.user.id, parseResult.data);
    if (!updated) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const { password, refreshToken, ...safeProfile } = updated;
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: safeProfile
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
};

export const submitKyc = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const parseResult = kycSubmitSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors
      });
      return;
    }

    const now = new Date().toISOString();
    const kycDetails = {
      documentType: parseResult.data.documentType,
      documentNumberMasked: parseResult.data.documentNumberMasked,
      submittedAt: now,
      status: 'pending' as const
    };

    const updated = storage.updateUser(req.user.id, {
      kycDetails,
      isKycVerified: false
    });

    storage.createAuditLog({
      id: 'aud_' + Date.now().toString(36),
      actorId: req.user.id,
      action: 'KYC_SUBMITTED',
      details: { documentType: parseResult.data.documentType },
      ipAddress: req.ip,
      timestamp: now
    });

    res.json({
      success: true,
      message: 'KYC documents submitted for review. Our compliance team will review within 24 hours.',
      data: updated?.kycDetails
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to submit KYC' });
  }
};
