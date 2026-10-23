import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import {
  MongoUserModel,
  MongoPokeModel,
  MongoConnectionModel,
  MongoMessageModel,
  MongoCommissionModel,
  MongoNotificationModel,
  MongoAuditModel
} from '../src/models/mongooseModels.js';

const API_BASE = 'http://localhost:5000/api';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/setu_database';
const ORIGINAL_DB_PATH = path.resolve('data/db.json');
const EXPECTED_CHECKSUM = 'dc4589b696a9af82e24c00c42a44616ba4a7e3bc486df8e5fa9b29883baee867';

// Lightweight fetch helper for test assertions
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
  suite: string;
  test: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

const record = (suite: string, test: string, passed: boolean, details?: string) => {
  results.push({ suite, test, passed, details });
  const mark = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`  [${mark}] ${test}${details ? ` -> ${details}` : ''}`);
};

async function runTestSuite() {
  console.log('================================================================');
  console.log('🧪 SETU PRODUCTION MIGRATION, INTEGRITY & SECURITY TEST SUITE');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. Data Preservation & Source Integrity
  // ---------------------------------------------------------------------------
  console.log('📁 SUITE 1: Source JSON Preservation & Integrity');
  try {
    const rawData = fs.readFileSync(ORIGINAL_DB_PATH);
    const hash = crypto.createHash('sha256').update(rawData).digest('hex');
    const checksumMatches = hash === EXPECTED_CHECKSUM;
    record(
      'Integrity',
      'Original db.json unchanged with exact SHA-256 checksum',
      checksumMatches,
      `Calculated: ${hash.slice(0, 16)}...`
    );
  } catch (err: any) {
    record('Integrity', 'Original db.json exists and is readable', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // 2. MongoDB Direct Record Counts
  // ---------------------------------------------------------------------------
  console.log('\n🍃 SUITE 2: MongoDB Persistence & Record Counts');
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGODB_URI);
    }

    const userCount = await MongoUserModel.countDocuments();
    const pokeCount = await MongoPokeModel.countDocuments();
    const connCount = await MongoConnectionModel.countDocuments();
    const msgCount = await MongoMessageModel.countDocuments();
    const commCount = await MongoCommissionModel.countDocuments();
    const notifCount = await MongoNotificationModel.countDocuments();
    const auditCount = await MongoAuditModel.countDocuments();

    record('Database', 'Users count is at least 7', userCount >= 7, `Found: ${userCount}`);
    record('Database', 'Pokes count is at least 4', pokeCount >= 4, `Found: ${pokeCount}`);
    record('Database', 'Connections count is at least 1', connCount >= 1, `Found: ${connCount}`);
    record('Database', 'Messages count is at least 3', msgCount >= 3, `Found: ${msgCount}`);
    record('Database', 'Commission entries count is at least 1', commCount >= 1, `Found: ${commCount}`);
    record('Database', 'Notifications count is at least 3', notifCount >= 3, `Found: ${notifCount}`);
    record('Database', 'Audit logs count is at least 13', auditCount >= 13, `Found: ${auditCount}`);
  } catch (err: any) {
    record('Database', 'MongoDB connection and queries', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // 3. API Health & Operational State
  // ---------------------------------------------------------------------------
  console.log('\n🩺 SUITE 3: Server Health & Live Connection');
  try {
    const res = await http.get(`${API_BASE}/health`);
    record(
      'Health',
      'API responds healthy with MongoDB database connected',
      res.data?.status === 'healthy' && res.data?.database === 'connected',
      `App: ${res.data?.app}, Database: ${res.data?.database}`
    );
  } catch (err: any) {
    record('Health', 'API health check', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // 4. Authentication with Preserved Passwords
  // ---------------------------------------------------------------------------
  console.log('\n🔑 SUITE 4: Authentication & Session Security');
  let holderToken = '';
  let holderRefresh = '';
  let investorToken = '';
  let adminToken = '';

  // 4.1 Holder Login
  try {
    const res = await http.post(`${API_BASE}/auth/login`, {
      identifier: 'rajesh.sharma@demat.in',
      password: 'Password123!'
    });
    const success = res.data?.success && res.data?.data?.accessToken;
    holderToken = res.data?.data?.accessToken;
    holderRefresh = res.data?.data?.refreshToken;
    record(
      'Auth',
      'Holder can login with existing password without re-hashing',
      Boolean(success),
      `User: ${res.data?.data?.user?.fullName}`
    );
  } catch (err: any) {
    record('Auth', 'Holder login with existing password', false, err.message);
  }

  // 4.2 Investor Login
  try {
    const res = await http.post(`${API_BASE}/auth/login`, {
      identifier: 'arjun.kapoor@investor.in',
      password: 'Password123!'
    });
    investorToken = res.data?.data?.accessToken;
    record(
      'Auth',
      'Investor can login with existing password',
      Boolean(investorToken),
      `User: ${res.data?.data?.user?.fullName}`
    );
  } catch (err: any) {
    record('Auth', 'Investor login', false, err.message);
  }

  // 4.3 Admin Login
  try {
    const res = await http.post(`${API_BASE}/auth/login`, {
      identifier: 'compliance.admin@ipoconnect.in',
      password: 'AdminSecure2025!'
    });
    adminToken = res.data?.data?.accessToken;
    record(
      'Auth',
      'Admin can login with administrator password',
      Boolean(adminToken) && res.data?.data?.user?.primaryRole === 'admin',
      `Role: ${res.data?.data?.user?.primaryRole}`
    );
  } catch (err: any) {
    record('Auth', 'Admin login', false, err.message);
  }

  // 4.4 Invalid credentials rejection
  try {
    const res = await http.post(`${API_BASE}/auth/login`, {
      identifier: 'rajesh.sharma@demat.in',
      password: 'WrongPassword123!'
    });
    record(
      'Auth',
      'Invalid password safely rejected with 401',
      res.status === 401,
      `Status: ${res.status}`
    );
  } catch (err: any) {
    record('Auth', 'Invalid password check', false, err.message);
  }

  // 4.5 Refresh Token Rotation
  try {
    const res = await http.post(`${API_BASE}/auth/refresh`, {
      refreshToken: holderRefresh
    });
    const success = res.data?.success && res.data?.data?.accessToken;
    record(
      'Auth',
      'Refresh token exchange generates new valid session token',
      Boolean(success),
      `New Token issued: ${res.data?.data?.accessToken ? 'Yes' : 'No'}`
    );
  } catch (err: any) {
    record('Auth', 'Refresh token rotation', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // 5. PII Data Exposure Fixes
  // ---------------------------------------------------------------------------
  console.log('\n🛡️ SUITE 5: Privacy Protection & Public Data Sanitization');
  try {
    const res = await http.get(`${API_BASE}/users/holders`);
    const holders = res.data?.data || [];
    let leakedCount = 0;
    for (const h of holders) {
      if (h.email || h.mobileNumber || h.password || h.refreshToken || h.kycDetails) {
        leakedCount++;
      }
    }
    record(
      'Privacy',
      'Public /api/users/holders strictly conceals email, mobile, password, and KYC',
      leakedCount === 0 && holders.length > 0,
      `Checked ${holders.length} profiles; Leaks found: ${leakedCount}`
    );
  } catch (err: any) {
    record('Privacy', 'Public holders endpoint PII check', false, err.message);
  }

  try {
    const res = await http.get(`${API_BASE}/users/profile/usr_holder_rajesh`);
    const p = res.data?.data || {};
    const isSafe = !p.email && !p.mobileNumber && !p.password && !p.refreshToken;
    record(
      'Privacy',
      'Public profile by ID strictly conceals private contact information',
      isSafe,
      `Name: ${p.fullName}, Email field present: ${'email' in p}`
    );
  } catch (err: any) {
    record('Privacy', 'Public profile by ID check', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // 6. Access Control & Authorization Boundaries
  // ---------------------------------------------------------------------------
  console.log('\n🔒 SUITE 6: Object-Level Authorization & Access Control');
  try {
    const res = await http.get(`${API_BASE}/admin/audit-logs`, {
      Authorization: `Bearer ${investorToken}`
    });
    record(
      'Access Control',
      'Investor denied access to admin audit logs with 403',
      res.status === 403,
      `Status: ${res.status}`
    );
  } catch (err: any) {
    record('Access Control', 'Investor audit logs access', false, err.message);
  }

  try {
    const res = await http.put(
      `${API_BASE}/commission`,
      { rate: 5.0, basis: 'Test basis' },
      { Authorization: `Bearer ${investorToken}` }
    );
    record(
      'Access Control',
      'Investor denied commission configuration with 403',
      res.status === 403,
      `Status: ${res.status}`
    );
  } catch (err: any) {
    record('Access Control', 'Investor commission update access', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // 7. Chat Persistence & Controlled Admin Inspection
  // ---------------------------------------------------------------------------
  console.log('\n💬 SUITE 7: Chat Persistence & Audited Administrative Access');
  try {
    const res = await http.get(`${API_BASE}/chat/conn_rajesh_arjun`, {
      Authorization: `Bearer ${holderToken}`
    });
    const messages = res.data?.data || [];
    record(
      'Chat',
      'Participant can retrieve persistent chat history from MongoDB',
      messages.length >= 3,
      `Retrieved ${messages.length} messages`
    );
  } catch (err: any) {
    record('Chat', 'Participant chat retrieval', false, err.message);
  }

  try {
    const res = await http.get(`${API_BASE}/admin/connections/conn_rajesh_arjun/messages`, {
      Authorization: `Bearer ${holderToken}`
    });
    record(
      'Admin Chat',
      'Non-admin denied access to admin chat review with 403',
      res.status === 403,
      `Status: ${res.status}`
    );
  } catch (err: any) {
    record('Admin Chat', 'Non-admin chat inspection access', false, err.message);
  }

  try {
    const res = await http.get(
      `${API_BASE}/admin/connections/conn_rajesh_arjun/messages?reason=Automated+Regulatory+Inspection`,
      { Authorization: `Bearer ${adminToken}` }
    );
    const success = res.data?.success && res.data?.data?.messages?.length >= 3;

    // Verify audit log entry was created
    const audit = await MongoAuditModel.findOne({ action: 'ADMIN_CHAT_INSPECTED' }).sort({ timestamp: -1 });

    record(
      'Admin Chat',
      'Admin can review chat under regulatory audit policy with audit logging',
      Boolean(success && audit !== null),
      `Audit Action: ${audit?.action}, Reason: ${audit?.details?.reason}`
    );
  } catch (err: any) {
    record('Admin Chat', 'Admin chat inspection', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // 8. Commission Calculation Engine
  // ---------------------------------------------------------------------------
  console.log('\n💼 SUITE 8: Commission Validation & Calculation Engine');
  try {
    const res = await http.post(
      `${API_BASE}/commission/calculate`,
      {
        baseAmount: 15000,
        rate: 7.5
      },
      { Authorization: `Bearer ${holderToken}` }
    );
    const validCalc =
      res.data?.data?.commissionFee === 1125 && res.data?.data?.effectiveTotal === 16125;
    record(
      'Commission',
      'Valid 2.5% increment commission calculated accurately (7.5% on 15,000 = 1,125)',
      validCalc,
      `Fee: ${res.data?.data?.commissionFee}, Total: ${res.data?.data?.effectiveTotal}`
    );
  } catch (err: any) {
    record('Commission', 'Valid commission calculation', false, err.message);
  }

  try {
    const res = await http.post(
      `${API_BASE}/commission/calculate`,
      {
        baseAmount: 15000,
        rate: 3.33 // invalid step
      },
      { Authorization: `Bearer ${holderToken}` }
    );
    record(
      'Commission',
      'Non-2.5% step rate safely rejected with 400',
      res.status === 400,
      `Status: ${res.status}`
    );
  } catch (err: any) {
    record('Commission', 'Non-2.5% step rate check', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log('\n================================================================');
  console.log(`📊 TEST EXECUTION SUMMARY: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((e) => {
  console.error('Test runner fatal error:', e);
  process.exit(1);
});
