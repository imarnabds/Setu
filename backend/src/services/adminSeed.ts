import { dbService } from './dbService.js';
import { hashPassword } from '../utils/security.js';
import { User } from '../models/types.js';
import { config } from '../config/index.js';

export const ensureAdminAndKycData = async (): Promise<void> => {
  try {
    const adminEmail = 'kuchbhi0804@gmail.com';
    const adminPasswordPlain = '123456';
    const now = new Date().toISOString();

    console.log(`[Admin Seed] Verifying admin account (${adminEmail})...`);

    let admin = await dbService.findUserByEmail(adminEmail);
    const hashedPassword = await hashPassword(adminPasswordPlain);

    if (!admin) {
      console.log(`[Admin Seed] Creating specific admin user: ${adminEmail}`);
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
        supportedCategories: ['Platform Compliance', 'KYC Review', 'Security Audit', 'Regulatory Reporting'],
        defaultCommissionRate: 0,
        commissionBasis: 'Platform Administration',
        isAvailable: true,
        createdAt: now,
        updatedAt: now
      };
      await dbService.createUser(newAdmin);
      console.log(`[Admin Seed] Admin user successfully created with email: ${adminEmail}`);
    } else {
      console.log(`[Admin Seed] Updating existing admin password and credentials for: ${adminEmail}`);
      await dbService.updateUser(admin.id, {
        password: hashedPassword,
        primaryRole: 'admin',
        isEmailVerified: true,
        isMobileVerified: true,
        isKycVerified: true
      });
      console.log(`[Admin Seed] Admin user credentials ensured.`);
    }

    // 2. Ensure live IPO baseline if empty
    await ensureIpoData();
  } catch (error: any) {
    console.error('[Admin Seed Error] Failed to ensure admin data:', error.message);
  }
};

export const ensureIpoData = async (): Promise<void> => {
  try {
    const now = new Date().toISOString();

    // Check if live Upstox IPOs already exist or a successful sync has occurred
    const syncState = await dbService.getIpoSyncState();
    const liveIpoCount = await dbService.countIpos({ isVerified: true, source: 'upstox' });

    if (!syncState?.lastSuccessfulSync && liveIpoCount === 0) {
      console.log('[IPO Seed] No live IPOs or sync state found. Waiting for Upstox sync.');
    }
  } catch (error: any) {
    console.error('[IPO Seed Error]', error.message);
  }
};

