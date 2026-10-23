import { connectDatabase } from '../src/config/database.js';
import {
  MongoUserModel,
  MongoConnectionModel,
  MongoPokeModel,
  MongoMessageModel,
  MongoNotificationModel,
  MongoIpoModel
} from '../src/models/mongooseModels.js';
import { hashPassword, comparePassword } from '../src/utils/security.js';

async function main() {
  await connectDatabase();
  console.log('[Cleanup] Starting demo account removal...');

  const adminEmail = 'kuchbhi0804@gmail.com';
  const realUserEmail = 'b4uthisizme@gmail.com';

  // 1. Identify users to preserve
  const preservedEmails = [adminEmail.toLowerCase(), realUserEmail.toLowerCase()];

  // 2. Fetch all users
  const allUsers = await MongoUserModel.find({}).lean().exec();
  console.log(`[Cleanup] Found ${allUsers.length} total users in MongoDB.`);

  const demoUsers = allUsers.filter(
    (u) => !preservedEmails.includes((u.email || '').toLowerCase())
  );
  const demoUserIds = demoUsers.map((u) => u._id);

  console.log(`[Cleanup] Identified ${demoUsers.length} demo/test accounts to remove:`);
  for (const du of demoUsers) {
    console.log(`  - ${du.email} (${du.fullName}, role: ${du.primaryRole}, id: ${du._id})`);
  }

  // 3. Remove dependent records for demo users
  if (demoUserIds.length > 0) {
    // A. Connections where either userA or userB is a demo user
    const deletedConnections = await MongoConnectionModel.deleteMany({
      $or: [{ userAId: { $in: demoUserIds } }, { userBId: { $in: demoUserIds } }]
    });
    console.log(`[Cleanup] Deleted ${deletedConnections.deletedCount} demo connections.`);

    // B. Pokes where sender or recipient is a demo user
    const deletedPokes = await MongoPokeModel.deleteMany({
      $or: [{ senderId: { $in: demoUserIds } }, { recipientId: { $in: demoUserIds } }]
    });
    console.log(`[Cleanup] Deleted ${deletedPokes.deletedCount} demo pokes.`);

    // C. Messages sent by or to demo users
    const deletedMessages = await MongoMessageModel.deleteMany({
      $or: [{ senderId: { $in: demoUserIds } }, { receiverId: { $in: demoUserIds } }]
    });
    console.log(`[Cleanup] Deleted ${deletedMessages.deletedCount} demo messages.`);

    // D. Notifications for demo users
    const deletedNotifications = await MongoNotificationModel.deleteMany({
      userId: { $in: demoUserIds }
    });
    console.log(`[Cleanup] Deleted ${deletedNotifications.deletedCount} demo notifications.`);

    // E. Delete the demo users themselves
    const deletedUsers = await MongoUserModel.deleteMany({
      _id: { $in: demoUserIds }
    });
    console.log(`[Cleanup] Deleted ${deletedUsers.deletedCount} demo user documents.`);
  }

  // 4. Remove any archived demo IPOs (now that no connections or pokes reference them)
  const deletedDemoIpos = await MongoIpoModel.deleteMany({
    source: { $in: ['local_sync', 'demo_preserved'] }
  });
  console.log(`[Cleanup] Deleted ${deletedDemoIpos.deletedCount} demo IPO records.`);

  // 5. Ensure admin user kuchbhi0804@gmail.com has password 123456
  console.log(`[Cleanup] Ensuring admin account (${adminEmail}) with password '123456'...`);
  let admin = await MongoUserModel.findOne({ email: adminEmail.toLowerCase() }).exec();
  const hashedAdminPassword = await hashPassword('123456');

  if (!admin) {
    console.log('[Cleanup] Creating admin user kuchbhi0804@gmail.com...');
    await MongoUserModel.create({
      _id: 'usr_admin_kuchbhi0804',
      fullName: 'Setu Platform Administrator',
      email: adminEmail.toLowerCase(),
      mobileNumber: '+91 98765 08040',
      password: hashedAdminPassword,
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log('[Cleanup] Admin user created.');
  } else {
    admin.password = hashedAdminPassword;
    admin.primaryRole = 'admin';
    admin.isEmailVerified = true;
    admin.isMobileVerified = true;
    admin.isKycVerified = true;
    admin.updatedAt = new Date().toISOString();
    await admin.save();
    console.log('[Cleanup] Admin credentials and role updated.');
  }

  // Verify password matches
  const verifiedAdmin = await MongoUserModel.findOne({ email: adminEmail.toLowerCase() }).lean().exec();
  const passwordMatches = await comparePassword('123456', verifiedAdmin!.password);
  console.log(`[Cleanup] Verified admin login password '123456' match: ${passwordMatches}`);

  // 6. Summary of remaining database state
  const remainingUsers = await MongoUserModel.find({}).lean().exec();
  const remainingIpos = await MongoIpoModel.countDocuments();
  const remainingConns = await MongoConnectionModel.countDocuments();
  const remainingPokes = await MongoPokeModel.countDocuments();
  const remainingMsgs = await MongoMessageModel.countDocuments();

  console.log('\n====================================================');
  console.log('CLEANUP SUMMARY:');
  console.log(`- Remaining Users (${remainingUsers.length}):`);
  for (const ru of remainingUsers) {
    console.log(`    * ${ru.email} [${ru.primaryRole}] - ${ru.fullName}`);
  }
  console.log(`- Remaining Live Upstox IPOs: ${remainingIpos}`);
  console.log(`- Remaining Connections: ${remainingConns}`);
  console.log(`- Remaining Pokes: ${remainingPokes}`);
  console.log(`- Remaining Messages: ${remainingMsgs}`);
  console.log('====================================================');

  process.exit(0);
}

main().catch((err) => {
  console.error('[Cleanup Error]', err);
  process.exit(1);
});
