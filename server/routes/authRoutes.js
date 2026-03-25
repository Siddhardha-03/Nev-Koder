import express from 'express';
import {
  register,
  verifyOTPCode,
  resendOTP,
  login,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
  getDashboardStats
} from '../controllers/authController.js';
import { verifyToken, rateLimitMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Rate limiting for auth endpoints (separate buckets per route)
const registerRateLimit = rateLimitMiddleware(20, 15 * 60 * 1000);
const verifyOtpRateLimit = rateLimitMiddleware(30, 15 * 60 * 1000);
const resendOtpRateLimit = rateLimitMiddleware(15, 15 * 60 * 1000);
const loginRateLimit = rateLimitMiddleware(25, 15 * 60 * 1000);
const forgotPasswordRateLimit = rateLimitMiddleware(15, 15 * 60 * 1000);
const resetPasswordRateLimit = rateLimitMiddleware(15, 15 * 60 * 1000);

// Auth routes
router.post('/register', registerRateLimit, register);
router.post('/verify-otp', verifyOtpRateLimit, verifyOTPCode);
router.post('/resend-otp', resendOtpRateLimit, resendOTP);
router.post('/login', loginRateLimit, login);
router.post('/forgot-password', forgotPasswordRateLimit, forgotPassword);
router.post('/reset-password', resetPasswordRateLimit, resetPassword);
router.post('/refresh-token', refreshAccessToken);
router.get('/dashboard/stats', verifyToken, getDashboardStats);

// Protected route example
router.get('/me', verifyToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

export default router;
