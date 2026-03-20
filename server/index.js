import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import executeRoutes from './routes/execute.js';
import { corsMiddleware, errorHandler } from './middlewares/authMiddleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
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
      register: '/api/auth/register',
      login: '/api/auth/login'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/execute', executeRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handling (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📧 Make sure to configure email settings in .env file`);
  console.log(`🔐 Make sure JWT_SECRET is set in .env file`);
});
