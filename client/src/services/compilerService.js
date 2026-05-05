import api, { getAuthHeaders } from './apiClient';

export const executeCode = async ({ sourceCode, language, stdin = '', questionId = null }) => {
  const response = await api.post('/execute', {
    sourceCode,
    language,
    stdin,
    questionId
  });

  return response.data;
};

export const runTestCase = async ({ sourceCode, language, questionId }) => {
  const response = await api.post('/execute/run', {
    sourceCode,
    language,
    questionId
  });

  return response.data;
};

export const submitSolution = async ({ sourceCode, language, questionId }) => {
  const response = await api.post(
    '/execute/submit',
    {
      sourceCode,
      language,
      questionId
    },
    {
      headers: getAuthHeaders()
    }
  );

  return response.data;
};
