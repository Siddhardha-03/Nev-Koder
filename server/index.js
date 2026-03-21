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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(fileUpload({ limits: { fileSize: 50 * 1024 * 1024 } })); // 50MB limit
app.use(corsMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
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
      register: '/api/auth/register',
      login: '/api/auth/login'
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
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ DB connected');
  } catch (error) {
    console.error(`❌ DB connection failed: ${error.message}`);
  }

  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📧 Make sure to configure email settings in .env file`);
    console.log(`🔐 Make sure JWT_SECRET is set in .env file`);
  });
};

startServer();
