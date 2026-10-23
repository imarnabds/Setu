/**
 * Setu — Safe, Restartable JSON to MongoDB Data Migration Utility
 *
 * Usage:
 *   Dry-Run Mode (validates and previews without writing to MongoDB):
 *     npx tsx scripts/migrate-json-to-mongodb.ts --dry-run
 *
 *   Execute Mode (imports records into MongoDB with upsert):
 *     npx tsx scripts/migrate-json-to-mongodb.ts --execute
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { config } from '../src/config/index.js';
import {
  MongoUserModel,
  MongoPokeModel,
  MongoConnectionModel,
  MongoMessageModel,
  MongoCommissionModel,
  MongoNotificationModel,
  MongoAuditModel
} from '../src/models/mongooseModels.js';

interface MigrationSummary {
  dryRun: boolean;
  sourceFile: string;
  sourceFileSize: number;
  sourceFileSha256: string;
  databaseUriSanitized: string;
  databaseName: string;
  counts: {
    users: { source: number; valid: number; inserted: number; updated: number; skipped: number; errors: number };
    pokes: { source: number; valid: number; inserted: number; updated: number; skipped: number; errors: number };
    connections: { source: number; valid: number; inserted: number; updated: number; skipped: number; errors: number };
    messages: { source: number; valid: number; inserted: number; updated: number; skipped: number; errors: number };
    commissionHistories: { source: number; valid: number; inserted: number; updated: number; skipped: number; errors: number };
    notifications: { source: number; valid: number; inserted: number; updated: number; skipped: number; errors: number };
    auditLogs: { source: number; valid: number; inserted: number; updated: number; skipped: number; errors: number };
  };
  warnings: string[];
  errors: string[];
  durationMs: number;
}

const runMigration = async () => {
  const startTime = Date.now();
  const args = process.argv.slice(2);
  const isExecute = args.includes('--execute') || args.includes('--commit');
  const isDryRun = !isExecute || args.includes('--dry-run');

  console.log('================================================================');
  console.log(`SETU DATABASE MIGRATION ENGINE — ${isDryRun ? 'DRY-RUN PREVIEW MODE' : 'LIVE EXECUTION MODE'}`);
  console.log('================================================================');

  const sourcePath = path.resolve(process.cwd(), 'data/db.json');
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`[Migration Fatal] Source JSON database not found at: ${sourcePath}`);
  }

  const fileContent = fs.readFileSync(sourcePath, 'utf-8');
  const fileSize = fs.statSync(sourcePath).size;
  const sha256 = crypto.createHash('sha256').update(fileContent).digest('hex');

  let rawData: any;
  try {
    rawData = JSON.parse(fileContent);
  } catch (err: any) {
    throw new Error(`[Migration Fatal] Failed to parse JSON database: ${err.message}`);
  }

  const summary: MigrationSummary = {
    dryRun: isDryRun,
    sourceFile: sourcePath,
    sourceFileSize: fileSize,
    sourceFileSha256: sha256,
    databaseUriSanitized: config.mongodbUri.replace(/:([^:@]{3,})@/, ':****@'),
    databaseName: 'setu_database',
    counts: {
      users: { source: 0, valid: 0, inserted: 0, updated: 0, skipped: 0, errors: 0 },
      pokes: { source: 0, valid: 0, inserted: 0, updated: 0, skipped: 0, errors: 0 },
      connections: { source: 0, valid: 0, inserted: 0, updated: 0, skipped: 0, errors: 0 },
      messages: { source: 0, valid: 0, inserted: 0, updated: 0, skipped: 0, errors: 0 },
      commissionHistories: { source: 0, valid: 0, inserted: 0, updated: 0, skipped: 0, errors: 0 },
      notifications: { source: 0, valid: 0, inserted: 0, updated: 0, skipped: 0, errors: 0 },
      auditLogs: { source: 0, valid: 0, inserted: 0, updated: 0, skipped: 0, errors: 0 }
    },
    warnings: [],
    errors: [],
    durationMs: 0
  };

  // 1. Validate & Audit Source Data Integrity
  const users = rawData.users || [];
  const pokes = rawData.pokes || [];
  const connections = rawData.connections || [];
  const messages = rawData.messages || [];
  const commissionHistories = rawData.commissionHistories || [];
  const notifications = rawData.notifications || [];
  const auditLogs = rawData.auditLogs || [];

  summary.counts.users.source = users.length;
  summary.counts.pokes.source = pokes.length;
  summary.counts.connections.source = connections.length;
  summary.counts.messages.source = messages.length;
  summary.counts.commissionHistories.source = commissionHistories.length;
  summary.counts.notifications.source = notifications.length;
  summary.counts.auditLogs.source = auditLogs.length;

  const userIds = new Set<string>();
  const emails = new Set<string>();
  const phones = new Set<string>();

  for (const u of users) {
    if (!u.id) summary.errors.push(`User missing ID: ${JSON.stringify(u)}`);
    if (userIds.has(u.id)) summary.errors.push(`Duplicate User ID: ${u.id}`);
    userIds.add(u.id);

    const emailNorm = (u.email || '').toLowerCase().trim();
    if (!emailNorm) summary.errors.push(`User ${u.id} missing email`);
    if (emails.has(emailNorm)) summary.errors.push(`Duplicate user email: ${emailNorm}`);
    emails.add(emailNorm);

    const phoneNorm = (u.mobileNumber || '').trim();
    if (phones.has(phoneNorm)) summary.warnings.push(`Duplicate user phone: ${phoneNorm}`);
    phones.add(phoneNorm);

    if (!u.password || !u.password.startsWith('$2')) {
      summary.warnings.push(`User ${u.id} does not have a standard bcrypt hash.`);
    }

    if (typeof u.defaultCommissionRate === 'number') {
      if (u.defaultCommissionRate < 0 || u.defaultCommissionRate > 50) {
        summary.errors.push(`User ${u.id} invalid commission rate: ${u.defaultCommissionRate}`);
      }
    }

    summary.counts.users.valid++;
  }

  // Validate Pokes
  const pokeIds = new Set<string>();
  for (const p of pokes) {
    if (!p.id) summary.errors.push(`Poke missing ID: ${JSON.stringify(p)}`);
    pokeIds.add(p.id);
    if (!userIds.has(p.senderId)) summary.warnings.push(`Poke ${p.id} references non-existent sender: ${p.senderId}`);
    if (!userIds.has(p.recipientId)) summary.warnings.push(`Poke ${p.id} references non-existent recipient: ${p.recipientId}`);
    summary.counts.pokes.valid++;
  }

  // Validate Connections
  const connIds = new Set<string>();
  for (const c of connections) {
    if (!c.id) summary.errors.push(`Connection missing ID: ${JSON.stringify(c)}`);
    connIds.add(c.id);
    if (!userIds.has(c.userAId)) summary.warnings.push(`Connection ${c.id} references non-existent userAId: ${c.userAId}`);
    if (!userIds.has(c.userBId)) summary.warnings.push(`Connection ${c.id} references non-existent userBId: ${c.userBId}`);
    summary.counts.connections.valid++;
  }

  // Validate Messages
  for (const m of messages) {
    if (!connIds.has(m.connectionId)) summary.warnings.push(`Message ${m.id} references non-existent connection: ${m.connectionId}`);
    summary.counts.messages.valid++;
  }

  // Validate Commission Histories
  for (const ch of commissionHistories) {
    if (!userIds.has(ch.holderId)) summary.warnings.push(`CommissionHistory ${ch.id} references non-existent holder: ${ch.holderId}`);
    summary.counts.commissionHistories.valid++;
  }

  // Validate Notifications
  for (const n of notifications) {
    if (!userIds.has(n.userId)) summary.warnings.push(`Notification ${n.id} references non-existent user: ${n.userId}`);
    summary.counts.notifications.valid++;
  }

  // Validate Audit Logs
  for (const a of auditLogs) {
    summary.counts.auditLogs.valid++;
  }

  console.log(`Source File Verification:`);
  console.log(`  Path: ${summary.sourceFile}`);
  console.log(`  Size: ${summary.sourceFileSize} bytes`);
  console.log(`  SHA-256: ${summary.sourceFileSha256}`);
  console.log(`Target Database:`);
  console.log(`  URI: ${summary.databaseUriSanitized}`);
  console.log(`Validation Results:`);
  console.log(`  Users: ${summary.counts.users.valid} valid of ${summary.counts.users.source}`);
  console.log(`  Pokes: ${summary.counts.pokes.valid} valid of ${summary.counts.pokes.source}`);
  console.log(`  Connections: ${summary.counts.connections.valid} valid of ${summary.counts.connections.source}`);
  console.log(`  Messages: ${summary.counts.messages.valid} valid of ${summary.counts.messages.source}`);
  console.log(`  Commission Histories: ${summary.counts.commissionHistories.valid} valid of ${summary.counts.commissionHistories.source}`);
  console.log(`  Notifications: ${summary.counts.notifications.valid} valid of ${summary.counts.notifications.source}`);
  console.log(`  Audit Logs: ${summary.counts.auditLogs.valid} valid of ${summary.counts.auditLogs.source}`);

  if (summary.errors.length > 0) {
    console.error('\n[Migration Error] Pre-migration validation found blocking errors:');
    summary.errors.forEach((e) => console.error(`  - ${e}`));
    throw new Error('Pre-migration integrity check failed.');
  }

  if (summary.warnings.length > 0) {
    console.warn(`\n[Migration Warning] ${summary.warnings.length} non-blocking warning(s) detected:`);
    summary.warnings.forEach((w) => console.warn(`  - ${w}`));
  }

  if (isDryRun) {
    console.log('\n[DRY RUN SUMMARY] Validation succeeded with ZERO blocking errors.');
    console.log('No data was written to MongoDB. To execute the live migration, run:');
    console.log('  npx tsx scripts/migrate-json-to-mongodb.ts --execute\n');
    return summary;
  }

  // 2. LIVE EXECUTION: Connect to MongoDB and Upsert All Records
  console.log('\nConnecting to MongoDB for Live Execution...');
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 5000 });
  const dbName = mongoose.connection.name || 'setu_database';
  summary.databaseName = dbName;
  console.log(`Connected to database: '${dbName}'`);

  // Migrate Users
  for (const u of users) {
    const doc = { ...u, _id: u.id };
    delete doc.id;
    const res = await MongoUserModel.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
    if (res.upsertedCount > 0) summary.counts.users.inserted++;
    else summary.counts.users.updated++;
  }

  // Migrate Pokes
  for (const p of pokes) {
    const doc = { ...p, _id: p.id };
    delete doc.id;
    const res = await MongoPokeModel.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
    if (res.upsertedCount > 0) summary.counts.pokes.inserted++;
    else summary.counts.pokes.updated++;
  }

  // Migrate Connections
  for (const c of connections) {
    const doc = { ...c, _id: c.id };
    delete doc.id;
    const res = await MongoConnectionModel.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
    if (res.upsertedCount > 0) summary.counts.connections.inserted++;
    else summary.counts.connections.updated++;
  }

  // Migrate Messages
  for (const m of messages) {
    const doc = { ...m, _id: m.id };
    delete doc.id;
    const res = await MongoMessageModel.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
    if (res.upsertedCount > 0) summary.counts.messages.inserted++;
    else summary.counts.messages.updated++;
  }

  // Migrate Commission Histories
  for (const ch of commissionHistories) {
    const doc = { ...ch, _id: ch.id };
    delete doc.id;
    const res = await MongoCommissionModel.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
    if (res.upsertedCount > 0) summary.counts.commissionHistories.inserted++;
    else summary.counts.commissionHistories.updated++;
  }

  // Migrate Notifications
  for (const n of notifications) {
    const doc = { ...n, _id: n.id };
    delete doc.id;
    const res = await MongoNotificationModel.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
    if (res.upsertedCount > 0) summary.counts.notifications.inserted++;
    else summary.counts.notifications.updated++;
  }

  // Migrate Audit Logs
  for (const a of auditLogs) {
    const doc = { ...a, _id: a.id };
    delete doc.id;
    const res = await MongoAuditModel.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
    if (res.upsertedCount > 0) summary.counts.auditLogs.inserted++;
    else summary.counts.auditLogs.updated++;
  }

  // Post-Migration Verification: Verify document counts in MongoDB
  const dbUserCount = await MongoUserModel.countDocuments();
  const dbPokeCount = await MongoPokeModel.countDocuments();
  const dbConnCount = await MongoConnectionModel.countDocuments();
  const dbMsgCount = await MongoMessageModel.countDocuments();
  const dbCommCount = await MongoCommissionModel.countDocuments();
  const dbNotifCount = await MongoNotificationModel.countDocuments();
  const dbAuditCount = await MongoAuditModel.countDocuments();

  // Verify that 100% of source records are preserved by matching source IDs in MongoDB
  const verifiedUsers = await MongoUserModel.countDocuments({ _id: { $in: users.map(u => u.id) } });
  const verifiedPokes = await MongoPokeModel.countDocuments({ _id: { $in: pokes.map(p => p.id) } });
  const verifiedConns = await MongoConnectionModel.countDocuments({ _id: { $in: connections.map(c => c.id) } });
  const verifiedMsgs = await MongoMessageModel.countDocuments({ _id: { $in: messages.map(m => m.id) } });
  const verifiedComms = await MongoCommissionModel.countDocuments({ _id: { $in: commissionHistories.map(c => c.id) } });
  const verifiedNotifs = await MongoNotificationModel.countDocuments({ _id: { $in: notifications.map(n => n.id) } });
  const verifiedAudits = await MongoAuditModel.countDocuments({ _id: { $in: auditLogs.map(a => a.id) } });

  console.log('\n================================================================');
  console.log('POST-MIGRATION SOURCE RECORD VERIFICATION:');
  console.log(`  Users:                Source=${users.length} | In Mongo=${verifiedUsers} (Total in DB: ${dbUserCount})`);
  console.log(`  Pokes:                Source=${pokes.length} | In Mongo=${verifiedPokes} (Total in DB: ${dbPokeCount})`);
  console.log(`  Connections:          Source=${connections.length} | In Mongo=${verifiedConns} (Total in DB: ${dbConnCount})`);
  console.log(`  Messages:             Source=${messages.length} | In Mongo=${verifiedMsgs} (Total in DB: ${dbMsgCount})`);
  console.log(`  Commission Histories: Source=${commissionHistories.length} | In Mongo=${verifiedComms} (Total in DB: ${dbCommCount})`);
  console.log(`  Notifications:        Source=${notifications.length} | In Mongo=${verifiedNotifs} (Total in DB: ${dbNotifCount})`);
  console.log(`  Audit Logs:           Source=${auditLogs.length} | In Mongo=${verifiedAudits} (Total in DB: ${dbAuditCount})`);
  console.log('================================================================\n');

  if (
    verifiedUsers !== users.length ||
    verifiedPokes !== pokes.length ||
    verifiedConns !== connections.length ||
    verifiedMsgs !== messages.length ||
    verifiedComms !== commissionHistories.length ||
    verifiedNotifs !== notifications.length ||
    verifiedAudits !== auditLogs.length
  ) {
    throw new Error('[Migration Verification Failure] One or more source records are missing from MongoDB destination!');
  }

  summary.durationMs = Date.now() - startTime;
  console.log(`MIGRATION COMPLETED SUCCESSFULLY in ${summary.durationMs}ms.`);
  console.log('Original JSON database file remains intact and unaltered.');

  await mongoose.disconnect();
  return summary;
};

// Execute if invoked directly from CLI
runMigration()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n[Migration Script Fatal Error]:', err.message);
    process.exit(1);
  });
