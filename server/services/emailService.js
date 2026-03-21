import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const resendApiUrl = 'https://api.resend.com/emails';
const requiredSmtpEnv = ['EMAIL_USER', 'EMAIL_PASSWORD'];

const getMissingSmtpEnv = () => requiredSmtpEnv.filter((key) => !process.env[key]);
const isResendConfigured = () => Boolean(process.env.RESEND_API_KEY && (process.env.EMAIL_FROM || process.env.EMAIL_USER));
const isSmtpConfigured = () => getMissingSmtpEnv().length === 0;

const dedupe = (values) => [...new Set(values.filter(Boolean))];

const parseList = (value) => (value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const getSmtpHosts = () => {
  const configuredHosts = parseList(process.env.EMAIL_HOSTS);
  const primaryHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
  return dedupe([...configuredHosts, primaryHost, 'smtp.gmail.com', 'smtp-relay.gmail.com']);
};

const parsePort = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getSmtpPorts = () => {
  const configuredPorts = parseList(process.env.EMAIL_PORTS)
    .map(parsePort)
    .filter(Boolean);

  const primaryPort = parsePort(process.env.EMAIL_PORT || '');

  return dedupe([...configuredPorts, primaryPort, 465, 587]);
};

const getSmtpTimeouts = () => ({
  connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT_MS || 8000),
  greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT_MS || 8000),
  socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT_MS || 10000)
});

export const getEmailConfigStatus = () => {
  if (isResendConfigured()) {
    return {
      provider: 'resend',
      configured: true,
      missing: []
    };
  }

  return {
    provider: 'smtp',
    configured: isSmtpConfigured(),
    missing: getMissingSmtpEnv()
  };
};

export const isEmailConfigured = () => getEmailConfigStatus().configured;

const createTransporter = ({ host, port }) => {
  const secure = port === 465;
  const timeouts = getSmtpTimeouts();

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,
    ...timeouts,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

const smtpAttempts = async (action) => {
  const hosts = getSmtpHosts();
  const ports = getSmtpPorts();
  const errors = [];

  for (const host of hosts) {
    for (const port of ports) {
      const transporter = createTransporter({ host, port });
      try {
        const result = await action(transporter);
        return { success: true, result, host, port };
      } catch (error) {
        errors.push(`${host}:${port} -> ${error?.code || 'ERROR'} ${error?.message || 'Unknown error'}`);
      }
    }
  }

  return {
    success: false,
    error: errors.join(' | ') || 'All SMTP attempts failed'
  };
};

const ensureEmailConfigured = () => {
  const status = getEmailConfigStatus();
  if (status.configured) {
    return null;
  }

  const errorMessage = `Email service is not configured. Missing env: ${status.missing.join(', ')}`;
  console.error(errorMessage);
  return errorMessage;
};

const sendViaResend = async ({ to, subject, html }) => {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  const response = await fetch(resendApiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.message || payload?.error || `Resend request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
};

const sendViaSmtp = async ({ to, subject, html }) => {
  const attempt = await smtpAttempts((transporter) => transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html
  }));

  if (!attempt.success) {
    throw new Error(attempt.error);
  }
};

const sendEmail = async ({ to, subject, html }) => {
  if (isResendConfigured()) {
    await sendViaResend({ to, subject, html });
    return { success: true, message: 'Email sent successfully via Resend' };
  }

  await sendViaSmtp({ to, subject, html });
  return { success: true, message: 'Email sent successfully via SMTP' };
};

export const verifyEmailTransport = async () => {
  const status = getEmailConfigStatus();

  if (!status.configured) {
    return {
      success: false,
      reason: 'missing_env',
      message: `Missing env: ${status.missing.join(', ')}`
    };
  }

  if (status.provider === 'resend') {
    return {
      success: true,
      reason: 'ok',
      message: 'Resend API configuration detected'
    };
  }

  try {
    const attempt = await smtpAttempts((transporter) => transporter.verify());
    if (!attempt.success) {
      throw new Error(attempt.error);
    }

    return {
      success: true,
      reason: 'ok',
      message: `SMTP connection verified (${attempt.host}:${attempt.port})`
    };
  } catch (error) {
    return {
      success: false,
      reason: 'smtp_error',
      message: error?.message || 'SMTP verification failed'
    };
  }
};

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

    return await sendEmail({
      to: email,
      subject: 'Your OTP for nev-koder Email Verification',
      html: htmlContent
    });
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, message: 'Failed to send email', error: error.message };
  }
};

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

    return await sendEmail({
      to: email,
      subject: 'Reset Your nev-koder Password',
      html: htmlContent
    });
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, message: 'Failed to send email', error: error.message };
  }
};

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

    return await sendEmail({
      to: email,
      subject: 'Welcome to nev-koder!',
      html: htmlContent
    });
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, message: 'Failed to send email', error: error.message };
  }
};

export default createTransporter({ host: process.env.EMAIL_HOST || 'smtp.gmail.com', port: parsePort(process.env.EMAIL_PORT || '587') || 587 });
