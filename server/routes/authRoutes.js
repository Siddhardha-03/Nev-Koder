import express from 'express';
import {
  refreshAccessToken,
  getDashboardStats
} from '../controllers/authController.js';
import {
  firebaseSync,
  firebaseMe,
  firebaseRegisterRequestOtp,
  firebaseRegisterVerifyOtp,
  firebaseRegisterResendOtp,
  firebaseForgotPassword,
  firebaseResetPasswordWithOTP
} from '../controllers/firebaseAuthController.js';
import { verifyToken, rateLimitMiddleware } from '../middlewares/authMiddleware.js';
import { verifyFirebaseToken } from '../middlewares/firebaseAuthMiddleware.js';

const router = express.Router();

// Rate limiting for auth endpoints (separate buckets per route)
const forgotPasswordRateLimit = rateLimitMiddleware(15, 15 * 60 * 1000);
const resetPasswordRateLimit = rateLimitMiddleware(15, 15 * 60 * 1000);
const firebaseSyncRateLimit = rateLimitMiddleware(60, 15 * 60 * 1000);
const registerOtpRateLimit = rateLimitMiddleware(20, 15 * 60 * 1000);

// Firebase auth routes
router.post('/firebase/register/request-otp', registerOtpRateLimit, verifyFirebaseToken, firebaseRegisterRequestOtp);
router.post('/firebase/register/verify-otp', registerOtpRateLimit, verifyFirebaseToken, firebaseRegisterVerifyOtp);
router.post('/firebase/register/resend-otp', registerOtpRateLimit, verifyFirebaseToken, firebaseRegisterResendOtp);
router.post('/firebase/sync', firebaseSyncRateLimit, verifyFirebaseToken, firebaseSync);
router.get('/firebase/me', verifyFirebaseToken, firebaseMe);
router.post('/forgot-password', forgotPasswordRateLimit, firebaseForgotPassword);
router.post('/reset-password', resetPasswordRateLimit, firebaseResetPasswordWithOTP);

// Session token routes
router.post('/refresh-token', refreshAccessToken);
router.get('/dashboard/stats', verifyToken, getDashboardStats);

// Protected route (app JWT)
router.get('/me', verifyToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

export default router;
