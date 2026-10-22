import { Response } from 'express';
import { storage } from '../services/storage.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { commissionUpdateSchema, VALID_COMMISSION_RATES } from '../validators/schemas.js';
import { CommissionHistory } from '../models/types.js';

const createId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).substring(2, 9)}${Date.now().toString(36)}`;

export const updateCommission = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    if (req.user.primaryRole !== 'demat_holder' && req.user.primaryRole !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Only Demat Account Holders can configure commission rates'
      });
      return;
    }

    const parseResult = commissionUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors
      });
      return;
    }

    const { rate, basis, reason, targetApplicantId } = parseResult.data;

    // Strict validation
    if (!VALID_COMMISSION_RATES.includes(rate)) {
      res.status(400).json({
        success: false,
        error: `Invalid rate. Rate must be between 0% and 50% in exact 2.5% increments.`
      });
      return;
    }

    const previousRate = req.user.defaultCommissionRate;
    const now = new Date().toISOString();

    // If targetApplicantId is provided, this is an applicant-specific rate proposal
    if (targetApplicantId) {
      const applicant = storage.findUserById(targetApplicantId);
      if (!applicant) {
        res.status(404).json({ success: false, error: 'Applicant user not found' });
        return;
      }

      // Record in commission audit history
      const historyEntry: CommissionHistory = {
        id: createId('ch'),
        holderId: req.user.id,
        previousRate,
        newRate: rate,
        basis,
        targetApplicantId,
        changedById: req.user.id,
        reason: reason || `Applicant-specific rate proposal for ${applicant.fullName}`,
        timestamp: now
      };
      storage.createCommissionHistory(historyEntry);

      storage.createAuditLog({
        id: createId('aud'),
        actorId: req.user.id,
        action: 'APPLICANT_COMMISSION_PROPOSED',
        details: { holderId: req.user.id, applicantId: targetApplicantId, rate, basis },
        ipAddress: req.ip,
        timestamp: now
      });

      res.json({
        success: true,
        message: `Applicant-specific rate of ${rate}% configured for ${applicant.fullName}. Terms must be accepted before activation.`,
        data: {
          rate,
          basis,
          targetApplicantId,
          historyEntry
        }
      });
      return;
    }

    // Otherwise, update holder's default published rate
    const updatedUser = storage.updateUser(req.user.id, {
      defaultCommissionRate: rate,
      commissionBasis: basis
    });

    const historyEntry: CommissionHistory = {
      id: createId('ch'),
      holderId: req.user.id,
      previousRate,
      newRate: rate,
      basis,
      changedById: req.user.id,
      reason: reason || 'Updated default published commission rate',
      timestamp: now
    };
    storage.createCommissionHistory(historyEntry);

    storage.createAuditLog({
      id: createId('aud'),
      actorId: req.user.id,
      action: 'DEFAULT_COMMISSION_UPDATED',
      details: { previousRate, newRate: rate, basis },
      ipAddress: req.ip,
      timestamp: now
    });

    res.json({
      success: true,
      message: `Default commission rate updated to ${rate}%.`,
      data: {
        defaultCommissionRate: updatedUser?.defaultCommissionRate,
        commissionBasis: updatedUser?.commissionBasis,
        historyEntry
      }
    });
  } catch (error) {
    console.error('updateCommission error:', error);
    res.status(500).json({ success: false, error: 'Failed to update commission' });
  }
};

export const getCommissionHistory = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { holderId } = req.params;
    const targetId = holderId || req.user.id;

    const history = storage.getCommissionHistories(targetId);

    // Populate target applicant details if present
    const populated = history.map((h) => {
      let applicantName = undefined;
      if (h.targetApplicantId) {
        const applicant = storage.findUserById(h.targetApplicantId);
        applicantName = applicant?.fullName;
      }
      return {
        ...h,
        targetApplicantName: applicantName
      };
    });

    // Sort by latest first
    populated.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    res.json({
      success: true,
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch commission history' });
  }
};

export const calculateCommission = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { baseAmount, rate } = req.body;

    const numBase = parseFloat(baseAmount);
    const numRate = parseFloat(rate);

    if (isNaN(numBase) || numBase <= 0) {
      res.status(400).json({
        success: false,
        error: 'Base amount must be a positive number'
      });
      return;
    }

    if (!VALID_COMMISSION_RATES.includes(numRate)) {
      res.status(400).json({
        success: false,
        error: 'Rate must be one of allowed 2.5% increments between 0% and 50%'
      });
      return;
    }

    // Decimal safe calculation
    const commissionFee = Math.round((numBase * (numRate / 100)) * 100) / 100;
    const effectiveTotal = Math.round((numBase + commissionFee) * 100) / 100;

    res.json({
      success: true,
      data: {
        baseAmount: numBase,
        rate: numRate,
        commissionFee,
        effectiveTotal,
        currency: 'INR',
        disclaimer:
          'Statutory Notice: Commission is applicable solely to documented advisory or technical assistance service fees. Under SEBI regulations, no profit-sharing, allotment guarantee, or custody fee is permitted.'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Calculation error' });
  }
};
