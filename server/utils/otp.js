import crypto from 'crypto';

// Generate a random 6-digit OTP
export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Validate OTP format (must be 6 digits)
export const validateOTPFormat = (otp) => {
  return /^\d{6}$/.test(otp);
};

// Check if OTP has expired
export const isOTPExpired = (expiresAt) => {
  return new Date() > new Date(expiresAt);
};

// Calculate time remaining until OTP expires (in seconds)
export const getOTPTimeRemaining = (expiresAt) => {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry - now;
  return Math.max(0, Math.floor(diffMs / 1000));
};
