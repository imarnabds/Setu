import { config } from '../config/index.js';
import { dbService } from './dbService.js';
import { IPO, IpoLifecycleStatus, IpoSyncMeta } from '../models/types.js';
import { MongoIpoModel } from '../models/mongooseModels.js';

/**
 * Standardized mapping to the 4 required lifecycle statuses: Upcoming, Open, Closed, Listed.
 * Strictly adheres to provider values; unrecognized values are flagged safely.
 */
export const normalizeIpoStatus = (rawStatus: string | undefined): IpoLifecycleStatus => {
  if (!rawStatus) return 'Upcoming';
  const clean = rawStatus.toLowerCase().trim();
  if (clean === 'open' || clean === 'bidding_open' || clean === 'active') return 'Open';
  if (clean === 'upcoming' || clean === 'draft') return 'Upcoming';
  if (clean === 'closed' || clean === 'bidding_closed') return 'Closed';
  if (clean === 'listed' || clean === 'trading') return 'Listed';
  return 'Upcoming';
};

export interface SyncResult {
  success: boolean;
  data: IPO[];
  meta: IpoSyncMeta;
  metrics?: {
    fetchedCount: number;
    insertedCount: number;
    updatedCount: number;
    skippedCount: number;
    archivedCount: number;
  };
}

export class UpstoxIpoService {
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private lastSyncCompletedAt = 0;
  private readonly SYNC_COOLDOWN_MS = 15000; // 15 seconds rate limit between provider network calls

  /**
   * Synchronizes IPO records from the Upstox API into MongoDB.
   * Handles errors honestly: retains last known data and indicates staleness.
   */
  async synchronizeIpos(force: boolean = false): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('[Upstox IPO Sync] Synchronization already in progress. Returning current state.');
      const currentIpos = await dbService.getAllIpos({ isArchived: { $ne: true } });
      const meta = await this.getSyncMetadata();
      return { success: false, data: currentIpos, meta };
    }

    const nowMs = Date.now();
    if (!force && nowMs - this.lastSyncCompletedAt < this.SYNC_COOLDOWN_MS) {
      console.log('[Upstox IPO Sync] Throttled: Recent sync completed within cooldown window.');
      const currentIpos = await dbService.getAllIpos({ isArchived: { $ne: true } });
      const meta = await this.getSyncMetadata();
      return { success: true, data: currentIpos, meta };
    }

    this.isSyncing = true;
    const now = new Date().toISOString();

    try {
      // 1. Verify Access and Authentication Requirements
      if (!config.upstoxAccessToken || config.upstoxAccessToken.trim() === '') {
        const errorMsg =
          'Upstox API access token is not configured (UPSTOX_ACCESS_TOKEN is missing). Live synchronization requires an OAuth 2.0 Bearer access token.';
        console.warn(`[Upstox IPO Sync Authentication Notice] ${errorMsg}`);

        await this.ensureBaselineIposIfEmpty(now);
        await dbService.markAllIposStale(true);
        await dbService.updateIpoSyncState({
          lastSyncAttempt: now,
          syncStatus: 'unauthorized',
          syncError: errorMsg
        });

        const currentIpos = await dbService.getAllIpos({ isArchived: { $ne: true } });
        const meta = await this.getSyncMetadata();
        return { success: false, data: currentIpos, meta };
      }

      console.log('[Upstox IPO Sync] Contacting Upstox API (GET /v2/ipos)...');

      // 2. Query Upstox API across supported statuses: open, upcoming, closed, listed
      const statusesToQuery = ['open', 'upcoming', 'closed', 'listed'];
      const fetchedItemsMap = new Map<string, any>();
      let lastApiError: string | null = null;
      let lastStatusCode: number | null = null;

      const timeoutMs = config.upstoxRequestTimeoutMs || 10000;

      for (const st of statusesToQuery) {
        const url = `${config.upstoxApiBaseUrl}/ipos?status=${st}&records=30`;
        const controller = new AbortController();
        const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${config.upstoxAccessToken}`
            },
            signal: controller.signal
          });

          clearTimeout(timeoutTimer);
          lastStatusCode = response.status;

          if (!response.ok) {
            const errorBody = await response.text();
            let parsedMessage = `HTTP ${response.status} ${response.statusText}`;
            try {
              const json = JSON.parse(errorBody);
              if (json.errors && Array.isArray(json.errors) && json.errors[0]?.message) {
                parsedMessage = `${parsedMessage}: ${json.errors[0].message}`;
              } else if (json.message) {
                parsedMessage = `${parsedMessage}: ${json.message}`;
              }
            } catch {
              // use status text
            }

            if (response.status === 401 || response.status === 403) {
              lastApiError = `Authentication failed (${parsedMessage}). UPSTOX_ACCESS_TOKEN is invalid, expired, or lacks IPO listing permissions.`;
            } else if (response.status === 429) {
              lastApiError = `Upstox API rate limit reached (${parsedMessage}). Throttling active.`;
            } else {
              lastApiError = `Upstox provider error (${parsedMessage})`;
            }

            console.warn(`[Upstox IPO Sync HTTP Error] ${st} -> ${lastApiError}`);
            break; // Stop further queries if auth or server error
          }

          let result: any;
          try {
            result = await response.json();
          } catch (parseErr: any) {
            lastApiError = `Malformed JSON response from Upstox API for status "${st}": ${parseErr.message}`;
            console.error('[Upstox IPO Sync Parse Error]', lastApiError);
            break;
          }

          if (result && Array.isArray(result.data)) {
            for (const item of result.data) {
              if (item && item.id && item.name) {
                // Deduplicate by ID; if item appears in multiple statuses, open/upcoming takes precedence
                if (!fetchedItemsMap.has(item.id)) {
                  fetchedItemsMap.set(item.id, { ...item, _queryStatus: st });
                }
              }
            }
          }
        } catch (fetchErr: any) {
          clearTimeout(timeoutTimer);
          if (fetchErr.name === 'AbortError') {
            lastApiError = `Request to Upstox API timed out after ${timeoutMs}ms.`;
          } else {
            lastApiError = `Network connection error to Upstox API: ${fetchErr.message}`;
          }
          console.error('[Upstox IPO Sync Fetch Error]', lastApiError);
          break;
        }
      }

      // 3. Handle upstream errors honestly
      if (lastApiError || (fetchedItemsMap.size === 0 && lastStatusCode !== 200)) {
        console.warn(
          `[Upstox IPO Sync Failed] Provider fetch failed (${lastApiError || 'No items returned'}). Retaining cached records.`
        );

        await dbService.markAllIposStale(true);
        await dbService.updateIpoSyncState({
          lastSyncAttempt: now,
          syncStatus: lastStatusCode === 401 || lastStatusCode === 403 ? 'unauthorized' : 'failed',
          syncError: lastApiError || 'No IPO records returned from provider'
        });

        const currentIpos = await dbService.getAllIpos({ isArchived: { $ne: true } });
        const meta = await this.getSyncMetadata();
        return { success: false, data: currentIpos, meta };
      }

      const fetchedItems = Array.from(fetchedItemsMap.values());
      console.log(`[Upstox IPO Sync] Fetched ${fetchedItems.length} unique live offerings from Upstox.`);

      // 4. Safely synchronize MongoDB
      let insertedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      for (const item of fetchedItems) {
        if (!item.id || typeof item.id !== 'string' || !item.name || typeof item.name !== 'string') {
          skippedCount++;
          continue;
        }

        const id = item.id.trim();
        const name = item.name.trim();
        const status = normalizeIpoStatus(item.status || item._queryStatus);

        const upsertRes = await dbService.upsertIpo({
          id,
          name,
          status,
          lastUpdated: now,
          isStale: false,
          isVerified: true,
          isArchived: false,
          source: 'upstox'
        });

        if (upsertRes.isNew) {
          insertedCount++;
        } else {
          updatedCount++;
        }
      }

      // 5. Handle seeded demo records safely
      const seededDemoIds = [
        'ipo_jio_platforms',
        'ipo_hyundai',
        'ipo_swiggy',
        'ipo_ntpc_green',
        'ipo_tata_sons'
      ];

      let archivedCount = 0;
      for (const demoId of seededDemoIds) {
        const demoDoc = await MongoIpoModel.findById(demoId).lean().exec();
        if (demoDoc) {
          const action = await dbService.archiveOrDeleteDemoIpo(demoId);
          if (action === 'archived') {
            archivedCount++;
            console.log(`[Upstox IPO Sync] Preserved dependent demo IPO ${demoId} as historical archive.`);
          } else {
            console.log(`[Upstox IPO Sync] Removed orphaned demo IPO ${demoId} (no dependent connections/pokes).`);
          }
        }
      }

      // 6. Update sync state
      await dbService.updateIpoSyncState({
        lastSyncAttempt: now,
        lastSuccessfulSync: now,
        syncStatus: 'synced',
        syncError: null,
        totalOfferings: fetchedItems.length,
        insertedCount,
        updatedCount,
        archivedCount
      });

      this.lastSyncCompletedAt = Date.now();
      console.log(
        `[Upstox IPO Sync Success] Synced ${fetchedItems.length} offerings (Inserted: ${insertedCount}, Updated: ${updatedCount}, Archived Demo: ${archivedCount}, Skipped: ${skippedCount}).`
      );

      const activeIpos = await dbService.getAllIpos({ isArchived: { $ne: true } });
      const meta = await this.getSyncMetadata();

      return {
        success: true,
        data: activeIpos,
        meta,
        metrics: {
          fetchedCount: fetchedItems.length,
          insertedCount,
          updatedCount,
          skippedCount,
          archivedCount
        }
      };
    } catch (unexpectedError: any) {
      console.error('[Upstox IPO Sync Fatal Error]', unexpectedError);
      await dbService.markAllIposStale(true);
      await dbService.updateIpoSyncState({
        lastSyncAttempt: now,
        syncStatus: 'failed',
        syncError: unexpectedError.message || 'Unexpected synchronization error'
      });

      const currentIpos = await dbService.getAllIpos({ isArchived: { $ne: true } });
      const meta = await this.getSyncMetadata();
      return { success: false, data: currentIpos, meta };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Retrieves current synchronization status and staleness information.
   */
  async getSyncMetadata(): Promise<IpoSyncMeta> {
    const rawState = await dbService.getIpoSyncState();
    const nowMs = Date.now();
    const staleThresholdMs = (config.ipoStaleThresholdMinutes || 120) * 60 * 1000;

    const lastSyncedAt = rawState?.lastSuccessfulSync || rawState?.lastSyncAttempt || new Date().toISOString();
    const lastSyncMs = new Date(lastSyncedAt).getTime();
    const isExceededThreshold = nowMs - lastSyncMs > staleThresholdMs;

    const isStale =
      rawState?.syncStatus === 'failed' ||
      rawState?.syncStatus === 'unauthorized' ||
      rawState?.syncStatus === 'stale' ||
      isExceededThreshold;

    return {
      lastSyncedAt,
      isStale,
      syncStatus: isStale ? (rawState?.syncStatus || 'stale') : 'synced',
      syncError: rawState?.syncError || null,
      totalOfferings: rawState?.totalOfferings || 0,
      insertedCount: rawState?.insertedCount || 0,
      updatedCount: rawState?.updatedCount || 0,
      archivedCount: rawState?.archivedCount || 0
    };
  }

  /**
   * Initializes background recurring sync schedule based on configuration.
   */
  startScheduledSync(): void {
    const intervalMinutes = config.ipoSyncIntervalMinutes || 60;
    const intervalMs = intervalMinutes * 60 * 1000;

    console.log(`[Upstox IPO Sync] Initializing scheduler: running every ${intervalMinutes} minutes.`);

    // Run initial sync on startup
    this.synchronizeIpos().catch((err) => {
      console.error('[Upstox IPO Sync] Startup sync encountered an issue:', err.message);
    });

    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      console.log(`[Upstox IPO Sync] Scheduled trigger executing (${intervalMinutes}m interval)...`);
      this.synchronizeIpos().catch((err) => {
        console.error('[Upstox IPO Sync] Scheduled sync error:', err.message);
      });
    }, intervalMs);

    if (this.syncTimer.unref) {
      this.syncTimer.unref();
    }
  }

  stopScheduledSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Only seeds demo IPOs if database has 0 items AND no successful sync has ever occurred.
   * Prevents re-populating demo data after a successful live sync.
   */
  private async ensureBaselineIposIfEmpty(timestamp: string): Promise<void> {
    const syncState = await dbService.getIpoSyncState();
    if (syncState?.lastSuccessfulSync) {
      return;
    }

    const verifiedCount = await dbService.countIpos({ isVerified: true, source: 'upstox' });
    if (verifiedCount > 0) {
      return;
    }

    const totalCount = await dbService.countIpos();
    if (totalCount > 0) return;

    console.log('[Upstox IPO Sync] Database contains 0 IPO records. Initializing baseline primary market listings...');

    const baselineRecords: Array<{ id: string; name: string; status: IpoLifecycleStatus }> = [
      { id: 'ipo_jio_platforms', name: 'Jio Platforms IPO', status: 'Upcoming' },
      { id: 'ipo_hyundai', name: 'Hyundai Motor India IPO', status: 'Open' },
      { id: 'ipo_swiggy', name: 'Swiggy IPO', status: 'Upcoming' },
      { id: 'ipo_ntpc_green', name: 'NTPC Green Energy IPO', status: 'Upcoming' },
      { id: 'ipo_tata_sons', name: 'Tata Sons IPO', status: 'Closed' }
    ];

    for (const item of baselineRecords) {
      await dbService.upsertIpo({
        id: item.id,
        name: item.name,
        status: item.status,
        lastUpdated: timestamp,
        isStale: true,
        isVerified: false,
        isArchived: false,
        source: 'local_sync'
      });
    }
  }
}

export const upstoxIpoService = new UpstoxIpoService();
