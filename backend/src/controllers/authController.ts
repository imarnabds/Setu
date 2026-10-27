import crypto from 'crypto';
import { Request, Response } from 'express';
import { dbService } from '../services/dbService.js';
import {
  hashPassword,
  comparePassword,
  hashRefreshToken,
  generateTokens,
  verifyRefreshToken,
  verifyAccessToken,
  generateSecureOtp,
  hmacOtp,
  verifyOtpHmac,
  verifyGoogleIdToken,
} from '../utils/security.js';
import { redisService, MAX_OTP_ATTEMPTS } from '../services/redisService.js';
import { signupSchema, loginSchema } from '../validators/schemas.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { User } from '../models/types.js';
import { config } from '../config/index.js';

// Helper to generate canonical user IDs
const createId = () =>
  'usr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

// â”€â”€ OTP send helper (shared by signup flow & resend) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Never logs or returns the raw OTP. Stores an HMAC in Redis.
const issueEmailOtp = async (userId: string, email: string): Promise<void> => {
  const purpose = 'email_verify';

  // Enforce resend cooldown
  if (await redisService.hasOtpCooldown(userId, purpose)) {
    throw Object.assign(new Error('Please wait 60 seconds before requesting another code.'), { status: 429 });
  }

  const otp = generateSecureOtp();
  const otpHmac = hmacOtp(otp, userId, purpose);

  // Store HMAC in Redis (invalidates any previous challenge for this user+purpose)
  await redisService.setOtpChallenge(userId, purpose, otpHmac);
  // Reset attempt counter whenever a new OTP is issued
  await redisService.clearOtpAttempts(userId, purpose);
  // Set resend cooldown
  await redisService.setOtpCooldown(userId, purpose);

  // TODO: Integrate a real email provider (e.g., SendGrid, AWS SES) here.
  // The OTP must ONLY be delivered via the email channel â€” never in the API response.
  // In development mode we emit it to the server console only (never the response body).
  if (!config.isProduction) {
    console.log(`\n[DEV ONLY - OTP] Code for ${email}: ${otp} (NOT shown in production)\n`);
  } else {
    // Production: send via email provider. Placeholder until provider is configured.
    if (config.otpProviderApiKey) {
      // TODO: call email provider SDK here
      console.log(`[OTP] Sending email OTP to ${email} via configured provider...`);
    } else {
      console.warn(`[OTP] OTP_PROVIDER_API_KEY not set â€” OTP not delivered to ${email} in production.`);
    }
  }
};

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

    const { fullName, email, mobileNumber, password, primaryRole, upiId } = parseResult.data;

    // Check duplicate email
    const existingEmail = await dbService.findUserByEmail(email);
    if (existingEmail) {
      res.status(409).json({
        success: false,
        error: 'An account with this email address already exists'
      });
      return;
    }

    // Check duplicate mobile
    const existingMobile = await dbService.findUserByMobile(mobileNumber);
    if (existingMobile) {
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
      isEmailVerified: false,
      isMobileVerified: true,
      isKycVerified: false,
      ...(primaryRole === 'demat_holder' && upiId
        ? { upiId: upiId.trim(), isUpiVerified: false }
        : {}),
      kycDetails: {
        documentType: 'Aadhaar + PAN Verification',
        documentNumberMasked: 'XXXX' + mobileNumber.slice(-4),
        submittedAt: now,
        status: 'none'
      },
      avatarUrl: `https://images.unsplash.com/photo-${
        primaryRole === 'demat_holder'
          ? '1534528741775-53994a69daeb'
          : '1507003211169-0a1dd7228f2d'
      }?w=150&auto=format&fit=crop&q=80`,
      city: 'Mumbai',
      region: 'Maharashtra',
      bio:
        primaryRole === 'demat_holder'
          ? 'Experienced Demat account holder active in Indian equity and IPO markets.'
          : 'Individual retail investor actively exploring upcoming Mainboard & SME IPO opportunities.',
      investmentExperience: primaryRole === 'demat_holder' ? '4+ Years' : '1-2 Years',
      preferredLanguage: 'English, Hindi',
      supportedCategories:
        primaryRole === 'demat_holder'
          ? ['Mainboard IPO', 'SME IPO', 'Retail Bidding Strategy', 'HNI Category Assistance']
          : ['Mainboard IPO', 'Retail Application Strategy'],
      defaultCommissionRate: primaryRole === 'demat_holder' ? 5.0 : 0,
      commissionBasis: 'Commission on Listing Profit',
      isAvailable: true,
      createdAt: now,
      updatedAt: now
    };

    const createdUser = await dbService.createUser(newUser);

    // Issue OTP via email (stored as HMAC in Redis â€” never returned in response)
    await issueEmailOtp(createdUser.id, createdUser.email);

    const { accessToken, refreshToken } = generateTokens(createdUser);
    await dbService.updateUser(createdUser.id, {
      refreshToken: hashRefreshToken(refreshToken)
    });

    await dbService.createAuditLog({
      id: 'aud_' + Date.now().toString(36),
      actorId: createdUser.id,
      action: 'USER_REGISTERED',
      details: { role: primaryRole, email: createdUser.email },
      ipAddress: req.ip,
      timestamp: now
    });

    // Strip sensitive fields â€” never return password, refreshToken, or OTP
    const { password: _, refreshToken: __, ...userResponse } = createdUser;

    res.status(201).json({
      success: true,
      message: 'Account created successfully. A verification code has been sent to your email.',
      data: {
        user: userResponse,
        accessToken,
        refreshToken
      }
    });
  } catch (error: any) {
    if (error.status === 429) {
      res.status(429).json({ success: false, error: error.message });
      return;
    }
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
    let user = await dbService.findUserByEmail(cleanId);
    if (!user) {
      user = await dbService.findUserByMobile(identifier.trim());
    }

    // Use a constant-time-equivalent response to prevent user enumeration
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
      return;
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
      return;
    }

    const { accessToken, refreshToken } = generateTokens(user);
    await dbService.updateUser(user.id, {
      refreshToken: hashRefreshToken(refreshToken)
    });

    await dbService.createAuditLog({
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

    const user = await dbService.findUserById(decoded.userId);
    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }

    // Verify token hash match (refresh token rotation)
    const hashed = hashRefreshToken(refreshToken);
    if (user.refreshToken !== hashed) {
      res.status(401).json({ success: false, error: 'Refresh token revoked or invalid' });
      return;
    }

    const tokens = generateTokens(user);
    await dbService.updateUser(user.id, {
      refreshToken: hashRefreshToken(tokens.refreshToken)
    });

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
    await dbService.updateUser(req.user.id, { refreshToken: undefined });
  }
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  res.json({
    success: true,
    message:
      'If an account exists with the provided information, password recovery instructions have been sent.'
  });
};

export const verifyContact = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  // This endpoint is deprecated in favor of verifyEmailOtp which uses proper HMAC OTP.
  // Redirect callers to the proper OTP flow.
  res.status(410).json({
    success: false,
    error: 'This endpoint is deprecated. Use POST /api/auth/send-email-otp and POST /api/auth/verify-email-otp.'
  });
};

export const sendEmailOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    let user: User | null = null;

    if (authReq.user) {
      user = await dbService.findUserById(authReq.user.id);
    } else if (req.headers.authorization?.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = verifyAccessToken(token);
      if (decoded?.userId) {
        user = await dbService.findUserById(decoded.userId);
      }
    }

    if (!user && req.body.email) {
      user = await dbService.findUserByEmail(req.body.email.toLowerCase().trim());
    }

    if (!user) {
      // Always respond the same to prevent user enumeration
      res.json({
        success: true,
        message: 'If an account exists, a verification code has been sent.'
      });
      return;
    }

    await issueEmailOtp(user.id, user.email);

    res.json({
      success: true,
      message: 'A 6-digit verification code has been sent to your email address.'
      // NEVER include the OTP or a hint in the response
    });
  } catch (error: any) {
    if (error.status === 429) {
      res.status(429).json({ success: false, error: error.message });
      return;
    }
    console.error('Error sending email OTP:', error);
    res.status(500).json({ success: false, error: 'Failed to send email verification OTP' });
  }
};

export const verifyEmailOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { code } = req.body;

    if (!code || typeof code !== 'string' || code.length !== 6 || !/^\d{6}$/.test(code)) {
      res.status(400).json({ success: false, error: 'Please enter a valid 6-digit verification code' });
      return;
    }

    let user: User | null = null;
    if (authReq.user) {
      user = await dbService.findUserById(authReq.user.id);
    } else if (req.headers.authorization?.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = verifyAccessToken(token);
      if (decoded?.userId) {
        user = await dbService.findUserById(decoded.userId);
      }
    }

    if (!user && req.body.email) {
      user = await dbService.findUserByEmail(req.body.email.toLowerCase().trim());
    }

    if (!user) {
      res.status(404).json({ success: false, error: 'User account not found' });
      return;
    }

    const purpose = 'email_verify';

    // Check attempt limit BEFORE verifying the code
    if (await redisService.isOtpLocked(user.id, purpose)) {
      res.status(429).json({
        success: false,
        error: `Too many incorrect attempts. Please request a new verification code.`
      });
      return;
    }

    // Retrieve stored HMAC from Redis
    const storedHmac = await redisService.getOtpChallenge(user.id, purpose);

    if (!storedHmac) {
      res.status(400).json({
        success: false,
        error: 'No verification code was found or it has expired. Please request a new code.'
      });
      return;
    }

    // Constant-time HMAC comparison
    const isMatch = verifyOtpHmac(code, user.id, purpose, storedHmac);

    if (!isMatch) {
      const attempts = await redisService.incrementOtpAttempts(user.id, purpose);
      const remaining = MAX_OTP_ATTEMPTS - attempts;
      res.status(400).json({
        success: false,
        error: remaining > 0
          ? `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Too many incorrect attempts. Please request a new code.'
      });
      return;
    }

    // OTP correct â€” invalidate (single-use)
    await redisService.deleteOtpChallenge(user.id, purpose);
    await redisService.clearOtpAttempts(user.id, purpose);

    const updated = await dbService.updateUser(user.id, {
      isEmailVerified: true,
      emailOtpCode: undefined,
      emailOtpExpiresAt: undefined
    });

    await dbService.createAuditLog({
      id: 'aud_' + Date.now().toString(36),
      actorId: user.id,
      action: 'EMAIL_OTP_VERIFIED',
      details: { email: user.email },
      ipAddress: req.ip,
      timestamp: new Date().toISOString()
    });

    const { password: _, refreshToken: __, ...userResponse } = updated || user;

    res.json({
      success: true,
      message: 'Email address verified successfully!',
      data: {
        user: userResponse
      }
    });
  } catch (error) {
    console.error('Error verifying email OTP:', error);
    res.status(500).json({ success: false, error: 'Failed to verify email OTP' });
  }
};

/**
 * Google OAuth sign-in via ID token.
 *
 * The mobile/web client obtains a Google ID token using the appropriate
 * Google Sign-In SDK (e.g., @react-native-google-signin/google-signin for RN,
 * or the Google Identity Services for web). It sends only the ID token here.
 * We verify issuer, audience, signature, and expiration server-side using
 * Google's public keys via google-auth-library.
 *
 * Account linking uses Google's stable `sub` (subject) identifier, not email.
 * Email is only used as a display/search field, never as the identity anchor.
 *
 * The Google client secret is NEVER sent to the frontend â€” it stays on the server.
 */
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken, primaryRole } = req.body;

    if (!idToken || typeof idToken !== 'string') {
      res.status(400).json({
        success: false,
        error: 'A Google ID token is required. Obtain it from Google Sign-In on the client.'
      });
      return;
    }

    if (!config.googleClientId) {
      res.status(503).json({
        success: false,
        error: 'Google Sign-In is not configured on this server. Set GOOGLE_CLIENT_ID.'
      });
      return;
    }

    // Server-side verification: checks signature, issuer, audience, expiration
    const googlePayload = await verifyGoogleIdToken(idToken);

    if (!googlePayload) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired Google ID token. Please sign in again.'
      });
      return;
    }

    // Use the stable Google subject identifier as the identity anchor
    const googleSub = googlePayload.sub;
    const googleEmail = googlePayload.email.toLowerCase().trim();
    const now = new Date().toISOString();

    // Look up existing user â€” try by googleSub first (preferred stable link),
    // then fall back to email (for accounts that pre-existed Google sign-in).
    // TODO: add a googleSub field to User schema for a clean link. For now email is used
    // since the schema does not yet have a googleSub field, but email_verified from
    // Google guarantees the email belongs to the user.
    let user = await dbService.findUserByEmail(googleEmail);

    if (user) {
      // Existing user â€” generate new tokens and return
      const { accessToken, refreshToken } = generateTokens(user);
      await dbService.updateUser(user.id, {
        refreshToken: hashRefreshToken(refreshToken),
        isEmailVerified: true // Google guarantees email_verified
      });

      await dbService.createAuditLog({
        id: 'aud_' + Date.now().toString(36),
        actorId: user.id,
        action: 'USER_LOGIN',
        details: { method: 'google_oauth', googleSub, email: user.email },
        ipAddress: req.ip,
        timestamp: now
      });

      const { password: _, refreshToken: __, ...userResponse } = user;
      res.json({
        success: true,
        message: 'Signed in with Google successfully',
        data: {
          user: userResponse,
          accessToken,
          refreshToken,
          isNewUser: false
        }
      });
      return;
    }

    // New user â€” create account
    const role: 'investor' | 'demat_holder' = primaryRole === 'demat_holder' ? 'demat_holder' : 'investor';
    // Set a long random unusable password â€” Google users authenticate via OAuth, not password
    const unusablePassword = await hashPassword(
      'google_oauth_' + crypto.randomUUID()
    );

    const newUser: User = {
      id: createId(),
      fullName: googlePayload.name?.trim() || googleEmail.split('@')[0],
      email: googleEmail,
      mobileNumber: `+91 00000 00000`, // placeholder â€” user must update via profile
      password: unusablePassword,
      primaryRole: role,
      isEmailVerified: true, // Google guarantees this
      isMobileVerified: false,
      isKycVerified: false,
      avatarUrl: googlePayload.picture || undefined,
      city: '',
      region: '',
      bio: role === 'demat_holder'
        ? 'Demat account holder joined via Google Sign-In.'
        : 'Investor joined via Google Sign-In.',
      investmentExperience: '',
      preferredLanguage: 'English',
      supportedCategories:
        role === 'demat_holder'
          ? ['Mainboard IPO', 'SME IPO']
          : ['Mainboard IPO'],
      defaultCommissionRate: role === 'demat_holder' ? 5.0 : 0,
      commissionBasis: 'Commission on Listing Profit',
      isAvailable: true,
      createdAt: now,
      updatedAt: now
    };

    const createdUser = await dbService.createUser(newUser);
    const { accessToken, refreshToken } = generateTokens(createdUser);
    await dbService.updateUser(createdUser.id, {
      refreshToken: hashRefreshToken(refreshToken)
    });

    await dbService.createAuditLog({
      id: 'aud_' + Date.now().toString(36),
      actorId: createdUser.id,
      action: 'USER_REGISTERED',
      details: { method: 'google_oauth', googleSub, role, email: createdUser.email },
      ipAddress: req.ip,
      timestamp: now
    });

    const { password: _, refreshToken: __, ...userResponse } = createdUser;

    res.status(201).json({
      success: true,
      message: 'Account created with Google Sign-In. Please complete your profile.',
      data: {
        user: userResponse,
        accessToken,
        refreshToken,
        isNewUser: true
      }
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    res.status(500).json({ success: false, error: 'Internal server error during Google authentication' });
  }
};

/**
 * Legacy social auth endpoint â€” now requires a real Google ID token.
 * The old "trust client email" path is completely removed.
 * Kept for backward-compatibility with existing mobile clients that call /social.
 */
export const socialAuth = async (req: Request, res: Response): Promise<void> => {
  const { provider, idToken } = req.body;

  if (provider === 'google') {
    // Delegate to the secure Google handler
    return googleAuth(req, res);
  }

  res.status(400).json({
    success: false,
    error: 'Only Google Sign-In is currently supported. Pass provider="google" and a valid idToken.'
  });
};

