import { Router } from 'express';
import { getAllIpos, getIpoById, syncIposNow } from '../controllers/ipoController.js';

const router = Router();

router.get('/', getAllIpos);
router.post('/sync', syncIposNow);
router.post('/refresh', syncIposNow);
router.get('/:id', getIpoById);

export default router;
