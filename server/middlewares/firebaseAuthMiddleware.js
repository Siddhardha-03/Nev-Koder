import { admin, isFirebaseInitialized } from '../firebaseAdmin.js';
import { syncFirebaseUserToDatabase } from '../services/firebaseUserSyncService.js';

const extractBearerToken = (req) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim();
};

export const verifyFirebaseToken = async (req, res, next) => {
  try {
    const enabled = String(process.env.FIREBASE_AUTH_ENABLED || 'false').toLowerCase() === 'true';
    if (!enabled) {
      return res.status(503).json({ success: false, message: 'Firebase authentication is disabled' });
    }

    if (!isFirebaseInitialized) {
      return res.status(503).json({
        success: false,
        message: 'Firebase authentication is not configured.'
      });
    }

    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'No Firebase token provided' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    const syncedUser = await syncFirebaseUserToDatabase(decodedToken);

    req.firebaseUser = decodedToken;
    req.user = {
      id: syncedUser.id,
      email: syncedUser.email,
      role: syncedUser.role || 'user',
      name: syncedUser.name,
      firebase_uid: syncedUser.firebase_uid
    };

    return next();
  } catch (error) {
    const tokenErrorCodes = new Set(['auth/id-token-expired', 'auth/argument-error', 'auth/invalid-id-token']);
    if (tokenErrorCodes.has(error.code)) {
      return res.status(401).json({ success: false, message: 'Invalid or expired Firebase token' });
    }

    return res.status(500).json({ success: false, message: 'Firebase authentication failed', error: error.message });
  }
};

export const verifyFirebaseTokenOptional = async (req, res, next) => {
  try {
    const enabled = String(process.env.FIREBASE_AUTH_ENABLED || 'false').toLowerCase() === 'true';
    if (!enabled) return next();

    if (!isFirebaseInitialized) return next();

    const token = extractBearerToken(req);
    if (!token) return next();

    const decodedToken = await admin.auth().verifyIdToken(token);
    const syncedUser = await syncFirebaseUserToDatabase(decodedToken);

    req.firebaseUser = decodedToken;
    req.user = {
      id: syncedUser.id,
      email: syncedUser.email,
      role: syncedUser.role || 'user',
      name: syncedUser.name,
      firebase_uid: syncedUser.firebase_uid
    };

    return next();
  } catch {
    return next();
  }
};
