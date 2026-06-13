import express from 'express';
import pool from '../config/database.js';
import { verifyToken, verifyTokenOptional } from '../middlewares/authMiddleware.js';

const router = express.Router();

const parseUtcDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const normalized = String(value).trim();
  if (!normalized) return null;

  const dateTimeText = normalized.includes('T') ? normalized : normalized.replace(' ', 'T');
  const hasTimeZone = /Z$|[+-]\d{2}:\d{2}$/.test(dateTimeText);
  const parsed = new Date(hasTimeZone ? dateTimeText : `${dateTimeText}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const serializeUtcDate = (value) => {
  const parsed = parseUtcDate(value);
  return parsed ? parsed.toISOString() : null;
};

const getQuizAvailabilityStatus = (quiz, nowMs = Date.now()) => {
  if (!Boolean(quiz?.scheduling_enabled)) {
    return 'available';
  }

  const availableFrom = parseUtcDate(quiz.available_from_utc);
  const availableUntil = parseUtcDate(quiz.available_until_utc);

  if (availableFrom && nowMs < availableFrom.getTime()) {
    return 'coming_soon';
  }

  if (availableUntil && nowMs > availableUntil.getTime()) {
    return 'expired';
  }

  return 'available';
};

const clampAnswer = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  return ['A', 'B', 'C', 'D'].includes(normalized) ? normalized : null;
};

const finalizeAttempt = async (connection, attemptId, mode = 'submitted') => {
  const [[attempt]] = await connection.execute(
    `SELECT qa.id, qa.quiz_id, qa.user_id, qa.started_at, q.passing_score
     FROM quiz_attempts qa
     JOIN quizzes q ON q.id = qa.quiz_id
     WHERE qa.id = ?
     LIMIT 1`,
    [attemptId]
  );

  if (!attempt) {
    return { success: false, message: 'Attempt not found' };
  }

  if (attempt.status && attempt.status !== 'in_progress') {
    const [[existing]] = await connection.execute(
      `SELECT id, score, total_points, accuracy_percent, time_spent_seconds, passed, tab_switch_count, violation_count, status
       FROM quiz_attempts
       WHERE id = ?`,
      [attemptId]
    );

    return {
      success: true,
      alreadySubmitted: true,
      result: existing
    };
  }

  const [rows] = await connection.execute(
    `SELECT qq.id,
            qq.correct_option,
            qq.points,
            qa.selected_option
     FROM quiz_questions qq
     LEFT JOIN quiz_attempt_answers qa ON qa.quiz_question_id = qq.id AND qa.attempt_id = ?
     WHERE qq.quiz_id = ?
     ORDER BY qq.question_order ASC`,
    [attemptId, attempt.quiz_id]
  );

  let totalPoints = 0;
  let earnedPoints = 0;

  for (const row of rows) {
    totalPoints += Number(row.points || 0);
    const isCorrect = row.selected_option && row.selected_option === row.correct_option;
    const pointsEarned = isCorrect ? Number(row.points || 0) : 0;
    earnedPoints += pointsEarned;

    await connection.execute(
      `UPDATE quiz_attempt_answers
       SET is_correct = ?, points_earned = ?, updated_at = CURRENT_TIMESTAMP
       WHERE attempt_id = ? AND quiz_question_id = ?`,
      [Boolean(isCorrect), pointsEarned, attemptId, row.id]
    );
  }

  const accuracy = totalPoints > 0 ? Number(((earnedPoints / totalPoints) * 100).toFixed(2)) : 0;
  const passMark = Number(attempt.passing_score || 60);
  const passed = accuracy >= passMark;

  await connection.execute(
    `UPDATE quiz_attempts
     SET status = ?,
         submitted_at = CURRENT_TIMESTAMP,
         total_questions = ?,
         total_points = ?,
         score = ?,
         accuracy_percent = ?,
         time_spent_seconds = TIMESTAMPDIFF(SECOND, started_at, CURRENT_TIMESTAMP),
         passed = ?
     WHERE id = ?`,
    [mode, rows.length, totalPoints, earnedPoints, accuracy, Boolean(passed), attemptId]
  );

  const [[summary]] = await connection.execute(
    `SELECT id,
            quiz_id,
            user_id,
            status,
            score,
            total_points,
            accuracy_percent,
            time_spent_seconds,
            passed,
            tab_switch_count,
            violation_count,
            submitted_at
     FROM quiz_attempts
     WHERE id = ?`,
    [attemptId]
  );

  return {
    success: true,
    result: summary
  };
};

router.get('/public', verifyTokenOptional, async (req, res) => {
  const search = String(req.query.search || '').trim().toLowerCase();
  const difficulty = String(req.query.difficulty || '').trim();
  const statusFilter = String(req.query.status || '').trim().toLowerCase();
  const userId = Number(req.user?.id || 0);

  const filters = ['q.status = ?'];
  const params = ['published'];

  if (difficulty) {
    filters.push('q.difficulty = ?');
    params.push(difficulty);
  }

  if (search) {
    filters.push('(LOWER(q.title) LIKE ? OR LOWER(COALESCE(q.description, "")) LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

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
              q.created_at,
              COUNT(qq.id) AS question_count,
              ${userId > 0 ? 'EXISTS(SELECT 1 FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.user_id = ?) AS attempted' : '0 AS attempted'}
       FROM quizzes q
       LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
       WHERE ${filters.join(' AND ')}
       GROUP BY q.id
       ORDER BY q.updated_at DESC`,
      userId > 0 ? [userId, ...params] : params
    );

    let data = rows.map((row) => ({
      ...row,
      is_proctored: Boolean(row.is_proctored),
      scheduling_enabled: Boolean(row.scheduling_enabled),
      available_from_utc: serializeUtcDate(row.available_from_utc),
      available_until_utc: serializeUtcDate(row.available_until_utc),
      availability_status: getQuizAvailabilityStatus(row),
      auto_submit_on_violation: Boolean(row.auto_submit_on_violation),
      attempted: Boolean(row.attempted),
      question_count: Number(row.question_count || 0),
      max_attempts: Number(row.max_attempts || 0),
      passing_score: Number(row.passing_score || 0),
      time_limit_minutes: Number(row.time_limit_minutes || 0),
      violation_auto_submit_threshold: row.violation_auto_submit_threshold === null
        ? null
        : Number(row.violation_auto_submit_threshold)
    }));

    if (statusFilter === 'attempted') {
      data = data.filter((item) => item.attempted);
    }

    if (statusFilter === 'unattempted') {
      data = data.filter((item) => !item.attempted);
    }

    return res.json({
      success: true,
      quizzes: data
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch quizzes', error: error.message });
  } finally {
    connection.release();
  }
});

router.get('/public/:id', verifyTokenOptional, async (req, res) => {
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
       WHERE id = ? AND status = 'published'`,
      [quizId]
    );

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const [questions] = await connection.execute(
      `SELECT id,
              question_text,
              option_a,
              option_b,
              option_c,
              option_d,
              explanation,
              question_order,
              points
       FROM quiz_questions
       WHERE quiz_id = ?
       ORDER BY question_order ASC`,
      [quizId]
    );

    return res.json({
      success: true,
      quiz: {
        ...quiz,
        is_proctored: Boolean(quiz.is_proctored),
        scheduling_enabled: Boolean(quiz.scheduling_enabled),
        available_from_utc: serializeUtcDate(quiz.available_from_utc),
        available_until_utc: serializeUtcDate(quiz.available_until_utc),
        availability_status: getQuizAvailabilityStatus(quiz),
        auto_submit_on_violation: Boolean(quiz.auto_submit_on_violation),
        question_count: questions.length,
        questions
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch quiz details', error: error.message });
  } finally {
    connection.release();
  }
});

router.post('/:id/start', verifyToken, async (req, res) => {
  const quizId = Number(req.params.id);
  const userId = Number(req.user.id);

  if (!Number.isInteger(quizId) || quizId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid quiz id' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[quiz]] = await connection.execute(
      `SELECT id,
              status,
              max_attempts,
              time_limit_minutes,
              is_proctored,
              scheduling_enabled,
              available_from_utc,
              available_until_utc
       FROM quizzes
       WHERE id = ?`,
      [quizId]
    );

    if (!quiz || quiz.status !== 'published') {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const availabilityStatus = getQuizAvailabilityStatus(quiz);
    if (availabilityStatus === 'coming_soon') {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        code: 'QUIZ_COMING_SOON',
        message: 'This quiz is scheduled and not available yet.'
      });
    }

    if (availabilityStatus === 'expired') {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        code: 'QUIZ_EXPIRED',
        message: 'This quiz availability window has ended.'
      });
    }

    const [[countRow]] = await connection.execute(
      `SELECT COUNT(*) AS attempt_count
       FROM quiz_attempts
       WHERE quiz_id = ? AND user_id = ?`,
      [quizId, userId]
    );

    const existingCount = Number(countRow?.attempt_count || 0);
    const maxAttempts = Number(quiz.max_attempts || 0);

    if (maxAttempts > 0 && existingCount >= maxAttempts) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'Maximum attempts reached for this quiz' });
    }

    const [questionRows] = await connection.execute(
      `SELECT COUNT(*) AS question_count, COALESCE(SUM(points), 0) AS total_points
       FROM quiz_questions
       WHERE quiz_id = ?`,
      [quizId]
    );

    const questionCount = Number(questionRows[0]?.question_count || 0);
    const totalPoints = Number(questionRows[0]?.total_points || 0);

    if (questionCount === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Quiz has no questions yet' });
    }

    const attemptNumber = existingCount + 1;

    const [result] = await connection.execute(
      `INSERT INTO quiz_attempts (quiz_id, user_id, attempt_number, total_questions, total_points)
       VALUES (?, ?, ?, ?, ?)`,
      [quizId, userId, attemptNumber, questionCount, totalPoints]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Quiz attempt started',
      attempt: {
        id: result.insertId,
        quiz_id: quizId,
        attempt_number: attemptNumber,
        time_limit_minutes: Number(quiz.time_limit_minutes || 0),
        is_proctored: Boolean(quiz.is_proctored)
      }
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: 'Failed to start quiz attempt', error: error.message });
  } finally {
    connection.release();
  }
});

router.get('/attempts/history', verifyToken, async (req, res) => {
  const userId = Number(req.user.id);

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT qa.id,
              qa.quiz_id,
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
              qa.submitted_at,
              q.title,
              q.difficulty,
              q.is_proctored
       FROM quiz_attempts qa
       JOIN quizzes q ON q.id = qa.quiz_id
       WHERE qa.user_id = ?
       ORDER BY qa.started_at DESC`,
      [userId]
    );

    const attempts = rows.map((row) => ({
      ...row,
      quiz_id: Number(row.quiz_id),
      attempt_number: Number(row.attempt_number || 0),
      score: Number(row.score || 0),
      total_points: Number(row.total_points || 0),
      accuracy_percent: Number(row.accuracy_percent || 0),
      time_spent_seconds: Number(row.time_spent_seconds || 0),
      passed: Boolean(row.passed),
      tab_switch_count: Number(row.tab_switch_count || 0),
      violation_count: Number(row.violation_count || 0),
      is_proctored: Boolean(row.is_proctored)
    }));

    return res.json({ success: true, attempts });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch attempt history', error: error.message });
  } finally {
    connection.release();
  }
});

router.get('/attempts/:attemptId', verifyToken, async (req, res) => {
  const attemptId = Number(req.params.attemptId);
  const userId = Number(req.user.id);

  if (!Number.isInteger(attemptId) || attemptId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid attempt id' });
  }

  const connection = await pool.getConnection();
  try {
    const [[attempt]] = await connection.execute(
      `SELECT qa.id,
              qa.quiz_id,
              qa.user_id,
              qa.attempt_number,
              qa.status,
              qa.started_at,
              qa.submitted_at,
              qa.score,
              qa.total_points,
              qa.accuracy_percent,
              qa.time_spent_seconds,
              qa.passed,
              qa.tab_switch_count,
              qa.violation_count,
              q.title,
              q.description,
              q.difficulty,
              q.is_proctored,
              q.time_limit_minutes,
              q.passing_score,
              q.auto_submit_on_violation,
              q.violation_auto_submit_threshold
       FROM quiz_attempts qa
       JOIN quizzes q ON q.id = qa.quiz_id
       WHERE qa.id = ? AND qa.user_id = ?`,
      [attemptId, userId]
    );

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    const [questions] = await connection.execute(
      `SELECT qq.id,
              qq.question_text,
              qq.option_a,
              qq.option_b,
              qq.option_c,
              qq.option_d,
              qq.correct_option,
              qq.explanation,
              qq.question_order,
              qq.points,
              qaa.selected_option,
              qaa.is_correct,
              qaa.points_earned
       FROM quiz_questions qq
       LEFT JOIN quiz_attempt_answers qaa ON qaa.quiz_question_id = qq.id AND qaa.attempt_id = ?
       WHERE qq.quiz_id = ?
       ORDER BY qq.question_order ASC`,
      [attemptId, attempt.quiz_id]
    );

    return res.json({
      success: true,
      attempt: {
        ...attempt,
        is_proctored: Boolean(attempt.is_proctored),
        auto_submit_on_violation: Boolean(attempt.auto_submit_on_violation),
        passed: Boolean(attempt.passed),
        questions
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch attempt', error: error.message });
  } finally {
    connection.release();
  }
});

router.post('/attempts/:attemptId/violation', verifyToken, async (req, res) => {
  const attemptId = Number(req.params.attemptId);
  const userId = Number(req.user.id);
  const violationType = String(req.body?.violationType || '').trim();
  const details = req.body?.details || null;

  const allowedTypes = new Set(['tab_switch', 'copy_blocked', 'context_menu_blocked', 'right_click_blocked']);

  if (!Number.isInteger(attemptId) || attemptId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid attempt id' });
  }

  if (!allowedTypes.has(violationType)) {
    return res.status(400).json({ success: false, message: 'Invalid violation type' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[attempt]] = await connection.execute(
      `SELECT qa.id,
              qa.status,
              qa.quiz_id,
              q.is_proctored,
              q.auto_submit_on_violation,
              q.violation_auto_submit_threshold
       FROM quiz_attempts qa
       JOIN quizzes q ON q.id = qa.quiz_id
       WHERE qa.id = ? AND qa.user_id = ?`,
      [attemptId, userId]
    );

    if (!attempt) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    if (attempt.status !== 'in_progress') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Attempt is already finalized' });
    }

    if (!attempt.is_proctored) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Violations are allowed only for proctored quizzes' });
    }

    await connection.execute(
      `INSERT INTO quiz_violations (attempt_id, violation_type, details)
       VALUES (?, ?, ?)`,
      [attemptId, violationType, details ? JSON.stringify(details) : null]
    );

    await connection.execute(
      `UPDATE quiz_attempts
       SET violation_count = violation_count + 1,
           tab_switch_count = tab_switch_count + CASE WHEN ? = 'tab_switch' THEN 1 ELSE 0 END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [violationType, attemptId]
    );

    const [[counts]] = await connection.execute(
      `SELECT violation_count, tab_switch_count
       FROM quiz_attempts
       WHERE id = ?`,
      [attemptId]
    );

    const threshold = attempt.violation_auto_submit_threshold === null
      ? null
      : Number(attempt.violation_auto_submit_threshold);

    const shouldAutoSubmit = Boolean(attempt.auto_submit_on_violation)
      && threshold !== null
      && Number(counts.violation_count || 0) >= threshold;

    let autoSubmittedResult = null;

    if (shouldAutoSubmit) {
      const finalized = await finalizeAttempt(connection, attemptId, 'auto_submitted');
      if (!finalized.success) {
        await connection.rollback();
        return res.status(400).json(finalized);
      }
      autoSubmittedResult = finalized.result;
    }

    await connection.commit();

    return res.json({
      success: true,
      message: 'Violation recorded',
      violation_count: Number(counts.violation_count || 0),
      tab_switch_count: Number(counts.tab_switch_count || 0),
      auto_submitted: shouldAutoSubmit,
      auto_submit_result: autoSubmittedResult
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: 'Failed to record violation', error: error.message });
  } finally {
    connection.release();
  }
});

router.post('/attempts/:attemptId/submit', verifyToken, async (req, res) => {
  const attemptId = Number(req.params.attemptId);
  const userId = Number(req.user.id);
  const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];

  if (!Number.isInteger(attemptId) || attemptId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid attempt id' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[attempt]] = await connection.execute(
      `SELECT qa.id, qa.quiz_id, qa.status
       FROM quiz_attempts qa
       WHERE qa.id = ? AND qa.user_id = ?`,
      [attemptId, userId]
    );

    if (!attempt) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    if (attempt.status !== 'in_progress') {
      const [[existing]] = await connection.execute(
        `SELECT id, status, score, total_points, accuracy_percent, time_spent_seconds, passed, tab_switch_count, violation_count
         FROM quiz_attempts
         WHERE id = ?`,
        [attemptId]
      );

      await connection.rollback();
      return res.json({ success: true, alreadySubmitted: true, result: existing });
    }

    const [questions] = await connection.execute(
      `SELECT id
       FROM quiz_questions
       WHERE quiz_id = ?`,
      [attempt.quiz_id]
    );

    const questionSet = new Set(questions.map((q) => Number(q.id)));

    for (const answer of answers) {
      const questionId = Number(answer?.quiz_question_id);
      const selectedOption = clampAnswer(answer?.selected_option);

      if (!Number.isInteger(questionId) || !questionSet.has(questionId)) {
        continue;
      }

      await connection.execute(
        `INSERT INTO quiz_attempt_answers (attempt_id, quiz_question_id, selected_option)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE selected_option = VALUES(selected_option), updated_at = CURRENT_TIMESTAMP`,
        [attemptId, questionId, selectedOption]
      );
    }

    const finalized = await finalizeAttempt(connection, attemptId, 'submitted');
    if (!finalized.success) {
      await connection.rollback();
      return res.status(400).json(finalized);
    }

    await connection.commit();

    return res.json({
      success: true,
      message: 'Quiz submitted successfully',
      result: finalized.result
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: 'Failed to submit quiz', error: error.message });
  } finally {
    connection.release();
  }
});

export default router;
