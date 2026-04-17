import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const quizApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

const formatError = (error, fallback) => ({
  success: false,
  code: error.response?.data?.code || null,
  message: error.response?.data?.message || fallback,
  error: error.message
});

const buildAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getPublicQuizzes = async (params = {}) => {
  try {
    const response = await quizApi.get('/quizzes/public', {
      params,
      headers: buildAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to fetch quizzes.');
  }
};

export const getPublicQuizById = async (quizId) => {
  try {
    const response = await quizApi.get(`/quizzes/public/${quizId}`, {
      headers: buildAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to fetch quiz details.');
  }
};

export const startQuizAttempt = async (quizId) => {
  try {
    const response = await quizApi.post(`/quizzes/${quizId}/start`, {}, {
      headers: buildAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to start quiz attempt.');
  }
};

export const getQuizAttempt = async (attemptId) => {
  try {
    const response = await quizApi.get(`/quizzes/attempts/${attemptId}`, {
      headers: buildAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to fetch quiz attempt.');
  }
};

export const submitQuizAttempt = async (attemptId, answers = []) => {
  try {
    const response = await quizApi.post(
      `/quizzes/attempts/${attemptId}/submit`,
      { answers },
      { headers: buildAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to submit quiz attempt.');
  }
};

export const recordQuizViolation = async (attemptId, violationType, details = null) => {
  try {
    const response = await quizApi.post(
      `/quizzes/attempts/${attemptId}/violation`,
      { violationType, details },
      { headers: buildAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to record proctoring violation.');
  }
};

export const getQuizAttemptHistory = async () => {
  try {
    const response = await quizApi.get('/quizzes/attempts/history', {
      headers: buildAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to fetch quiz attempt history.');
  }
};

export const getAdminQuizzes = async () => {
  try {
    const response = await quizApi.get('/admin/quizzes', {
      headers: buildAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to fetch admin quizzes.');
  }
};

export const createAdminQuiz = async (payload) => {
  try {
    const response = await quizApi.post('/admin/quizzes', payload, {
      headers: buildAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to create quiz.');
  }
};

export const updateAdminQuiz = async (quizId, payload) => {
  try {
    const response = await quizApi.put(`/admin/quizzes/${quizId}`, payload, {
      headers: buildAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to update quiz.');
  }
};

export const deleteAdminQuiz = async (quizId) => {
  try {
    const response = await quizApi.delete(`/admin/quizzes/${quizId}`, {
      headers: buildAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to delete quiz.');
  }
};

export const getAdminQuizQuestions = async (quizId) => {
  try {
    const response = await quizApi.get(`/admin/quizzes/${quizId}/questions`, {
      headers: buildAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to fetch quiz questions.');
  }
};

export const createAdminQuizQuestion = async (quizId, payload) => {
  try {
    const response = await quizApi.post(`/admin/quizzes/${quizId}/questions`, payload, {
      headers: buildAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to add quiz question.');
  }
};

export const updateAdminQuizQuestion = async (quizId, questionId, payload) => {
  try {
    const response = await quizApi.put(`/admin/quizzes/${quizId}/questions/${questionId}`, payload, {
      headers: buildAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to update quiz question.');
  }
};

export const deleteAdminQuizQuestion = async (quizId, questionId) => {
  try {
    const response = await quizApi.delete(`/admin/quizzes/${quizId}/questions/${questionId}`, {
      headers: buildAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to delete quiz question.');
  }
};

export const downloadAdminQuizResults = async (quizId) => {
  try {
    const response = await quizApi.get(`/admin/quizzes/${quizId}/export`, {
      headers: buildAuthHeaders(),
      responseType: 'blob'
    });

    const contentDisposition = response.headers['content-disposition'] || '';
    const match = contentDisposition.match(/filename="?([^";]+)"?/i);
    const filename = match ? match[1] : `quiz-${quizId}-results.xlsx`;

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    return formatError(error, 'Failed to export quiz results.');
  }
};
