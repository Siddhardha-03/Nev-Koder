import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
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

export const uploadQuestionsBulkBoilerplate = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await adminApi.post('/questions/bulk-upload/boilerplate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to upload boilerplate questions.');
  }
};

export const uploadQuestionsBulkNoBoilerplate = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await adminApi.post('/questions/bulk-upload/no-boilerplate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to upload no-boilerplate questions.');
  }
};

export const downloadTemplateBoilerplate = async () => {
  try {
    const response = await adminApi.get('/questions/templates/boilerplate', {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'boilerplate_template.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    return { success: true };
  } catch (error) {
    return extractError(error, 'Failed to download boilerplate template.');
  }
};

export const downloadTemplateNoBoilerplate = async () => {
  try {
    const response = await adminApi.get('/questions/templates/no-boilerplate', {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'no_boilerplate_template.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    return { success: true };
  } catch (error) {
    return extractError(error, 'Failed to download no-boilerplate template.');
  }
};

export const getAdminUsers = async () => {
  try {
    const response = await adminApi.get('/admin/users');
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to fetch users.');
  }
};

export const createAdminUser = async (payload) => {
  try {
    const response = await adminApi.post('/admin/users', payload);
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to create user.');
  }
};

export const deleteAdminUser = async (id) => {
  try {
    const response = await adminApi.delete(`/admin/users/${id}`);
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to delete user.');
  }
};

export const getAdminAssessments = async () => {
  try {
    const response = await adminApi.get('/admin/assessments');
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to fetch assessments.');
  }
};

export const createAdminAssessment = async (payload) => {
  try {
    const response = await adminApi.post('/admin/assessments', payload);
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to create assessment.');
  }
};

export const deleteAdminAssessment = async (id) => {
  try {
    const response = await adminApi.delete(`/admin/assessments/${id}`);
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to delete assessment.');
  }
};

export const exportAdminQuizResults = async (quizId) => {
  try {
    const response = await adminApi.get(`/admin/quizzes/${quizId}/export`, {
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
    return extractError(error, 'Failed to export quiz results.');
  }
};
