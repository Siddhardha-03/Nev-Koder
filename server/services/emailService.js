import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const requiredEmailEnv = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASSWORD'];

const getMissingEmailEnv = () => requiredEmailEnv.filter((key) => !process.env[key]);

export const isEmailConfigured = () => getMissingEmailEnv().length === 0;

export const getEmailConfigStatus = () => ({
  configured: isEmailConfigured(),
  missing: getMissingEmailEnv()
});

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 587),
  secure: Number(process.env.EMAIL_PORT || 587) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const ensureEmailConfigured = () => {
  const status = getEmailConfigStatus();
  if (status.configured) {
    return null;
  }

  const errorMessage = `Email service is not configured. Missing env: ${status.missing.join(', ')}`;
  console.error(errorMessage);
  return errorMessage;
};

// Send OTP email
export const sendOTPEmail = async (email, otp, name) => {
  try {
    const configError = ensureEmailConfigured();
    if (configError) {
      return { success: false, message: configError, error: configError };
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verify Your Email</h2>
        <p>Hi ${name},</p>
        <p>Your one-time password (OTP) is:</p>
        <div style="background-color: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #007bff;">${otp}</span>
        </div>
        <p>This OTP will expire in 5 minutes. Do not share this code with anyone.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">nev-koder Platform</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP for nev-koder Email Verification',
      html: htmlContent
    });

    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, message: 'Failed to send email', error: error.message };
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email, resetToken, name) => {
  try {
    const configError = ensureEmailConfigured();
    if (configError) {
      return { success: false, message: configError, error: configError };
    }

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Reset Your Password</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset your password. Click the button below to reset it:</p>
        <div style="margin: 20px 0;">
          <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p>Or copy this link: <a href="${resetLink}">${resetLink}</a></p>
        <p>This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">nev-koder Platform</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Reset Your nev-koder Password',
      html: htmlContent
    });

    return { success: true, message: 'Password reset email sent successfully' };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, message: 'Failed to send email', error: error.message };
  }
};

// Send welcome email
export const sendWelcomeEmail = async (email, name) => {
  try {
    const configError = ensureEmailConfigured();
    if (configError) {
      return { success: false, message: configError, error: configError };
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to nev-koder!</h2>
        <p>Hi ${name},</p>
        <p>Your account has been verified and is ready to use. You can now:</p>
        <ul>
          <li>Access all coding challenges and problems</li>
          <li>Track your progress and analytics</li>
          <li>Compete in contests and earn badges</li>
          <li>Join our community of coders</li>
        </ul>
        <div style="margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL}" style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Get Started</a>
        </div>
        <p>Happy coding!</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">nev-koder Platform</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to nev-koder!',
      html: htmlContent
    });

    return { success: true, message: 'Welcome email sent successfully' };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, message: 'Failed to send email', error: error.message };
  }
};

export default transporter;
