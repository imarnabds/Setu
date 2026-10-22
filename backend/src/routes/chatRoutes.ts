import { Router } from 'express';
import {
  getMessages,
  sendMessage,
  markAsRead
} from '../controllers/chatController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/:connectionId', authenticate, getMessages);
router.post('/', authenticate, sendMessage);
router.put('/:connectionId/read', authenticate, markAsRead);

export default router;
