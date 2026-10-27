import { dbService } from './dbService.js';
import { hashPassword } from '../utils/security.js';
import { User } from '../models/types.js';

/**
 * Ensures the designated admin account exists exactly once.
 *
 * IMPORTANT: This function is IDEMPOTENT. If the admin already exists it does
 * nothing — it does NOT reset or overwrite the existing password. Resetting
 * credentials at startup is the root cause of "password resets on restart".
 *
 * If you need to change the admin password, do so via the dedicated
 * password-change API or directly in MongoDB with a pre-hashed value.
 */
export const ensureAdminAndKycData = async (): Promise<void> => {
  try {
    const adminEmail = 'kuchbhi0804@gmail.com';
    const now = new Date().toISOString();

    console.log(`[Admin Seed] Verifying admin account (${adminEmail})...`);

    const admin = await dbService.findUserByEmail(adminEmail);

    if (admin) {
      // Admin already exists — leave it completely untouched.
      // Do NOT update the password here; that would silently overwrite whatever
      // password the admin last set and is the bug that caused "credentials reset
      // on restart".
      console.log(
        `[Admin Seed] Admin account found (id: ${admin.id}). No changes made — existing credentials preserved.`
      );
    } else {
      // First-time bootstrap: create admin with a TEMPORARY password.
      // The admin MUST change this via the password-change API before production use.
      // The temporary password is read from ADMIN_BOOTSTRAP_PASSWORD env var; if not
      // set a strong random one is generated and printed ONCE to the log.
      const bootstrapPassword =
        process.env.ADMIN_BOOTSTRAP_PASSWORD ||
        (() => {
          const random =
            'Setu@' +
            Math.random().toString(36).slice(2, 10).toUpperCase() +
            Math.random().toString(36).slice(2, 6) +
            '!';
          console.warn(
            `[Admin Seed] ADMIN_BOOTSTRAP_PASSWORD not set. Generated temporary password: ${random}`
          );
          console.warn(
            `[Admin Seed] CHANGE THIS PASSWORD IMMEDIATELY after first login.`
          );
          return random;
        })();

      const hashedPassword = await hashPassword(bootstrapPassword);

      const newAdmin: User = {
        id: 'usr_admin_kuchbhi0804',
        fullName: 'Setu Platform Administrator',
        email: adminEmail,
        mobileNumber: '+91 98765 08040',
        password: hashedPassword,
        primaryRole: 'admin',
        isEmailVerified: true,
        isMobileVerified: true,
        isKycVerified: true,
        avatarUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        city: 'Mumbai',
        region: 'Maharashtra',
        bio: 'Primary Compliance & Verification Administrator for Setu Platform.',
        supportedCategories: [
          'Platform Compliance',
          'KYC Review',
          'Security Audit',
          'Regulatory Reporting'
        ],
        defaultCommissionRate: 0,
        commissionBasis: 'Platform Administration',
        isAvailable: true,
        createdAt: now,
        updatedAt: now
      };

      await dbService.createUser(newAdmin);
      console.log(
        `[Admin Seed] Admin account created for ${adminEmail}. Set ADMIN_BOOTSTRAP_PASSWORD in .env to control the initial password.`
      );
    }

    // Ensure live IPO baseline if needed
    await ensureIpoData();
  } catch (error: any) {
    console.error('[Admin Seed Error] Failed to ensure admin data:', error.message);
  }
};

export const ensureIpoData = async (): Promise<void> => {
  try {
    const syncState = await dbService.getIpoSyncState();
    const liveIpoCount = await dbService.countIpos({ isVerified: true, source: 'upstox' });

    if (!syncState?.lastSuccessfulSync && liveIpoCount === 0) {
      console.log('[IPO Seed] No live IPOs or sync state found. Waiting for Upstox sync.');
    }
  } catch (error: any) {
    console.error('[IPO Seed Error]', error.message);
  }
};


