/**
 * Redis service — ephemeral state only.
 * NEVER cache: passwords, raw OTPs, KYC docs, private messages.
 * Fails gracefully: unavailability degrades to in-memory fallback
 * (OTP send cooldowns and per-IP rate limiting still enforced via
 * express-rate-limit; the Redis layer adds per-user OTP throttling).
 */
import Redis from 'ioredis';
import { config } from '../config/index.js';

export const KEY = {
  otpChallenge: (userId: string, purpose: string) =>
    `otp:challenge:${purpose}:${userId}`,
  otpAttempts: (userId: string, purpose: string) =>
    `otp:attempts:${purpose}:${userId}`,
  otpCooldown: (userId: string, purpose: string) =>
    `otp:cooldown:${purpose}:${userId}`,
  rateLimit: (ip: string, route: string) => `rl:${route}:${ip}`,
  tokenRevoked: (jti: string) => `revoked:${jti}`,
} as const;

export const TTL = {
  otpChallenge: 10 * 60,      // 10 min — OTP valid window
  otpAttempts: 10 * 60,       // attempt counter window
  otpCooldown: 60,             // 60 s resend cooldown
  rateLimit: 15 * 60,         // 15 min rate-limit window
  tokenRevoked: 7 * 24 * 3600, // match refresh token max lifetime
} as const;

export const MAX_OTP_ATTEMPTS = 5;

class RedisService {
  private client: Redis | null = null;
  private _available = false;

  async connect(): Promise<void> {
    if (!config.redisUrl) {
      console.warn(
        '[Redis] REDIS_URL not set — ephemeral OTP and per-user rate-limit state will use in-process fallback.'
      );
      return;
    }
    try {
      this.client = new Redis(config.redisUrl, {
        tls: config.redisUrl.startsWith('rediss://') ? {} : undefined,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        connectTimeout: 5000,
        enableReadyCheck: true,
      });
      this.client.on('error', (err: Error) => {
        if (this._available) {
          console.error('[Redis] Connection error:', err.message);
          this._available = false;
        }
      });
      this.client.on('ready', () => {
        console.log('[Redis] Connected and ready.');
        this._available = true;
      });
      await this.client.connect();
    } catch (err: any) {
      console.error('[Redis] Failed to connect:', err.message);
      this._available = false;
      this.client = null;
    }
  }

  get isAvailable(): boolean {
    return this._available && this.client !== null;
  }

  // ── OTP Challenge (stores HMAC-SHA256 of OTP, never plaintext) ───────────
  async setOtpChallenge(userId: string, purpose: string, otpHmac: string): Promise<void> {
    if (!this.client) return;
    await this.client.set(
      KEY.otpChallenge(userId, purpose),
      otpHmac,
      'EX',
      TTL.otpChallenge
    );
  }

  async getOtpChallenge(userId: string, purpose: string): Promise<string | null> {
    if (!this.client) return null;
    return this.client.get(KEY.otpChallenge(userId, purpose));
  }

  async deleteOtpChallenge(userId: string, purpose: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(KEY.otpChallenge(userId, purpose));
  }

  // ── Attempt tracking (rate-limit OTP guesses per user) ───────────────────
  async incrementOtpAttempts(userId: string, purpose: string): Promise<number> {
    if (!this.client) return 0;
    const key = KEY.otpAttempts(userId, purpose);
    const count = await this.client.incr(key);
    if (count === 1) await this.client.expire(key, TTL.otpAttempts);
    return count;
  }

  async getOtpAttempts(userId: string, purpose: string): Promise<number> {
    if (!this.client) return 0;
    const v = await this.client.get(KEY.otpAttempts(userId, purpose));
    return v ? parseInt(v, 10) : 0;
  }

  async clearOtpAttempts(userId: string, purpose: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(KEY.otpAttempts(userId, purpose));
  }

  async isOtpLocked(userId: string, purpose: string): Promise<boolean> {
    const attempts = await this.getOtpAttempts(userId, purpose);
    return attempts >= MAX_OTP_ATTEMPTS;
  }

  // ── Resend cooldown ───────────────────────────────────────────────────────
  async setOtpCooldown(userId: string, purpose: string): Promise<void> {
    if (!this.client) return;
    await this.client.set(
      KEY.otpCooldown(userId, purpose),
      '1',
      'EX',
      TTL.otpCooldown
    );
  }

  async hasOtpCooldown(userId: string, purpose: string): Promise<boolean> {
    if (!this.client) return false;
    return (await this.client.get(KEY.otpCooldown(userId, purpose))) !== null;
  }

  // ── Token revocation ──────────────────────────────────────────────────────
  async revokeToken(jti: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    await this.client.set(
      KEY.tokenRevoked(jti),
      '1',
      'EX',
      ttlSeconds ?? TTL.tokenRevoked
    );
  }

  async isTokenRevoked(jti: string): Promise<boolean> {
    if (!this.client) return false;
    return (await this.client.get(KEY.tokenRevoked(jti))) !== null;
  }

  // ── Generic IP rate-limit counter ─────────────────────────────────────────
  async incrementRateLimit(ip: string, route: string, windowSecs: number): Promise<number> {
    if (!this.client) return 0;
    const key = KEY.rateLimit(ip, route);
    const count = await this.client.incr(key);
    if (count === 1) await this.client.expire(key, windowSecs);
    return count;
  }

  async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
}

export const redisService = new RedisService();

