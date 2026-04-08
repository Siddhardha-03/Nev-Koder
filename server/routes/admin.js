import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { verifyToken, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

const parseQuestionIds = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
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

export default router;
