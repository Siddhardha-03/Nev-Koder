import api, { getAuthHeaders } from './apiClient';

const formatError = (error, fallback) => ({
  success: false,
  code: error.response?.data?.code || null,
  message: error.response?.data?.message || fallback,
  error: error.message
});

export const getPublicQuizzes = async (params = {}) => {
  try {
    const response = await api.get('/quizzes/public', {
      params,
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to fetch quizzes.');
  }
};

export const getPublicQuizById = async (quizId) => {
  try {
    const response = await api.get(`/quizzes/public/${quizId}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to fetch quiz details.');
  }
};

export const startQuizAttempt = async (quizId) => {
  try {
    const response = await api.post(`/quizzes/${quizId}/start`, {}, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to start quiz attempt.');
  }
};

export const getQuizAttempt = async (attemptId) => {
  try {
    const response = await api.get(`/quizzes/attempts/${attemptId}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to fetch quiz attempt.');
  }
};

export const submitQuizAttempt = async (attemptId, answers = []) => {
  try {
    const response = await api.post(
      `/quizzes/attempts/${attemptId}/submit`,
      { answers },
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to submit quiz attempt.');
  }
};

export const recordQuizViolation = async (attemptId, violationType, details = null) => {
  try {
    const response = await api.post(
      `/quizzes/attempts/${attemptId}/violation`,
      { violationType, details },
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to record proctoring violation.');
  }
};

export const getQuizAttemptHistory = async () => {
  try {
    const response = await api.get('/quizzes/attempts/history', {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to fetch quiz attempt history.');
  }
};

export const getAdminQuizzes = async () => {
  try {
    const response = await api.get('/admin/quizzes', {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to fetch admin quizzes.');
  }
};

export const createAdminQuiz = async (payload) => {
  try {
    const response = await api.post('/admin/quizzes', payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to create quiz.');
  }
};

export const updateAdminQuiz = async (quizId, payload) => {
  try {
    const response = await api.put(`/admin/quizzes/${quizId}`, payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to update quiz.');
  }
};

export const deleteAdminQuiz = async (quizId) => {
  try {
    const response = await api.delete(`/admin/quizzes/${quizId}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to delete quiz.');
  }
};

export const getAdminQuizQuestions = async (quizId) => {
  try {
    const response = await api.get(`/admin/quizzes/${quizId}/questions`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to fetch quiz questions.');
  }
};

export const createAdminQuizQuestion = async (quizId, payload) => {
  try {
    const response = await api.post(`/admin/quizzes/${quizId}/questions`, payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to add quiz question.');
  }
};

export const updateAdminQuizQuestion = async (quizId, questionId, payload) => {
  try {
    const response = await api.put(`/admin/quizzes/${quizId}/questions/${questionId}`, payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to update quiz question.');
  }
};

export const deleteAdminQuizQuestion = async (quizId, questionId) => {
  try {
    const response = await api.delete(`/admin/quizzes/${quizId}/questions/${questionId}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to delete quiz question.');
  }
};

export const downloadAdminQuizResults = async (quizId) => {
  try {
    const response = await api.get(`/admin/quizzes/${quizId}/export`, {
      headers: getAuthHeaders(),
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
