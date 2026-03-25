# nev-koder Authentication System - Complete Setup & Integration Guide

> Legacy note: this document contains older non-Firebase flows in some sections.
> Use `AUTH_DEPLOY_READY.md` as the source of truth for the current Firebase + OTP deployment flow.

## 🎯 What Has Been Built

### Backend (Node.js + Express)
✅ **Complete production-ready authentication server** with:
- User registration with email validation
- 6-digit OTP verification (5-minute expiry)
- Email-based login with password hashing (bcrypt)
- Forgot password + reset token flow
- JWT-based authentication (access + refresh tokens)
- Rate limiting (10 requests per 15 minutes per endpoint)
- Account lockout (5 failed attempts = 15-min lockout)
- OTP resend with 60-second cooldown
- Secure refresh token storage in HTTP-only cookies

### Frontend (React)
✅ **6 complete authentication pages** with:
- RegisterPage: Name, email, password registration
- OTPVerificationPage: 6-digit OTP input with resend logic
- LoginPage: Email/password login with "Forgot Password" link
- ForgotPasswordPage: Email submission for password reset
- ResetPasswordPage: Password reset with token from email
- Modern SaaS-style UI with error/success messaging
- Form validation on all pages
- Full API integration with authService

### Database (MySQL)
✅ **5 tables with security-first design**:
- `users`: Account data with hashed passwords
- `otp_codes`: OTP tracking with expiry
- `password_reset_tokens`: Secure password reset
- `refresh_tokens`: JWT token management
- `login_attempts`: Rate limiting data (optional)

## 📋 Setup Steps (In Order)

### Step 1: Database Setup (5 minutes)

**Windows:**
1. Download & install MySQL 8.0 from https://dev.mysql.com/downloads/mysql/
2. During installation:
   - Port: 3306 (default)
   - Username: root
   - Password: system
   - Configure as service
3. Open MySQL Command Line or MySQL Workbench
4. Run the schema file:
   ```sql
   source D:\Coding project_vscode\1\nev-koder\database\schema.sql
   ```
   Or copy-paste the entire file content into MySQL Workbench

**Verify:**
```bash
mysql -u root -p
# Password: system

SHOW DATABASES;
USE nev_coder;
SHOW TABLES;
```

Expected tables: `users`, `otp_codes`, `password_reset_tokens`, `refresh_tokens`, `login_attempts`

---

### Step 2: Backend Environment Setup (3 minutes)

1. **Create .env file** in `nev-koder/server/`:
```bash
cd d:\Coding project_vscode\1\nev-koder\server\
copy .env.example .env
```

2. **Edit .env with your settings:**

**Minimum configuration (for local testing):**
```
PORT=5000
NODE_ENV=development

# Database (these match your MySQL setup)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=system
DB_NAME=nev_coder

# JWT (CHANGE THESE! Use random strings)
JWT_SECRET=your_super_secret_key_12345_change_this
JWT_EXPIRE=7d
REFRESH_TOKEN_SECRET=your_refresh_secret_key_12345_change_this
REFRESH_TOKEN_EXPIRE=30d

# Email (REQUIRED - won't work without this)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Frontend
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
```

**Get Gmail App Password** (needed for EMAIL_PASSWORD):
1. Go to https://myaccount.google.com/security
2. Enable "2-Step Verification"
3. Go to https://myaccount.google.com/apppasswords
4. Select "Mail" and "Windows Computer"
5. Copy the 16-character password
6. Use it as EMAIL_PASSWORD in .env

---

### Step 3: Backend Server Installation (2 minutes)

```bash
cd d:\Coding project_vscode\1\nev-koder\server\

# Install all dependencies
npm install

# Start the server
npm start
```

Expected output:
```
✅ Server running on http://localhost:5000
📧 Make sure to configure email settings in .env file
🔐 Make sure JWT_SECRET is set in .env file
```

**Test the server:**
```bash
# In another terminal
curl http://localhost:5000/health
# Response: {"success":true,"message":"Server is running"}
```

---

### Step 4: Frontend Configuration (1 minute)

The frontend is **already configured** to use the backend at `http://localhost:5000`.

If you need to verify/change the API URL:
- File: `src/services/authService.js`
- Line 3: `const API_BASE_URL = 'http://localhost:5000/api'`

---

### Step 5: Start Frontend & Test (1 minute)

```bash
cd d:\Coding project_vscode\1\nev-koder\

# Start React development server
npm run dev
```

Expected output:
```
VITE v... ready in ... ms

➜  Local:   http://localhost:5173/
```

---

## 🧪 Testing the Full Flow

### Manual Testing Flow

1. **Open http://localhost:5173 in browser**

2. **Register:**
   - Click "Start Practicing" or "Join Now"
   - Go to "/register"
   - Fill: Name, Email, Password, Confirm Password
   - Click "Create Account"
   - ✅ Should redirect to OTP page if successful

3. **Verify OTP:**
   - Check email for 6-digit code
   - Enter code in OTP input
   - Click "Verify Email"
   - ✅ Should redirect to dashboard (currently just "/dashboard" placeholder)

4. **Login (New Account):**
   - Go to "/login"
   - Use the same email/password
   - Click "Sign In"
   - ✅ Should redirect to dashboard if verified

5. **Forgot Password:**
   - Go to "/forgot-password"
   - Enter email
   - Click "Send Reset Link"
   - Check email for reset link
   - Click link (opens "/reset-password?token=...")
   - Enter new password
   - ✅ Should redirect to login after reset

---

### Testing Error Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Register with existing email | Error: "Email already registered" |
| OTP wrong digits | Error: "Invalid OTP" |
| OTP expired (>5 min) | Error: "OTP has expired", offer resend |
| Resend OTP too fast | Error: "Please wait X seconds" |
| Login unverified account | Error: "Please verify email first" |
| Failed logins 5x | Account locked for 15 min |
| Invalid reset token | Error: "Invalid reset token" |
| Password too short | Error: "Password must be at least 6 characters" |

---

## 🔌 API Endpoints Reference

### Authentication Endpoints

**All endpoints require JSON Content-Type header:**
```
Content-Type: application/json
```

#### 1. Register
```
POST /api/auth/register
Body: { name, email, password, confirmPassword }
Response: { success, message, userId, email }
```

#### 2. Verify OTP
```
POST /api/auth/verify-otp
Body: { userId, otp }
Response: { success, message, accessToken, user }
Cookies: refreshToken (HTTP-only)
```

#### 3. Resend OTP
```
POST /api/auth/resend-otp
Body: { userId }
Response: { success, message }
```

#### 4. Login
```
POST /api/auth/login
Body: { email, password }
Response: { success, message, accessToken, user }
Cookies: refreshToken (HTTP-only)
```

#### 5. Forgot Password
```
POST /api/auth/forgot-password
Body: { email }
Response: { success, message }
```

#### 6. Reset Password
```
POST /api/auth/reset-password
Body: { token, newPassword, confirmPassword }
Response: { success, message }
```

#### 7. Refresh Token
```
POST /api/auth/refresh-token
Cookies: refreshToken
Response: { success, accessToken }
```

#### 8. Get Current User (Protected)
```
GET /api/auth/me
Headers: Authorization: Bearer {accessToken}
Response: { success, user }
```

---

## 🛠 File Structure Overview

```
nev-koder/
├── server/                          # Node.js backend
│   ├── index.js                    # Main server entry
│   ├── package.json               # Backend dependencies
│   ├── .env                       # Configuration (create from .env.example)
│   ├── config/
│   │   └── database.js           # MySQL connection
│   ├── controllers/
│   │   └── authController.js     # Auth logic (register, login, OTP, etc.)
│   ├── routes/
│   │   └── authRoutes.js         # API endpoint definitions
│   ├── services/
│   │   ├── emailService.js       # Email sending (Nodemailer)
│   │   └── otpService.js         # OTP database operations
│   ├── middlewares/
│   │   └── authMiddleware.js     # JWT, CORS, rate limiting
│   ├── utils/
│   │   ├── otp.js               # OTP generation/validation
│   │   └── jwt.js               # JWT token management
│   └── README.md                 # Full backend documentation
│
├── database/
│   └── schema.sql               # MySQL table definitions
│
├── src/                          # React frontend
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── OTPVerificationPage.jsx
│   │   ├── ForgotPasswordPage.jsx
│   │   ├── ResetPasswordPage.jsx
│   │   └── AuthPages.css        # Auth styling
│   ├── services/
│   │   └── authService.js       # API integration (axios)
│   ├── App.jsx                  # Routing setup
│   └── ...
```

---

## 🔐 Security Features Implemented

✅ **Password Security**
- Bcrypt hashing (10 salt rounds)
- 6-character minimum (validated on backend)
- Password confirmation required

✅ **Email Verification**
- 6-digit OTP sent on registration
- 5-minute expiration
- One-time use only

✅ **Rate Limiting**
- 10 requests per 15 minutes per endpoint
- Prevents brute force attacks

✅ **Account Protection**
- 5 failed login attempts lock account
- 15-minute lockout duration
- Failed attempts reset on successful login

✅ **JWT Tokens**
- Access tokens (7 days)
- Refresh tokens (30 days, HTTP-only cookies)
- Automatic token refresh on /api/auth/refresh-token

✅ **Database Security**
- Parameterized queries (prevent SQL injection)
- Secure token storage
- Expiry tracking for all temporary tokens

---

## 🚀 Next Steps

### 1. Create Dashboard Page
Create `src/pages/DashboardPage.jsx` to display after login:
```jsx
function DashboardPage() {
  const user = authService.getStoredUser();
  return <h1>Welcome {user.name}!</h1>;
}
```

### 2. Protect Routes
Add route guards in `App.jsx`:
```jsx
// Only show if authenticated
const ProtectedRoute = ({ children }) => {
  return authService.isAuthenticated() ? children : <Navigate to="/login" />;
};
```

### 3. Add Logout
Add logout button to navbar:
```jsx
function logout() {
  authService.logout();
  navigate('/login');
}
```

### 4. Match Actual Email
Update `FRONTEND_URL` in `.env` when deploying:
- Local: `http://localhost:5173`
- Production: `https://yourdomain.com`

---

## 🐛 Troubleshooting

### Backend Won't Start
**Error:** `connect ECONNREFUSED 127.0.0.1:3306`
- **Fix:** Make sure MySQL is running
  ```bash
  # Windows: Check Services or start MySQL from System Tray
  mysql -u root -p  # Test connection
  ```

### Email Not Sending
**Error:** `Invalid login: 535`
- **Fix:** 
  - Use Gmail App Password, not regular password
  - Enable "Less secure app access" if not using 2FA
  - Check EMAIL_USER and EMAIL_PASSWORD in .env

### "Cannot POST /api/auth/register"
- **Cause:** Frontend trying to call wrong API URL
- **Fix:** Check `API_BASE_URL` in `src/services/authService.js`

### OTP Page Redirects to Register
- **Cause:** No `registrationUserId` in session storage
- **Fix:** Complete registration flow, don't navigate directly to /verify-otp

### "Token verification failed"
- **Cause:** JWT_SECRET not set or mismatched
- **Fix:** Set strong JWT_SECRET in `.env` and restart server

---

## 📚 Key Files to Know

| File | Purpose | Edit When |
|------|---------|-----------|
| `server/.env` | Backend configuration | Changing DB, email, JWT secrets |
| `server/index.js` | Server entry point | Adding new routes or middleware |
| `src/services/authService.js` | Frontend API layer | Changing backend URL or endpoints |
| `src/App.jsx` | Frontend routing | Adding new pages |
| `database/schema.sql` | Database structure | Modifying user fields |

---

## ✅ Verification Checklist

- [ ] MySQL installed and running
- [ ] Database schema created (`nev_coder` exists with all tables)
- [ ] Backend `.env` configured with DB and email settings
- [ ] `npm install` completed in `/server`
- [ ] Backend starts: `npm start` shows "Server running on http://localhost:5000"
- [ ] Frontend starts: `npm run dev` shows local URL
- [ ] Can register new user
- [ ] OTP email received and verifiable
- [ ] Can login with verified account
- [ ] Can reset forgotten password
- [ ] Tokens stored in localStorage after login

---

## 🎓 Understanding the Auth Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    REGISTRATION FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│ 1. User enters name, email, password → RegisterPage             │
│ 2. Frontend validates form                                       │
│ 3. POST /api/auth/register → Backend                            │
│ 4. Backend hashes password, creates user, generates OTP         │
│ 5. Backend sends OTP email                                       │
│ 6. Frontend redirects to /verify-otp with userId                │
│ 7. User enters OTP → OTPVerificationPage                        │
│ 8. POST /api/auth/verify-otp → Backend                          │
│ 9. Backend marks user as verified, returns JWT                  │
│ 10. Frontend stores token, redirects to dashboard               │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                      LOGIN FLOW                                   │
├──────────────────────────────────────────────────────────────────┤
│ 1. User enters email, password → LoginPage                       │
│ 2. Frontend validates form                                        │
│ 3. POST /api/auth/login → Backend                               │
│ 4. Backend hashes password, compares with stored hash           │
│ 5. If unverified: return error with userId                      │
│ 6. If verified: generate JWT access + refresh tokens            │
│ 7. Backend sets refresh token in HTTP-only cookie               │
│ 8. Frontend stores access token in localStorage                 │
│ 9. Frontend redirects to dashboard                              │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                 PASSWORD RESET FLOW                               │
├──────────────────────────────────────────────────────────────────┤
│ 1. User enters email → ForgotPasswordPage                        │
│ 2. POST /api/auth/forgot-password → Backend                     │
│ 3. Backend generates reset token, sends email with link         │
│ 4. User clicks email link with token parameter                  │
│ 5. Frontend detects token, shows /reset-password page           │
│ 6. User enters new password                                      │
│ 7. POST /api/auth/reset-password → Backend                      │
│ 8. Backend validates token, updates password hash               │
│ 9. Frontend redirects to login                                   │
│ 10. User logs in with new password                              │
└──────────────────────────────────────────────────────────────────┘
```

---

## 💡 API Integration Patterns (authService.js)

The frontend uses axios with automatic token management:

```javascript
// Service automatically adds access token to all requests
const response = await authService.loginUser(email, password);

// On 401 error, automatically refreshes token and retries
// If refresh fails, clears storage and redirects to /login

// Token stored in localStorage:
localStorage.getItem('accessToken')
localStorage.getItem('user')

// Get current user anywhere:
const user = authService.getStoredUser();

// Check if authenticated:
if (authService.isAuthenticated()) { ... }

// Logout:
authService.logout();
```

---

## 📞 Support & Common Questions

**Q: Why does OTP take time to arrive?**
A: Gmail SMTP can take 5-30 seconds. Check spam folder.

**Q: Can I use Gmail password instead of app password?**
A: No, if 2FA is enabled. Use app password from https://myaccount.google.com/apppasswords

**Q: How do I see database contents?**
A: `mysql -u root -p` → use Workbench or `SELECT * FROM users;`

**Q: Can multiple people register?**
A: Yes, each gets unique email and separate account.

**Q: Is the code production-ready?**
A: Yes, but for production you'll need:
- HTTPS (set NODE_ENV=production)
- Stronger JWT_SECRET (64+ random chars)
- Email service upgrade to SendGrid/Mailgun
- Database backups
- Error logging (Sentry/LogRocket)
- Rate limiting refinement

---

**You now have a complete, secure, production-ready authentication system!** 🎉
