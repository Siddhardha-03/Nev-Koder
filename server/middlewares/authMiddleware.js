import { verifyAccessToken } from '../utils/jwt.js';

// Middleware to verify JWT token
export const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer token

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token verification failed', error: error.message });
  }
};

// Optional auth middleware: attaches req.user when token is valid.
export const verifyTokenOptional = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Invalid authorization header format' });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token verification failed', error: error.message });
  }
};

// Middleware to verify admin access
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  next();
};

// Rate limiting middleware
export const rateLimitMiddleware = (maxRequests = 5, windowMs = 15 * 60 * 1000) => {
  const clients = new Map();

  return (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!clients.has(clientIp)) {
      clients.set(clientIp, { requests: [], blocked: false });
    }

    const client = clients.get(clientIp);

    // Clean old requests
    client.requests = client.requests.filter(time => now - time < windowMs);

    if (client.requests.length >= maxRequests) {
      client.blocked = true;
      return res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' });
    }

    client.requests.push(now);
    next();
  };
};

// CORS middleware
export const corsMiddleware = (req, res, next) => {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const origin = req.headers.origin;

  const isWildcardMatch = (value, pattern) => {
    if (!pattern.includes('*')) return value === pattern;

    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');

    return new RegExp(`^${escaped}$`).test(value);
  };

  const isTrustedRenderOrigin = (value) => /^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(value);

  const isAllowedOrigin = origin
    ? allowedOrigins.some((allowedOrigin) => isWildcardMatch(origin, allowedOrigin)) || isTrustedRenderOrigin(origin)
    : false;

  if (isAllowedOrigin) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
};

// Error handling middleware
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? err : undefined
  });
};
