import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const buildAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const executeCode = async ({ sourceCode, language, stdin = '', questionId = null }) => {
  const response = await axios.post(`${API_BASE_URL}/execute`, {
    sourceCode,
    language,
    stdin,
    questionId
  });

  return response.data;
};

export const runTestCase = async ({ sourceCode, language, questionId }) => {
  const response = await axios.post(`${API_BASE_URL}/execute/run`, {
    sourceCode,
    language,
    questionId
  });

  return response.data;
};

export const submitSolution = async ({ sourceCode, language, questionId }) => {
  const response = await axios.post(
    `${API_BASE_URL}/execute/submit`,
    {
      sourceCode,
      language,
      questionId
    },
    {
      headers: buildAuthHeaders()
    }
  );

  return response.data;
};
