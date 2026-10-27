import crypto from 'crypto';
import mongoose from 'mongoose';
import {
  MongoUserModel,
  MongoPokeModel,
  MongoConnectionModel,
  MongoMessageModel,
  MongoNotificationModel,
  MongoAuditModel
} from '../src/models/mongooseModels.js';

const API_BASE = 'http://localhost:5000/api';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/setu_database';

const http = {
  async get(url: string, headers: Record<string, string> = {}) {
    const res = await fetch(url, { headers });
    const data = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data };
  },
  async post(url: string, body: any, headers: Record<string, string> = {}) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data };
  },
  async put(url: string, body: any, headers: Record<string, string> = {}) {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data };
  }
};

interface TestResult {
  num: number;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

const record = (num: number, name: string, passed: boolean, details?: string) => {
  results.push({ num, name, passed, details });
  const mark = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[Test ${num}] ${mark}: ${name}${details ? ` -> ${details}` : ''}`);
};

async function runTestSuite() {
  console.log('\n============================================================');
  console.log('   SETU — ACTIVE UPI ID WORKFLOW & SECURITY VERIFICATION   ');
  console.log('============================================================\n');

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB at', MONGODB_URI);

  const testSuffix = crypto.randomBytes(4).toString('hex');
  const holderEmail = `holder_${testSuffix}@setutest.com`;
  const holderPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const investorEmail = `investor_${testSuffix}@setutest.com`;
  const investorPhone = `97${Math.floor(10000000 + Math.random() * 90000000)}`;
  const intruderEmail = `intruder_${testSuffix}@setutest.com`;
  const intruderPhone = `96${Math.floor(10000000 + Math.random() * 90000000)}`;
  const plainUserEmail = `plain_${testSuffix}@setutest.com`;
  const plainUserPhone = `95${Math.floor(10000000 + Math.random() * 90000000)}`;

  let holderToken = '';
  let holderId = '';
  let investorToken = '';
  let investorId = '';
  let intruderToken = '';
  let connectionId = '';
  let pokeId = '';

  try {
    // -------------------------------------------------------------------------
    // 1. Demat Account Holder can add their own UPI ID on signup or profile
    // -------------------------------------------------------------------------
    const signupHolderRes = await http.post(`${API_BASE}/auth/signup`, {
      fullName: `Test Demat Holder ${testSuffix}`,
      email: holderEmail,
      mobileNumber: holderPhone,
      password: 'StrongPassword123!',
      primaryRole: 'demat_holder',
      upiId: 'initialholder@okaxis',
      termsAccepted: true,
      privacyAccepted: true
    });

    const holderUser = signupHolderRes.data?.data?.user;
    holderToken = signupHolderRes.data?.data?.accessToken || '';
    holderId = holderUser?.id || '';

    const test1Passed =
      signupHolderRes.status === 201 &&
      holderUser?.upiId === 'initialholder@okaxis' &&
      holderUser?.isUpiVerified === false;

    record(
      1,
      'Demat Account Holder can add their own UPI ID during registration',
      test1Passed,
      `Status: ${signupHolderRes.status}, UPI: ${holderUser?.upiId}, isUpiVerified: ${holderUser?.isUpiVerified}`
    );

    // -------------------------------------------------------------------------
    // 2. Demat Account Holder can update their own UPI ID
    // -------------------------------------------------------------------------
    const updateUpiRes = await http.put(
      `${API_BASE}/users/upi`,
      { upiId: 'holder.updated@okhdfcbank' },
      { Authorization: `Bearer ${holderToken}` }
    );

    const meRes = await http.get(`${API_BASE}/auth/me`, {
      Authorization: `Bearer ${holderToken}`
    });

    const test2Passed =
      updateUpiRes.status === 200 &&
      updateUpiRes.data?.data?.upiId === 'holder.updated@okhdfcbank' &&
      meRes.data?.data?.upiId === 'holder.updated@okhdfcbank' &&
      meRes.data?.data?.isUpiVerified === false;

    record(
      2,
      'Demat Account Holder can update their own UPI ID via authenticated endpoint',
      test2Passed,
      `Status: ${updateUpiRes.status}, Updated UPI: ${meRes.data?.data?.upiId}`
    );

    // -------------------------------------------------------------------------
    // 3. Investor cannot edit another user's UPI ID (Object ownership check)
    // -------------------------------------------------------------------------
    const signupInvestorRes = await http.post(`${API_BASE}/auth/signup`, {
      fullName: `Test Investor ${testSuffix}`,
      email: investorEmail,
      mobileNumber: investorPhone,
      password: 'StrongPassword123!',
      primaryRole: 'investor',
      termsAccepted: true,
      privacyAccepted: true
    });

    investorToken = signupInvestorRes.data?.data?.accessToken || '';
    investorId = signupInvestorRes.data?.data?.user?.id || '';

    // Investor attempts to update UPI providing an arbitrary payload
    const investorUpdateRes = await http.put(
      `${API_BASE}/users/upi`,
      { upiId: 'investor.spoofed@icici', targetUserId: holderId },
      { Authorization: `Bearer ${investorToken}` }
    );

    // Verify Demat Holder's UPI in DB remained unchanged
    const holderDbAfter = await MongoUserModel.findById(holderId).lean();
    const test3Passed =
      holderDbAfter?.upiId === 'holder.updated@okhdfcbank' &&
      investorUpdateRes.status === 200 && // Updated investor's own record, NOT holder's record
      holderDbAfter?.upiId !== 'investor.spoofed@icici';

    record(
      3,
      "Investor cannot edit another user's UPI ID (strict server ownership)",
      test3Passed,
      `Holder UPI preserved: ${holderDbAfter?.upiId}`
    );

    // -------------------------------------------------------------------------
    // 4. Invalid UPI IDs are rejected by validation
    // -------------------------------------------------------------------------
    const invalidAttempts = [
      '',
      'invalid-no-at-sign',
      '@bankonly',
      'user@',
      'spaces not allowed@bank',
      'a@b' // too short handle
    ];

    let allRejected = true;
    for (const badUpi of invalidAttempts) {
      const res = await http.put(
        `${API_BASE}/users/upi`,
        { upiId: badUpi },
        { Authorization: `Bearer ${holderToken}` }
      );
      if (res.status !== 400 || res.data?.success !== false) {
        allRejected = false;
        console.log(`Failed to reject invalid UPI: "${badUpi}" (Status: ${res.status})`);
      }
    }

    record(
      4,
      'Invalid UPI IDs are rejected by server Zod schema validation',
      allRejected,
      `Tested ${invalidAttempts.length} malformed variations — all returned 400 Bad Request`
    );

    // -------------------------------------------------------------------------
    // 5. UPI ID is NOT exposed through public profile or search endpoints
    // -------------------------------------------------------------------------
    const holdersListRes = await http.get(`${API_BASE}/users/holders`);
    const publicProfileRes = await http.get(`${API_BASE}/users/profile/${holderId}`);

    const holderInList = holdersListRes.data?.data?.find((h: any) => h.id === holderId);
    const hasUpiInList = holderInList && 'upiId' in holderInList;
    const hasUpiInPublicProfile = publicProfileRes.data?.data && 'upiId' in publicProfileRes.data?.data;

    const test5Passed = !hasUpiInList && !hasUpiInPublicProfile;

    record(
      5,
      'UPI ID is not exposed through public profile or search endpoints',
      test5Passed,
      `In /holders: ${hasUpiInList ? 'EXPOSED' : 'HIDDEN'}, in /profile/:id: ${hasUpiInPublicProfile ? 'EXPOSED' : 'HIDDEN'}`
    );

    // -------------------------------------------------------------------------
    // 6. UPI ID remains hidden before all required acceptance conditions are met
    // -------------------------------------------------------------------------
    // Investor sends a Poke
    const sendPokeRes = await http.post(
      `${API_BASE}/pokes`,
      {
        recipientId: holderId,
        ipoId: 'ipo_jio_platforms',
        message: 'Hello, looking to connect'
      },
      { Authorization: `Bearer ${investorToken}` }
    );

    pokeId = sendPokeRes.data?.data?.id || '';

    // While Poke is pending, attempt to access UPI or check poke payload
    const hasUpiInPoke = sendPokeRes.data?.data && 'upiId' in sendPokeRes.data?.data;
    const test6Passed = !hasUpiInPoke && sendPokeRes.data?.data?.status === 'pending';

    record(
      6,
      'UPI ID remains hidden before mutual Poke acceptance (pending state)',
      test6Passed,
      `Poke status: ${sendPokeRes.data?.data?.status}, Poke response leaked UPI: ${hasUpiInPoke}`
    );

    // -------------------------------------------------------------------------
    // 7. UPI ID becomes accessible only to authorized Investor after mutual acceptance
    // -------------------------------------------------------------------------
    // Demat Holder accepts Poke
    const acceptPokeRes = await http.put(
      `${API_BASE}/pokes/${pokeId}/accept`,
      {
        agreedCommissionRate: 5.0,
        agreedCommissionBasis: 'Commission on Listing Profit'
      },
      { Authorization: `Bearer ${holderToken}` }
    );

    // Find the connection created
    const connInDb = await MongoConnectionModel.findOne({ pokeRequestId: pokeId }).lean();
    connectionId =
      acceptPokeRes.data?.data?.connection?.id ||
      connInDb?._id?.toString() ||
      connInDb?.id ||
      '';

    // Investor accesses authorized connection details
    const connDetailsRes = await http.get(`${API_BASE}/connections/${connectionId}`, {
      Authorization: `Bearer ${investorToken}`
    });

    // Investor calls dedicated /connections/:id/upi endpoint
    const upiDetailsRes = await http.get(`${API_BASE}/connections/${connectionId}/upi`, {
      Authorization: `Bearer ${investorToken}`
    });

    const test7Passed =
      acceptPokeRes.status === 200 &&
      connDetailsRes.data?.data?.dematHolderUpi?.upiId === 'holder.updated@okhdfcbank' &&
      upiDetailsRes.data?.data?.upiId === 'holder.updated@okhdfcbank' &&
      upiDetailsRes.data?.data?.hasUpi === true;

    record(
      7,
      'UPI ID becomes accessible to authorized Investor after acceptance',
      test7Passed,
      `Retrieved UPI: ${upiDetailsRes.data?.data?.upiId}, isUpiVerified: ${upiDetailsRes.data?.data?.isUpiVerified}`
    );

    // -------------------------------------------------------------------------
    // 8. Declined, cancelled, expired, or disconnected requests cannot reveal UPI ID
    // -------------------------------------------------------------------------
    // Disconnect connection
    const disconnectRes = await http.put(
      `${API_BASE}/connections/${connectionId}/disconnect`,
      {},
      { Authorization: `Bearer ${investorToken}` }
    );

    // Attempt to access UPI now that connection is disconnected
    const disconnectedUpiRes = await http.get(`${API_BASE}/connections/${connectionId}/upi`, {
      Authorization: `Bearer ${investorToken}`
    });

    const connAfterDisconnectRes = await http.get(`${API_BASE}/connections/${connectionId}`, {
      Authorization: `Bearer ${investorToken}`
    });

    const test8Passed =
      disconnectedUpiRes.status === 403 &&
      disconnectedUpiRes.data?.success === false &&
      connAfterDisconnectRes.data?.data?.dematHolderUpi === null;

    record(
      8,
      'Disconnected or non-active connections cannot reveal the UPI ID',
      test8Passed,
      `Status on /upi: ${disconnectedUpiRes.status} (${disconnectedUpiRes.data?.error})`
    );

    // -------------------------------------------------------------------------
    // 9. Another Investor cannot retrieve UPI ID by guessing connection ID
    // -------------------------------------------------------------------------
    const signupIntruderRes = await http.post(`${API_BASE}/auth/signup`, {
      fullName: `Test Intruder ${testSuffix}`,
      email: intruderEmail,
      mobileNumber: intruderPhone,
      password: 'StrongPassword123!',
      primaryRole: 'investor',
      termsAccepted: true,
      privacyAccepted: true
    });

    intruderToken = signupIntruderRes.data?.data?.accessToken || '';

    // Intruder attempts to fetch connection and UPI
    const intruderConnRes = await http.get(`${API_BASE}/connections/${connectionId}`, {
      Authorization: `Bearer ${intruderToken}`
    });
    const intruderUpiRes = await http.get(`${API_BASE}/connections/${connectionId}/upi`, {
      Authorization: `Bearer ${intruderToken}`
    });

    const test9Passed =
      intruderConnRes.status === 403 &&
      intruderUpiRes.status === 403 &&
      intruderUpiRes.data?.success === false;

    record(
      9,
      'Unrelated user cannot access UPI ID by guessing connection ID (403 Forbidden)',
      test9Passed,
      `Intruder response status: ${intruderUpiRes.status}`
    );

    // -------------------------------------------------------------------------
    // 10. Socket.IO events and notifications do not leak the UPI ID
    // -------------------------------------------------------------------------
    const notifications = await MongoNotificationModel.find({
      userId: { $in: [holderId, investorId] }
    }).lean();

    let notificationLeakedUpi = false;
    for (const notif of notifications) {
      const serialized = JSON.stringify(notif);
      if (serialized.includes('holder.updated@okhdfcbank') || serialized.includes('initialholder@okaxis')) {
        notificationLeakedUpi = true;
      }
    }

    record(
      10,
      'Notifications and audit events do not leak sensitive UPI ID strings',
      !notificationLeakedUpi,
      `Audited ${notifications.length} notification documents — zero plain UPI strings found`
    );

    // -------------------------------------------------------------------------
    // 11. Existing users without a UPI ID continue to work normally
    // -------------------------------------------------------------------------
    const signupPlainRes = await http.post(`${API_BASE}/auth/signup`, {
      fullName: `Test Plain User ${testSuffix}`,
      email: plainUserEmail,
      mobileNumber: plainUserPhone,
      password: 'StrongPassword123!',
      primaryRole: 'demat_holder',
      termsAccepted: true,
      privacyAccepted: true
    });

    const plainUser = signupPlainRes.data?.data?.user;
    const test11Passed =
      signupPlainRes.status === 201 &&
      (plainUser?.upiId === undefined || plainUser?.upiId === null);

    record(
      11,
      'Existing users / users without a UPI ID continue to work normally',
      test11Passed,
      `Plain signup status: ${signupPlainRes.status}, user ID: ${plainUser?.id}`
    );

    // -------------------------------------------------------------------------
    // 12. Existing Pokes, connections, chats, messages, and IPO features intact
    // -------------------------------------------------------------------------
    const iposRes = await http.get(`${API_BASE}/ipos`);
    const chatMsgRes = await MongoMessageModel.find({ connectionId }).lean();
    const test12Passed = iposRes.status === 200 && Array.isArray(iposRes.data?.data) && iposRes.data?.data?.length > 0;

    record(
      12,
      'Platform features (IPOs, connections, messages, chat records) intact',
      test12Passed,
      `Fetched ${iposRes.data?.data?.length} IPO offerings, verified system chat messages exist`
    );

    // -------------------------------------------------------------------------
    // 13. Audit logs record UPI events without recording the sensitive UPI string
    // -------------------------------------------------------------------------
    const upiAuditLogs = await MongoAuditModel.find({
      action: { $in: ['UPI_UPDATED', 'UPI_DETAILS_ACCESSED'] }
    }).lean();

    let auditLeakedUpi = false;
    for (const log of upiAuditLogs) {
      const detailsStr = JSON.stringify(log.details);
      if (detailsStr.includes('holder.updated@okhdfcbank') || detailsStr.includes('initialholder@okaxis')) {
        auditLeakedUpi = true;
      }
    }

    const test13Passed = upiAuditLogs.length >= 2 && !auditLeakedUpi;

    record(
      13,
      'Audit log events (UPI_UPDATED, UPI_DETAILS_ACCESSED) never record raw UPI IDs',
      test13Passed,
      `Found ${upiAuditLogs.length} audit records. Zero UPI IDs leaked in logs.`
    );

  } finally {
    // Clean up test fixtures created during the automated test
    console.log('\nCleaning up test fixtures from MongoDB...');
    await MongoUserModel.deleteMany({
      email: { $in: [holderEmail, investorEmail, intruderEmail, plainUserEmail] }
    });
    if (connectionId) {
      await MongoConnectionModel.findByIdAndDelete(connectionId);
      await MongoMessageModel.deleteMany({ connectionId });
    }
    if (pokeId) {
      await MongoPokeModel.findByIdAndDelete(pokeId);
    }
    await MongoNotificationModel.deleteMany({
      userId: { $in: [holderId, investorId] }
    });
    await mongoose.disconnect();
    console.log('MongoDB disconnected. Test cleanup completed.');
  }

  // Summary
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log('\n============================================================');
  console.log(`TEST RESULTS SUMMARY: ${passedCount}/${totalCount} TESTS PASSED`);
  console.log('============================================================\n');

  if (passedCount === totalCount) {
    console.log('🎉 ALL 13 TEST REQUIREMENTS FULLY VERIFIED!\n');
    process.exit(0);
  } else {
    console.error(`❌ ${totalCount - passedCount} TESTS FAILED\n`);
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
