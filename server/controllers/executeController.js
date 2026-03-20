import { executeWithJudge0 } from '../services/judge0Service.js';

const MAX_SOURCE_SIZE = 20000;
const MAX_STDIN_SIZE = 5000;

export const executeCode = async (req, res, next) => {
  try {
    const { sourceCode, language, stdin = '' } = req.body;

    if (!sourceCode || !language) {
      return res.status(400).json({
        success: false,
        message: 'sourceCode and language are required.'
      });
    }

    if (typeof sourceCode !== 'string' || sourceCode.length > MAX_SOURCE_SIZE) {
      return res.status(400).json({
        success: false,
        message: `Source code must be a string up to ${MAX_SOURCE_SIZE} characters.`
      });
    }

    if (typeof stdin !== 'string' || stdin.length > MAX_STDIN_SIZE) {
      return res.status(400).json({
        success: false,
        message: `Input must be a string up to ${MAX_STDIN_SIZE} characters.`
      });
    }

    const result = await executeWithJudge0({
      sourceCode,
      language,
      stdin
    });

    return res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    if (error.response?.data) {
      return res.status(502).json({
        success: false,
        message: 'Judge0 API request failed.',
        details: error.response.data
      });
    }

    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    return next(error);
  }
};
