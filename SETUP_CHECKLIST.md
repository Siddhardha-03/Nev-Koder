# nev-koder Authentication System - Setup Checklist

## Phase 1: MySQL Database Setup (15 minutes)

- [ ] **Download MySQL 8.0** (if not installed)
  - From: https://dev.mysql.com/downloads/mysql/
  - Port: 3306 (default)
  - Username: root
  - Password: system

- [ ] **Verify MySQL is running**
  ```bash
  mysql -u root -p
  # Password: system
  # Should show: mysql> prompt
  ```

- [ ] **Create nev_coder database and tables**
  ```bash
  mysql -u root -p < database/schema.sql
  # Or: Open database/schema.sql in MySQL Workbench and execute
  ```

- [ ] **Verify tables created**
  ```sql
  USE nev_coder;
  SHOW TABLES;
  -- Expected: users, otp_codes, password_reset_tokens, refresh_tokens, login_attempts
  ```

---

## Phase 2: Backend Configuration (10 minutes)

- [ ] **Create .env file in server/ folder**
  ```bash
  cd nev-koder\server\
  copy .env.example .env
  ```

- [ ] **Get Gmail App Password** (REQUIRED for email)
  - [ ] Go to: https://myaccount.google.com/security
  - [ ] Enable 2-Step Verification (if not already done)
  - [ ] Go to: https://myaccount.google.com/apppasswords
  - [ ] Select: "Mail" and "Windows Computer"
  - [ ] Copy the 16-character password

- [ ] **Edit server/.env with your settings**
  ```
  DB_HOST=localhost
  DB_PORT=3306
  DB_USER=root
  DB_PASSWORD=system
  DB_NAME=nev_coder
  
  EMAIL_HOST=smtp.gmail.com
  EMAIL_PORT=587
  EMAIL_USER=your_email@gmail.com
  EMAIL_PASSWORD=<paste 16-char app password>
  
  JWT_SECRET=generate_random_string_12345_change_this
  REFRESH_TOKEN_SECRET=generate_random_string_12345_change_this
  
  FRONTEND_URL=http://localhost:5173
  ALLOWED_ORIGINS=http://localhost:5173
  ```

- [ ] **Verify .env file saved correctly**
  - Open server/.env in VS Code
  - Confirm all fields have values
  - Save file

---

## Phase 3: Backend Installation & Start (5 minutes)

- [ ] **Install backend dependencies**
  ```bash
  cd nev-koder\server\
  npm install
  # Should see: added X packages in Y seconds
  ```

- [ ] **Start backend server**
  ```bash
  npm start
  # Expected output:
  # ✅ Server running on http://localhost:5000
  # 📧 Make sure to configure email settings in .env file
  # 🔐 Make sure JWT_SECRET is set in .env file
  ```

- [ ] **Test backend health**
  ```bash
  # In new terminal/PowerShell:
  curl http://localhost:5000/health
  # Response: {"success":true,"message":"Server is running"}
  ```

---

## Phase 4: Frontend Verification (2 minutes)

- [ ] **Verify frontend configuration**
  - [ ] Check `src/services/authService.js` line 3:
  - [ ] Should show: `const API_BASE_URL = 'http://localhost:5000/api'`

- [ ] **Start frontend development server**
  ```bash
  cd nev-koder\
  npm run dev
  # Expected: Local: http://localhost:5173/
  ```

- [ ] **Open browser**
  - [ ] Navigate to: http://localhost:5173
  - [ ] Should see landing page with "Start Practicing" button

---

## Phase 5: End-to-End Testing (10 minutes)

### Test 5.1: Registration
- [ ] Click "Start Practicing" button on landing page
- [ ] Redirects to /register page
- [ ] Fill form:
  - Name: "Test User"
  - Email: "test@example.com" (YOUR EMAIL for receiving OTP)
  - Password: "Test123"
  - Confirm: "Test123"
- [ ] Click "Create Account"
- [ ] Should show: "Registration successful" message
- [ ] **Check your email** for 6-digit OTP code
  - May take 5-30 seconds
  - Check spam folder if not found

### Test 5.2: OTP Verification
- [ ] Page should redirect to /verify-otp
- [ ] Should show: "Enter the 6-digit code sent to test@example.com"
- [ ] Copy OTP from email
- [ ] Paste 6 digits into OTP input field
- [ ] Click "Verify Email"
- [ ] Should show: "Email verified successfully!"
- [ ] Should redirect to /dashboard (placeholder)

### Test 5.3: Login
- [ ] Navigate to http://localhost:5173/login
- [ ] Fill form:
  - Email: "test@example.com"
  - Password: "Test123"
- [ ] Click "Sign In"
- [ ] Should show: "Login successful!"
- [ ] Should redirect to /dashboard

### Test 5.4: Password Reset
- [ ] Go to http://localhost:5173/forgot-password
- [ ] Enter: "test@example.com"
- [ ] Click "Send Reset Link"
- [ ] Should show: "If email exists, reset link will be sent"
- [ ] **Check your email** for reset link
- [ ] Click link (opens /reset-password?token=...)
- [ ] Enter new password: "NewTest456"
- [ ] Confirm: "NewTest456"
- [ ] Click "Reset Password"
- [ ] Should redirect to /login
- [ ] Login with new password

---

## Phase 6: Error Testing (Optional - 5 minutes)

Test error cases to verify error handling:

- [ ] **Wrong OTP**: Enter wrong digits → "Invalid OTP" error
- [ ] **Expired OTP**: Wait >5 min, try old code → "OTP has expired"
- [ ] **Reuse OTP**: Try same OTP twice → Error on second attempt
- [ ] **Duplicate Email**: Register twice with same email → "Email already registered"
- [ ] **Wrong Password**: Login with wrong password → "Invalid email or password"
- [ ] **Resend Cooldown**: Try resend twice quickly → "Please wait X seconds"

---

## Troubleshooting

### Issue: "Cannot connect to MySQL"
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
**Solution:**
1. Verify MySQL is running (Check Services or System Tray)
2. Test connection: `mysql -u root -p`
3. Confirm credentials in .env (DB_USER, DB_PASSWORD)

### Issue: "Email not sending"
```
Error: Invalid login: 535 or timeout
```
**Solution:**
1. Verify Gmail app password (not regular password)
2. Go to https://myaccount.google.com/apppasswords
3. Generate new password for Mail/Windows Computer
4. Copy entire 16-character password to EMAIL_PASSWORD in .env
5. Restart backend: npm start

### Issue: "OTP page redirects to register"
```
Reason: No userId in session storage
```
**Solution:**
1. Don't navigate directly to /verify-otp
2. Always go through registration first
3. Should automatically redirect from RegisterPage

### Issue: "CORS error in browser console"
```
Error: Cross-Origin Request Blocked
```
**Solution:**
1. Verify ALLOWED_ORIGINS in server/.env
2. Should include: http://localhost:5173
3. Restart backend server

### Issue: "Cannot POST /api/auth/..."
```
404 Not Found
```
**Solution:**
1. Verify backend is running: http://localhost:5000/health
2. Check API_BASE_URL in src/services/authService.js
3. Should be: http://localhost:5000/api
4. Verify backend routes are registered in server/routes/authRoutes.js

---

## Success Indicators

✅ **When everything is working, you'll see:**

1. **Landing page loads** at http://localhost:5173
2. **Registration works** → form submits → OTP email arrives
3. **OTP page loads** → can enter 6 digits → verifies email
4. **Login works** → can sign in → token stored (check Dev Tools → Application → localStorage → accessToken)
5. **Password reset works** → email link → can set new password
6. **No CORS errors** in browser console
7. **No 500 errors** in backend terminal
8. **Tokens in localStorage** after successful login/verification

---

## What's Ready to Use

### Backend Fully Functional:
✅ User registration with validation
✅ OTP generation and email delivery
✅ Email verification flow
✅ Password hashing with bcrypt
✅ JWT-based authentication
✅ Password reset via email token
✅ Token refresh mechanism
✅ Rate limiting (10 req/15 min)
✅ Account lockout (5 failed = 15 min lock)

### Frontend Fully Functional:
✅ All auth pages with form validation
✅ API integration with authService
✅ Error/success messaging
✅ Loading states on buttons
✅ Form focus and tab order
✅ Session storage for user ID
✅ LocalStorage for tokens
✅ Automatic token refresh

### Database Fully Functional:
✅ 5 security-focused tables
✅ Indexes for performance
✅ Foreign key relationships
✅ Expiry tracking for tokens

---

## Files to Know

| File | What to do | When |
|------|-----------|------|
| server/.env | Edit with your settings | Before npm start |
| src/services/authService.js | Review API integration | Understanding auth |
| database/schema.sql | Execute in MySQL | Initial setup |
| AUTH_SYSTEM_SETUP_GUIDE.md | Read for detailed help | Need more details |
| QUICK_START.md | Quick reference | Quick lookup |

---

## Commands to Remember

```bash
# Database
mysql -u root -p < database/schema.sql     # Create database
mysql -u root -p                            # Connect to MySQL

# Backend
cd nev-koder\server\
npm install                                 # Install dependencies
npm start                                   # Run server
npm run dev                                 # Run with auto-reload (if nodemon installed)

# Frontend
cd nev-koder\
npm run dev                                 # Start dev server
npm run build                               # Build for production
```

---

## Next: Create Dashboard

After verification works, create a protected dashboard page:

```jsx
// src/pages/DashboardPage.jsx
import { useNavigate } from 'react-router-dom'
import * as authService from '../services/authService'

function DashboardPage() {
  const navigate = useNavigate()
  const user = authService.getStoredUser()

  if (!authService.isAuthenticated()) {
    navigate('/login')
  }

  return (
    <div>
      <h1>Welcome {user?.name}!</h1>
      <button onClick={() => {
        authService.logout()
        navigate('/login')
      }}>Logout</button>
    </div>
  )
}

export default DashboardPage
```

Then add to App.jsx:
```jsx
<Route path="/dashboard" element={<DashboardPage />} />
```

---

## ✅ Final Verification

Before considering everything "done":

- [ ] Database created with all 5 tables
- [ ] Backend environment configured (.env has real Gmail app password)
- [ ] Backend runs without errors on port 5000
- [ ] Frontend runs without errors on port 5173
- [ ] Can register with email
- [ ] OTP arrives in email within 30 seconds
- [ ] Can verify OTP
- [ ] Can login with verified email
- [ ] Can reset forgotten password
- [ ] No CORS errors in browser
- [ ] Tokens persist after page refresh
- [ ] All form validation working

**When all boxes are checked, your auth system is fully functional!** 🎉

---

**Questions? Refer to:**
- Detailed setup: [AUTH_SYSTEM_SETUP_GUIDE.md](AUTH_SYSTEM_SETUP_GUIDE.md)
- Quick reference: [QUICK_START.md](QUICK_START.md)
- Backend API: [server/README.md](server/README.md)
