# nev-koder Backend Authentication System - Setup Guide

## Overview
Complete backend authentication system with registration, email OTP verification, JWT login, password reset, rate limiting, and account lockout protection.

## Project Structure
```
server/
├── index.js                    # Main express server
├── package.json               # Node dependencies
├── .env.example              # Environment template
├── config/
│   └── database.js           # MySQL connection pool
├── controllers/
│   └── authController.js     # Auth business logic
├── routes/
│   └── authRoutes.js         # Auth API endpoints
├── services/
│   ├── emailService.js       # Email sending (Nodemailer)
│   └── otpService.js         # OTP database operations
├── middlewares/
│   └── authMiddleware.js     # JWT verification, CORS, rate limiting
├── utils/
│   ├── otp.js               # OTP generation and validation
│   └── jwt.js               # JWT token utilities
└── database/
    └── schema.sql           # MySQL table definitions
```

## Setup Instructions

### 1. Database Setup

#### MySQL Installation
- Download MySQL 8.0 from https://dev.mysql.com/downloads/mysql/
- Install with default port 3306
- Default credentials: username=`root`, password=`system`

#### Create Database and Tables
```bash
# Login to MySQL
mysql -u root -p

# Execute schema SQL
source path/to/nev-koder/database/schema.sql
```

Or use MySQL Workbench to execute the SQL file.

### 2. Backend Environment Setup

#### Install Dependencies
```bash
cd nev-koder/server
npm install
```

#### Configure Environment Variables
1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` with your settings:
```
# Server
PORT=5000
NODE_ENV=development

# Database (update if using different credentials)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=system
DB_NAME=nev_coder

# JWT (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=your_super_secret_jwt_key_12345
JWT_EXPIRE=7d
REFRESH_TOKEN_SECRET=your_refresh_token_secret_12345
REFRESH_TOKEN_EXPIRE=30d

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Timeouts
OTP_EXPIRE_MINUTES=5
OTP_RESEND_COOLDOWN_SECONDS=60
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15

# URLs
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 3. Email Configuration (Gmail SMTP)

#### Get Gmail App Password
1. Enable 2-Factor Authentication on your Google Account
2. Go to https://myaccount.google.com/apppasswords
3. Select "Mail" and "Windows Computer"
4. Generate a 16-character password
5. Use this password in `.env` as `EMAIL_PASSWORD`

#### Alternative Email Services
- **Outlook/Hotmail**: `smtp.outlook.com:587`
- **SendGrid**: Use SendGrid API instead of SMTP
- **Nodemailer Gmail OAuth2**: For more secure setup

### 4. Start the Server

#### Development Mode (with auto-reload)
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

Expected output:
```
✅ Server running on http://localhost:5000
📧 Make sure to configure email settings in .env file
🔐 Make sure JWT_SECRET is set in .env file
```

## API Endpoints

### Public Endpoints

#### 1. Register User
**POST** `/api/auth/register`

Request:
```json
{
  "name": "John Doe",
  "email": "john@yourmail.com",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123"
}
```

Response:
```json
{
  "success": true,
  "message": "Registration successful. Please check your email for OTP.",
  "userId": 1,
  "email": "john@yourmail.com"
}
```

Error Responses:
- 400: Invalid input (missing fields, password too short, email format invalid)
- 400: Email already registered

---

#### 2. Verify OTP
**POST** `/api/auth/verify-otp`

Request:
```json
{
  "userId": 1,
  "otp": "123456"
}
```

Response:
```json
{
  "success": true,
  "message": "Email verified successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@yourmail.com"
  }
}
```

Error Responses:
- 400: "Invalid OTP"
- 400: "OTP has expired"
- 404: "User not found"

---

#### 3. Resend OTP
**POST** `/api/auth/resend-otp`

Request:
```json
{
  "userId": 1
}
```

Response:
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

Error Responses:
- 429: "Please wait X seconds before requesting a new OTP"
- 500: Email service failure

---

#### 4. Login
**POST** `/api/auth/login`

Request:
```json
{
  "email": "john@yourmail.com",
  "password": "SecurePass123"
}
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@yourmail.com"
  }
}
```

Error Responses:
- 400: "Email and password are required"
- 401: "Invalid email or password"
- 403: "Please verify your email first" (returns userId for OTP flow)
- 429: "Account locked due to too many failed login attempts"

---

#### 5. Forgot Password
**POST** `/api/auth/forgot-password`

Request:
```json
{
  "email": "john@yourmail.com"
}
```

Response (always returns success for security):
```json
{
  "success": true,
  "message": "If email exists, reset link will be sent"
}
```

---

#### 6. Reset Password
**POST** `/api/auth/reset-password`

Request:
```json
{
  "token": "uuid-reset-token-from-email",
  "newPassword": "NewSecurePass456",
  "confirmPassword": "NewSecurePass456"
}
```

Response:
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

Error Responses:
- 400: "Invalid reset token"
- 400: "Reset token has expired"
- 400: "Password must be at least 6 characters"

---

#### 7. Refresh Token
**POST** `/api/auth/refresh-token`

Cookies: `refreshToken=...`

Response:
```json
{
  "success": true,
  "accessToken": "new_access_token"
}
```

---

### Protected Endpoints

#### Get Current User (Example)
**GET** `/api/auth/me`

Headers:
```
Authorization: Bearer <accessToken>
```

Response:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "john@yourmail.com"
  }
}
```

## Security Features

### 1. Password Security
- Bcrypt hashing with 10 salt rounds
- Minimum 6 characters
- Password confirmation required
- Password reset via email token

### 2. OTP Verification
- 6-digit random OTP
- 5-minute expiration (configurable)
- 60-second resend cooldown (configurable)
- One-time use only

### 3. JWT Authentication
- Access tokens (7 days default)
- Refresh tokens (30 days, stored in HTTP-only cookies)
- Token validation on protected routes
- Secure secret key required

### 4. Account Protection
- Account lockout after 5 failed login attempts
- 15-minute lockout duration (configurable)
- Rate limiting (10 requests per 15 minutes)
- Email-based password reset with token expiry

### 5. Database Security
- Parameterized queries (prevent SQL injection)
- Hashed password storage
- Secure token storage with expiry tracking

### 6. CORS Configuration
- Configurable allowed origins
- Credential support for cookies
- Methods: GET, POST, PUT, DELETE

## Testing the API

### Using Postman

1. **Register**: POST http://localhost:5000/api/auth/register
2. Check email for OTP
3. **Verify OTP**: POST http://localhost:5000/api/auth/verify-otp
4. **Login**: POST http://localhost:5000/api/auth/login
5. Use returned accessToken in Authorization: Bearer header

### Using cURL

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@test.com","password":"Test123","confirmPassword":"Test123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@test.com","password":"Test123"}'
```

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 5000 | Express server port |
| `DB_HOST` | localhost | MySQL host |
| `DB_USER` | root | MySQL username |
| `DB_PASSWORD` | system | MySQL password |
| `DB_NAME` | nev_coder | Database name |
| `JWT_SECRET` | - | Secret key for JWT (MUST SET) |
| `EMAIL_USER` | - | Gmail address (MUST SET) |
| `EMAIL_PASSWORD` | - | Gmail app password (MUST SET) |
| `OTP_EXPIRE_MINUTES` | 5 | OTP validity duration |
| `MAX_LOGIN_ATTEMPTS` | 5 | Failed attempts before lockout |
| `LOCKOUT_DURATION_MINUTES` | 15 | Account lockout period |

## Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
**Solution**: Make sure MySQL is running and credentials in .env are correct

### Email Not Sending
```
Error: Invalid login: 535, Authentication unsuccessful
```
**Solution**: 
- Enable "Less secure app access" in Gmail settings OR
- Use Google App Password instead of account password
- Check EMAIL_USER and EMAIL_PASSWORD in .env

### OTP Validation Fails
- Check OTP hasn't expired in database
- Verify OTP format is exactly 6 digits
- Check user exists and is not verified

### JWT Token Errors
- Verify JWT_SECRET is set in .env
- Check token hasn't expired
- Ensure Authorization header format: `Bearer <token>`

## Next Steps

1. **Frontend Integration**: Update frontend authService.js to call these endpoints
2. **Frontend Forms**: Implement form validation and error handling in React components
3. **Protected Routes**: Add route guards in frontend based on token presence
4. **Token Persistence**: Store tokens in localStorage/sessionStorage on frontend
5. **Token Refresh**: Automatically refresh tokens before expiry using refresh endpoint

## Production Deployment Checklist

- [ ] Set JWT_SECRET to a strong, random value
- [ ] Set REFRESH_TOKEN_SECRET to a strong, random value
- [ ] Configure actual email service (not test)
- [ ] Enable HTTPS (set NODE_ENV=production)
- [ ] Configure ALLOWED_ORIGINS for your domain
- [ ] Setup database backups
- [ ] Monitor rate limiting thresholds
- [ ] Enable CSRF protection if needed
- [ ] Setup logging and error monitoring
- [ ] Test all endpoints in production environment
