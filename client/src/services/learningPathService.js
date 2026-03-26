import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

const formatError = (error, fallback) => ({
  success: false,
  message: error.response?.data?.message || fallback,
  error: error.message
});

const buildAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getPublicLearningPaths = async () => {
  try {
    const response = await api.get('/learning-paths/public', {
      headers: buildAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to fetch learning paths.');
  }
};

export const getPublicLearningPathById = async (id) => {
  try {
    const response = await api.get(`/learning-paths/public/${id}`, {
      headers: buildAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to fetch learning path details.');
  }
};
