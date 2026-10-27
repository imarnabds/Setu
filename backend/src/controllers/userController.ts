import { Request, Response } from 'express';
import { dbService } from '../services/dbService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { profileUpdateSchema, kycSubmitSchema, upiUpdateSchema } from '../validators/schemas.js';
import { User } from '../models/types.js';

// Explicit public profile DTO allowlist that guarantees zero exposure of email, phone, or KYC documents
export const toPublicProfileDTO = (user: User) => ({
  id: user.id,
  fullName: user.fullName,
  primaryRole: user.primaryRole,
  avatarUrl: user.avatarUrl,
  city: user.city,
  region: user.region,
  bio: user.bio,
  investmentExperience: user.investmentExperience,
  preferredLanguage: user.preferredLanguage,
  supportedCategories: user.supportedCategories || [],
  defaultCommissionRate: user.defaultCommissionRate,
  commissionBasis: user.commissionBasis,
  isKycVerified: user.isKycVerified,
  isAvailable: user.isAvailable,
  createdAt: user.createdAt
});

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

    const allUsers = await dbService.getAllUsers();
    let holders = allUsers.filter((u) => u.primaryRole === 'demat_holder');

    // Search filter
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
        (h) =>
          h.region?.toLowerCase() === region.toLowerCase() ||
          h.city?.toLowerCase() === region.toLowerCase()
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
      holders.sort((a, b) => {
        if (a.isKycVerified !== b.isKycVerified) {
          return a.isKycVerified ? -1 : 1;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    // Apply strict Public DTO allowlist (masks email, phone, and KYC documents)
    const safeHolders = holders.map(toPublicProfileDTO);

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
    const allUsers = await dbService.getAllUsers();
    let investors = allUsers.filter((u) => u.primaryRole === 'investor');

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
        (inv) =>
          inv.region?.toLowerCase() === region.toLowerCase() ||
          inv.city?.toLowerCase() === region.toLowerCase()
      );
    }

    const safeInvestors = investors.map(toPublicProfileDTO);
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
    const id = req.params.id as string;
    const user = await dbService.findUserById(id);
    if (!user) {
      res.status(404).json({ success: false, error: 'User profile not found' });
      return;
    }

    // Return sanitized public profile DTO
    res.json({
      success: true,
      data: toPublicProfileDTO(user)
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

    const updates = { ...parseResult.data };
    if (updates.upiId !== undefined) {
      // Whenever UPI ID is updated, reset isUpiVerified to false until re-verified
      (updates as any).isUpiVerified = false;
    }

    const updated = await dbService.updateUser(req.user.id, updates);
    if (!updated) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    if (updates.upiId !== undefined) {
      await dbService.createAuditLog({
        id: 'aud_' + Date.now().toString(36),
        actorId: req.user.id,
        action: 'UPI_UPDATED',
        details: { userId: req.user.id, source: 'profile_update' },
        ipAddress: req.ip,
        timestamp: new Date().toISOString()
      });
    }

    // Return own profile with password stripped
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

export const updateUpi = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const parseResult = upiUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors
      });
      return;
    }

    const { upiId } = parseResult.data;
    const trimmedUpi = upiId.trim();

    const updated = await dbService.updateUser(req.user.id, {
      upiId: trimmedUpi,
      isUpiVerified: false
    });

    if (!updated) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    await dbService.createAuditLog({
      id: 'aud_' + Date.now().toString(36),
      actorId: req.user.id,
      action: 'UPI_UPDATED',
      details: {
        userId: req.user.id,
        source: 'direct_upi_update',
        isVerified: false
      },
      ipAddress: req.ip,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Active UPI ID saved successfully',
      data: {
        upiId: updated.upiId,
        isUpiVerified: updated.isUpiVerified || false
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update UPI ID' });
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
    const {
      avatarUrl,
      livePhotoUrl,
      aadhaarNumber,
      aadhaarFrontUrl,
      aadhaarBackUrl,
      panNumber,
      panCardUrl,
      documentType
    } = parseResult.data;

    // Masked document number (e.g., Aadhaar XXXX-XXXX-1234 & PAN ABCDE****F)
    const maskedAadhaar = aadhaarNumber
      ? 'XXXX-XXXX-' + aadhaarNumber.replace(/\D/g, '').slice(-4)
      : 'XXXX-XXXX-XXXX';
    const maskedPan = panNumber
      ? panNumber.slice(0, 5) + '****' + panNumber.slice(-1)
      : 'XXXXXXXXXX';

    const kycDetails = {
      documentType: documentType || 'Aadhaar + PAN Verification',
      documentNumberMasked: `${maskedAadhaar} / ${maskedPan}`,
      submittedAt: now,
      status: 'pending' as const,
      livePhotoUrl,
      aadhaarNumber,
      aadhaarFrontUrl,
      aadhaarBackUrl,
      panNumber,
      panCardUrl
    };

    const userUpdates: Partial<User> = {
      kycDetails,
      isKycVerified: false
    };

    if (avatarUrl) {
      userUpdates.avatarUrl = avatarUrl;
    }

    const updated = await dbService.updateUser(req.user.id, userUpdates);

    await dbService.createAuditLog({
      id: 'aud_' + Date.now().toString(36),
      actorId: req.user.id,
      action: 'KYC_SUBMITTED',
      details: {
        documentType: kycDetails.documentType,
        hasLivePhoto: !!livePhotoUrl,
        hasAadhaar: !!aadhaarFrontUrl && !!aadhaarBackUrl,
        hasPan: !!panCardUrl
      },
      ipAddress: req.ip,
      timestamp: now
    });

    const { password: _, refreshToken: __, ...safeUser } = updated || req.user;

    res.json({
      success: true,
      message: 'KYC documents submitted for review. Our compliance team will review within 24 hours.',
      data: {
        user: safeUser,
        kycDetails: updated?.kycDetails
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to submit KYC' });
  }
};
