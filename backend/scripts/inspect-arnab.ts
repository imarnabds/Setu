import { connectDatabase } from '../src/config/database.js';
import { MongoUserModel } from '../src/models/mongooseModels.js';

async function main() {
  await connectDatabase();
  const arnabUsers = await MongoUserModel.find({
    email: { $in: ['b4uthisizme@gmail.com', 'ad.arnab03@gmail.com', 'arnab.bannerjee@gmail.com'] }
  });
  for (const u of arnabUsers) {
    console.log(`Arnab user: id=${u.id}, email=${u.email}, name=${u.fullName}, role=${u.primaryRole}, mobile=${u.mobileNumber}`);
  }
  process.exit(0);
}

main().catch(console.error);
