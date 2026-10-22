import { Router } from 'express';
import {
  updateCommission,
  getCommissionHistory,
  calculateCommission
} from '../controllers/commissionController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.put('/', authenticate, updateCommission);
router.get('/history', authenticate, getCommissionHistory);
router.get('/history/:holderId', authenticate, getCommissionHistory);
router.post('/calculate', authenticate, calculateCommission);

export default router;
