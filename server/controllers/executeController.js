import { executeWithJudge0 } from '../services/judge0Service.js';
import pool from '../config/database.js';
import { buildWrappedCode } from '../utils/codeRunnerLite.js';

const MAX_SOURCE_SIZE = 20000;
const MAX_STDIN_SIZE = 5000;

const parseQuestionId = (questionId) => {
  if (questionId === null || questionId === undefined || questionId === '') return null;
  const numericQuestionId = Number(questionId);
  if (!Number.isInteger(numericQuestionId) || numericQuestionId <= 0) {
    const error = new Error('questionId must be a positive integer when provided.');
    error.status = 400;
    throw error;
  }
  return numericQuestionId;
};

const parseParameterSchema = (raw) => {
  if (!raw) return { params: [], returnType: '' };
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return { params: [], returnType: '' };
  }
};

const loadQuestionForExecution = async (connection, questionId) => {
  const [questionRows] = await connection.execute(
    `SELECT id, title, function_name, has_boilerplate, parameter_schema
     FROM questions
     WHERE id = ?`,
    [questionId]
  );

  if (questionRows.length === 0) {
    const error = new Error('Question not found.');
    error.status = 404;
    throw error;
  }

  return {
    id: questionRows[0].id,
    title: questionRows[0].title,
    function_name: questionRows[0].function_name,
    has_boilerplate: Boolean(questionRows[0].has_boilerplate),
    parameter_schema: parseParameterSchema(questionRows[0].parameter_schema)
  };
};

const resolveExecutionInput = async (connection, questionId, stdin = '') => {
  const directInput = String(stdin || '');
  if (directInput.trim()) return directInput;

  const [testRows] = await connection.execute(
    `SELECT input
     FROM test_cases
     WHERE question_id = ? AND hidden = FALSE
     ORDER BY id ASC
     LIMIT 1`,
    [questionId]
  );

  if (testRows.length > 0) {
    return String(testRows[0].input || '');
  }

  return directInput;
};

export const executeCode = async (req, res, next) => {
  try {
    const { sourceCode, language, stdin = '', questionId = null } = req.body;

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

    let codeToRun = sourceCode;
    let stdinToRun = stdin;
    let questionMeta = null;

    const numericQuestionId = parseQuestionId(questionId);

    if (numericQuestionId !== null) {

      const connection = await pool.getConnection();
      try {
        const question = await loadQuestionForExecution(connection, numericQuestionId);

        questionMeta = {
          id: question.id,
          has_boilerplate: question.has_boilerplate
        };

        if (question.has_boilerplate) {
          const executionInput = await resolveExecutionInput(connection, numericQuestionId, stdinToRun);

          codeToRun = buildWrappedCode({
            problem: question,
            code: sourceCode,
            language,
            testCaseInput: executionInput
          });

          // Wrapped code consumes synthesized args directly.
          stdinToRun = '';
        }
      } finally {
        connection.release();
      }
    }

    const result = await executeWithJudge0({
      sourceCode: codeToRun,
      language,
      stdin: stdinToRun
    });

    return res.status(200).json({
      success: true,
      result,
      meta: {
        question: questionMeta
      }
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

export const previewWrappedCode = async (req, res, next) => {
  try {
    const { sourceCode, language, stdin = '', questionId } = req.body;

    if (!sourceCode || !language || !questionId) {
      return res.status(400).json({
        success: false,
        message: 'sourceCode, language and questionId are required.'
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

    const numericQuestionId = parseQuestionId(questionId);
    const connection = await pool.getConnection();
    try {
      const question = await loadQuestionForExecution(connection, numericQuestionId);
      const executionInput = await resolveExecutionInput(connection, numericQuestionId, stdin);

      const wrappedSource = question.has_boilerplate
        ? buildWrappedCode({
          problem: question,
          code: sourceCode,
          language,
          testCaseInput: executionInput
        })
        : sourceCode;

      return res.status(200).json({
        success: true,
        data: {
          question: {
            id: question.id,
            has_boilerplate: question.has_boilerplate
          },
          executionInput,
          wrappedSource
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    return next(error);
  }
};

export const submitSolution = async (req, res, next) => {
  try {
    const { sourceCode, language, questionId } = req.body;

    if (!sourceCode || !language || !questionId) {
      return res.status(400).json({
        success: false,
        message: 'sourceCode, language, and questionId are required for submission.'
      });
    }

    if (typeof sourceCode !== 'string' || sourceCode.length > MAX_SOURCE_SIZE) {
      return res.status(400).json({
        success: false,
        message: `Source code must be a string up to ${MAX_SOURCE_SIZE} characters.`
      });
    }

    const numericQuestionId = parseQuestionId(questionId);
    const connection = await pool.getConnection();

    try {
      const question = await loadQuestionForExecution(connection, numericQuestionId);

      // Fetch all test cases (both visible and hidden)
      const [testCases] = await connection.execute(
        `SELECT id, input, expected_output, hidden
         FROM test_cases
         WHERE question_id = ?
         ORDER BY id ASC`,
        [numericQuestionId]
      );

      if (testCases.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No test cases found for this question.'
        });
      }

      // Run code against each test case
      const results = [];
      let passCount = 0;
      let failCount = 0;

      for (const testCase of testCases) {
        try {
          const executionInput = String(testCase.input || '');

          let codeToRun = sourceCode;
          if (question.has_boilerplate) {
            codeToRun = buildWrappedCode({
              problem: question,
              code: sourceCode,
              language,
              testCaseInput: executionInput
            });
          }

          const result = await executeWithJudge0({
            sourceCode: codeToRun,
            language,
            stdin: question.has_boilerplate ? '' : executionInput
          });

          const output = (result.stdout || '').trim();
          const expectedOutput = String(testCase.expected_output || '').trim();
          const passed = output === expectedOutput;

          if (passed) {
            passCount++;
          } else {
            failCount++;
          }

          results.push({
            testCaseId: testCase.id,
            isHidden: Boolean(testCase.hidden),
            passed,
            expected: testCase.expected_output,
            actual: result.stdout,
            status: result.status?.description || 'Unknown',
            time: result.time || 'N/A',
            memory: result.memory || 'N/A',
            compilationError: result.compile_output || null,
            runtimeError: result.stderr || null
          });
        } catch (error) {
          failCount++;
          results.push({
            testCaseId: testCase.id,
            isHidden: Boolean(testCase.hidden),
            passed: false,
            error: error.message || 'Execution failed'
          });
        }
      }

      const allPassed = passCount === testCases.length;
      let solvedRecorded = false;

      if (allPassed && req.user?.id) {
        try {
          await connection.execute(
            `INSERT INTO user_solved_questions (user_id, question_id)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE solved_at = CURRENT_TIMESTAMP`,
            [req.user.id, numericQuestionId]
          );
          solvedRecorded = true;
        } catch (persistError) {
          // Submission result should still be returned even if progress persistence fails.
          console.error('Failed to persist solved question:', persistError.message);
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          summary: {
            totalTestCases: testCases.length,
            passCount,
            failCount,
            passPercentage: Math.round((passCount / testCases.length) * 100),
            allPassed
          },
          results,
          question: {
            id: question.id,
            has_boilerplate: question.has_boilerplate
          },
          solvedTracking: {
            eligible: Boolean(req.user?.id),
            markedSolved: solvedRecorded
          }
        }
      });
    } finally {
      connection.release();
    }
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

export const runTestCase = async (req, res, next) => {
  try {
    const { sourceCode, language, questionId } = req.body;

    if (!sourceCode || !language || !questionId) {
      return res.status(400).json({
        success: false,
        message: 'sourceCode, language, and questionId are required.'
      });
    }

    if (typeof sourceCode !== 'string' || sourceCode.length > MAX_SOURCE_SIZE) {
      return res.status(400).json({
        success: false,
        message: `Source code must be a string up to ${MAX_SOURCE_SIZE} characters.`
      });
    }

    const numericQuestionId = parseQuestionId(questionId);
    const connection = await pool.getConnection();

    try {
      const question = await loadQuestionForExecution(connection, numericQuestionId);

      // Fetch only the first visible test case
      const [testCases] = await connection.execute(
        `SELECT id, input, expected_output
         FROM test_cases
         WHERE question_id = ? AND hidden = FALSE
         ORDER BY id ASC
         LIMIT 1`,
        [numericQuestionId]
      );

      if (testCases.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No visible test cases found for this question.'
        });
      }

      const testCase = testCases[0];
      const executionInput = String(testCase.input || '');

      let codeToRun = sourceCode;
      if (question.has_boilerplate) {
        codeToRun = buildWrappedCode({
          problem: question,
          code: sourceCode,
          language,
          testCaseInput: executionInput
        });
      }

      const result = await executeWithJudge0({
        sourceCode: codeToRun,
        language,
        stdin: question.has_boilerplate ? '' : executionInput
      });

      const actualOutput = (result.stdout || '').trim();
      const expectedOutput = String(testCase.expected_output || '').trim();
      const passed = actualOutput === expectedOutput;

      return res.status(200).json({
        success: true,
        data: {
          testCaseId: testCase.id,
          passed,
          expected: testCase.expected_output,
          actual: result.stdout,
          status: result.status?.description || 'Unknown',
          time: result.time || 'N/A',
          memory: result.memory || 'N/A',
          compilationError: result.compile_output || null,
          runtimeError: result.stderr || null
        }
      });
    } finally {
      connection.release();
    }
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
