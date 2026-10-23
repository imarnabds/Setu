import { connectDatabase } from '../src/config/database.js';
import { dbService } from '../src/services/dbService.js';
import { hashPassword, comparePassword } from '../src/utils/security.js';

async function main() {
  await connectDatabase();
  const adminEmail = 'kuchbhi0804@gmail.com';
  let admin = await dbService.findUserByEmail(adminEmail);
  console.log('Admin user in DB:', admin ? { id: admin.id, email: admin.email, role: admin.primaryRole } : 'Not found');
  
  if (admin) {
    const is123456 = await comparePassword('123456', admin.password);
    console.log('Does password match 123456?', is123456);
    if (!is123456) {
      console.log('Updating password to 123456...');
      const hashedPassword = await hashPassword('123456');
      await dbService.updateUser(admin.id, { password: hashedPassword });
      console.log('Password updated successfully.');
    }
  } else {
    console.log('Creating admin user...');
    const hashedPassword = await hashPassword('123456');
    const newAdmin = {
      id: 'usr_admin_kuchbhi0804',
      fullName: 'Setu Platform Administrator',
      email: adminEmail,
      mobileNumber: '+91 98765 08040',
      password: hashedPassword,
      primaryRole: 'admin' as const,
      isEmailVerified: true,
      isMobileVerified: true,
      isKycVerified: true,
      city: 'Mumbai',
      region: 'Maharashtra',
      bio: 'Primary Compliance & Verification Administrator for Setu Platform.',
      supportedCategories: ['Platform Compliance', 'KYC Review', 'Security Audit'],
      defaultCommissionRate: 0,
      commissionBasis: 'Platform Administration',
      isAvailable: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await dbService.createUser(newAdmin);
    console.log('Created admin user successfully.');
  }

  process.exit(0);
}

main().catch(console.error);
