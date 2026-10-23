import { Request, Response } from 'express';
import { dbService } from '../services/dbService.js';
import { upstoxIpoService } from '../services/upstoxIpoService.js';

/**
 * Returns list of IPO offerings containing strictly ID, Name, Lifecycle Status, and Last-Updated timestamp.
 * Filters out archived demo records by default unless explicitly requested.
 * Adheres strictly to the requirement: no subscription figures, price bands, or allotment details.
 */
export const getAllIpos = async (req: Request, res: Response): Promise<void> => {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    const filter = includeArchived ? {} : { isArchived: { $ne: true } };

    const rawIpos = await dbService.getAllIpos(filter);
    const meta = await upstoxIpoService.getSyncMetadata();

    // Map strictly to required fields: ID, Name, Status, LastUpdated, and Source transparency
    const sanitized = rawIpos.map((item) => ({
      id: item.id,
      name: item.name,
      status: item.status,
      lastUpdated: item.lastUpdated || item.updatedAt,
      isStale: item.isStale ?? meta.isStale,
      isVerified: item.isVerified ?? (item.source === 'upstox'),
      source: item.source || 'upstox'
    }));

    res.json({
      success: true,
      data: sanitized,
      meta
    });
  } catch (error: any) {
    console.error('Failed to get IPOs:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve IPO offerings' });
  }
};

/**
 * Retrieves a single IPO offering by its database identifier (supports both live and archived IDs).
 */
export const getIpoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const item = await dbService.findIpoById(id);
    if (!item) {
      res.status(404).json({ success: false, error: 'IPO offering not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: item.id,
        name: item.name,
        status: item.status,
        lastUpdated: item.lastUpdated || item.updatedAt,
        isStale: item.isStale ?? false,
        isVerified: item.isVerified ?? (item.source === 'upstox'),
        source: item.source || 'upstox'
      }
    });
  } catch (error: any) {
    console.error('Failed to get IPO by ID:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve IPO details' });
  }
};

/**
 * Trigger to synchronize IPO statuses from Upstox API into MongoDB.
 */
export const syncIposNow = async (req: Request, res: Response): Promise<void> => {
  try {
    const force = req.body?.force === true;
    const result = await upstoxIpoService.synchronizeIpos(force);

    const sanitized = result.data.map((item) => ({
      id: item.id,
      name: item.name,
      status: item.status,
      lastUpdated: item.lastUpdated || item.updatedAt,
      isStale: item.isStale ?? result.meta.isStale,
      isVerified: item.isVerified ?? (item.source === 'upstox'),
      source: item.source || 'upstox'
    }));

    res.json({
      success: result.success,
      data: sanitized,
      meta: result.meta,
      metrics: result.metrics,
      message: result.success
        ? `IPO statuses synchronized successfully with Upstox API (${sanitized.length} active offerings).`
        : `Synchronization status: ${result.meta.syncStatus}. Retained cached data with timestamp.`
    });
  } catch (error: any) {
    console.error('Manual IPO sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Synchronization failed',
      details: error.message
    });
  }
};
