import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let isFirebaseInitialized = false;

const initializeFirebaseAdmin = () => {
  if (isFirebaseInitialized) return;

  try {
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
      console.log('✅ Firebase Admin initialized with project ID');
      return;
    }

    console.warn('⚠️ Firebase Admin not initialized: missing service account and FIREBASE_PROJECT_ID');
  } catch (error) {
    console.error(`❌ Firebase Admin initialization failed: ${error.message}`);
  }
};

initializeFirebaseAdmin();

export { admin, isFirebaseInitialized };
