import { Router } from 'express';
import {
  getAdminStats,
  getAdminUsers,
  reviewKyc,
  getAllPokes,
  getAllConnections,
  getAuditLogs,
  getConnectionMessagesForAdmin
} from '../controllers/adminController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Protect all admin routes with authentication and admin role requirement
router.use(authenticate);
router.use(requireRole('admin'));

router.get('/stats', getAdminStats);
router.get('/users', getAdminUsers);
router.get('/pokes', getAllPokes);
router.put('/kyc/:userId', reviewKyc);
router.post('/kyc/:userId', reviewKyc);
router.put('/kyc/:userId/review', reviewKyc);
router.post('/kyc/:userId/review', reviewKyc);
router.get('/connections', getAllConnections);
router.get('/connections/:connectionId/messages', getConnectionMessagesForAdmin);
router.get('/audit-logs', getAuditLogs);

export default router;
