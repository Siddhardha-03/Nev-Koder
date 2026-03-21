import express from 'express';
import pool from '../config/database.js';
import { verifyToken, verifyTokenOptional, requireAdmin } from '../middlewares/authMiddleware.js';
import { generateScaffolds } from '../utils/scaffoldGenerator.js';
import { parseBoilerplateTemplate, parseNoBoilerplateTemplate } from '../services/bulkQuestionService.js';
import XLSX from 'xlsx';

const router = express.Router();

const safeJsonParse = (value, fallback) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeQuestion = (row) => ({
  id: row.id,
  title: row.title,
  function_name: row.function_name,
  description: row.description,
  difficulty: row.difficulty,
  question_type: row.question_type,
  parameter_schema: safeJsonParse(row.parameter_schema, { params: [], returnType: '' }),
  tags: safeJsonParse(row.tags, { tags: [] }),
  examples: safeJsonParse(row.examples, []),
  has_boilerplate: Boolean(row.has_boilerplate),
  created_at: row.created_at,
  updated_at: row.updated_at
});

const getQuestionStats = async () => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN difficulty = 'Easy' THEN 1 ELSE 0 END) AS easy_count,
        SUM(CASE WHEN difficulty = 'Medium' THEN 1 ELSE 0 END) AS medium_count,
        SUM(CASE WHEN difficulty = 'Hard' THEN 1 ELSE 0 END) AS hard_count
      FROM questions`
    );
    return rows[0] || { total: 0, easy_count: 0, medium_count: 0, hard_count: 0 };
  } finally {
    connection.release();
  }
};

router.get('/public', verifyTokenOptional, async (req, res) => {
  const { search = '', difficulty = '', tag = '' } = req.query;
  const where = [];
  const values = [];

  if (search) {
    where.push('title LIKE ?');
    values.push(`%${search}%`);
  }

  if (difficulty) {
    where.push('difficulty = ?');
    values.push(difficulty);
  }

  if (tag) {
    where.push('JSON_SEARCH(tags, "one", ?) IS NOT NULL');
    values.push(tag);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.execute(
      `SELECT id, title, function_name, description, difficulty, question_type, parameter_schema, tags, examples, has_boilerplate, created_at, updated_at
       FROM questions
       ${whereClause}
       ORDER BY updated_at DESC`,
      values
    );

    const normalizedQuestions = rows.map(normalizeQuestion);
    if (!req.user?.id || normalizedQuestions.length === 0) {
      return res.json({ success: true, questions: normalizedQuestions });
    }

    const questionIds = normalizedQuestions.map((question) => question.id);
    const placeholders = questionIds.map(() => '?').join(', ');
    const [solvedRows] = await connection.execute(
      `SELECT question_id
       FROM user_solved_questions
       WHERE user_id = ? AND question_id IN (${placeholders})`,
      [req.user.id, ...questionIds]
    );

    const solvedSet = new Set(solvedRows.map((row) => Number(row.question_id)));
    const questionsWithStatus = normalizedQuestions.map((question) => ({
      ...question,
      solved: solvedSet.has(Number(question.id))
    }));

    return res.json({ success: true, questions: questionsWithStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch public questions', error: error.message });
  } finally {
    connection.release();
  }
});

router.get('/public/:id', verifyTokenOptional, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const [questionRows] = await connection.execute(
      `SELECT id, title, function_name, description, difficulty, question_type, parameter_schema, tags, examples, has_boilerplate, created_at, updated_at
       FROM questions WHERE id = ?`,
      [req.params.id]
    );

    if (questionRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const [visibleTests] = await connection.execute(
      `SELECT id, input, expected_output, hidden
       FROM test_cases
       WHERE question_id = ? AND hidden = FALSE
       ORDER BY id ASC`,
      [req.params.id]
    );

    const normalizedQuestion = normalizeQuestion(questionRows[0]);
    const scaffolds = generateScaffolds(normalizedQuestion, ['java', 'python', 'javascript', 'cpp']);

    let solved = false;
    if (req.user?.id) {
      const [solvedRows] = await connection.execute(
        `SELECT 1
         FROM user_solved_questions
         WHERE user_id = ? AND question_id = ?
         LIMIT 1`,
        [req.user.id, req.params.id]
      );
      solved = solvedRows.length > 0;
    }

    res.json({
      success: true,
      question: {
        ...normalizedQuestion,
        solved,
        scaffolds,
        testCases: visibleTests.map((tc) => ({ ...tc, hidden: Boolean(tc.hidden) }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch question details', error: error.message });
  } finally {
    connection.release();
  }
});

router.get('/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const stats = await getQuestionStats();
    res.json({
      success: true,
      stats: {
        total: Number(stats.total || 0),
        easy: Number(stats.easy_count || 0),
        medium: Number(stats.medium_count || 0),
        hard: Number(stats.hard_count || 0)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch question stats', error: error.message });
  }
});

router.get('/', verifyToken, requireAdmin, async (req, res) => {
  const { search = '', difficulty = '' } = req.query;
  const where = [];
  const values = [];

  if (search) {
    where.push('title LIKE ?');
    values.push(`%${search}%`);
  }

  if (difficulty) {
    where.push('difficulty = ?');
    values.push(difficulty);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT id, title, function_name, description, difficulty, question_type, parameter_schema, tags, examples, has_boilerplate, created_at, updated_at
       FROM questions
       ${whereClause}
       ORDER BY updated_at DESC`,
      values
    );

    res.json({ success: true, questions: rows.map(normalizeQuestion) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch questions', error: error.message });
  } finally {
    connection.release();
  }
});

router.get('/:id', verifyToken, requireAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [questionRows] = await connection.execute(
      `SELECT id, title, function_name, description, difficulty, question_type, parameter_schema, tags, examples, has_boilerplate, created_at, updated_at
       FROM questions WHERE id = ?`,
      [req.params.id]
    );

    if (questionRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const [testRows] = await connection.execute(
      `SELECT id, input, expected_output, hidden, created_at, updated_at
       FROM test_cases
       WHERE question_id = ?
       ORDER BY id ASC`,
      [req.params.id]
    );

    res.json({
      success: true,
      question: {
        ...normalizeQuestion(questionRows[0]),
        testCases: testRows.map((tc) => ({
          ...tc,
          hidden: Boolean(tc.hidden)
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch question', error: error.message });
  } finally {
    connection.release();
  }
});

router.post('/', verifyToken, requireAdmin, async (req, res) => {
  const {
    title,
    function_name,
    description,
    difficulty,
    question_type,
    parameter_schema,
    tags,
    examples,
    has_boilerplate,
    testCases = []
  } = req.body;

  if (!title || !description || !difficulty) {
    return res.status(400).json({ success: false, message: 'Title, description and difficulty are required' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO questions
      (title, function_name, description, difficulty, question_type, parameter_schema, tags, examples, has_boilerplate, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        function_name || null,
        description,
        difficulty,
        question_type || null,
        JSON.stringify(parameter_schema || { params: [], returnType: '' }),
        JSON.stringify(tags || { tags: [] }),
        JSON.stringify(examples || []),
        Boolean(has_boilerplate),
        req.user.id
      ]
    );

    for (const testCase of testCases) {
      await connection.execute(
        `INSERT INTO test_cases (question_id, input, expected_output, hidden)
         VALUES (?, ?, ?, ?)`,
        [result.insertId, testCase.input || '', testCase.expected_output || '', Boolean(testCase.hidden)]
      );
    }

    await connection.commit();
    res.status(201).json({ success: true, message: 'Question created successfully', id: result.insertId });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: 'Failed to create question', error: error.message });
  } finally {
    connection.release();
  }
});

router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  const {
    title,
    function_name,
    description,
    difficulty,
    question_type,
    parameter_schema,
    tags,
    examples,
    has_boilerplate,
    testCases = []
  } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [updateResult] = await connection.execute(
      `UPDATE questions
       SET title = ?, function_name = ?, description = ?, difficulty = ?, question_type = ?,
           parameter_schema = ?, tags = ?, examples = ?, has_boilerplate = ?
       WHERE id = ?`,
      [
        title,
        function_name || null,
        description,
        difficulty,
        question_type || null,
        JSON.stringify(parameter_schema || { params: [], returnType: '' }),
        JSON.stringify(tags || { tags: [] }),
        JSON.stringify(examples || []),
        Boolean(has_boilerplate),
        req.params.id
      ]
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    await connection.execute('DELETE FROM test_cases WHERE question_id = ?', [req.params.id]);

    for (const testCase of testCases) {
      await connection.execute(
        `INSERT INTO test_cases (question_id, input, expected_output, hidden)
         VALUES (?, ?, ?, ?)`,
        [req.params.id, testCase.input || '', testCase.expected_output || '', Boolean(testCase.hidden)]
      );
    }

    await connection.commit();
    res.json({ success: true, message: 'Question updated successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: 'Failed to update question', error: error.message });
  } finally {
    connection.release();
  }
});

router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute('DELETE FROM questions WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete question', error: error.message });
  } finally {
    connection.release();
  }
});

// Download boilerplate template
router.get('/templates/boilerplate', verifyToken, requireAdmin, (req, res) => {
  try {
    const templateData = [
      {
        'Title': 'Two Sum',
        'Function Name': 'twoSum',
        'Difficulty': 'Easy',
        'Question Type': 'array',
        'Tags': 'array, hash-table, two-pointer',
        'Return Type': 'List[int]',
        'Param 1 Name': 'nums',
        'Param 1 Type': 'List[int]',
        'Param 2 Name': 'target',
        'Param 2 Type': 'int',
        'Description': 'Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target. You may assume that each input has exactly one solution, and you may not use the same element twice.',
        'Examples': JSON.stringify([
          {
            input: 'nums = [2,7,11,15], target = 9',
            output: '[0,1]',
            explanation: 'The sum of 2 and 7 is 9. Therefore, index0 = 0, index1 = 1. We return [0, 1].'
          }
        ]),
        'Test Cases': JSON.stringify([
          {
            input: '[2,7,11,15]\n9',
            expected_output: '[0,1]',
            hidden: false
          }
        ])
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet['!cols'] = [
      { wch: 20 },
      { wch: 20 },
      { wch: 12 },
      { wch: 18 },
      { wch: 30 },
      { wch: 15 },
      { wch: 18 },
      { wch: 15 },
      { wch: 18 },
      { wch: 15 },
      { wch: 40 },
      { wch: 50 },
      { wch: 50 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="boilerplate_template.xlsx"');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate template', error: error.message });
  }
});

// Download no-boilerplate template
router.get('/templates/no-boilerplate', verifyToken, requireAdmin, (req, res) => {
  try {
    const templateData = [
      {
        'Title': 'Simple Math Problem',
        'Difficulty': 'Easy',
        'Question Type': 'math',
        'Tags': 'math, primitives',
        'Description': 'Write a program that reads two integers and outputs their sum and product.',
        'Examples': JSON.stringify([
          {
            input: '5\n3',
            output: '8\n15',
            explanation: 'Sum of 5 and 3 is 8, product is 15.'
          }
        ]),
        'Test Cases': JSON.stringify([
          {
            input: '5\n3',
            expected_output: '8\n15',
            hidden: false
          },
          {
            input: '10\n20',
            expected_output: '30\n200',
            hidden: false
          }
        ])
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet['!cols'] = [
      { wch: 20 },
      { wch: 12 },
      { wch: 18 },
      { wch: 30 },
      { wch: 40 },
      { wch: 50 },
      { wch: 50 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="no_boilerplate_template.xlsx"');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate template', error: error.message });
  }
});

// Bulk upload boilerplate questions
router.post('/bulk-upload/boilerplate', verifyToken, requireAdmin, async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileBuffer = req.files.file.data;
    const { questions, errors: parseErrors } = parseBoilerplateTemplate(fileBuffer);

    if (parseErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'File contains validation errors',
        errors: parseErrors
      });
    }

    if (questions.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid questions found in file' });
    }

    const connection = await pool.getConnection();
    const createdIds = [];
    const errors = [];

    try {
      await connection.beginTransaction();

      for (const { rowNum, question } of questions) {
        try {
          const [result] = await connection.execute(
            `INSERT INTO questions
            (title, function_name, description, difficulty, question_type, parameter_schema, tags, examples, has_boilerplate, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              question.title,
              question.function_name,
              question.description,
              question.difficulty,
              question.question_type || null,
              JSON.stringify(question.parameter_schema || { params: [], returnType: '' }),
              JSON.stringify(question.tags || { tags: [] }),
              JSON.stringify(question.examples || []),
              Boolean(question.has_boilerplate),
              req.user.id
            ]
          );

          const questionId = result.insertId;
          createdIds.push(questionId);

          // Insert test cases
          for (const testCase of (question.testCases || [])) {
            await connection.execute(
              `INSERT INTO test_cases (question_id, input, expected_output, hidden)
               VALUES (?, ?, ?, ?)`,
              [questionId, testCase.input || '', testCase.expected_output || '', Boolean(testCase.hidden)]
            );
          }
        } catch (error) {
          errors.push({
            row: rowNum,
            title: question.title,
            message: error.message
          });
        }
      }

      await connection.commit();

      res.json({
        success: true,
        message: `Successfully created ${createdIds.length} questions`,
        createdCount: createdIds.length,
        totalRows: questions.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      await connection.rollback();
      res.status(500).json({ success: false, message: 'Failed to upload questions', error: error.message });
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to process file', error: error.message });
  }
});

// Bulk upload no-boilerplate questions
router.post('/bulk-upload/no-boilerplate', verifyToken, requireAdmin, async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileBuffer = req.files.file.data;
    const { questions, errors: parseErrors } = parseNoBoilerplateTemplate(fileBuffer);

    if (parseErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'File contains validation errors',
        errors: parseErrors
      });
    }

    if (questions.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid questions found in file' });
    }

    const connection = await pool.getConnection();
    const createdIds = [];
    const errors = [];

    try {
      await connection.beginTransaction();

      for (const { rowNum, question } of questions) {
        try {
          const [result] = await connection.execute(
            `INSERT INTO questions
            (title, function_name, description, difficulty, question_type, parameter_schema, tags, examples, has_boilerplate, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              question.title,
              question.function_name || null,
              question.description,
              question.difficulty,
              question.question_type || null,
              JSON.stringify(question.parameter_schema || { params: [], returnType: '' }),
              JSON.stringify(question.tags || { tags: [] }),
              JSON.stringify(question.examples || []),
              Boolean(question.has_boilerplate),
              req.user.id
            ]
          );

          const questionId = result.insertId;
          createdIds.push(questionId);

          // Insert test cases
          for (const testCase of (question.testCases || [])) {
            await connection.execute(
              `INSERT INTO test_cases (question_id, input, expected_output, hidden)
               VALUES (?, ?, ?, ?)`,
              [questionId, testCase.input || '', testCase.expected_output || '', Boolean(testCase.hidden)]
            );
          }
        } catch (error) {
          errors.push({
            row: rowNum,
            title: question.title,
            message: error.message
          });
        }
      }

      await connection.commit();

      res.json({
        success: true,
        message: `Successfully created ${createdIds.length} questions`,
        createdCount: createdIds.length,
        totalRows: questions.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      await connection.rollback();
      res.status(500).json({ success: false, message: 'Failed to upload questions', error: error.message });
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to process file', error: error.message });
  }
});

export default router;
