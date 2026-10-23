import { Router } from 'express';
import {
  signup,
  login,
  refresh,
  getMe,
  logout,
  forgotPassword,
  verifyContact,
  sendEmailOtp,
  verifyEmailOtp,
  socialAuth
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/social', socialAuth);
router.post('/refresh', refresh);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);
router.post('/forgot-password', forgotPassword);
router.post('/verify-contact', authenticate, verifyContact);
router.post('/send-email-otp', sendEmailOtp);
router.post('/verify-email-otp', verifyEmailOtp);

export default router;
