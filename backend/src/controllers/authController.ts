import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../services/storage.js';
import {
  hashPassword,
  comparePassword,
  generateTokens,
  verifyRefreshToken
} from '../utils/security.js';
import { signupSchema, loginSchema } from '../validators/schemas.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { User } from '../models/types.js';

// Helper to generate simple UUID if uuid package isn't used
const createId = () => 'usr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = signupSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors
      });
      return;
    }

    const { fullName, email, mobileNumber, password, primaryRole } = parseResult.data;

    // Check duplicate email
    if (storage.findUserByEmail(email)) {
      res.status(409).json({
        success: false,
        error: 'An account with this email address already exists'
      });
      return;
    }

    // Check duplicate mobile
    if (storage.findUserByMobile(mobileNumber)) {
      res.status(409).json({
        success: false,
        error: 'An account with this mobile number already exists'
      });
      return;
    }

    const hashedPassword = await hashPassword(password);
    const now = new Date().toISOString();

    const newUser: User = {
      id: createId(),
      fullName,
      email: email.toLowerCase().trim(),
      mobileNumber: mobileNumber.trim(),
      password: hashedPassword,
      primaryRole,
      isEmailVerified: true, // For smooth dev/demo onboarding
      isMobileVerified: true,
      isKycVerified: false,
      kycDetails: {
        documentType: 'PAN / Demat Account Statement',
        documentNumberMasked: 'XXXX' + mobileNumber.slice(-4),
        submittedAt: now,
        status: 'none'
      },
      avatarUrl: `https://images.unsplash.com/photo-${primaryRole === 'demat_holder' ? '1534528741775-53994a69daeb' : '1507003211169-0a1dd7228f2d'}?w=150&auto=format&fit=crop&q=80`,
      city: 'Mumbai',
      region: 'Maharashtra',
      bio:
        primaryRole === 'demat_holder'
          ? 'Experienced Demat account holder active in Indian equity and IPO markets. Happy to assist with lawful allocation procedures and bidding strategy.'
          : 'Individual retail investor actively exploring upcoming Mainboard & SME IPO opportunities.',
      investmentExperience: primaryRole === 'demat_holder' ? '4+ Years' : '1-2 Years',
      preferredLanguage: 'English, Hindi',
      supportedCategories:
        primaryRole === 'demat_holder'
          ? ['Mainboard IPO', 'SME IPO', 'Retail Bidding Strategy', 'HNI Category Assistance']
          : ['Mainboard IPO', 'Retail Application Strategy'],
      defaultCommissionRate: primaryRole === 'demat_holder' ? 5.0 : 0,
      commissionBasis: 'Fixed Advisory / Assistance Service Fee Base',
      isAvailable: true,
      createdAt: now,
      updatedAt: now
    };

    storage.createUser(newUser);

    const { accessToken, refreshToken } = generateTokens(newUser);
    storage.updateUser(newUser.id, { refreshToken });

    // Audit log
    storage.createAuditLog({
      id: 'aud_' + Date.now().toString(36),
      actorId: newUser.id,
      action: 'USER_REGISTERED',
      details: { role: primaryRole, email: newUser.email },
      ipAddress: req.ip,
      timestamp: now
    });

    // Strip sensitive fields
    const { password: _, refreshToken: __, ...userResponse } = newUser;

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: userResponse,
        accessToken,
        refreshToken
      }
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, error: 'Internal server error during registration' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors
      });
      return;
    }

    const { identifier, password } = parseResult.data;
    const cleanId = identifier.trim().toLowerCase();

    // Find by email or mobile
    let user = storage.findUserByEmail(cleanId);
    if (!user) {
      user = storage.findUserByMobile(identifier.trim());
    }

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid email/mobile or password'
      });
      return;
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: 'Invalid email/mobile or password'
      });
      return;
    }

    const { accessToken, refreshToken } = generateTokens(user);
    storage.updateUser(user.id, { refreshToken });

    storage.createAuditLog({
      id: 'aud_' + Date.now().toString(36),
      actorId: user.id,
      action: 'USER_LOGIN',
      details: { role: user.primaryRole },
      ipAddress: req.ip,
      timestamp: new Date().toISOString()
    });

    const { password: _, refreshToken: __, ...userResponse } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        accessToken,
        refreshToken
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error during login' });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ success: false, error: 'Refresh token required' });
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded || !decoded.userId) {
      res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
      return;
    }

    const user = storage.findUserById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      res.status(401).json({ success: false, error: 'Refresh token revoked or mismatched' });
      return;
    }

    const tokens = generateTokens(user);
    storage.updateUser(user.id, { refreshToken: tokens.refreshToken });

    res.json({
      success: true,
      data: tokens
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to refresh token' });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  const { password: _, refreshToken: __, ...userResponse } = req.user;
  res.json({
    success: true,
    data: userResponse
  });
};

export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user) {
    storage.updateUser(req.user.id, { refreshToken: undefined });
  }
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  // Non-revealing response for security
  res.json({
    success: true,
    message: 'If an account exists with the provided information, password recovery instructions have been sent.'
  });
};

export const verifyContact = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  const { type, code } = req.body;
  // Demo verification code is '123456' or any 6-digit code for frictionless testing
  if (code && code.length === 6) {
    const updates: Partial<User> = {};
    if (type === 'email') updates.isEmailVerified = true;
    if (type === 'mobile') updates.isMobileVerified = true;
    const updated = storage.updateUser(req.user.id, updates);
    res.json({
      success: true,
      message: `${type === 'email' ? 'Email' : 'Mobile number'} verified successfully`,
      data: updated
    });
    return;
  }

  res.status(400).json({ success: false, error: 'Invalid verification code. Enter any 6-digit code (e.g. 123456) for demo mode.' });
};
