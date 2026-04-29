import { useEffect, useMemo, useState } from 'react';
import LandingNavbar from '../../components/LandingNavbar';
import AdminTabs from '../../components/admin/AdminTabs';
import {
  createLearningPath,
  deleteLearningPath,
  getAdminLearningPathById,
  getAdminLearningPaths,
  getQuestions,
  updateLearningPath
} from '../../services/adminService';
import './AdminPages.css';

const createEmptyTopic = () => ({
  key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  title: '',
  problemIds: []
});

const normalizeText = (value = '') => String(value).toLowerCase().replace(/_/g, ' ').trim();

function AdminLearningPathsPage() {
  const [editingPathId, setEditingPathId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topics, setTopics] = useState([createEmptyTopic()]);

  const [problemSearch, setProblemSearch] = useState('');
  const [problemDifficulty, setProblemDifficulty] = useState('');
  const [allProblems, setAllProblems] = useState([]);
  const [learningPaths, setLearningPaths] = useState([]);

  const [loadingProblems, setLoadingProblems] = useState(true);
  const [loadingPaths, setLoadingPaths] = useState(true);
  const [loadingPathForEdit, setLoadingPathForEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingPathId, setDeletingPathId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const filteredProblems = useMemo(() => {
    const search = normalizeText(problemSearch);

    return allProblems.filter((problem) => {
      const byDifficulty = problemDifficulty ? problem.difficulty === problemDifficulty : true;
      const titleText = normalizeText(problem.title);
      const typeText = normalizeText(problem.question_type);
      const bySearch = search ? (titleText.includes(search) || typeText.includes(search)) : true;
      return byDifficulty && bySearch;
    });
  }, [allProblems, problemDifficulty, problemSearch]);

  useEffect(() => {
    const loadProblems = async () => {
      setLoadingProblems(true);
      setError('');

      const response = await getQuestions();
      if (!response.success) {
        setError(response.message || 'Failed to load problems for learning path creation.');
        setAllProblems([]);
      } else {
        setAllProblems(response.questions || []);
      }

      setLoadingProblems(false);
    };

    loadProblems();
  }, []);

  const loadLearningPaths = async () => {
    setLoadingPaths(true);
    const response = await getAdminLearningPaths();
    if (response.success) {
      setLearningPaths(response.learningPaths || []);
    } else {
      setError(response.message || 'Failed to load learning paths.');
      setLearningPaths([]);
    }
    setLoadingPaths(false);
  };

  useEffect(() => {
    loadLearningPaths();
  }, []);

  const updateTopicTitle = (topicKey, nextTitle) => {
    setTopics((prev) => prev.map((topic) => (
      topic.key === topicKey ? { ...topic, title: nextTitle } : topic
    )));
  };

  const toggleTopicProblem = (topicKey, problemId) => {
    setTopics((prev) => prev.map((topic) => {
      if (topic.key !== topicKey) return topic;

      const hasProblem = topic.problemIds.includes(problemId);
      return {
        ...topic,
        problemIds: hasProblem
          ? topic.problemIds.filter((id) => id !== problemId)
          : [...topic.problemIds, problemId]
      };
    }));
  };

  const addTopic = () => {
    setTopics((prev) => [...prev, createEmptyTopic()]);
  };

  const removeTopic = (topicKey) => {
    setTopics((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((topic) => topic.key !== topicKey);
    });
  };

  const resetForm = () => {
    setEditingPathId(null);
    setTitle('');
    setDescription('');
    setTopics([createEmptyTopic()]);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim()) {
      setError('Learning path topic/title is required.');
      return;
    }

    const hasInvalidTopic = topics.some((topic) => !topic.title.trim() || topic.problemIds.length === 0);
    if (hasInvalidTopic) {
      setError('Each topic needs a name and at least one selected problem.');
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      topics: topics.map((topic) => ({
        title: topic.title.trim(),
        problemIds: topic.problemIds
      }))
    };

    setSaving(true);
    const response = editingPathId
      ? await updateLearningPath(editingPathId, payload)
      : await createLearningPath(payload);
    setSaving(false);

    if (!response.success) {
      setError(response.message || (editingPathId ? 'Failed to update learning path.' : 'Failed to create learning path.'));
      return;
    }

    setSuccess(editingPathId ? 'Learning path updated successfully.' : 'Learning path created successfully.');
    resetForm();
    await loadLearningPaths();
  };

  const onEditPath = async (pathId) => {
    setError('');
    setSuccess('');
    setLoadingPathForEdit(true);

    const response = await getAdminLearningPathById(pathId);
    setLoadingPathForEdit(false);

    if (!response.success || !response.learningPath) {
      setError(response.message || 'Failed to load learning path details.');
      return;
    }

    const nextTopics = (response.learningPath.topics || []).map((topic) => ({
      key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: topic.title || '',
      problemIds: (topic.problems || []).map((problem) => Number(problem.id)).filter((id) => Number.isInteger(id))
    }));

    setEditingPathId(pathId);
    setTitle(response.learningPath.title || '');
    setDescription(response.learningPath.description || '');
    setTopics(nextTopics.length > 0 ? nextTopics : [createEmptyTopic()]);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onDeletePath = async (pathId) => {
    const confirmed = window.confirm('Delete this learning path? This cannot be undone.');
    if (!confirmed) return;

    setDeletingPathId(pathId);
    const response = await deleteLearningPath(pathId);
    setDeletingPathId(null);

    if (!response.success) {
      setError(response.message || 'Failed to delete learning path.');
      return;
    }

    setSuccess('Learning path deleted successfully.');
    await loadLearningPaths();
  };

  return (
    <section>
      <LandingNavbar />
      <main className="admin-shell">
        <header className="admin-header">
          <div>
            <h1>{editingPathId ? 'Edit Learning Path' : 'Create Learning Path'}</h1>
            <p>Build structured topic-by-topic paths and attach existing coding problems.</p>
          </div>
        </header>

        <AdminTabs />

        <section className="admin-content-card">
          <form onSubmit={onSubmit} className="admin-learning-path-form">
            <div className="admin-form-grid">
              <div className="admin-form-group admin-form-group-full">
                <label className="admin-label" htmlFor="lp-title">Learning Path Title</label>
                <input
                  id="lp-title"
                  className="admin-input"
                  placeholder="Example: Python Fundamentals Path"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>

              <div className="admin-form-group admin-form-group-full">
                <label className="admin-label" htmlFor="lp-description">Description (optional)</label>
                <textarea
                  id="lp-description"
                  className="admin-textarea"
                  rows={3}
                  placeholder="Describe what learners will cover in this path"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
            </div>

            <div className="admin-learning-toolbar">
              <input
                className="admin-input"
                placeholder="Search problems by title or type"
                value={problemSearch}
                onChange={(event) => setProblemSearch(event.target.value)}
              />
              <select
                className="admin-select"
                value={problemDifficulty}
                onChange={(event) => setProblemDifficulty(event.target.value)}
              >
                <option value="">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            {topics.map((topic, topicIndex) => (
              <article key={topic.key} className="admin-topic-card">
                <div className="admin-topic-header">
                  <h3>Topic {topicIndex + 1}</h3>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => removeTopic(topic.key)}
                    disabled={topics.length === 1}
                  >
                    Remove Topic
                  </button>
                </div>

                <div className="admin-form-group">
                  <label className="admin-label" htmlFor={`topic-${topic.key}`}>Topic Name</label>
                  <input
                    id={`topic-${topic.key}`}
                    className="admin-input"
                    placeholder="Example: Basic I/O Statements"
                    value={topic.title}
                    onChange={(event) => updateTopicTitle(topic.key, event.target.value)}
                  />
                </div>

                <div className="admin-topic-problems">
                  <p className="admin-label">Select Problems</p>

                  {loadingProblems ? <div className="admin-loading">Loading problems...</div> : null}

                  {!loadingProblems && filteredProblems.length === 0 ? (
                    <div className="admin-empty">No problems found for this filter.</div>
                  ) : null}

                  {!loadingProblems && filteredProblems.length > 0 ? (
                    <div className="admin-problem-list">
                      {filteredProblems.map((problem) => {
                        const checked = topic.problemIds.includes(problem.id);
                        return (
                          <label key={`${topic.key}-${problem.id}`} className="admin-problem-item">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTopicProblem(topic.key, problem.id)}
                            />
                            <span className="admin-problem-title">{problem.title}</span>
                            <span className="admin-problem-meta">
                              <span className={`admin-badge admin-badge-${String(problem.difficulty || '').toLowerCase()}`}>
                                {problem.difficulty}
                              </span>
                              <span className="admin-badge admin-badge-neutral">
                                {problem.question_type || 'N/A'}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </article>
            ))}

            {error ? <div className="admin-error">{error}</div> : null}
            {success ? <div className="admin-empty">{success}</div> : null}
            {loadingPathForEdit ? <div className="admin-loading">Loading selected path details...</div> : null}

            <div className="admin-modal-footer" style={{ paddingInline: 0 }}>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={addTopic}>
                Add Another Topic
              </button>
              {editingPathId ? (
                <button type="button" className="admin-btn admin-btn-secondary" onClick={resetForm}>
                  Cancel Edit
                </button>
              ) : null}
              <button type="submit" className="admin-btn admin-btn-primary" disabled={saving || loadingProblems}>
                {saving
                  ? (editingPathId ? 'Updating...' : 'Creating...')
                  : (editingPathId ? 'Update Learning Path' : 'Create Learning Path')}
              </button>
            </div>
          </form>
        </section>

        <section className="admin-content-card">
          <h2 className="admin-subtitle">Existing Learning Paths</h2>

          {loadingPaths ? <div className="admin-loading">Loading learning paths...</div> : null}

          {!loadingPaths && learningPaths.length === 0 ? (
            <div className="admin-empty">No learning paths created yet.</div>
          ) : null}

          {!loadingPaths && learningPaths.length > 0 ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Description</th>
                    <th>Topics</th>
                    <th>Problems</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {learningPaths.map((path) => (
                    <tr key={path.id}>
                      <td>{path.title}</td>
                      <td>{path.description || '-'}</td>
                      <td>{Number(path.topic_count || 0)}</td>
                      <td>{Number(path.problem_count || 0)}</td>
                      <td>
                        <div className="admin-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary"
                            onClick={() => onEditPath(path.id)}
                            disabled={deletingPathId === path.id || loadingPathForEdit}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-danger"
                            onClick={() => onDeletePath(path.id)}
                            disabled={deletingPathId === path.id}
                          >
                            {deletingPathId === path.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </main>
    </section>
  );
}

export default AdminLearningPathsPage;
