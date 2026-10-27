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
  socialAuth,
  googleAuth
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/google', googleAuth);          // New: explicit Google OAuth endpoint
router.post('/social', socialAuth);          // Kept for backward-compat — delegates to googleAuth
router.post('/refresh', refresh);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);
router.post('/forgot-password', forgotPassword);
router.post('/verify-contact', authenticate, verifyContact); // deprecated — returns 410
router.post('/send-email-otp', sendEmailOtp);
router.post('/verify-email-otp', verifyEmailOtp);

export default router;

