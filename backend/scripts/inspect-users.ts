import { connectDatabase } from '../src/config/database.js';
import { MongoUserModel, MongoConnectionModel, MongoPokeModel, MongoMessageModel, MongoNotificationModel, MongoIpoModel } from '../src/models/mongooseModels.js';

async function main() {
  await connectDatabase();
  console.log('--- ALL USERS IN MONGODB ---');
  const users = await MongoUserModel.find({});
  for (const u of users) {
    console.log(`[User] email=${u.email} | id=${u.id} | role=${u.primaryRole} | name=${u.fullName} | created=${u.createdAt}`);
  }

  const connections = await MongoConnectionModel.find({});
  console.log(`\nTOTAL CONNECTIONS: ${connections.length}`);
  for (const c of connections) {
    console.log(`Connection: id=${c.id}, userAId=${c.userAId}, userBId=${c.userBId}, ipoId=${c.ipoId}`);
  }

  const pokes = await MongoPokeModel.find({});
  console.log(`\nTOTAL POKES: ${pokes.length}`);
  for (const p of pokes) {
    console.log(`Poke: id=${p.id}, senderId=${p.senderId}, recipientId=${p.recipientId}`);
  }

  const messages = await MongoMessageModel.find({});
  console.log(`\nTOTAL MESSAGES: ${messages.length}`);

  const ipos = await MongoIpoModel.find({});
  console.log(`\nTOTAL IPOS IN MONGODB: ${ipos.length}`);
  const liveCount = ipos.filter(i => i.isVerified && i.source === 'upstox').length;
  console.log(`Live Upstox Verified IPOs: ${liveCount}`);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
