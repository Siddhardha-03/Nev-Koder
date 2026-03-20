import express from 'express';
import rateLimit from 'express-rate-limit';
import { executeCode, previewWrappedCode, submitSolution, runTestCase } from '../controllers/executeController.js';
import { verifyToken, verifyTokenOptional, requireAdmin } from '../middlewares/authMiddleware.js';

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
router.post('/preview', executeLimiter, verifyToken, requireAdmin, previewWrappedCode);
router.post('/run', executeLimiter, runTestCase);
router.post('/submit', executeLimiter, verifyTokenOptional, submitSolution);

export default router;
