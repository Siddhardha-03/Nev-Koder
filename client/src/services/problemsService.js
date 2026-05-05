import api, { getAuthHeaders } from './apiClient';

const formatError = (error, fallback) => ({
  success: false,
  message: error.response?.data?.message || fallback,
  error: error.message
});

export const getPublicProblems = async (filters = {}) => {
  try {
    const response = await api.get('/questions/public', {
      params: filters,
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to fetch problems.');
  }
};

export const getPublicProblemById = async (id) => {
  try {
    const response = await api.get(`/questions/public/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    return formatError(error, 'Failed to fetch problem details.');
  }
};
