import express from 'express';
import bcrypt from 'bcryptjs';
import XLSX from 'xlsx';
import pool from '../config/database.js';
import { verifyToken, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

const parseQuestionIds = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
};

const parseUtcDateInput = (value, fieldName) => {
  if (value === undefined) {
    return { provided: false, value: undefined };
  }

  if (value === null || value === '') {
    return { provided: true, value: null };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { provided: true, error: `${fieldName} must be a valid UTC datetime` };
  }

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  const hours = String(parsed.getUTCHours()).padStart(2, '0');
  const minutes = String(parsed.getUTCMinutes()).padStart(2, '0');
  const seconds = String(parsed.getUTCSeconds()).padStart(2, '0');

  return {
    provided: true,
    value: `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  };
};

const parseStoredUtcDate = (value) => {
  if (!value) return null;
  const dateTimeText = value instanceof Date
    ? value.toISOString()
    : String(value).includes('T')
      ? String(value)
      : String(value).replace(' ', 'T');
  const withZone = /Z$|[+-]\d{2}:\d{2}$/.test(dateTimeText) ? dateTimeText : `${dateTimeText}Z`;
  const parsed = new Date(withZone);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

router.get('/users', verifyToken, requireAdmin, async (_req, res) => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT id, name, email, role, is_verified, created_at, updated_at
       FROM users
       ORDER BY created_at DESC`
    );

    return res.json({
      success: true,
      users: rows.map((user) => ({
        ...user,
        is_verified: Boolean(user.is_verified)
      }))
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
  } finally {
    connection.release();
  }
});

router.post('/users', verifyToken, requireAdmin, async (req, res) => {
  const { name, email, password, role = 'user', verified = true } = req.body;
  const normalizedName = String(name || '').trim();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const requestedRole = String(role || 'user').trim().toLowerCase();
  const normalizedRole = 'user';

  if (!normalizedName || !normalizedEmail || !password) {
    return res.status(400).json({ success: false, message: 'Name, email and password are required' });
  }

  if (requestedRole !== 'user') {
    return res.status(403).json({ success: false, message: 'Admins can only create users with role user' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  }

  const connection = await pool.getConnection();
  try {
    const [existingUsers] = await connection.execute('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await connection.execute(
      `INSERT INTO users (name, email, password_hash, role, is_verified)
       VALUES (?, ?, ?, ?, ?)`,
      [normalizedName, normalizedEmail, passwordHash, normalizedRole, Boolean(verified)]
    );

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: result.insertId,
        name: normalizedName,
        email: normalizedEmail,
        role: normalizedRole,
        is_verified: Boolean(verified)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create user', error: error.message });
  } finally {
    connection.release();
  }
});

router.delete('/users/:id', verifyToken, requireAdmin, async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid user id' });
  }

  if (Number(req.user.id) === userId) {
    return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
  }

  const connection = await pool.getConnection();
  try {
    const [existingUsers] = await connection.execute('SELECT id FROM users WHERE id = ?', [userId]);
    if (existingUsers.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await connection.execute('DELETE FROM users WHERE id = ?', [userId]);
    return res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete user', error: error.message });
  } finally {
    connection.release();
  }
});

router.get('/assessments', verifyToken, requireAdmin, async (_req, res) => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT a.id,
              a.title,
              a.description,
              a.type,
              a.difficulty,
              a.category,
              a.time_limit_minutes,
              a.created_at,
              a.updated_at,
              COUNT(aq.question_id) AS question_count
       FROM assessments a
       LEFT JOIN assessment_questions aq ON aq.assessment_id = a.id
       GROUP BY a.id
       ORDER BY a.updated_at DESC`
    );

    return res.json({
      success: true,
      assessments: rows.map((assessment) => ({
        ...assessment,
        question_count: Number(assessment.question_count || 0),
        time_limit_minutes: assessment.time_limit_minutes === null ? null : Number(assessment.time_limit_minutes)
      }))
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch assessments', error: error.message });
  } finally {
    connection.release();
  }
});

router.post('/assessments', verifyToken, requireAdmin, async (req, res) => {
  const {
    title,
    description = '',
    type = 'assessment',
    difficulty = null,
    category = null,
    timeLimitMinutes = null,
    questionIds = []
  } = req.body;

  const normalizedTitle = String(title || '').trim();
  const normalizedDescription = String(description || '').trim();
  const normalizedType = type === 'assignment' ? 'assignment' : 'assessment';
  const normalizedDifficulty = difficulty ? String(difficulty).trim() : null;
  const normalizedCategory = category ? String(category).trim() : null;
  const normalizedTimeLimit = timeLimitMinutes === null || timeLimitMinutes === undefined || timeLimitMinutes === ''
    ? null
    : Number(timeLimitMinutes);
  const normalizedQuestionIds = parseQuestionIds(questionIds);

  if (!normalizedTitle) {
    return res.status(400).json({ success: false, message: 'Title is required' });
  }

  if (normalizedQuestionIds.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one question is required' });
  }

  if (normalizedTimeLimit !== null && (!Number.isInteger(normalizedTimeLimit) || normalizedTimeLimit <= 0)) {
    return res.status(400).json({ success: false, message: 'Time limit must be a positive integer' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const placeholders = normalizedQuestionIds.map(() => '?').join(', ');
    const [existingQuestions] = await connection.execute(
      `SELECT id FROM questions WHERE id IN (${placeholders})`,
      normalizedQuestionIds
    );

    const existingSet = new Set(existingQuestions.map((row) => Number(row.id)));
    const missing = normalizedQuestionIds.filter((id) => !existingSet.has(id));
    if (missing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: `Some selected questions are missing: ${missing.join(', ')}` });
    }

    const [result] = await connection.execute(
      `INSERT INTO assessments (title, description, type, difficulty, category, time_limit_minutes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        normalizedTitle,
        normalizedDescription,
        normalizedType,
        normalizedDifficulty,
        normalizedCategory,
        normalizedTimeLimit,
        req.user.id
      ]
    );

    for (let i = 0; i < normalizedQuestionIds.length; i += 1) {
      await connection.execute(
        `INSERT INTO assessment_questions (assessment_id, question_id, question_order)
         VALUES (?, ?, ?)`,
        [result.insertId, normalizedQuestionIds[i], i + 1]
      );
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: `${normalizedType === 'assignment' ? 'Assignment' : 'Assessment'} created successfully`,
      assessment: {
        id: result.insertId,
        title: normalizedTitle,
        description: normalizedDescription,
        type: normalizedType,
        difficulty: normalizedDifficulty,
        category: normalizedCategory,
        time_limit_minutes: normalizedTimeLimit,
        question_count: normalizedQuestionIds.length
      }
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: 'Failed to create assessment', error: error.message });
  } finally {
    connection.release();
  }
});

router.delete('/assessments/:id', verifyToken, requireAdmin, async (req, res) => {
  const assessmentId = Number(req.params.id);
  if (!Number.isInteger(assessmentId) || assessmentId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid assessment id' });
  }

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute('SELECT id FROM assessments WHERE id = ?', [assessmentId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }

    await connection.execute('DELETE FROM assessments WHERE id = ?', [assessmentId]);
    return res.json({ success: true, message: 'Assessment deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete assessment', error: error.message });
  } finally {
    connection.release();
  }
});

router.get('/quizzes', verifyToken, requireAdmin, async (_req, res) => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT q.id,
              q.title,
              q.description,
              q.difficulty,
              q.is_proctored,
              q.scheduling_enabled,
              q.available_from_utc,
              q.available_until_utc,
              q.time_limit_minutes,
              q.passing_score,
              q.max_attempts,
              q.auto_submit_on_violation,
              q.violation_auto_submit_threshold,
              q.status,
              q.created_at,
              q.updated_at,
              COUNT(qq.id) AS question_count
       FROM quizzes q
       LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
       GROUP BY q.id
       ORDER BY q.updated_at DESC`
    );

    return res.json({
      success: true,
      quizzes: rows.map((quiz) => ({
        ...quiz,
        question_count: Number(quiz.question_count || 0),
        is_proctored: Boolean(quiz.is_proctored),
        scheduling_enabled: Boolean(quiz.scheduling_enabled),
        available_from_utc: parseStoredUtcDate(quiz.available_from_utc)?.toISOString() || null,
        available_until_utc: parseStoredUtcDate(quiz.available_until_utc)?.toISOString() || null,
        auto_submit_on_violation: Boolean(quiz.auto_submit_on_violation),
        max_attempts: Number(quiz.max_attempts || 0),
        time_limit_minutes: Number(quiz.time_limit_minutes || 0),
        passing_score: Number(quiz.passing_score || 0),
        violation_auto_submit_threshold: quiz.violation_auto_submit_threshold === null
          ? null
          : Number(quiz.violation_auto_submit_threshold)
      }))
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch quizzes', error: error.message });
  } finally {
    connection.release();
  }
});

router.get('/quizzes/:id', verifyToken, requireAdmin, async (req, res) => {
  const quizId = Number(req.params.id);
  if (!Number.isInteger(quizId) || quizId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid quiz id' });
  }

  const connection = await pool.getConnection();
  try {
    const [[quiz]] = await connection.execute(
      `SELECT id,
              title,
              description,
              difficulty,
              is_proctored,
              scheduling_enabled,
              available_from_utc,
              available_until_utc,
              time_limit_minutes,
              passing_score,
              max_attempts,
              auto_submit_on_violation,
              violation_auto_submit_threshold,
              status,
              created_at,
              updated_at
       FROM quizzes
       WHERE id = ?`,
      [quizId]
    );

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const [questionRows] = await connection.execute(
      `SELECT COUNT(*) AS question_count
       FROM quiz_questions
       WHERE quiz_id = ?`,
      [quizId]
    );

    return res.json({
      success: true,
      quiz: {
        ...quiz,
        question_count: Number(questionRows[0]?.question_count || 0),
        is_proctored: Boolean(quiz.is_proctored),
        scheduling_enabled: Boolean(quiz.scheduling_enabled),
        available_from_utc: parseStoredUtcDate(quiz.available_from_utc)?.toISOString() || null,
        available_until_utc: parseStoredUtcDate(quiz.available_until_utc)?.toISOString() || null,
        auto_submit_on_violation: Boolean(quiz.auto_submit_on_violation),
        max_attempts: Number(quiz.max_attempts || 0),
        time_limit_minutes: Number(quiz.time_limit_minutes || 0),
        passing_score: Number(quiz.passing_score || 0),
        violation_auto_submit_threshold: quiz.violation_auto_submit_threshold === null
          ? null
          : Number(quiz.violation_auto_submit_threshold)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch quiz details', error: error.message });
  } finally {
    connection.release();
  }
});

router.post('/quizzes', verifyToken, requireAdmin, async (req, res) => {
  const {
    title,
    description = '',
    difficulty = 'Easy',
    isProctored = false,
    timeLimitMinutes = 15,
    passingScore = 60,
    maxAttempts = 3,
    autoSubmitOnViolation = false,
    violationAutoSubmitThreshold = null,
    schedulingEnabled = false,
    availableFromUtc,
    availableUntilUtc,
    status = 'draft'
  } = req.body;

  const normalizedTitle = String(title || '').trim();
  const normalizedDescription = String(description || '').trim();
  const normalizedDifficulty = ['Easy', 'Medium', 'Hard'].includes(String(difficulty)) ? String(difficulty) : 'Easy';
  const normalizedStatus = ['draft', 'published', 'archived'].includes(String(status)) ? String(status) : 'draft';
  const normalizedTimeLimit = Number(timeLimitMinutes);
  const normalizedPassingScore = Number(passingScore);
  const normalizedMaxAttempts = Number(maxAttempts);
  const normalizedThreshold = violationAutoSubmitThreshold === null || violationAutoSubmitThreshold === ''
    ? null
    : Number(violationAutoSubmitThreshold);
  const normalizedSchedulingEnabled = Boolean(schedulingEnabled);
  const parsedAvailableFrom = parseUtcDateInput(availableFromUtc, 'availableFromUtc');
  const parsedAvailableUntil = parseUtcDateInput(availableUntilUtc, 'availableUntilUtc');

  if (!normalizedTitle) {
    return res.status(400).json({ success: false, message: 'Quiz title is required' });
  }

  if (!Number.isInteger(normalizedTimeLimit) || normalizedTimeLimit <= 0) {
    return res.status(400).json({ success: false, message: 'Time limit must be a positive integer' });
  }

  if (!Number.isInteger(normalizedPassingScore) || normalizedPassingScore < 0 || normalizedPassingScore > 100) {
    return res.status(400).json({ success: false, message: 'Passing score must be between 0 and 100' });
  }

  if (!Number.isInteger(normalizedMaxAttempts) || normalizedMaxAttempts <= 0) {
    return res.status(400).json({ success: false, message: 'Max attempts must be a positive integer' });
  }

  if (normalizedThreshold !== null && (!Number.isInteger(normalizedThreshold) || normalizedThreshold <= 0)) {
    return res.status(400).json({ success: false, message: 'Violation threshold must be a positive integer' });
  }

  if (parsedAvailableFrom.error) {
    return res.status(400).json({ success: false, message: parsedAvailableFrom.error });
  }

  if (parsedAvailableUntil.error) {
    return res.status(400).json({ success: false, message: parsedAvailableUntil.error });
  }

  if (normalizedSchedulingEnabled && parsedAvailableFrom.value === null) {
    return res.status(400).json({ success: false, message: 'availableFromUtc is required when scheduling is enabled' });
  }

  if (parsedAvailableFrom.value && parsedAvailableUntil.value) {
    const fromTime = parseStoredUtcDate(parsedAvailableFrom.value);
    const untilTime = parseStoredUtcDate(parsedAvailableUntil.value);
    if (fromTime && untilTime && untilTime.getTime() <= fromTime.getTime()) {
      return res.status(400).json({ success: false, message: 'availableUntilUtc must be after availableFromUtc' });
    }
  }

  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(
      `INSERT INTO quizzes
       (title, description, difficulty, is_proctored, time_limit_minutes, passing_score, max_attempts,
        auto_submit_on_violation, violation_auto_submit_threshold, scheduling_enabled,
        available_from_utc, available_until_utc, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        normalizedTitle,
        normalizedDescription,
        normalizedDifficulty,
        Boolean(isProctored),
        normalizedTimeLimit,
        normalizedPassingScore,
        normalizedMaxAttempts,
        Boolean(autoSubmitOnViolation),
        normalizedThreshold,
        normalizedSchedulingEnabled,
        parsedAvailableFrom.value,
        parsedAvailableUntil.value,
        normalizedStatus,
        req.user.id
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Quiz created successfully',
      quiz: {
        id: result.insertId,
        title: normalizedTitle,
        difficulty: normalizedDifficulty,
        is_proctored: Boolean(isProctored),
        time_limit_minutes: normalizedTimeLimit,
        passing_score: normalizedPassingScore,
        max_attempts: normalizedMaxAttempts,
        auto_submit_on_violation: Boolean(autoSubmitOnViolation),
        violation_auto_submit_threshold: normalizedThreshold,
        scheduling_enabled: normalizedSchedulingEnabled,
        available_from_utc: parseStoredUtcDate(parsedAvailableFrom.value)?.toISOString() || null,
        available_until_utc: parseStoredUtcDate(parsedAvailableUntil.value)?.toISOString() || null,
        status: normalizedStatus
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create quiz', error: error.message });
  } finally {
    connection.release();
  }
});

router.put('/quizzes/:id', verifyToken, requireAdmin, async (req, res) => {
  const quizId = Number(req.params.id);
  if (!Number.isInteger(quizId) || quizId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid quiz id' });
  }

  const fields = {
    title: req.body.title,
    description: req.body.description,
    difficulty: req.body.difficulty,
    is_proctored: req.body.isProctored,
    time_limit_minutes: req.body.timeLimitMinutes,
    passing_score: req.body.passingScore,
    max_attempts: req.body.maxAttempts,
    auto_submit_on_violation: req.body.autoSubmitOnViolation,
    violation_auto_submit_threshold: req.body.violationAutoSubmitThreshold,
    scheduling_enabled: req.body.schedulingEnabled,
    available_from_utc: undefined,
    available_until_utc: undefined,
    status: req.body.status
  };

  const parsedAvailableFrom = parseUtcDateInput(req.body.availableFromUtc, 'availableFromUtc');
  const parsedAvailableUntil = parseUtcDateInput(req.body.availableUntilUtc, 'availableUntilUtc');

  if (parsedAvailableFrom.error) {
    return res.status(400).json({ success: false, message: parsedAvailableFrom.error });
  }

  if (parsedAvailableUntil.error) {
    return res.status(400).json({ success: false, message: parsedAvailableUntil.error });
  }

  if (parsedAvailableFrom.provided) {
    fields.available_from_utc = parsedAvailableFrom.value;
  }

  if (parsedAvailableUntil.provided) {
    fields.available_until_utc = parsedAvailableUntil.value;
  }

  const setClauses = [];
  const values = [];

  for (const [key, rawValue] of Object.entries(fields)) {
    if (rawValue === undefined) continue;
    setClauses.push(`${key} = ?`);
    values.push(rawValue);
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ success: false, message: 'No update fields provided' });
  }

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT id, scheduling_enabled, available_from_utc, available_until_utc
       FROM quizzes
       WHERE id = ?`,
      [quizId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const existing = rows[0];
    const resultingSchedulingEnabled = fields.scheduling_enabled !== undefined
      ? Boolean(fields.scheduling_enabled)
      : Boolean(existing.scheduling_enabled);

    const resultingAvailableFrom = fields.available_from_utc !== undefined
      ? fields.available_from_utc
      : existing.available_from_utc;

    const resultingAvailableUntil = fields.available_until_utc !== undefined
      ? fields.available_until_utc
      : existing.available_until_utc;

    if (resultingSchedulingEnabled && !resultingAvailableFrom) {
      return res.status(400).json({ success: false, message: 'availableFromUtc is required when scheduling is enabled' });
    }

    if (resultingAvailableFrom && resultingAvailableUntil) {
      const fromTime = parseStoredUtcDate(resultingAvailableFrom);
      const untilTime = parseStoredUtcDate(resultingAvailableUntil);

      if (fromTime && untilTime && untilTime.getTime() <= fromTime.getTime()) {
        return res.status(400).json({ success: false, message: 'availableUntilUtc must be after availableFromUtc' });
      }
    }

    values.push(quizId);
    await connection.execute(
      `UPDATE quizzes
       SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      values
    );

    return res.json({ success: true, message: 'Quiz updated successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update quiz', error: error.message });
  } finally {
    connection.release();
  }
});

router.delete('/quizzes/:id', verifyToken, requireAdmin, async (req, res) => {
  const quizId = Number(req.params.id);
  if (!Number.isInteger(quizId) || quizId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid quiz id' });
  }

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute('SELECT id FROM quizzes WHERE id = ?', [quizId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    await connection.execute('DELETE FROM quizzes WHERE id = ?', [quizId]);
    return res.json({ success: true, message: 'Quiz deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete quiz', error: error.message });
  } finally {
    connection.release();
  }
});

router.get('/quizzes/:id/questions', verifyToken, requireAdmin, async (req, res) => {
  const quizId = Number(req.params.id);
  if (!Number.isInteger(quizId) || quizId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid quiz id' });
  }

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, question_order, points
       FROM quiz_questions
       WHERE quiz_id = ?
       ORDER BY question_order ASC`,
      [quizId]
    );

    return res.json({ success: true, questions: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch quiz questions', error: error.message });
  } finally {
    connection.release();
  }
});

router.post('/quizzes/:id/questions', verifyToken, requireAdmin, async (req, res) => {
  const quizId = Number(req.params.id);
  const {
    questionText,
    optionA,
    optionB,
    optionC,
    optionD,
    correctOption,
    explanation = '',
    questionOrder,
    points = 1
  } = req.body;

  if (!Number.isInteger(quizId) || quizId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid quiz id' });
  }

  const normalizedCorrect = String(correctOption || '').trim().toUpperCase();
  if (!['A', 'B', 'C', 'D'].includes(normalizedCorrect)) {
    return res.status(400).json({ success: false, message: 'Correct option must be A, B, C, or D' });
  }

  if (!questionText || !optionA || !optionB || !optionC || !optionD) {
    return res.status(400).json({ success: false, message: 'Question text and all options are required' });
  }

  const orderValue = Number(questionOrder);
  const pointsValue = Number(points);

  if (!Number.isInteger(orderValue) || orderValue <= 0) {
    return res.status(400).json({ success: false, message: 'Question order must be a positive integer' });
  }

  if (!Number.isInteger(pointsValue) || pointsValue <= 0) {
    return res.status(400).json({ success: false, message: 'Points must be a positive integer' });
  }

  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(
      `INSERT INTO quiz_questions
       (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, question_order, points)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [quizId, questionText, optionA, optionB, optionC, optionD, normalizedCorrect, explanation, orderValue, pointsValue]
    );

    return res.status(201).json({
      success: true,
      message: 'Quiz question added successfully',
      question: {
        id: result.insertId,
        quiz_id: quizId,
        question_order: orderValue,
        points: pointsValue,
        correct_option: normalizedCorrect
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to add quiz question', error: error.message });
  } finally {
    connection.release();
  }
});

router.put('/quizzes/:id/questions/:questionId', verifyToken, requireAdmin, async (req, res) => {
  const quizId = Number(req.params.id);
  const questionId = Number(req.params.questionId);

  if (!Number.isInteger(quizId) || quizId <= 0 || !Number.isInteger(questionId) || questionId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid quiz or question id' });
  }

  const updates = {
    question_text: req.body.questionText,
    option_a: req.body.optionA,
    option_b: req.body.optionB,
    option_c: req.body.optionC,
    option_d: req.body.optionD,
    correct_option: req.body.correctOption ? String(req.body.correctOption).trim().toUpperCase() : undefined,
    explanation: req.body.explanation,
    question_order: req.body.questionOrder,
    points: req.body.points
  };

  if (updates.correct_option && !['A', 'B', 'C', 'D'].includes(updates.correct_option)) {
    return res.status(400).json({ success: false, message: 'Correct option must be A, B, C, or D' });
  }

  const setClauses = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    setClauses.push(`${key} = ?`);
    values.push(value);
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ success: false, message: 'No update fields provided' });
  }

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT id FROM quiz_questions WHERE id = ? AND quiz_id = ?',
      [questionId, quizId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Quiz question not found' });
    }

    values.push(questionId, quizId);
    await connection.execute(
      `UPDATE quiz_questions
       SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND quiz_id = ?`,
      values
    );

    return res.json({ success: true, message: 'Quiz question updated successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update quiz question', error: error.message });
  } finally {
    connection.release();
  }
});

router.delete('/quizzes/:id/questions/:questionId', verifyToken, requireAdmin, async (req, res) => {
  const quizId = Number(req.params.id);
  const questionId = Number(req.params.questionId);

  if (!Number.isInteger(quizId) || quizId <= 0 || !Number.isInteger(questionId) || questionId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid quiz or question id' });
  }

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT id FROM quiz_questions WHERE id = ? AND quiz_id = ?',
      [questionId, quizId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Quiz question not found' });
    }

    await connection.execute('DELETE FROM quiz_questions WHERE id = ? AND quiz_id = ?', [questionId, quizId]);
    return res.json({ success: true, message: 'Quiz question deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete quiz question', error: error.message });
  } finally {
    connection.release();
  }
});

router.get('/quizzes/:id/export', verifyToken, requireAdmin, async (req, res) => {
  const quizId = Number(req.params.id);
  if (!Number.isInteger(quizId) || quizId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid quiz id' });
  }

  const connection = await pool.getConnection();
  try {
    const [[quiz]] = await connection.execute('SELECT id, title FROM quizzes WHERE id = ?', [quizId]);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const [rows] = await connection.execute(
      `SELECT u.id AS user_id,
              u.name,
              u.email,
              qa.attempt_number,
              qa.status,
              qa.score,
              qa.total_points,
              qa.accuracy_percent,
              qa.time_spent_seconds,
              qa.passed,
              qa.tab_switch_count,
              qa.violation_count,
              qa.started_at,
              qa.submitted_at
       FROM quiz_attempts qa
       JOIN users u ON u.id = qa.user_id
       WHERE qa.quiz_id = ?
       ORDER BY qa.submitted_at DESC, qa.started_at DESC`,
      [quizId]
    );

    const exportRows = rows.map((row) => ({
      'User ID': row.user_id,
      Name: row.name,
      Email: row.email,
      'Attempt #': Number(row.attempt_number || 0),
      Status: row.status,
      Score: Number(row.score || 0),
      'Total Points': Number(row.total_points || 0),
      'Accuracy %': Number(row.accuracy_percent || 0),
      'Time Taken (sec)': Number(row.time_spent_seconds || 0),
      Passed: Boolean(row.passed) ? 'Yes' : 'No',
      'Tab Switch Count': Number(row.tab_switch_count || 0),
      'Violation Count': Number(row.violation_count || 0),
      'Started At': row.started_at,
      'Submitted At': row.submitted_at
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Quiz Results');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    const safeTitle = String(quiz.title || 'quiz').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle || 'quiz'}-results.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to export quiz results', error: error.message });
  } finally {
    connection.release();
  }
});

export default router;
