import pool from '../config/database.js';
import { generateOTP, isOTPExpired } from '../utils/otp.js';

// Create a new OTP
export const createOTP = async (userId) => {
  try {
    const connection = await pool.getConnection();
    
    // Mark previous unused OTP as expired
    const otp = generateOTP();
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + (parseInt(process.env.OTP_EXPIRE_MINUTES) || 5));

    // Insert new OTP
    const query = 'INSERT INTO otp_codes (user_id, otp_code, expires_at) VALUES (?, ?, ?)';
    await connection.execute(query, [userId, otp, expiryTime]);

    connection.release();
    return { success: true, otp };
  } catch (error) {
    console.error('Error creating OTP:', error);
    return { success: false, error: error.message };
  }
};

// Verify OTP
export const verifyOTP = async (userId, otp) => {
  try {
    const connection = await pool.getConnection();

    const query = `
      SELECT * FROM otp_codes 
      WHERE user_id = ? AND otp_code = ? AND is_used = FALSE 
      ORDER BY created_at DESC LIMIT 1
    `;
    const [rows] = await connection.execute(query, [userId, otp]);

    connection.release();

    if (rows.length === 0) {
      return { success: false, message: 'Invalid OTP' };
    }

    const otpRecord = rows[0];

    // Check if OTP is expired
    if (isOTPExpired(otpRecord.expires_at)) {
      return { success: false, message: 'OTP has expired' };
    }

    return { success: true, message: 'OTP is valid' };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { success: false, error: error.message };
  }
};

// Mark OTP as used
export const markOTPAsUsed = async (userId, otp) => {
  try {
    const connection = await pool.getConnection();

    const query = `
      UPDATE otp_codes 
      SET is_used = TRUE 
      WHERE user_id = ? AND otp_code = ? AND is_used = FALSE
    `;
    await connection.execute(query, [userId, otp]);

    connection.release();
    return { success: true };
  } catch (error) {
    console.error('Error marking OTP as used:', error);
    return { success: false, error: error.message };
  }
};

// Check OTP resend cooldown
export const checkOTPResendCooldown = async (userId) => {
  try {
    const connection = await pool.getConnection();

    const query = `
      SELECT last_otp_sent_at FROM users WHERE id = ?
    `;
    const [rows] = await connection.execute(query, [userId]);

    connection.release();

    if (rows.length === 0) {
      return { canResend: true };
    }

    const lastSentAt = rows[0].last_otp_sent_at;
    if (!lastSentAt) {
      return { canResend: true };
    }

    const cooldownSeconds = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60;
    const timeDiff = (new Date() - new Date(lastSentAt)) / 1000;

    if (timeDiff < cooldownSeconds) {
      return { canResend: false, remainingSeconds: Math.ceil(cooldownSeconds - timeDiff) };
    }

    return { canResend: true };
  } catch (error) {
    console.error('Error checking OTP resend cooldown:', error);
    return { success: false, error: error.message };
  }
};

// Update last OTP sent time
export const updateLastOTPSentTime = async (userId) => {
  try {
    const connection = await pool.getConnection();

    const query = `
      UPDATE users SET last_otp_sent_at = NOW() WHERE id = ?
    `;
    await connection.execute(query, [userId]);

    connection.release();
    return { success: true };
  } catch (error) {
    console.error('Error updating last OTP sent time:', error);
    return { success: false, error: error.message };
  }
};

// Get latest OTP for user
export const getLatestOTP = async (userId) => {
  try {
    const connection = await pool.getConnection();

    const query = `
      SELECT * FROM otp_codes 
      WHERE user_id = ? 
      ORDER BY created_at DESC LIMIT 1
    `;
    const [rows] = await connection.execute(query, [userId]);

    connection.release();

    if (rows.length === 0) {
      return { success: false, message: 'No OTP found' };
    }

    return { success: true, otpRecord: rows[0] };
  } catch (error) {
    console.error('Error getting latest OTP:', error);
    return { success: false, error: error.message };
  }
};
