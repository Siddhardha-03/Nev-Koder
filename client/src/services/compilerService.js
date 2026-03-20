import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const executeCode = async ({ sourceCode, language, stdin = '' }) => {
  const response = await axios.post(`${API_BASE_URL}/execute`, {
    sourceCode,
    language,
    stdin
  });

  return response.data;
};
