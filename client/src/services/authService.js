import axios from 'axios';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  signOut
} from 'firebase/auth';
import { auth, firebaseConfigError } from './firebaseClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Create axios instance with default settings
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // For cookies (refresh token)
});

// Add token to request headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses (token expired)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/forgot-password')
      || originalRequest?.url?.includes('/auth/reset-password')
      || originalRequest?.url?.includes('/auth/firebase/sync')
      || originalRequest?.url?.includes('/auth/firebase/me')
      || originalRequest?.url?.includes('/auth/refresh-token');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const response = await api.post('/auth/refresh-token');
        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

const persistAuthState = (response) => {
  localStorage.setItem('accessToken', response.accessToken);
  localStorage.setItem('user', JSON.stringify(response.user));
};

const syncFirebaseSession = async (firebaseIdToken) => {
  const response = await api.post(
    '/auth/firebase/sync',
    {},
    {
      headers: {
        Authorization: `Bearer ${firebaseIdToken}`
      }
    }
  );

  if (response.data.success) {
    persistAuthState(response.data);
  }

  return response.data;
};

const postWithFirebaseToken = async (path, payload = {}) => {
  const readinessError = ensureFirebaseReady();
  if (readinessError) {
    return readinessError;
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    return {
      success: false,
      message: 'Firebase session expired. Please sign in again.'
    };
  }

  const idToken = await currentUser.getIdToken(true);
  const response = await api.post(path, payload, {
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  });

  return response.data;
};

const ensureFirebaseReady = () => {
  if (!auth) {
    return {
      success: false,
      message: firebaseConfigError || 'Firebase is not configured.'
    };
  }
  return null;
};

// Auth Service Functions

/**
 * Register a new user
 * @param {string} name - User's full name
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {string} confirmPassword - Password confirmation
 * @returns {Promise<object>} Registration response with userId
 */
export const registerUser = async (name, email, password, confirmPassword) => {
  try {
    const readinessError = ensureFirebaseReady();
    if (readinessError) {
      return readinessError;
    }

    if (password !== confirmPassword) {
      return {
        success: false,
        message: 'Passwords do not match.'
      };
    }

    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (name?.trim()) {
      await updateProfile(credential.user, { displayName: name.trim() });
    }

    const otpResponse = await postWithFirebaseToken('/auth/firebase/register/request-otp');
    if (otpResponse.success) {
      sessionStorage.setItem('pendingRegistrationEmail', email);
      return {
        success: true,
        requiresOtp: true,
        email,
        message: otpResponse.message || 'OTP sent successfully'
      };
    }

    return otpResponse;
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Registration failed. Please try again.',
      error: error.message
    };
  }
};

/**
 * Login user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<object>} Login response with access token and user info
 */
export const loginUser = async (email, password) => {
  try {
    const readinessError = ensureFirebaseReady();
    if (readinessError) {
      return readinessError;
    }

    const credential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await credential.user.getIdToken();
    const syncResponse = await syncFirebaseSession(idToken);
    if (!syncResponse.success && syncResponse.requiresOtp) {
      sessionStorage.setItem('pendingRegistrationEmail', email);
    }
    return syncResponse;
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Login failed. Please check your credentials.',
      error: error.message
    };
  }
};

const googleProvider = new GoogleAuthProvider();

export const continueWithGoogle = async () => {
  try {
    const readinessError = ensureFirebaseReady();
    if (readinessError) {
      return readinessError;
    }

    const credential = await signInWithPopup(auth, googleProvider);
    const idToken = await credential.user.getIdToken(true);
    const syncResponse = await syncFirebaseSession(idToken);

    if (!syncResponse.success && syncResponse.requiresOtp) {
      sessionStorage.setItem('pendingRegistrationEmail', credential.user.email || '');
    }

    return syncResponse;
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Google sign-in failed. Please try again.',
      error: error.message
    };
  }
};

/**
 * Request password reset
 * @param {string} email - User's email
 * @returns {Promise<object>} Forgot password response
 */
export const forgotPassword = async (email) => {
  try {
    const response = await api.post('/auth/forgot-password', {
      email
    });
    return response.data;
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to process forgot password request.',
      error: error.message
    };
  }
};

/**
 * Reset password using email + OTP + new password
 * @param {string} email - User's email
 * @param {string} otp - 6-digit OTP code
 * @param {string} newPassword - New password
 * @param {string} confirmPassword - Password confirmation
 * @returns {Promise<object>} Password reset response
 */
export const resetPasswordWithOTP = async (email, otp, newPassword, confirmPassword) => {
  try {
    const response = await api.post('/auth/reset-password', {
      email,
      otp,
      newPassword,
      confirmPassword
    });
    return response.data;
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Password reset failed.',
      error: error.message
    };
  }
};

export const resetPassword = resetPasswordWithOTP;

export const verifyRegistrationOTP = async (otp) => {
  try {
    const response = await postWithFirebaseToken('/auth/firebase/register/verify-otp', { otp });
    if (response.success) {
      persistAuthState(response);
      sessionStorage.removeItem('pendingRegistrationEmail');
    }
    return response;
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'OTP verification failed.',
      error: error.message
    };
  }
};

export const resendRegistrationOTP = async () => {
  try {
    return await postWithFirebaseToken('/auth/firebase/register/resend-otp');
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to resend OTP.',
      error: error.message
    };
  }
};

/**
 * Refresh access token
 * @returns {Promise<object>} Refresh token response
 */
export const refreshToken = async () => {
  try {
    const response = await api.post('/auth/refresh-token');
    if (response.data.success) {
      localStorage.setItem('accessToken', response.data.accessToken);
    }
    return response.data;
  } catch (error) {
    return {
      success: false,
      message: 'Token refresh failed.',
      error: error.message
    };
  }
};

/**
 * Get current user info
 * @returns {Promise<object>} Current user information
 */
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/me');
    return response.data;
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch user info.',
      error: error.message
    };
  }
};

export const getDashboardStats = async () => {
  try {
    const response = await api.get('/auth/dashboard/stats');
    return response.data;
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch dashboard stats.',
      error: error.message
    };
  }
};

/**
 * Logout user (clear local storage)
 */
export const logout = () => {
  if (auth) {
    signOut(auth).catch(() => {});
  }
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
};

/**
 * Check if user is authenticated
 * @returns {boolean} Whether user has valid token
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('accessToken');
};

/**
 * Get stored user info
 * @returns {object|null} Stored user object or null
 */
export const getStoredUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export default {
  registerUser,
  loginUser,
  continueWithGoogle,
  verifyRegistrationOTP,
  resendRegistrationOTP,
  forgotPassword,
  resetPassword: resetPasswordWithOTP,
  resetPasswordWithOTP,
  refreshToken,
  getCurrentUser,
  getDashboardStats,
  logout,
  isAuthenticated,
  getStoredUser
};
