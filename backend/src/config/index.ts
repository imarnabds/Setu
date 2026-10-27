import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
// Support JWT_ACCESS_SECRET (preferred) or JWT_SECRET (legacy)
const jwtSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const refreshTokenSecret = process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET;

// Fail fast in production if security secrets are missing or insecure
if (isProduction) {
  if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.includes('dev-only') || jwtSecret.includes('replace_with')) {
    throw new Error(
      '[FATAL] In production, JWT_ACCESS_SECRET must be set and contain at least 32 random characters. Generate with: openssl rand -hex 32'
    );
  }
  if (!refreshTokenSecret || refreshTokenSecret.length < 32 || refreshTokenSecret.includes('dev-only') || refreshTokenSecret.includes('replace_with')) {
    throw new Error(
      '[FATAL] In production, JWT_REFRESH_SECRET must be set and contain at least 32 random characters.'
    );
  }
  if (!process.env.MONGODB_URI) {
    throw new Error(
      '[FATAL] In production, MONGODB_URI must be provided.'
    );
  }
  if (!process.env.OTP_HMAC_SECRET || process.env.OTP_HMAC_SECRET.length < 32) {
    throw new Error(
      '[FATAL] In production, OTP_HMAC_SECRET must be set (min 32 chars) to hash OTP challenges.'
    );
  }
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('[WARN] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — Google OAuth will be disabled.');
  }
}

// Parse CORS allowed origins
const rawCors =
  process.env.CORS_ORIGINS ||
  process.env.CORS_ORIGIN ||
  'http://localhost:8081,http://127.0.0.1:8081';

const corsOrigins: string[] = rawCors
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv,
  isProduction,
  jwtSecret: jwtSecret || 'dev-only-jwt-access-secret-not-for-production-use-min-32!',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenSecret: refreshTokenSecret || 'dev-only-jwt-refresh-secret-not-for-production-min-32!',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/setu_database',
  corsOrigins,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8081',
  appName: process.env.APP_NAME || 'Setu',
  // Redis — ephemeral state (OTP, rate-limit, revocation)
  redisUrl: process.env.REDIS_URL || '',
  // Google OAuth 2.0
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  // OTP HMAC secret — used to hash OTP before storage, never store raw OTP
  otpHmacSecret: process.env.OTP_HMAC_SECRET || 'dev-only-otp-hmac-secret-min-32-chars-replace-in-prod!',
  // OTP provider (email/SMS) — pluggable
  otpProviderApiKey: process.env.OTP_PROVIDER_API_KEY || '',
  otpProviderSenderId: process.env.OTP_PROVIDER_SENDER_ID || 'Setu',
  // Cloudflare (infrastructure-level, not code-enforced)
  cloudflareZoneId: process.env.CLOUDFLARE_ZONE_ID || '',
  cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN || '',
  // Upstox API & IPO Sync Configuration
  upstoxApiBaseUrl: process.env.UPSTOX_API_BASE_URL || 'https://api.upstox.com/v2',
  upstoxAccessToken: process.env.UPSTOX_ACCESS_TOKEN || '',
  ipoSyncIntervalMinutes: parseInt(process.env.IPO_SYNC_INTERVAL_MINUTES || '60', 10),
  ipoStaleThresholdMinutes: parseInt(process.env.IPO_STALE_THRESHOLD_MINUTES || '120', 10),
  upstoxRequestTimeoutMs: parseInt(process.env.UPSTOX_REQUEST_TIMEOUT_MS || '10000', 10),
  commissionMin: 0,
  commissionMax: 50,
  commissionStep: 2.5,
  validCommissionRates: [
    0, 2.5, 5.0, 7.5, 10.0, 12.5, 15.0, 17.5, 20.0, 22.5, 25.0,
    27.5, 30.0, 32.5, 35.0, 37.5, 40.0, 42.5, 45.0, 47.5, 50.0
  ]
};
