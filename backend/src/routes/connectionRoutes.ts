import { Router } from 'express';
import {
  getMyConnections,
  getConnectionById,
  getConnectionUpi,
  disconnect,
  blockUser
} from '../controllers/connectionController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getMyConnections);
router.get('/:id', authenticate, getConnectionById);
router.get('/:id/upi', authenticate, getConnectionUpi);
router.put('/:id/disconnect', authenticate, disconnect);
router.put('/:id/block', authenticate, blockUser);

export default router;
