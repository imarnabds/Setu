import { Router } from 'express';
import {
  getHolders,
  getInvestors,
  getProfileById,
  updateProfile,
  submitKyc
} from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/holders', getHolders);
router.get('/investors', authenticate, getInvestors);
router.get('/profile/:id', getProfileById);
router.put('/profile', authenticate, updateProfile);
router.post('/kyc', authenticate, submitKyc);

export default router;
