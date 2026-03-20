import express from 'express';
import pool from '../config/database.js';
import { verifyToken, verifyTokenOptional, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

const normalizeTopics = (topics) => topics.map((topic, idx) => ({
  title: String(topic?.title || '').trim(),
  order: idx + 1,
  problemIds: Array.isArray(topic?.problemIds)
    ? [...new Set(topic.problemIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))]
    : []
}));

const validateTopicsInput = (topics) => {
  if (!Array.isArray(topics) || topics.length === 0) {
    return { ok: false, message: 'At least one topic is required' };
  }

  const cleanedTopics = normalizeTopics(topics);
  const invalidTopic = cleanedTopics.find((topic) => !topic.title || topic.problemIds.length === 0);
  if (invalidTopic) {
    return { ok: false, message: 'Each topic needs a title and at least one selected problem' };
  }

  return { ok: true, cleanedTopics };
};

const validateSelectedProblems = async (connection, topics) => {
  const allProblemIds = [...new Set(topics.flatMap((topic) => topic.problemIds))];
  if (allProblemIds.length === 0) {
    return { ok: false, message: 'No problems selected' };
  }

  const placeholders = allProblemIds.map(() => '?').join(', ');
  const [existingProblems] = await connection.execute(
    `SELECT id FROM questions WHERE id IN (${placeholders})`,
    allProblemIds
  );
  const existingSet = new Set(existingProblems.map((row) => Number(row.id)));

  const missing = allProblemIds.filter((id) => !existingSet.has(id));
  if (missing.length > 0) {
    return { ok: false, message: `Some selected problems do not exist: ${missing.join(', ')}` };
  }

  return { ok: true };
};

const insertTopicsAndProblems = async (connection, learningPathId, topics) => {
  for (const topic of topics) {
    const [topicInsert] = await connection.execute(
      `INSERT INTO learning_path_topics (learning_path_id, topic_title, topic_order)
       VALUES (?, ?, ?)`,
      [learningPathId, topic.title, topic.order]
    );

    for (let i = 0; i < topic.problemIds.length; i += 1) {
      await connection.execute(
        `INSERT INTO learning_path_topic_problems (topic_id, question_id, problem_order)
         VALUES (?, ?, ?)`,
        [topicInsert.insertId, topic.problemIds[i], i + 1]
      );
    }
  }
};

const getLearningPathWithTopics = async (connection, learningPathId, userId = null) => {
  const [pathRows] = await connection.execute(
    `SELECT id, title, description, created_at, updated_at
     FROM learning_paths
     WHERE id = ?`,
    [learningPathId]
  );

  if (!pathRows.length) {
    return null;
  }

  const [topicRows] = await connection.execute(
    `SELECT lpt.id AS topic_id,
            lpt.topic_title,
            lpt.topic_order,
            q.id AS question_id,
            q.title,
            q.difficulty
     FROM learning_path_topics lpt
     LEFT JOIN learning_path_topic_problems lptp ON lptp.topic_id = lpt.id
     LEFT JOIN questions q ON q.id = lptp.question_id
     WHERE lpt.learning_path_id = ?
     ORDER BY lpt.topic_order ASC, lptp.problem_order ASC`,
    [learningPathId]
  );

  const questionIds = [...new Set(topicRows
    .map((row) => Number(row.question_id))
    .filter((questionId) => Number.isInteger(questionId) && questionId > 0))];

  let solvedSet = new Set();
  if (userId && questionIds.length > 0) {
    const placeholders = questionIds.map(() => '?').join(', ');
    const [solvedRows] = await connection.execute(
      `SELECT question_id
       FROM user_solved_questions
       WHERE user_id = ? AND question_id IN (${placeholders})`,
      [userId, ...questionIds]
    );
    solvedSet = new Set(solvedRows.map((row) => Number(row.question_id)));
  }

  const topicMap = new Map();
  topicRows.forEach((row) => {
    if (!topicMap.has(row.topic_id)) {
      topicMap.set(row.topic_id, {
        id: row.topic_id,
        title: row.topic_title,
        order: row.topic_order,
        problems: []
      });
    }

    if (row.question_id) {
      topicMap.get(row.topic_id).problems.push({
        id: row.question_id,
        title: row.title,
        difficulty: row.difficulty,
        solved: solvedSet.has(Number(row.question_id))
      });
    }
  });

  const topics = Array.from(topicMap.values());
  const problemCount = topics.reduce((sum, topic) => sum + topic.problems.length, 0);
  const solvedProblemCount = topics.reduce(
    (sum, topic) => sum + topic.problems.filter((problem) => problem.solved).length,
    0
  );

  return {
    ...pathRows[0],
    topics,
    problem_count: problemCount,
    solved_problem_count: solvedProblemCount,
    progress_percent: problemCount > 0 ? Math.round((solvedProblemCount / problemCount) * 100) : 0
  };
};

router.get('/public', verifyTokenOptional, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    if (req.user?.id) {
      const [paths] = await connection.execute(
        `SELECT lp.id, lp.title, lp.description, lp.created_at, lp.updated_at,
                COUNT(DISTINCT lpt.id) AS topic_count,
                COUNT(DISTINCT lptp.question_id) AS problem_count,
                COUNT(DISTINCT usq.question_id) AS solved_problem_count
         FROM learning_paths lp
         LEFT JOIN learning_path_topics lpt ON lpt.learning_path_id = lp.id
         LEFT JOIN learning_path_topic_problems lptp ON lptp.topic_id = lpt.id
         LEFT JOIN user_solved_questions usq ON usq.question_id = lptp.question_id AND usq.user_id = ?
         GROUP BY lp.id
         ORDER BY lp.updated_at DESC`,
        [req.user.id]
      );

      const normalizedPaths = paths.map((path) => {
        const problemCount = Number(path.problem_count || 0);
        const solvedProblemCount = Number(path.solved_problem_count || 0);
        return {
          ...path,
          problem_count: problemCount,
          solved_problem_count: solvedProblemCount,
          progress_percent: problemCount > 0 ? Math.round((solvedProblemCount / problemCount) * 100) : 0
        };
      });

      return res.json({ success: true, learningPaths: normalizedPaths });
    }

    const [paths] = await connection.execute(
      `SELECT lp.id, lp.title, lp.description, lp.created_at, lp.updated_at,
              COUNT(DISTINCT lpt.id) AS topic_count,
              COUNT(DISTINCT lptp.question_id) AS problem_count,
              0 AS solved_problem_count
       FROM learning_paths lp
       LEFT JOIN learning_path_topics lpt ON lpt.learning_path_id = lp.id
       LEFT JOIN learning_path_topic_problems lptp ON lptp.topic_id = lpt.id
       GROUP BY lp.id
       ORDER BY lp.updated_at DESC`
    );

    const normalizedPaths = paths.map((path) => ({
      ...path,
      problem_count: Number(path.problem_count || 0),
      solved_problem_count: 0,
      progress_percent: 0
    }));

    return res.json({ success: true, learningPaths: normalizedPaths });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch learning paths', error: error.message });
  } finally {
    connection.release();
  }
});

router.get('/public/:id', verifyTokenOptional, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const learningPath = await getLearningPathWithTopics(connection, req.params.id, req.user?.id || null);
    if (!learningPath) {
      return res.status(404).json({ success: false, message: 'Learning path not found' });
    }

    return res.json({
      success: true,
      learningPath
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch learning path details', error: error.message });
  } finally {
    connection.release();
  }
});

router.get('/', verifyToken, requireAdmin, async (_req, res) => {
  const connection = await pool.getConnection();
  try {
    const [paths] = await connection.execute(
      `SELECT lp.id, lp.title, lp.description, lp.created_at, lp.updated_at,
              COUNT(DISTINCT lpt.id) AS topic_count,
              COUNT(DISTINCT lptp.question_id) AS problem_count
       FROM learning_paths lp
       LEFT JOIN learning_path_topics lpt ON lpt.learning_path_id = lp.id
       LEFT JOIN learning_path_topic_problems lptp ON lptp.topic_id = lpt.id
       GROUP BY lp.id
       ORDER BY lp.updated_at DESC`
    );

    return res.json({ success: true, learningPaths: paths });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch learning paths', error: error.message });
  } finally {
    connection.release();
  }
});

router.post('/', verifyToken, requireAdmin, async (req, res) => {
  const { title, description = '', topics = [] } = req.body;

  if (!title || !String(title).trim()) {
    return res.status(400).json({ success: false, message: 'Learning path title is required' });
  }

  const topicsValidation = validateTopicsInput(topics);
  if (!topicsValidation.ok) {
    return res.status(400).json({ success: false, message: topicsValidation.message });
  }
  const cleanedTopics = topicsValidation.cleanedTopics;

  const connection = await pool.getConnection();

  try {
    const problemValidation = await validateSelectedProblems(connection, cleanedTopics);
    if (!problemValidation.ok) {
      return res.status(400).json({ success: false, message: problemValidation.message });
    }

    await connection.beginTransaction();

    const [pathInsert] = await connection.execute(
      `INSERT INTO learning_paths (title, description, created_by)
       VALUES (?, ?, ?)`,
      [String(title).trim(), String(description || '').trim(), req.user.id]
    );

    await insertTopicsAndProblems(connection, pathInsert.insertId, cleanedTopics);

    await connection.commit();
    return res.status(201).json({ success: true, message: 'Learning path created successfully', id: pathInsert.insertId });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: 'Failed to create learning path', error: error.message });
  } finally {
    connection.release();
  }
});

router.get('/:id', verifyToken, requireAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const learningPath = await getLearningPathWithTopics(connection, req.params.id);
    if (!learningPath) {
      return res.status(404).json({ success: false, message: 'Learning path not found' });
    }

    return res.json({ success: true, learningPath });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch learning path details', error: error.message });
  } finally {
    connection.release();
  }
});

router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { title, description = '', topics = [] } = req.body;

  if (!title || !String(title).trim()) {
    return res.status(400).json({ success: false, message: 'Learning path title is required' });
  }

  const topicsValidation = validateTopicsInput(topics);
  if (!topicsValidation.ok) {
    return res.status(400).json({ success: false, message: topicsValidation.message });
  }
  const cleanedTopics = topicsValidation.cleanedTopics;

  const connection = await pool.getConnection();
  try {
    const [existingPath] = await connection.execute(
      `SELECT id FROM learning_paths WHERE id = ?`,
      [req.params.id]
    );

    if (!existingPath.length) {
      return res.status(404).json({ success: false, message: 'Learning path not found' });
    }

    const problemValidation = await validateSelectedProblems(connection, cleanedTopics);
    if (!problemValidation.ok) {
      return res.status(400).json({ success: false, message: problemValidation.message });
    }

    await connection.beginTransaction();

    await connection.execute(
      `UPDATE learning_paths
       SET title = ?, description = ?
       WHERE id = ?`,
      [String(title).trim(), String(description || '').trim(), req.params.id]
    );

    await connection.execute(
      `DELETE lptp
       FROM learning_path_topic_problems lptp
       INNER JOIN learning_path_topics lpt ON lpt.id = lptp.topic_id
       WHERE lpt.learning_path_id = ?`,
      [req.params.id]
    );

    await connection.execute(
      `DELETE FROM learning_path_topics WHERE learning_path_id = ?`,
      [req.params.id]
    );

    await insertTopicsAndProblems(connection, req.params.id, cleanedTopics);

    await connection.commit();
    return res.json({ success: true, message: 'Learning path updated successfully' });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: 'Failed to update learning path', error: error.message });
  } finally {
    connection.release();
  }
});

router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(
      `DELETE FROM learning_paths WHERE id = ?`,
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Learning path not found' });
    }

    return res.json({ success: true, message: 'Learning path deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete learning path', error: error.message });
  } finally {
    connection.release();
  }
});

export default router;