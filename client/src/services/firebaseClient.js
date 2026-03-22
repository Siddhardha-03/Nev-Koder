import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

const firebaseConfigError = missingKeys.length > 0
  ? `Missing Firebase configuration: ${missingKeys.join(', ')}`
  : null;

const app = firebaseConfigError
  ? null
  : (getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig));

const auth = app ? getAuth(app) : null;

export { app, auth, firebaseConfigError };
