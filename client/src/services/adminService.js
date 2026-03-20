import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const adminApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const extractError = (error, fallbackMessage) => ({
  success: false,
  message: error.response?.data?.message || fallbackMessage,
  error: error.message
});

export const getQuestionStats = async () => {
  try {
    const response = await adminApi.get('/questions/stats');
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to fetch question stats.');
  }
};

export const getQuestions = async (filters = {}) => {
  try {
    const response = await adminApi.get('/questions', { params: filters });
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to fetch questions.');
  }
};

export const getQuestionById = async (id) => {
  try {
    const response = await adminApi.get(`/questions/${id}`);
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to fetch question.');
  }
};

export const createQuestion = async (payload) => {
  try {
    const response = await adminApi.post('/questions', payload);
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to create question.');
  }
};

export const updateQuestion = async (id, payload) => {
  try {
    const response = await adminApi.put(`/questions/${id}`, payload);
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to update question.');
  }
};

export const deleteQuestion = async (id) => {
  try {
    const response = await adminApi.delete(`/questions/${id}`);
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to delete question.');
  }
};

export const createLearningPath = async (payload) => {
  try {
    const response = await adminApi.post('/learning-paths', payload);
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to create learning path.');
  }
};

export const getAdminLearningPaths = async () => {
  try {
    const response = await adminApi.get('/learning-paths');
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to fetch learning paths.');
  }
};

export const getAdminLearningPathById = async (id) => {
  try {
    const response = await adminApi.get(`/learning-paths/${id}`);
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to fetch learning path details.');
  }
};

export const updateLearningPath = async (id, payload) => {
  try {
    const response = await adminApi.put(`/learning-paths/${id}`, payload);
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to update learning path.');
  }
};

export const deleteLearningPath = async (id) => {
  try {
    const response = await adminApi.delete(`/learning-paths/${id}`);
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to delete learning path.');
  }
};
