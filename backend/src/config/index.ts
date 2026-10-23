import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const jwtSecret = process.env.JWT_SECRET;
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

// Fail fast in production if security secrets are missing or insecure
if (isProduction) {
  if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.includes('dev-only') || jwtSecret.includes('super-secret')) {
    throw new Error(
      '[FATAL SECURITY CONFIGURATION] In production, JWT_SECRET must be set via environment variable and contain at least 32 characters.'
    );
  }
  if (!refreshTokenSecret || refreshTokenSecret.length < 32 || refreshTokenSecret.includes('dev-only') || refreshTokenSecret.includes('refresh-secret')) {
    throw new Error(
      '[FATAL SECURITY CONFIGURATION] In production, REFRESH_TOKEN_SECRET must be set via environment variable and contain at least 32 characters.'
    );
  }
  if (!process.env.MONGODB_URI) {
    throw new Error(
      '[FATAL DATABASE CONFIGURATION] In production, MONGODB_URI must be provided for persistent MongoDB Atlas storage.'
    );
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
  jwtSecret: jwtSecret || 'dev-only-secret-jwt-key-not-for-production-use-min-32-chars-long!',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  refreshTokenSecret: refreshTokenSecret || 'dev-only-refresh-secret-jwt-key-not-for-production-min-32-chars!',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/setu_database',
  corsOrigins,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8081',
  appName: process.env.APP_NAME || 'Setu',
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
