# Firebase + OTP Authentication Deploy Ready Guide

This guide reflects the current implementation in nev-koder:
- Firebase Authentication (email/password + Google)
- OTP verification required during registration
- OTP-based forgot password reset
- Backend session JWT + refresh token cookie

## 1. Current Auth Endpoints

Base: /api/auth

- POST /firebase/sync
- GET /firebase/me
- POST /firebase/register/request-otp
- POST /firebase/register/verify-otp
- POST /firebase/register/resend-otp
- POST /forgot-password
- POST /reset-password
- POST /refresh-token
- GET /me
- GET /dashboard/stats

## 2. Backend Environment Map (Production)

Set these in your backend deployment service:

- PORT=5000
- NODE_ENV=production
- TRUST_PROXY=1

- DB_HOST=<your-db-host>
- DB_PORT=3306
- DB_USER=<your-db-user>
- DB_PASSWORD=<your-db-password>
- DB_NAME=nev_coder

- JWT_SECRET=<strong-random-secret>
- JWT_EXPIRE=7d
- REFRESH_TOKEN_SECRET=<strong-random-secret>
- REFRESH_TOKEN_EXPIRE=30d

- FIREBASE_AUTH_ENABLED=true
- FIREBASE_PROJECT_ID=nev-koder

Choose one Firebase admin credential method:

1) File-based
- FIREBASE_SERVICE_ACCOUNT_PATH=./config/serviceAccountKey.json

2) Raw JSON env
- FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

3) Base64 JSON env
- FIREBASE_SERVICE_ACCOUNT_BASE64=<base64-encoded-service-account-json>

Email/OTP delivery (production):
- EMAIL_DELIVERY_MODE=smtp
- EMAIL_HOST=<smtp-host>
- EMAIL_PORT=587
- EMAIL_SECURE=false
- EMAIL_USER=<smtp-user>
- EMAIL_PASSWORD=<smtp-password>
- EMAIL_TIMEOUT_MS=10000

OTP/security:
- OTP_EXPIRE_MINUTES=5
- OTP_RESEND_COOLDOWN_SECONDS=60
- MAX_LOGIN_ATTEMPTS=5
- LOCKOUT_DURATION_MINUTES=15

CORS/runtime:
- FRONTEND_URL=https://<your-frontend-domain>
- ALLOWED_ORIGINS=https://<your-frontend-domain>
- JUDGE0_BASE_URL=https://ce.judge0.com

## 3. Backend Environment Map (Local Development)

Use these local differences:

- NODE_ENV=development
- FRONTEND_URL=http://localhost:5174
- ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
- EMAIL_DELIVERY_MODE=log

In log mode, OTP is printed in backend logs. This keeps registration/forgot-password testable even without SMTP.

## 4. Frontend Environment Map

Set in client environment:

- VITE_API_BASE_URL=/api (local with proxy) or https://<backend-domain>/api (production)
- VITE_FIREBASE_API_KEY=<firebase-web-api-key>
- VITE_FIREBASE_AUTH_DOMAIN=nev-koder.firebaseapp.com
- VITE_FIREBASE_PROJECT_ID=nev-koder
- VITE_FIREBASE_STORAGE_BUCKET=nev-koder.firebasestorage.app
- VITE_FIREBASE_MESSAGING_SENDER_ID=688864534761
- VITE_FIREBASE_APP_ID=1:688864534761:web:2438c1badf2f55d30a5078
- VITE_FIREBASE_MEASUREMENT_ID=G-L7Y0CPBFDK

## 5. Database Readiness Checks

Ensure these schema requirements exist before deployment:

users table:
- firebase_uid
- auth_provider
- is_verified
- last_otp_sent_at

otp_codes table:
- purpose
- is_used
- expires_at

Also ensure refresh_tokens table exists for refresh flow.

## 6. Smoke Test Checklist

After deployment, verify in this order:

1) GET /health returns success and firebaseInitialized=true
2) Register a new email/password user in frontend
3) Request OTP during registration and verify OTP
4) Login with email/password after verification
5) Forgot password for existing user
6) Reset password with OTP
7) Login with new password

## 7. Security Notes

- Never commit server .env or service account JSON.
- Rotate Firebase service account keys immediately if exposed.
- Use a transactional SMTP provider in production for reliable OTP delivery.
- Keep EMAIL_DELIVERY_MODE=smtp in production and log only for local dev.
