import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import fileUpload from 'express-fileupload';
import authRoutes from './routes/authRoutes.js';
import executeRoutes from './routes/execute.js';
import questionRoutes from './routes/questions.js';
import learningPathRoutes from './routes/learningPaths.js';
import { corsMiddleware, errorHandler } from './middlewares/authMiddleware.js';
import pool from './config/database.js';
import { isFirebaseInitialized } from './firebaseAdmin.js';
import { verifyEmailTransporter } from './services/emailService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Required when running behind reverse proxies (e.g., Nginx on DigitalOcean).
const trustProxyValue = process.env.TRUST_PROXY;
if (trustProxyValue === 'true') {
  app.set('trust proxy', true);
} else if (trustProxyValue && !Number.isNaN(Number(trustProxyValue))) {
  app.set('trust proxy', Number(trustProxyValue));
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(fileUpload({ limits: { fileSize: 50 * 1024 * 1024 } })); // 50MB limit
app.use(corsMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    services: {
      firebaseAuthEnabled: String(process.env.FIREBASE_AUTH_ENABLED || 'false').toLowerCase() === 'true',
      firebaseInitialized: isFirebaseInitialized,
      emailHostConfigured: Boolean(process.env.EMAIL_HOST),
      emailUserConfigured: Boolean(process.env.EMAIL_USER)
    }
  });
});

// Root endpoint for quick API discovery
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'nev-koder auth API is running',
    endpoints: {
      health: '/health',
      authBase: '/api/auth',
      execute: '/api/execute',
      executePreview: '/api/execute/preview',
      questions: '/api/questions',
      publicQuestions: '/api/questions/public',
      firebaseSync: '/api/auth/firebase/sync',
      requestRegistrationOtp: '/api/auth/firebase/register/request-otp',
      verifyRegistrationOtp: '/api/auth/firebase/register/verify-otp',
      forgotPassword: '/api/auth/forgot-password',
      resetPassword: '/api/auth/reset-password'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/execute', executeRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/learning-paths', learningPathRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handling (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  let smtpStatus = { success: false, message: 'SMTP check not run' };

  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ DB connected');
  } catch (error) {
    console.error(`❌ DB connection failed: ${error.message}`);
  }

  smtpStatus = await verifyEmailTransporter();
  if (smtpStatus.success) {
    console.log('✅ SMTP connected');
  } else {
    console.warn(`⚠️ SMTP check failed: ${smtpStatus.message}`);
  }

  if (String(process.env.FIREBASE_AUTH_ENABLED || 'false').toLowerCase() === 'true') {
    if (isFirebaseInitialized) {
      console.log('✅ Firebase Admin initialized');
    } else {
      console.warn('⚠️ Firebase auth is enabled but Firebase Admin is not initialized');
    }
  }

  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📧 Email status: ${smtpStatus.success ? 'ready' : 'check configuration'}`);
    console.log(`🔐 Make sure JWT_SECRET is set in .env file`);
  });
};

startServer();
