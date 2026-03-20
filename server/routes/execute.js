import express from 'express';
import rateLimit from 'express-rate-limit';
import { executeCode } from '../controllers/executeController.js';

const router = express.Router();
const executeWindowMs = Number(process.env.EXECUTE_RATE_LIMIT_WINDOW_MS || 60 * 1000);
const executeMax = Number(process.env.EXECUTE_RATE_LIMIT_MAX || (process.env.NODE_ENV === 'production' ? 60 : 300));

const executeLimiter = rateLimit({
  windowMs: executeWindowMs,
  max: executeMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many execute requests. Please wait a minute and try again.'
  }
});

router.post('/', executeLimiter, executeCode);

export default router;
