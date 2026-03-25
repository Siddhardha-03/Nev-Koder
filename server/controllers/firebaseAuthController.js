import pool from '../config/database.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { admin, isFirebaseInitialized } from '../firebaseAdmin.js';
import { createOTP, verifyOTP, markOTPAsUsed, checkOTPResendCooldown, updateLastOTPSentTime, OTP_PURPOSES } from '../services/otpService.js';
import { sendOTPEmail, sendPasswordResetOTPEmail } from '../services/emailService.js';

const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
};

const persistRefreshToken = async (userId, refreshToken) => {
  const connection = await pool.getConnection();
  try {
    const expiryTime = new Date();
    expiryTime.setDate(expiryTime.getDate() + 30);
    await connection.execute(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, refreshToken, expiryTime]
    );
  } finally {
    connection.release();
  }
};

const issueSessionForUser = async (res, user) => {
  const accessToken = generateAccessToken(user.id, user.email, user.role || 'user');
  const refreshToken = generateRefreshToken(user.id);

  await persistRefreshToken(user.id, refreshToken);
  setRefreshTokenCookie(res, refreshToken);

  return {
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'user',
      firebase_uid: user.firebase_uid
    }
  };
};

const getCurrentDbUser = async (userId) => {
  const connection = await pool.getConnection();
  try {
    const [users] = await connection.execute(
      'SELECT id, name, email, role, firebase_uid, is_verified FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    return users[0] || null;
  } finally {
    connection.release();
  }
};

export const firebaseSync = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Firebase authentication required' });
    }

    const dbUser = await getCurrentDbUser(req.user.id);
    if (!dbUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!dbUser.is_verified) {
      return res.status(403).json({
        success: false,
        requiresOtp: true,
        message: 'Please verify your email with OTP before continuing.'
      });
    }

    const session = await issueSessionForUser(res, dbUser);

    return res.status(200).json({
      success: true,
      message: 'Firebase user synced successfully',
      ...session
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Firebase sync failed', error: error.message });
  }
};

export const firebaseMe = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Firebase authentication required' });
  }

  return res.status(200).json({
    success: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role || 'user',
      firebase_uid: req.user.firebase_uid,
      firebase_email_verified: Boolean(req.firebaseUser?.email_verified)
    }
  });
};

export const firebaseRegisterRequestOtp = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Firebase authentication required' });
    }

    const dbUser = await getCurrentDbUser(req.user.id);
    if (!dbUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (dbUser.is_verified) {
      return res.status(200).json({ success: true, message: 'Account is already verified' });
    }

    const cooldown = await checkOTPResendCooldown(dbUser.id);
    if (!cooldown.canResend) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${cooldown.remainingSeconds} seconds before requesting another OTP`
      });
    }

    const otpResult = await createOTP(dbUser.id, OTP_PURPOSES.EMAIL_VERIFICATION);
    if (!otpResult.success) {
      return res.status(500).json({ success: false, message: 'Failed to generate OTP' });
    }

    await updateLastOTPSentTime(dbUser.id);
    const emailResult = await sendOTPEmail(dbUser.email, otpResult.otp, dbUser.name || 'User');
    if (!emailResult.success) {
      return res.status(500).json({ success: false, message: 'Failed to send OTP email' });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully. Please verify your email to complete registration.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to send registration OTP', error: error.message });
  }
};

export const firebaseRegisterVerifyOtp = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Firebase authentication required' });
    }

    const otp = String(req.body?.otp || '').trim();
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: 'OTP must be 6 digits.' });
    }

    const dbUser = await getCurrentDbUser(req.user.id);
    if (!dbUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const verifyResult = await verifyOTP(dbUser.id, otp, OTP_PURPOSES.EMAIL_VERIFICATION);
    if (!verifyResult.success) {
      return res.status(400).json({ success: false, message: verifyResult.message || 'Invalid OTP' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.execute('UPDATE users SET is_verified = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [dbUser.id]);
    } finally {
      connection.release();
    }

    await markOTPAsUsed(dbUser.id, otp, OTP_PURPOSES.EMAIL_VERIFICATION);

    const refreshedUser = await getCurrentDbUser(dbUser.id);
    const session = await issueSessionForUser(res, refreshedUser);

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      ...session
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'OTP verification failed', error: error.message });
  }
};

export const firebaseRegisterResendOtp = firebaseRegisterRequestOtp;

export const firebaseForgotPassword = async (req, res) => {
  try {
    if (!isFirebaseInitialized) {
      return res.status(503).json({ success: false, message: 'Firebase authentication is not configured.' });
    }

    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const connection = await pool.getConnection();
    try {
      const [users] = await connection.execute(
        'SELECT id, email, name, firebase_uid, auth_provider FROM users WHERE email = ? LIMIT 1',
        [email]
      );

      // Do not reveal account existence.
      if (users.length === 0) {
        return res.status(200).json({ success: true, message: 'If account exists, OTP has been sent' });
      }

      const user = users[0];

      if (user.auth_provider !== 'firebase' || !user.firebase_uid) {
        return res.status(200).json({ success: true, message: 'If account exists, OTP has been sent' });
      }

      const cooldown = await checkOTPResendCooldown(user.id);
      if (!cooldown.canResend) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${cooldown.remainingSeconds} seconds before requesting another OTP`
        });
      }

      const otpResult = await createOTP(user.id, OTP_PURPOSES.PASSWORD_RESET);
      if (!otpResult.success) {
        return res.status(500).json({ success: false, message: 'Failed to generate OTP' });
      }

      await updateLastOTPSentTime(user.id);
      await sendPasswordResetOTPEmail(user.email, otpResult.otp, user.name || 'User');

      return res.status(200).json({ success: true, message: 'If account exists, OTP has been sent' });
    } finally {
      connection.release();
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Forgot password request failed', error: error.message });
  }
};

export const firebaseResetPasswordWithOTP = async (req, res) => {
  try {
    if (!isFirebaseInitialized) {
      return res.status(503).json({ success: false, message: 'Firebase authentication is not configured.' });
    }

    const email = String(req.body?.email || '').trim().toLowerCase();
    const otp = String(req.body?.otp || '').trim();
    const newPassword = String(req.body?.newPassword || '');
    const confirmPassword = String(req.body?.confirmPassword || '');

    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP format' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const connection = await pool.getConnection();
    try {
      const [users] = await connection.execute(
        'SELECT id, firebase_uid, auth_provider FROM users WHERE email = ? LIMIT 1',
        [email]
      );

      if (users.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid OTP or email' });
      }

      const user = users[0];
      if (user.auth_provider !== 'firebase' || !user.firebase_uid) {
        return res.status(400).json({ success: false, message: 'This account does not support Firebase password reset' });
      }

      const verifyResult = await verifyOTP(user.id, otp, OTP_PURPOSES.PASSWORD_RESET);
      if (!verifyResult.success) {
        return res.status(400).json({ success: false, message: verifyResult.message || 'Invalid OTP' });
      }

      await admin.auth().updateUser(user.firebase_uid, { password: newPassword });
      await markOTPAsUsed(user.id, otp, OTP_PURPOSES.PASSWORD_RESET);

      return res.status(200).json({ success: true, message: 'Password reset successful' });
    } finally {
      connection.release();
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Password reset failed', error: error.message });
  }
};
