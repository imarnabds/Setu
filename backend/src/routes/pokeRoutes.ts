import { Router } from 'express';
import {
  sendPoke,
  cancelPoke,
  acceptPoke,
  rejectPoke,
  getMyPokes
} from '../controllers/pokeController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticate, sendPoke);
router.get('/', authenticate, getMyPokes);
router.put('/:id/cancel', authenticate, cancelPoke);
router.put('/:id/accept', authenticate, acceptPoke);
router.put('/:id/reject', authenticate, rejectPoke);

export default router;
