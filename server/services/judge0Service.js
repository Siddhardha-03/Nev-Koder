import axios from 'axios';

const JUDGE0_BASE_URL =
  process.env.JUDGE0_BASE_URL || 'https://ce.judge0.com';

const LANGUAGE_MAP = {
  python: 71,
  java: 62,
  cpp: 54,
  javascript: 63,
  c: 50,
  csharp: 51
};

const encodeBase64 = (value = '') =>
  Buffer.from(value, 'utf8').toString('base64');

const decodeBase64 = (value) => {
  if (!value) return '';
  try {
    return Buffer.from(value, 'base64').toString('utf8');
  } catch {
    return value;
  }
};

export const getJudge0LanguageId = (language) => {
  const normalized = String(language || '').toLowerCase().trim();
  return LANGUAGE_MAP[normalized] || null;
};

// 🔥 NEW: Polling function
const pollSubmission = async (token) => {
  const maxAttempts = 20; // safety
  let attempts = 0;

  while (attempts < maxAttempts) {
    const res = await axios.get(
      `${JUDGE0_BASE_URL}/submissions/${token}?base64_encoded=true`
    );

    const statusId = res.data.status?.id;

    // 1 = In Queue, 2 = Processing
    if (statusId === 1 || statusId === 2) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
      continue;
    }

    return res.data;
  }

  throw new Error('Execution timeout');
};

export const executeWithJudge0 = async ({
  sourceCode,
  language,
  stdin = ''
}) => {
  const languageId = getJudge0LanguageId(language);

  if (!languageId) {
    const error = new Error('Unsupported language selected.');
    error.status = 400;
    throw error;
  }

  const payload = {
    source_code: encodeBase64(sourceCode),
    language_id: languageId,
    stdin: encodeBase64(stdin)
  };

  // ✅ STEP 1: Create submission (NO wait=true)
  const submission = await axios.post(
    `${JUDGE0_BASE_URL}/submissions?base64_encoded=true`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }
  );

  const token = submission.data.token;

  // ✅ STEP 2: Poll result
  const data = await pollSubmission(token);

  return {
    stdout: decodeBase64(data.stdout),
    stderr: decodeBase64(data.stderr),
    compile_output: decodeBase64(data.compile_output),
    message: decodeBase64(data.message),
    status: data.status || null,
    time: data.time || null,
    memory: data.memory || null
  };
};

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_MAP);
/*
import axios from 'axios';

const JUDGE0_BASE_URL = process.env.JUDGE0_BASE_URL || 'https://ce.judge0.com';

const LANGUAGE_MAP = {
  python: 71,
  java: 62,
  cpp: 54,
  javascript: 63,
  c: 50,
  csharp: 51
};

const encodeBase64 = (value = '') => Buffer.from(value, 'utf8').toString('base64');
const decodeBase64 = (value) => {
  if (!value) return '';
  try {
    return Buffer.from(value, 'base64').toString('utf8');
  } catch {
    return value;
  }
};

export const getJudge0LanguageId = (language) => {
  const normalized = String(language || '').toLowerCase().trim();
  return LANGUAGE_MAP[normalized] || null;
};

export const executeWithJudge0 = async ({ sourceCode, language, stdin = '' }) => {
  const languageId = getJudge0LanguageId(language);

  if (!languageId) {
    const error = new Error('Unsupported language selected.');
    error.status = 400;
    throw error;
  }

  const payload = {
    source_code: encodeBase64(sourceCode),
    language_id: languageId,
    stdin: encodeBase64(stdin)
  };

  const response = await axios.post(
    `${JUDGE0_BASE_URL}/submissions?base64_encoded=true&wait=true`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 25000
    }
  );

  const data = response.data || {};

  return {
    stdout: decodeBase64(data.stdout),
    stderr: decodeBase64(data.stderr),
    compile_output: decodeBase64(data.compile_output),
    message: decodeBase64(data.message),
    status: data.status || null,
    time: data.time || null,
    memory: data.memory || null
  };
};

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_MAP);
*/