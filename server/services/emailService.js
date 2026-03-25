import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const EMAIL_DELIVERY_MODES = {
  SMTP: 'smtp',
  LOG: 'log',
  DISABLED: 'disabled'
};

const normalizeDeliveryMode = (value) => {
  const normalized = String(value || EMAIL_DELIVERY_MODES.SMTP).trim().toLowerCase();
  if (Object.values(EMAIL_DELIVERY_MODES).includes(normalized)) {
    return normalized;
  }
  return EMAIL_DELIVERY_MODES.SMTP;
};

const emailDeliveryMode = normalizeDeliveryMode(process.env.EMAIL_DELIVERY_MODE);

const emailPort = Number(process.env.EMAIL_PORT || 587);
const emailSecure = String(process.env.EMAIL_SECURE || '').toLowerCase() === 'true' || emailPort === 465;
const emailTimeout = Number(process.env.EMAIL_TIMEOUT_MS || 10000);
const hasSmtpConfig = Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);

// Create transporter only when SMTP mode is active.
const transporter = emailDeliveryMode === EMAIL_DELIVERY_MODES.SMTP
  ? nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: emailPort,
      secure: emailSecure,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      connectionTimeout: emailTimeout,
      greetingTimeout: emailTimeout,
      socketTimeout: emailTimeout
    })
  : null;

export const getEmailDeliveryMode = () => emailDeliveryMode;

const dispatchEmail = async ({ to, subject, html, label, otp }) => {
  if (emailDeliveryMode === EMAIL_DELIVERY_MODES.DISABLED) {
    return {
      success: false,
      deliveryMode: emailDeliveryMode,
      message: 'Email delivery is disabled by configuration.'
    };
  }

  if (emailDeliveryMode === EMAIL_DELIVERY_MODES.LOG) {
    console.log(`[email:${label}] mode=log to=${to} subject="${subject}" otp=${otp || 'n/a'}`);
    return {
      success: true,
      deliveryMode: emailDeliveryMode,
      message: 'OTP generated successfully. Email is in log mode for local development.'
    };
  }

  if (!hasSmtpConfig || !transporter) {
    return {
      success: false,
      deliveryMode: emailDeliveryMode,
      message: 'SMTP configuration is incomplete. Set EMAIL_HOST, EMAIL_USER, and EMAIL_PASSWORD.'
    };
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    });

    return {
      success: true,
      deliveryMode: emailDeliveryMode,
      message: 'Email sent successfully.'
    };
  } catch (error) {
    console.error(`Email send error [${label}]:`, error);
    return {
      success: false,
      deliveryMode: emailDeliveryMode,
      message: 'Failed to send email',
      error: error.message
    };
  }
};

export const verifyEmailTransporter = async () => {
  if (emailDeliveryMode === EMAIL_DELIVERY_MODES.LOG) {
    return {
      success: true,
      message: 'Email delivery mode is LOG. OTPs will be printed in server logs.'
    };
  }

  if (emailDeliveryMode === EMAIL_DELIVERY_MODES.DISABLED) {
    return {
      success: false,
      message: 'Email delivery mode is DISABLED. OTP email flows will not work.'
    };
  }

  if (!hasSmtpConfig || !transporter) {
    return {
      success: false,
      message: 'Email configuration is incomplete. Set EMAIL_HOST, EMAIL_USER, and EMAIL_PASSWORD.'
    };
  }

  try {
    await transporter.verify();
    return { success: true, message: 'SMTP connection verified' };
  } catch (error) {
    return { success: false, message: `SMTP verification failed: ${error.message}` };
  }
};

// Send OTP email
export const sendOTPEmail = async (email, otp, name) => {
  try {
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

    return await dispatchEmail({
      to: email,
      subject: 'Your OTP for nev-koder Email Verification',
      html: htmlContent,
      label: 'registration-otp',
      otp
    });
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, deliveryMode: emailDeliveryMode, message: 'Failed to send email', error: error.message };
  }
};

// Send password reset OTP email
export const sendPasswordResetOTPEmail = async (email, otp, name) => {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Reset Your Password</h2>
        <p>Hi ${name},</p>
        <p>Use this one-time password (OTP) to reset your password:</p>
        <div style="background-color: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #007bff;">${otp}</span>
        </div>
        <p>This OTP will expire in 5 minutes. Do not share this code with anyone.</p>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">nev-koder Platform</p>
      </div>
    `;

    return await dispatchEmail({
      to: email,
      subject: 'Your OTP for nev-koder Password Reset',
      html: htmlContent,
      label: 'password-reset-otp',
      otp
    });
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, deliveryMode: emailDeliveryMode, message: 'Failed to send email', error: error.message };
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email, resetToken, name) => {
  try {
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

    return await dispatchEmail({
      to: email,
      subject: 'Reset Your nev-koder Password',
      html: htmlContent,
      label: 'password-reset-link'
    });
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, deliveryMode: emailDeliveryMode, message: 'Failed to send email', error: error.message };
  }
};

// Send welcome email
export const sendWelcomeEmail = async (email, name) => {
  try {
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

    return await dispatchEmail({
      to: email,
      subject: 'Welcome to nev-koder!',
      html: htmlContent,
      label: 'welcome'
    });
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, deliveryMode: emailDeliveryMode, message: 'Failed to send email', error: error.message };
  }
};

export default transporter;
