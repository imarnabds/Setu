import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/index.js';
import { User } from '../models/types.js';

// ── Password hashing ──────────────────────────────────────────────────────────
// Work factor 12: ~250 ms on modern hardware — appropriate for bcrypt.
// Passwords are NEVER stored in plaintext or encrypted (reversible). bcrypt is
// one-way: verification compares submitted password against stored hash only.
const BCRYPT_ROUNDS = 12;

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (
  plain: string,
  hashed: string
): Promise<boolean> => {
  return bcrypt.compare(plain, hashed);
};

// ── Refresh token hashing ─────────────────────────────────────────────────────
export const hashRefreshToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// ── JWT helpers ───────────────────────────────────────────────────────────────
export const generateTokens = (user: User) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.primaryRole
  };

  const accessToken = jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as any
  });

  const refreshToken = jwt.sign(
    { userId: user.id },
    config.refreshTokenSecret,
    {
      expiresIn: config.refreshTokenExpiresIn as any
    }
  );

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): any => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
};

export const verifyRefreshToken = (token: string): any => {
  try {
    return jwt.verify(token, config.refreshTokenSecret);
  } catch {
    return null;
  }
};

// ── OTP generation & verification ─────────────────────────────────────────────
// Generates a cryptographically secure 6-digit OTP.
export const generateSecureOtp = (): string => {
  // crypto.randomInt(min, max) is cryptographically secure (exclusive upper)
  const n = crypto.randomInt(100000, 1000000);
  return n.toString();
};

// HMAC-SHA256 of the OTP — this is what is stored in Redis, never the raw OTP.
// The same secret is used on verification to reproduce the HMAC and compare.
export const hmacOtp = (otp: string, userId: string, purpose: string): string => {
  const material = `${purpose}:${userId}:${otp}`;
  return crypto
    .createHmac('sha256', config.otpHmacSecret)
    .update(material)
    .digest('hex');
};

// Constant-time comparison to prevent timing attacks
export const verifyOtpHmac = (
  submittedOtp: string,
  userId: string,
  purpose: string,
  storedHmac: string
): boolean => {
  const expected = hmacOtp(submittedOtp, userId, purpose);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(storedHmac, 'hex')
    );
  } catch {
    return false;
  }
};

// ── Google OAuth verification ─────────────────────────────────────────────────
// Verifies a Google ID token on the backend using Google's public keys.
// This is the ONLY safe way to accept Google sign-in — the client sends the
// ID token; we verify issuer, audience, signature, and expiration server-side.
export interface GoogleTokenPayload {
  sub: string;       // stable Google user identifier — use this, not email
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  aud: string | string[];
  iss: string;
  exp: number;
}

let _googleClient: OAuth2Client | null = null;
const getGoogleClient = (): OAuth2Client => {
  if (!_googleClient) {
    _googleClient = new OAuth2Client(config.googleClientId);
  }
  return _googleClient;
};

export const verifyGoogleIdToken = async (
  idToken: string
): Promise<GoogleTokenPayload | null> => {
  if (!config.googleClientId) {
    console.warn('[Google OAuth] GOOGLE_CLIENT_ID not configured — verification skipped.');
    return null;
  }
  try {
    const client = getGoogleClient();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: config.googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload) return null;

    // Validate required claims
    if (!payload.sub) return null;
    if (!payload.email_verified) {
      console.warn('[Google OAuth] Received token with unverified email — rejecting.');
      return null;
    }
    // Verify issuer
    if (
      payload.iss !== 'accounts.google.com' &&
      payload.iss !== 'https://accounts.google.com'
    ) {
      console.warn('[Google OAuth] Invalid issuer:', payload.iss);
      return null;
    }

    return payload as unknown as GoogleTokenPayload;
  } catch (err: any) {
    console.error('[Google OAuth] Token verification failed:', err.message);
    return null;
  }
};

