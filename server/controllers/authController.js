import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import { generateOTP } from '../utils/otp.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { sendOTPEmail, sendWelcomeEmail, sendPasswordResetEmail } from '../services/emailService.js';
import { createOTP, verifyOTP, markOTPAsUsed, checkOTPResendCooldown, updateLastOTPSentTime } from '../services/otpService.js';
import { v4 as uuidv4 } from 'uuid';

// Helper: Check if account is locked
const checkAccountLock = async (userId) => {
  try {
    const connection = await pool.getConnection();
    const query = 'SELECT locked_until FROM users WHERE id = ?';
    const [rows] = await connection.execute(query, [userId]);
    connection.release();

    if (rows.length === 0) return false;

    const lockedUntil = rows[0].locked_until;
    if (lockedUntil && new Date() < new Date(lockedUntil)) {
      return true;
    }

    // Unlock if time has passed
    if (lockedUntil && new Date() > new Date(lockedUntil)) {
      const connection2 = await pool.getConnection();
      await connection2.execute('UPDATE users SET locked_until = NULL, failed_login_attempts = 0 WHERE id = ?', [userId]);
      connection2.release();
    }

    return false;
  } catch (error) {
    console.error('Error checking account lock:', error);
    return true; // Fail safe
  }
};

// Helper: Lock account after failed attempts
const lockAccount = async (userId) => {
  try {
    const connection = await pool.getConnection();
    const lockoutMinutes = parseInt(process.env.LOCKOUT_DURATION_MINUTES) || 15;
    const lockedUntil = new Date(Date.now() + lockoutMinutes * 60000);

    const query = 'UPDATE users SET locked_until = ?, failed_login_attempts = 0 WHERE id = ?';
    await connection.execute(query, [lockedUntil, userId]);
    connection.release();
  } catch (error) {
    console.error('Error locking account:', error);
  }
};

// Register user
export const register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    const connection = await pool.getConnection();

    // Check if email already exists
    const [existingUsers] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);

    if (existingUsers.length > 0) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const insertQuery = 'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)';
    const [result] = await connection.execute(insertQuery, [name, email, passwordHash]);

    const userId = result.insertId;

    // Generate and save OTP
    const otpResult = await createOTP(userId);
    if (!otpResult.success) {
      connection.release();
      return res.status(500).json({ success: false, message: 'Failed to generate OTP' });
    }

    // Update last OTP sent time
    await updateLastOTPSentTime(userId);

    // Send OTP email
    const emailResult = await sendOTPEmail(email, otpResult.otp, name);

    connection.release();

    if (!emailResult.success) {
      console.warn('Failed to send OTP email:', emailResult.error);
      // Continue anyway, user can request resend
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email for OTP.',
      userId,
      email
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
  }
};

// Verify OTP
export const verifyOTPCode = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ success: false, message: 'User ID and OTP are required' });
    }

    // Verify OTP format
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP format' });
    }

    const connection = await pool.getConnection();

    // Get user info
    const [users] = await connection.execute('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = users[0];

    // Verify OTP
    const verifyResult = await verifyOTP(userId, otp);
    if (!verifyResult.success) {
      connection.release();
      return res.status(400).json({ success: false, message: verifyResult.message });
    }

    // Mark OTP as used
    await markOTPAsUsed(userId, otp);

    // Update user as verified
    await connection.execute('UPDATE users SET is_verified = TRUE WHERE id = ?', [userId]);

    connection.release();

    // Send welcome email
    await sendWelcomeEmail(user.email, user.name);

    // Generate tokens
    const accessToken = generateAccessToken(userId, user.email);
    const refreshToken = generateRefreshToken(userId);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ success: false, message: 'OTP verification failed', error: error.message });
  }
};

// Resend OTP
export const resendOTP = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const connection = await pool.getConnection();

    // Get user
    const [users] = await connection.execute('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = users[0];

    // Check cooldown
    const cooldownResult = await checkOTPResendCooldown(userId);
    if (!cooldownResult.canResend) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${cooldownResult.remainingSeconds} seconds before requesting a new OTP`
      });
    }

    // Generate new OTP
    const otpResult = await createOTP(userId);
    if (!otpResult.success) {
      connection.release();
      return res.status(500).json({ success: false, message: 'Failed to generate OTP' });
    }

    // Update last OTP sent time
    await updateLastOTPSentTime(userId);

    // Send OTP email
    const emailResult = await sendOTPEmail(user.email, otpResult.otp, user.name);

    connection.release();

    if (!emailResult.success) {
      return res.status(500).json({ success: false, message: 'Failed to send OTP email', error: emailResult.error });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully'
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ success: false, message: 'Resend OTP failed', error: error.message });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const connection = await pool.getConnection();

    // Get user
    const [users] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      connection.release();
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = users[0];

    // Check if user is verified
    if (!user.is_verified) {
      connection.release();
      return res.status(403).json({
        success: false,
        message: 'Please verify your email first',
        userId: user.id
      });
    }

    // Check account lock
    const isLocked = await checkAccountLock(user.id);
    if (isLocked) {
      connection.release();
      return res.status(429).json({ success: false, message: 'Account locked due to too many failed login attempts. Try again later.' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      // Increment failed attempts
      const newAttempts = user.failed_login_attempts + 1;
      const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;

      if (newAttempts >= maxAttempts) {
        await lockAccount(user.id);
        connection.release();
        return res.status(429).json({ success: false, message: 'Account locked due to too many failed login attempts' });
      }

      await connection.execute('UPDATE users SET failed_login_attempts = ? WHERE id = ?', [newAttempts, user.id]);
      connection.release();

      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Reset failed attempts on successful login
    await connection.execute('UPDATE users SET failed_login_attempts = 0 WHERE id = ?', [user.id]);

    connection.release();

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);

    // Save refresh token in database
    const saveTokenConnection = await pool.getConnection();
    const expiryTime = new Date();
    expiryTime.setDate(expiryTime.getDate() + 30);
    await saveTokenConnection.execute(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, refreshToken, expiryTime]
    );
    saveTokenConnection.release();

    // Set refresh token in secure HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed', error: error.message });
  }
};

// Forgot password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const connection = await pool.getConnection();

    // Get user
    const [users] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      // Don't reveal if email exists (security)
      connection.release();
      return res.status(200).json({ success: true, message: 'If email exists, reset link will be sent' });
    }

    const user = users[0];

    // Generate reset token
    const resetToken = uuidv4();
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + 1); // 1 hour expiry

    // Save reset token
    await connection.execute(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, resetToken, expiryTime]
    );

    connection.release();

    // Send reset email
    const emailResult = await sendPasswordResetEmail(user.email, resetToken, user.name);

    if (!emailResult.success) {
      return res.status(500).json({ success: false, message: 'Failed to send reset email' });
    }

    res.status(200).json({ success: true, message: 'If email exists, reset link will be sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Forgot password failed', error: error.message });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const connection = await pool.getConnection();

    // Get reset token
    const [tokens] = await connection.execute(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND is_used = FALSE',
      [token]
    );

    if (tokens.length === 0) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Invalid reset token' });
    }

    const resetToken = tokens[0];

    // Check if token is expired
    if (new Date() > new Date(resetToken.expires_at)) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Reset token has expired' });
    }

    // Update password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await connection.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, resetToken.user_id]);

    // Mark token as used
    await connection.execute('UPDATE password_reset_tokens SET is_used = TRUE WHERE id = ?', [resetToken.id]);

    connection.release();

    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Password reset failed', error: error.message });
  }
};

// Refresh token
export const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token not found' });
    }

    const connection = await pool.getConnection();

    // Check if token exists and is not revoked
    const [tokens] = await connection.execute(
      'SELECT * FROM refresh_tokens WHERE token = ? AND is_revoked = FALSE',
      [refreshToken]
    );

    if (tokens.length === 0) {
      connection.release();
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const tokenRecord = tokens[0];

    // Check if token is expired
    if (new Date() > new Date(tokenRecord.expires_at)) {
      connection.release();
      return res.status(401).json({ success: false, message: 'Refresh token expired' });
    }

    // Get user details
    const [users] = await connection.execute('SELECT * FROM users WHERE id = ?', [tokenRecord.user_id]);

    connection.release();

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = users[0];

    // Generate new access token
    const newAccessToken = generateAccessToken(user.id, user.email);

    res.status(200).json({
      success: true,
      accessToken: newAccessToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ success: false, message: 'Token refresh failed', error: error.message });
  }
};
