import api, { getAuthHeaders } from './apiClient';

const extractError = (error, fallbackMessage) => ({
  success: false,
  message: error.response?.data?.message || fallbackMessage,
  error: error.message
});

export const getQuestionStats = async () => {
  try {
    const response = await api.get('/questions/stats', { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to fetch question stats.');
  }
};

export const getQuestions = async (filters = {}) => {
  try {
    const response = await api.get('/questions', { params: filters, headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to fetch questions.');
  }
};

export const getQuestionById = async (id) => {
  try {
    const response = await api.get(`/questions/${id}`, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to fetch question.');
  }
};

export const createQuestion = async (payload) => {
  try {
    const response = await api.post('/questions', payload, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to create question.');
  }
};

export const updateQuestion = async (id, payload) => {
  try {
    const response = await api.put(`/questions/${id}`, payload, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to update question.');
  }
};

export const deleteQuestion = async (id) => {
  try {
    const response = await api.delete(`/questions/${id}`, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to delete question.');
  }
};

export const createLearningPath = async (payload) => {
  try {
    const response = await api.post('/learning-paths', payload, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to create learning path.');
  }
};

export const getAdminLearningPaths = async () => {
  try {
    const response = await api.get('/learning-paths', { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to fetch learning paths.');
  }
};

export const getAdminLearningPathById = async (id) => {
  try {
    const response = await api.get(`/learning-paths/${id}`, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to fetch learning path details.');
  }
};

export const updateLearningPath = async (id, payload) => {
  try {
    const response = await api.put(`/learning-paths/${id}`, payload, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to update learning path.');
  }
};

export const deleteLearningPath = async (id) => {
  try {
    const response = await api.delete(`/learning-paths/${id}`, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to delete learning path.');
  }
};

export const uploadQuestionsBulkBoilerplate = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/questions/bulk-upload/boilerplate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...getAuthHeaders()
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

    const response = await api.post('/questions/bulk-upload/no-boilerplate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...getAuthHeaders()
      }
    });
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to upload no-boilerplate questions.');
  }
};

export const downloadTemplateBoilerplate = async () => {
  try {
    const response = await api.get('/questions/templates/boilerplate', {
      responseType: 'blob',
      headers: getAuthHeaders()
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
    const response = await api.get('/questions/templates/no-boilerplate', {
      responseType: 'blob',
      headers: getAuthHeaders()
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
    const response = await api.get('/admin/users', { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to fetch users.');
  }
};

export const createAdminUser = async (payload) => {
  try {
    const response = await api.post('/admin/users', payload, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to create user.');
  }
};

export const deleteAdminUser = async (id) => {
  try {
    const response = await api.delete(`/admin/users/${id}`, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to delete user.');
  }
};

export const getAdminAssessments = async () => {
  try {
    const response = await api.get('/admin/assessments', { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to fetch assessments.');
  }
};

export const createAdminAssessment = async (payload) => {
  try {
    const response = await api.post('/admin/assessments', payload, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to create assessment.');
  }
};

export const deleteAdminAssessment = async (id) => {
  try {
    const response = await api.delete(`/admin/assessments/${id}`, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    return extractError(error, 'Failed to delete assessment.');
  }
};

export const exportAdminQuizResults = async (quizId) => {
  try {
    const response = await api.get(`/admin/quizzes/${quizId}/export`, {
      responseType: 'blob',
      headers: getAuthHeaders()
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
