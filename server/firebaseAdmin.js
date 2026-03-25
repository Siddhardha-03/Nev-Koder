import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let isFirebaseInitialized = false;

const parseServiceAccountFromEnv = () => {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawJson) {
    const parsed = JSON.parse(rawJson);
    if (parsed.private_key && parsed.private_key.includes('\\n')) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return parsed;
  }

  const base64Json = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (base64Json) {
    const decoded = Buffer.from(base64Json, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    if (parsed.private_key && parsed.private_key.includes('\\n')) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return parsed;
  }

  return null;
};

const initializeFirebaseAdmin = () => {
  if (isFirebaseInitialized) return;

  try {
    const envServiceAccount = parseServiceAccountFromEnv();
    if (envServiceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(envServiceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || envServiceAccount.project_id
      });
      isFirebaseInitialized = true;
      console.log('✅ Firebase Admin initialized with environment service account');
      return;
    }

    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
      ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
      : path.join(__dirname, 'config', 'serviceAccountKey.json');

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
      });
      isFirebaseInitialized = true;
      console.log('✅ Firebase Admin initialized with service account');
      return;
    }

    if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID
      });
      isFirebaseInitialized = true;
      console.log('✅ Firebase Admin initialized with project ID (ADC fallback)');
      return;
    }

    console.warn('⚠️ Firebase Admin not initialized: missing service account and FIREBASE_PROJECT_ID');
  } catch (error) {
    console.error(`❌ Firebase Admin initialization failed: ${error.message}`);
  }
};

initializeFirebaseAdmin();

export { admin, isFirebaseInitialized };
