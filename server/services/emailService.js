import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const getEmailDeliveryMode = () => {
  const mode = String(process.env.EMAIL_DELIVERY_MODE || 'smtp').toLowerCase();
  if (mode === 'disabled' || mode === 'log' || mode === 'brevo_api') return mode;
  return 'smtp';
};

const sendViaBrevoApi = async ({ to, subject, html }) => {
  const apiKey = String(process.env.BREVO_API_KEY || '').trim();
  const senderEmail = String(process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || '').trim();
  const senderName = String(process.env.BREVO_SENDER_NAME || 'nev-koder').trim();

  if (!apiKey) {
    throw new Error('BREVO_API_KEY is required when EMAIL_DELIVERY_MODE=brevo_api');
  }

  if (!senderEmail) {
    throw new Error('BREVO_SENDER_EMAIL or EMAIL_USER is required when EMAIL_DELIVERY_MODE=brevo_api');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail
      },
      to: [{ email: to }],
      subject,
      htmlContent: html
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Brevo API failed (${response.status}): ${body}`);
  }
};

const dispatchEmail = async ({ to, subject, html }) => {
  const mode = getEmailDeliveryMode();

  if (mode === 'disabled') {
    console.log(`[email:${mode}] Skipped outbound email`, { to, subject });
    return { success: true, message: 'Email delivery disabled by configuration' };
  }

  if (mode === 'log') {
    console.log(`[email:${mode}] Email captured`, {
      to,
      subject,
      preview: String(html || '').slice(0, 180)
    });
    return { success: true, message: 'Email logged only (not sent)' };
  }

  if (mode === 'brevo_api') {
    await sendViaBrevoApi({ to, subject, html });
    return { success: true, message: 'Email sent successfully via Brevo API' };
  }

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html
  });

  return { success: true, message: 'Email sent successfully' };
};

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

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
      html: htmlContent
    });
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, message: 'Failed to send email', error: error.message };
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
      html: htmlContent
    });
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, message: 'Failed to send email', error: error.message };
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
      html: htmlContent
    });
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, message: 'Failed to send email', error: error.message };
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
      html: htmlContent
    });
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, message: 'Failed to send email', error: error.message };
  }
};

export default transporter;
