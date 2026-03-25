import axios from 'axios';

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
    const response = await api.post('/auth/register', {
      name,
      email,
      password,
      confirmPassword
    });

    if (response.data.success) {
      sessionStorage.setItem('registrationUserId', String(response.data.userId));
      sessionStorage.setItem('registrationEmail', response.data.email || email);
    }

    return response.data;
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
    const response = await api.post('/auth/login', {
      email,
      password
    });

    if (response.data.success) {
      persistAuthState(response.data);
    }

    return response.data;
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Login failed. Please check your credentials.',
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
  const userId = Number(sessionStorage.getItem('registrationUserId') || sessionStorage.getItem('unverifiedUserId') || 0);

  if (!userId) {
    return { success: false, message: 'User ID not found. Please register or login again.' };
  }

  try {
    const response = await api.post('/auth/verify-otp', { userId, otp });
    if (response.data.success) {
      persistAuthState(response.data);
      sessionStorage.removeItem('registrationUserId');
      sessionStorage.removeItem('registrationEmail');
      sessionStorage.removeItem('unverifiedUserId');
    }
    return response.data;
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'OTP verification failed.',
      error: error.message
    };
  }
};

export const resendRegistrationOTP = async () => {
  const userId = Number(sessionStorage.getItem('registrationUserId') || sessionStorage.getItem('unverifiedUserId') || 0);

  if (!userId) {
    return { success: false, message: 'User ID not found. Please register or login again.' };
  }

  try {
    const response = await api.post('/auth/resend-otp', { userId });
    return response.data;
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
