import { storage } from './services/storage.js';
import { hashPassword } from './utils/security.js';
import { User } from './models/types.js';

export const seedDatabase = async () => {
  console.log('[Seed] Verifying system accounts...');
  const existingUsers = storage.getAllUsers();
  const adminEmail = 'kuchbhi0804@gmail.com';
  const existingAdmin = existingUsers.find((u) => u.email.toLowerCase() === adminEmail);

  if (existingAdmin) {
    console.log(`[Seed] Admin user ${adminEmail} already exists. Skipping.`);
    return;
  }

  console.log(`[Seed] Creating default administrator: ${adminEmail}`);
  const adminPassword = await hashPassword('123456');
  const now = new Date().toISOString();

  const adminUser: User = {
    id: 'usr_admin_kuchbhi0804',
    fullName: 'Setu Platform Administrator',
    email: adminEmail,
    mobileNumber: '+91 98765 08040',
    password: adminPassword,
    primaryRole: 'admin',
    isEmailVerified: true,
    isMobileVerified: true,
    isKycVerified: true,
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    city: 'Mumbai',
    region: 'Maharashtra',
    bio: 'Primary Compliance & Verification Administrator for Setu Platform.',
    supportedCategories: ['Platform Compliance', 'KYC Review', 'Security Audit'],
    defaultCommissionRate: 0,
    commissionBasis: 'Platform Administration',
    isAvailable: true,
    createdAt: now,
    updatedAt: now
  };

  storage.createUser(adminUser);
  console.log('[Seed] Default administrator created successfully.');
};
