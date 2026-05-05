import api, { getAuthHeaders } from './apiClient';

const formatError = (error, fallback) => ({
  success: false,
  message: error.response?.data?.message || fallback,
  error: error.message
});

export const getPublicLearningPaths = async () => {
  try {
    const response = await api.get('/learning-paths/public', {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to fetch learning paths.');
  }
};

export const getPublicLearningPathById = async (id) => {
  try {
    const response = await api.get(`/learning-paths/public/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to fetch learning path details.');
  }
};
