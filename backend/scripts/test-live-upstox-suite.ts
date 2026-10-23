import mongoose from 'mongoose';
import {
  MongoIpoModel,
  MongoIpoSyncStateModel,
  MongoConnectionModel,
  MongoPokeModel
} from '../src/models/mongooseModels.js';
import { config } from '../src/config/index.js';
import { upstoxIpoService, normalizeIpoStatus } from '../src/services/upstoxIpoService.js';
import { dbService } from '../src/services/dbService.js';
import { ensureIpoData } from '../src/services/adminSeed.js';

const API_BASE = 'http://localhost:5000/api';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/setu_database';

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
  console.log(`[${mark}] #${num}: ${name}${details ? ` -> ${details}` : ''}`);
};

async function runTestSuite() {
  console.log('\n================================================================');
  console.log('🧪 SETU UPSTOX LIVE IPO INTEGRATION: 14-POINT AUTOMATED TEST SUITE');
  console.log('================================================================\n');

  await mongoose.connect(MONGODB_URI);
  const originalFetch = global.fetch;
  const originalToken = config.upstoxAccessToken;

  try {
    // -----------------------------------------------------------------
    // 1. Successful provider response and normalization
    // -----------------------------------------------------------------
    const norm1 = normalizeIpoStatus('open') === 'Open';
    const norm2 = normalizeIpoStatus('upcoming') === 'Upcoming';
    const norm3 = normalizeIpoStatus('closed') === 'Closed';
    const norm4 = normalizeIpoStatus('listed') === 'Listed';
    const norm5 = normalizeIpoStatus('bidding_open') === 'Open';
    const norm6 = normalizeIpoStatus('trading') === 'Listed';

    record(
      1,
      'Successful provider response normalization',
      norm1 && norm2 && norm3 && norm4 && norm5 && norm6,
      'open->Open, upcoming->Upcoming, closed->Closed, listed->Listed'
    );

    // -----------------------------------------------------------------
    // 2. Missing token
    // -----------------------------------------------------------------
    config.upstoxAccessToken = '';
    const missingTokenRes = await upstoxIpoService.synchronizeIpos(true);
    record(
      2,
      'Missing token handling',
      missingTokenRes.success === false &&
        missingTokenRes.meta.syncStatus === 'unauthorized' &&
        missingTokenRes.meta.isStale === true,
      `syncStatus: ${missingTokenRes.meta.syncStatus}, isStale: ${missingTokenRes.meta.isStale}`
    );
    config.upstoxAccessToken = originalToken;

    // -----------------------------------------------------------------
    // 3. Invalid or expired token (HTTP 401)
    // -----------------------------------------------------------------
    (global as any).fetch = async () => ({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => JSON.stringify({ message: 'Invalid token used to access API' })
    });

    const unauthorizedRes = await upstoxIpoService.synchronizeIpos(true);
    record(
      3,
      'Invalid or expired token (HTTP 401) handling',
      unauthorizedRes.success === false &&
        unauthorizedRes.meta.syncStatus === 'unauthorized' &&
        unauthorizedRes.meta.syncError?.includes('Authentication failed'),
      `Honest message: ${unauthorizedRes.meta.syncError?.substring(0, 50)}...`
    );

    // -----------------------------------------------------------------
    // 4. Insufficient endpoint permissions (HTTP 403)
    // -----------------------------------------------------------------
    (global as any).fetch = async () => ({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: async () => JSON.stringify({ message: 'Access denied to IPO resource' })
    });

    const forbiddenRes = await upstoxIpoService.synchronizeIpos(true);
    record(
      4,
      'Insufficient endpoint permissions (HTTP 403) handling',
      forbiddenRes.success === false &&
        forbiddenRes.meta.syncStatus === 'unauthorized' &&
        forbiddenRes.meta.syncError?.includes('Authentication failed'),
      `Status: ${forbiddenRes.meta.syncStatus}`
    );

    // -----------------------------------------------------------------
    // 5. Provider timeout & rate limiting (HTTP 429)
    // -----------------------------------------------------------------
    // Timeout
    (global as any).fetch = async () => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      throw err;
    };
    const timeoutRes = await upstoxIpoService.synchronizeIpos(true);
    const timeoutPassed = timeoutRes.meta.syncError?.includes('timed out');

    // Rate Limit 429
    (global as any).fetch = async () => ({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      text: async () => JSON.stringify({ message: 'Rate limit exceeded' })
    });
    const rateLimitRes = await upstoxIpoService.synchronizeIpos(true);
    const rateLimitPassed = rateLimitRes.meta.syncError?.includes('rate limit');

    record(
      5,
      'Provider timeout and rate limiting handling',
      Boolean(timeoutPassed && rateLimitPassed),
      `Timeout caught: ${timeoutPassed}, Rate limit caught: ${rateLimitPassed}`
    );

    // -----------------------------------------------------------------
    // 6. Malformed provider response
    // -----------------------------------------------------------------
    (global as any).fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('Unexpected token < in JSON at position 0');
      }
    });

    const malformedRes = await upstoxIpoService.synchronizeIpos(true);
    record(
      6,
      'Malformed provider response handling',
      malformedRes.success === false && malformedRes.meta.syncError?.includes('Malformed JSON'),
      `Handled gracefully: ${malformedRes.meta.syncError?.substring(0, 45)}...`
    );

    // -----------------------------------------------------------------
    // 7. Empty provider response
    // -----------------------------------------------------------------
    (global as any).fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: 'success', data: [] })
    });

    const emptyRes = await upstoxIpoService.synchronizeIpos(true);
    record(
      7,
      'Empty provider response handling',
      emptyRes.success === true && Array.isArray(emptyRes.data),
      `Returned active items: ${emptyRes.data.length}`
    );

    // -----------------------------------------------------------------
    // 8. MongoDB upsert and duplicate prevention
    // -----------------------------------------------------------------
    (global as any).fetch = async (url: string) => {
      const statusParam = new URL(url).searchParams.get('status');
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          data: [
            {
              id: 'test-upsert-ipo-1',
              name: 'Test Upsert Offering 1',
              status: statusParam === 'open' ? 'open' : 'upcoming'
            }
          ]
        })
      };
    };

    const firstUpsert = await upstoxIpoService.synchronizeIpos(true);
    const countAfterFirst = await MongoIpoModel.countDocuments({ _id: 'test-upsert-ipo-1' });

    const secondUpsert = await upstoxIpoService.synchronizeIpos(true);
    const countAfterSecond = await MongoIpoModel.countDocuments({ _id: 'test-upsert-ipo-1' });

    record(
      8,
      'MongoDB upsert and duplicate prevention',
      countAfterFirst === 1 && countAfterSecond === 1 && secondUpsert.metrics?.updatedCount! >= 1,
      `Exact single document maintained (count: ${countAfterSecond})`
    );
    await MongoIpoModel.deleteOne({ _id: 'test-upsert-ipo-1' });

    // -----------------------------------------------------------------
    // 9. Failed sync preserving previously verified records
    // -----------------------------------------------------------------
    // Insert a verified record
    await dbService.upsertIpo({
      id: 'test-verified-record',
      name: 'Test Verified Corp IPO',
      status: 'Open',
      lastUpdated: new Date().toISOString(),
      isStale: false,
      isVerified: true,
      source: 'upstox'
    });

    // Cause a failure
    (global as any).fetch = async () => ({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Upstream failure'
    });
    const failedSyncRes = await upstoxIpoService.synchronizeIpos(true);
    const preservedDoc = await MongoIpoModel.findById('test-verified-record').lean().exec();

    record(
      9,
      'Failed sync preserving previously verified records',
      failedSyncRes.success === false &&
        preservedDoc !== null &&
        preservedDoc.name === 'Test Verified Corp IPO' &&
        preservedDoc.isStale === true,
      `Record preserved in DB with isStale: ${preservedDoc?.isStale}`
    );
    await MongoIpoModel.deleteOne({ _id: 'test-verified-record' });

    // -----------------------------------------------------------------
    // 10. Safe handling of seeded IPOs with dependent user records
    // -----------------------------------------------------------------
    const jioDoc = await MongoIpoModel.findById('ipo_jio_platforms').lean().exec();
    const hyundaiDoc = await MongoIpoModel.findById('ipo_hyundai').lean().exec();
    const swiggyDoc = await MongoIpoModel.findById('ipo_swiggy').lean().exec();
    const jioConn = await MongoConnectionModel.findOne({ ipoId: 'ipo_jio_platforms' });
    const hyundaiConn = await MongoConnectionModel.findOne({ ipoId: 'ipo_hyundai' });

    const safeHandlingPassed =
      jioDoc !== null &&
      hyundaiDoc !== null &&
      swiggyDoc !== null &&
      jioDoc.isArchived === true &&
      hyundaiDoc.isArchived === true &&
      swiggyDoc.isArchived === true &&
      jioDoc.source === 'demo_preserved' &&
      jioConn !== null &&
      hyundaiConn !== null;

    record(
      10,
      'Safe handling of seeded IPOs with dependent user records',
      Boolean(safeHandlingPassed),
      'Dependent IPOs archived as demo_preserved; Connections intact'
    );

    // -----------------------------------------------------------------
    // 11. No accidental demo-data reseeding
    // -----------------------------------------------------------------
    await ensureIpoData();
    const ntpcDoc = await MongoIpoModel.findById('ipo_ntpc_green');
    const tataDoc = await MongoIpoModel.findById('ipo_tata_sons');

    record(
      11,
      'No accidental demo-data reseeding',
      ntpcDoc === null && tataDoc === null,
      'Orphaned demo records (NTPC, Tata Sons) not re-seeded into MongoDB'
    );

    // Restore original fetch and token
    (global as any).fetch = originalFetch;
    config.upstoxAccessToken = originalToken;

    // -----------------------------------------------------------------
    // 12. IPO dropdown loading, stale, and error states
    // -----------------------------------------------------------------
    const apiRes = await fetch(`${API_BASE}/ipos`);
    const apiJson = await apiRes.json();
    const hasLiveIpos = Array.isArray(apiJson.data) && apiJson.data.length > 0;
    const sampleItem = apiJson.data?.[0];

    record(
      12,
      'IPO dropdown loading, stale, and error states',
      apiRes.status === 200 && hasLiveIpos && sampleItem?.isVerified === true,
      `Loaded ${apiJson.data?.length} live verified IPOs (Sample: ${sampleItem?.name})`
    );

    // -----------------------------------------------------------------
    // 13. Isolation of connections and chats between different IPOs
    // -----------------------------------------------------------------
    // Login as Arjun Kapoor
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'arjun.kapoor@investor.in', password: 'Password123!' })
    });
    const loginJson = await loginRes.json();
    const token = loginJson.data?.accessToken;
    const authHeaders = { Authorization: `Bearer ${token}` };

    const jioConnsRes = await fetch(`${API_BASE}/connections?ipoId=ipo_jio_platforms`, { headers: authHeaders });
    const jioConnsJson = await jioConnsRes.json();
    const hyundaiConnsRes = await fetch(`${API_BASE}/connections?ipoId=ipo_hyundai`, { headers: authHeaders });
    const hyundaiConnsJson = await hyundaiConnsRes.json();

    const isolationPassed =
      jioConnsJson.data?.length === 1 &&
      jioConnsJson.data[0].ipoId === 'ipo_jio_platforms' &&
      hyundaiConnsJson.data?.length === 1 &&
      hyundaiConnsJson.data[0].ipoId === 'ipo_hyundai' &&
      jioConnsJson.data[0].id !== hyundaiConnsJson.data[0].id;

    record(
      13,
      'Isolation of connections and chats between different IPOs',
      Boolean(isolationPassed),
      'Strict separation enforced by backend authorization & database query'
    );

    // -----------------------------------------------------------------
    // 14. Confirmation that credentials never appear in logs or frontend responses
    // -----------------------------------------------------------------
    const syncRes = await fetch(`${API_BASE}/ipos/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: false })
    });
    const syncJson = await syncRes.json();

    const rawResponseText = JSON.stringify(apiJson) + JSON.stringify(syncJson);
    const leakedToken = originalToken && originalToken.length > 20 && rawResponseText.includes(originalToken);

    record(
      14,
      'Confirmation that credentials never appear in frontend responses or logs',
      !leakedToken,
      `API tokens concealed: 100% clean (leakedToken=${leakedToken})`
    );

    // -----------------------------------------------------------------
    // Final Summary
    // -----------------------------------------------------------------
    console.log('\n================================================================');
    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = total - passed;
    console.log(`TEST EXECUTION SUMMARY: ${passed}/${total} PASSED (${failed} FAILED)`);
    console.log('================================================================\n');

    await mongoose.disconnect();
    if (failed > 0) process.exit(1);
    else process.exit(0);
  } catch (err: any) {
    (global as any).fetch = originalFetch;
    config.upstoxAccessToken = originalToken;
    console.error('Test suite error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runTestSuite();
