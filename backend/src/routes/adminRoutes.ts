import { Router } from 'express';
import {
  getAdminStats,
  getAdminUsers,
  reviewKyc,
  getAllPokes,
  getAllConnections,
  getAuditLogs
} from '../controllers/adminController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Protect all admin routes with authentication and admin role requirement
router.use(authenticate);
router.use(requireRole('admin'));

router.get('/stats', getAdminStats);
router.get('/users', getAdminUsers);
router.put('/kyc/:userId', reviewKyc);
router.get('/pokes', getAllPokes);
router.get('/connections', getAllConnections);
router.get('/audit-logs', getAuditLogs);

export default router;
