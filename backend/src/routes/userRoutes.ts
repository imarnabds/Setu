import { Router } from 'express';
import {
  getHolders,
  getInvestors,
  getProfileById,
  updateProfile,
  submitKyc,
  updateUpi
} from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/holders', getHolders);
router.get('/investors', authenticate, getInvestors);
router.get('/profile/:id', getProfileById);
router.put('/profile', authenticate, updateProfile);
router.put('/upi', authenticate, updateUpi);
router.post('/upi', authenticate, updateUpi);
router.post('/kyc', authenticate, submitKyc);

export default router;
