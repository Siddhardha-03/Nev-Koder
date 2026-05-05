import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshInFlight = null;

const shouldSkipRefresh = (url = '') => {
  const path = String(url || '');
  return path.includes('/auth/login')
    || path.includes('/auth/register')
    || path.includes('/auth/verify-otp')
    || path.includes('/auth/resend-otp')
    || path.includes('/auth/forgot-password')
    || path.includes('/auth/reset-password')
    || path.includes('/auth/refresh-token');
};

const clearAuthStorage = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry || shouldSkipRefresh(originalRequest.url)) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshInFlight) {
        refreshInFlight = axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        ).finally(() => {
          refreshInFlight = null;
        });
      }

      const response = await refreshInFlight;
      const newAccessToken = response.data?.accessToken;

      if (!newAccessToken) {
        throw new Error('Refresh response missing access token');
      }

      localStorage.setItem('accessToken', newAccessToken);
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      clearAuthStorage();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    }
  }
);

export const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const clearAuthState = () => {
  clearAuthStorage();
};

export default apiClient;