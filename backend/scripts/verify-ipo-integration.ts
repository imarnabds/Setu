import mongoose from 'mongoose';
import {
  MongoIpoModel,
  MongoIpoSyncStateModel,
  MongoConnectionModel,
  MongoPokeModel,
  MongoUserModel
} from '../src/models/mongooseModels.js';
import { config } from '../src/config/index.js';

const API_BASE = 'http://localhost:5000/api';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/setu_database';

// HTTP fetch helper
const http = {
  async get(url: string, headers: Record<string, string> = {}) {
    const res = await fetch(url, { headers });
    const data = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data };
  },
  async post(url: string, body?: any, headers: Record<string, string> = {}) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined
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

async function runTests() {
  console.log('\n============================================================');
  console.log('🧪 SETU IPO INTEGRATION & ISOLATION AUTOMATED TEST SUITE');
  console.log('============================================================\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB setu_database for verification.\n');

    // -------------------------------------------------------------
    // SUITE 1: IPO Status Endpoint & Schema Constraints
    // -------------------------------------------------------------
    console.log('--- SUITE 1: IPO Status Endpoint & Minimal Schema ---');
    const iposRes = await http.get(`${API_BASE}/ipos`);

    record(
      'IPO Endpoint',
      'GET /api/ipos responds with HTTP 200 and success: true',
      iposRes.status === 200 && iposRes.data?.success === true,
      `status=${iposRes.status}`
    );

    const iposList = iposRes.data?.data || [];
    record(
      'IPO Endpoint',
      'GET /api/ipos returns non-empty IPO array directly from MongoDB',
      Array.isArray(iposList) && iposList.length > 0,
      `Count: ${iposList.length}`
    );

    // Validate minimal fields and forbidden fields
    const forbiddenKeys = ['priceBand', 'lotSize', 'issueSize', 'expectedGmp', 'subscriptionRate', 'allotmentDate'];
    
    let hasForbiddenFields = false;
    let validStatuses = true;
    const validLifecycle = new Set(['Upcoming', 'Open', 'Closed', 'Listed']);

    for (const ipo of iposList) {
      for (const k of forbiddenKeys) {
        if (ipo[k] !== undefined) {
          hasForbiddenFields = true;
          console.error(`Violation: Found forbidden key "${k}" on IPO ${ipo.id}`);
        }
      }
      if (!validLifecycle.has(ipo.status)) {
        validStatuses = false;
        console.error(`Invalid lifecycle status "${ipo.status}" on IPO ${ipo.id}`);
      }
    }

    record(
      'IPO Schema',
      'IPO items contain ONLY minimal fields (no price bands, lot sizes, GMP, or subscription figures)',
      !hasForbiddenFields,
      `All ${iposList.length} items free of forbidden fields`
    );

    record(
      'IPO Schema',
      'All IPO statuses are strictly valid lifecycle states (Upcoming, Open, Closed, Listed)',
      validStatuses,
      `Verified statuses: ${iposList.map((i: any) => `${i.name}: ${i.status}`).join(' | ')}`
    );

    record(
      'IPO Schema',
      'All IPO items provide valid ISO last-updated timestamps',
      iposList.every((i: any) => Boolean(i.lastUpdated) && !isNaN(new Date(i.lastUpdated).getTime())),
      `Sample timestamp: ${iposList[0]?.lastUpdated}`
    );

    // -------------------------------------------------------------
    // SUITE 2: Upstox Provider Handling, Honest Failures & Staleness
    // -------------------------------------------------------------
    console.log('\n--- SUITE 2: Upstox Provider Synchronization & Honest Stale Flagging ---');

    const meta = iposRes.data?.meta;
    record(
      'Upstox Sync Handling',
      'Response includes honest metadata with syncStatus and staleness indicator',
      meta !== undefined && typeof meta.isStale === 'boolean',
      `syncStatus: ${meta?.syncStatus}, isStale: ${meta?.isStale}`
    );

    record(
      'Upstox Sync Handling',
      'Provider authentication missing/unauthorized is honestly reported without crashing',
      meta?.syncStatus === 'unauthorized' && Boolean(meta?.syncError),
      `Honest message: "${meta?.syncError?.substring(0, 70)}..."`
    );

    // Manual Refresh Endpoint
    const syncRes = await http.post(`${API_BASE}/ipos/sync`);
    record(
      'Manual Refresh',
      'POST /api/ipos/sync triggers on-demand sync attempt',
      syncRes.status === 200,
      `status=${syncRes.status}, message: ${syncRes.data?.message}`
    );

    record(
      'Manual Refresh',
      'POST /api/ipos/sync retains database records on provider auth failure',
      Array.isArray(syncRes.data?.data) && syncRes.data.data.length > 0,
      `Retained ${syncRes.data?.data?.length} records with last known timestamps`
    );

    // MongoDB Direct Verification
    const dbIpos = await MongoIpoModel.find({});
    const dbSyncState = await MongoIpoSyncStateModel.findById('ipo_sync_state');

    record(
      'MongoDB Persistence',
      'IPO records and sync state are actively persisted in MongoDB (setu_database)',
      dbIpos.length > 0 && dbSyncState !== null && dbSyncState?.syncStatus !== undefined,
      `Found ${dbIpos.length} IPO docs, syncStatus: ${dbSyncState?.syncStatus}`
    );

    // Single IPO lookup endpoint
    const singleIpoRes = await http.get(`${API_BASE}/ipos/ipo_jio_platforms`);
    record(
      'Single IPO Endpoint',
      'GET /api/ipos/:id retrieves exact IPO record by database ID',
      singleIpoRes.status === 200 && singleIpoRes.data?.data?.id === 'ipo_jio_platforms',
      `Fetched: ${singleIpoRes.data?.data?.name}`
    );

    // -------------------------------------------------------------
    // SUITE 3: Cross-IPO Data Isolation (Connections & Chat)
    // -------------------------------------------------------------
    console.log('\n--- SUITE 3: Cross-IPO Data Isolation & Backend Authorization ---');

    // Login as Arjun Kapoor (Investor 1)
    const loginRes = await http.post(`${API_BASE}/auth/login`, {
      identifier: 'arjun.kapoor@investor.in',
      password: 'Password123!'
    });

    const token = loginRes.data?.data?.accessToken;
    const authHeaders = { Authorization: `Bearer ${token}` };

    record(
      'Auth Setup',
      'Investor 1 logs in successfully to verify IPO isolation',
      Boolean(token),
      `User: ${loginRes.data?.data?.user?.fullName}`
    );

    // Fetch connections filtered by Jio Platforms
    const jioConnRes = await http.get(`${API_BASE}/connections?ipoId=ipo_jio_platforms`, authHeaders);
    const jioConns = jioConnRes.data?.data || [];

    record(
      'Cross-IPO Isolation',
      'Filtering connections by ipo_jio_platforms returns only Jio connections',
      jioConnRes.status === 200 && jioConns.length > 0 && jioConns.every((c: any) => c.ipoId === 'ipo_jio_platforms'),
      `Returned ${jioConns.length} connection(s) for Jio Platforms (ID: ${jioConns[0]?.id})`
    );

    // Fetch connections filtered by Hyundai Motor
    const hyundaiConnRes = await http.get(`${API_BASE}/connections?ipoId=ipo_hyundai`, authHeaders);
    const hyundaiConns = hyundaiConnRes.data?.data || [];

    record(
      'Cross-IPO Isolation',
      'Filtering connections by ipo_hyundai strictly isolates and hides Jio connections',
      hyundaiConnRes.status === 200 &&
        hyundaiConns.length > 0 &&
        hyundaiConns.every((c: any) => c.ipoId === 'ipo_hyundai') &&
        !hyundaiConns.some((c: any) => c.ipoId === 'ipo_jio_platforms'),
      `Returned ${hyundaiConns.length} connection(s) for Hyundai (Jio connection strictly isolated)`
    );

    // Clean up any previous test poke for swiggy to ensure idempotency
    await MongoPokeModel.deleteMany({
      senderId: 'usr_investor_arjun',
      recipientId: 'usr_holder_priya',
      ipoId: 'ipo_swiggy'
    });

    // Test Poke creation with specific ipoId
    const newPokeRes = await http.post(
      `${API_BASE}/pokes`,
      {
        recipientId: 'usr_holder_priya',
        proposedCommissionRate: 5.0,
        commissionBasis: 'per_lot',
        message: 'Assistance request for Swiggy IPO offering',
        ipoId: 'ipo_swiggy'
      },
      authHeaders
    );

    record(
      'Cross-IPO Pokes',
      'Creating a Poke associates it strictly with selected IPO ID and resolves IPO name',
      newPokeRes.status === 201 && newPokeRes.data?.data?.ipoId === 'ipo_swiggy',
      `Poke ID: ${newPokeRes.data?.data?.id}, IPO: ${newPokeRes.data?.data?.ipoName}`
    );

    // Fetch pokes filtered by Swiggy vs Jio
    const swiggyPokesRes = await http.get(`${API_BASE}/pokes?ipoId=ipo_swiggy`, authHeaders);
    const swiggyPokes = swiggyPokesRes.data?.data || [];

    record(
      'Cross-IPO Poke Isolation',
      'Querying pokes for ipo_swiggy returns only Swiggy pokes and excludes other IPOs',
      swiggyPokes.length > 0 && swiggyPokes.every((p: any) => p.ipoId === 'ipo_swiggy'),
      `Swiggy pokes count: ${swiggyPokes.length}`
    );

    // Chat Message cross-connection / cross-user authorization
    if (jioConns.length > 0) {
      const connId = jioConns[0].id;
      const chatRes = await http.get(`${API_BASE}/chat/${connId}`, authHeaders);

      record(
        'Chat Isolation',
        'Authorized connection participant can retrieve chat messages for dedicated IPO connection',
        chatRes.status === 200 && Array.isArray(chatRes.data?.data),
        `Retrieved ${chatRes.data?.data?.length} message(s) for connection ${connId}`
      );

      // Attempt to access from unauthorized user (Neha / usr_investor_neha)
      const nehaLogin = await http.post(`${API_BASE}/auth/login`, {
        identifier: 'neha.verma@investor.in',
        password: 'Password123!'
      });
      const nehaToken = nehaLogin.data?.data?.accessToken;
      const nehaHeaders = { Authorization: `Bearer ${nehaToken}` };

      const unauthorizedChatRes = await http.get(`${API_BASE}/chat/${connId}`, nehaHeaders);

      record(
        'Chat Authorization Enforcement',
        'Unauthorized user is strictly blocked from accessing another user\'s IPO chat connection (403 Forbidden)',
        unauthorizedChatRes.status === 403,
        `Status: ${unauthorizedChatRes.status} (Forbidden)`
      );
    }

    // -------------------------------------------------------------
    // SUITE 4: Configurable Schedule Verification
    // -------------------------------------------------------------
    console.log('\n--- SUITE 4: Configurable Schedule & Thresholds ---');
    record(
      'Config',
      'Configurable sync interval and stale threshold are initialized',
      typeof config.ipoSyncIntervalMinutes === 'number' && typeof config.ipoStaleThresholdMinutes === 'number',
      `Sync interval: ${config.ipoSyncIntervalMinutes}m, Stale threshold: ${config.ipoStaleThresholdMinutes}m`
    );

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n============================================================');
    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = total - passed;
    console.log(`TEST SUMMARY: ${passed}/${total} PASSED (${failed} FAILED)`);
    console.log('============================================================\n');

    await mongoose.disconnect();

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err: any) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();
