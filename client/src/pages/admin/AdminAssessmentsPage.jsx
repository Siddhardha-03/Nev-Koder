import { useEffect, useMemo, useState } from 'react';
import LandingNavbar from '../../components/LandingNavbar';
import AdminTabs from '../../components/admin/AdminTabs';
import {
  createAdminAssessment,
  deleteAdminAssessment,
  getAdminAssessments,
  getQuestions
} from '../../services/adminService';
import './AdminPages.css';

const defaultAssessmentForm = {
  type: 'assessment',
  title: '',
  description: '',
  difficulty: '',
  category: '',
  timeLimitMinutes: ''
};

function AdminAssessmentsPage() {
  const [form, setForm] = useState(defaultAssessmentForm);
  const [allQuestions, setAllQuestions] = useState([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [questionSearch, setQuestionSearch] = useState('');

  const loadAssessments = async () => {
    const response = await getAdminAssessments();
    if (!response.success) {
      setError(response.message || 'Failed to load assessments.');
      setAssessments([]);
    } else {
      setAssessments(response.assessments || []);
    }
  };

  const loadQuestions = async () => {
    setLoadingQuestions(true);
    const response = await getQuestions();
    setLoadingQuestions(false);

    if (!response.success) {
      setError(response.message || 'Failed to load questions.');
      setAllQuestions([]);
      return;
    }

    setAllQuestions(response.questions || []);
  };

  useEffect(() => {
    const loadPageData = async () => {
      setLoading(true);
      setError('');
      await Promise.all([loadAssessments(), loadQuestions()]);
      setLoading(false);
    };

    loadPageData();
  }, []);

  const filteredQuestions = useMemo(() => {
    const search = questionSearch.trim().toLowerCase();
    if (!search) return allQuestions;

    return allQuestions.filter((question) => {
      const title = String(question.title || '').toLowerCase();
      const difficulty = String(question.difficulty || '').toLowerCase();
      return title.includes(search) || difficulty.includes(search);
    });
  }, [allQuestions, questionSearch]);

  const toggleQuestionSelection = (questionId) => {
    setSelectedQuestionIds((prev) => {
      if (prev.includes(questionId)) {
        return prev.filter((id) => id !== questionId);
      }
      return [...prev, questionId];
    });
  };

  const onChangeForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onCreateAssessment = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (selectedQuestionIds.length === 0) {
      setError('Please select at least one question.');
      return;
    }

    const payload = {
      ...form,
      questionIds: selectedQuestionIds
    };

    setSaving(true);
    const response = await createAdminAssessment(payload);
    setSaving(false);

    if (!response.success) {
      setError(response.message || 'Failed to create assessment.');
      return;
    }

    setSuccess(`${form.type === 'assignment' ? 'Assignment' : 'Assessment'} created successfully.`);
    setForm(defaultAssessmentForm);
    setSelectedQuestionIds([]);
    await loadAssessments();
  };

  const onDeleteAssessment = async (assessment) => {
    const label = assessment.type === 'assignment' ? 'assignment' : 'assessment';
    const confirmed = window.confirm(`Delete ${label} "${assessment.title}"?`);
    if (!confirmed) return;

    setError('');
    setSuccess('');

    const response = await deleteAdminAssessment(assessment.id);
    if (!response.success) {
      setError(response.message || 'Failed to delete item.');
      return;
    }

    setSuccess('Item deleted successfully.');
    await loadAssessments();
  };

  return (
    <section>
      <LandingNavbar />
      <main className="admin-shell">
        <header className="admin-header">
          <div>
            <p className="admin-header-badge">Assessment Studio</p>
            <h1>Assessments and Assignments</h1>
            <p>Create timed assessments or regular assignments using existing coding questions.</p>
          </div>
        </header>

        <AdminTabs />

        <section className="admin-content-card">
          <h2 className="admin-subtitle">Create New Assessment / Assignment</h2>
          <form className="admin-assessment-form" onSubmit={onCreateAssessment}>
            <select
              className="admin-select"
              value={form.type}
              onChange={(event) => onChangeForm('type', event.target.value)}
            >
              <option value="assessment">Assessment</option>
              <option value="assignment">Assignment</option>
            </select>
            <input
              className="admin-input"
              placeholder="Title"
              value={form.title}
              onChange={(event) => onChangeForm('title', event.target.value)}
              required
            />
            <input
              className="admin-input"
              placeholder="Difficulty (optional)"
              value={form.difficulty}
              onChange={(event) => onChangeForm('difficulty', event.target.value)}
            />
            <input
              className="admin-input"
              placeholder="Category (optional)"
              value={form.category}
              onChange={(event) => onChangeForm('category', event.target.value)}
            />
            <input
              className="admin-input"
              type="number"
              min="1"
              placeholder="Time limit in minutes (optional)"
              value={form.timeLimitMinutes}
              onChange={(event) => onChangeForm('timeLimitMinutes', event.target.value)}
            />
            <textarea
              className="admin-textarea admin-form-group-full"
              rows={3}
              placeholder="Description"
              value={form.description}
              onChange={(event) => onChangeForm('description', event.target.value)}
            />

            <div className="admin-form-group-full admin-question-selector">
              <div className="admin-question-selector-head">
                <strong>Select Questions</strong>
                <span>{selectedQuestionIds.length} selected</span>
              </div>

              <input
                className="admin-input"
                placeholder="Search by title or difficulty"
                value={questionSearch}
                onChange={(event) => setQuestionSearch(event.target.value)}
              />

              <div className="admin-problem-list admin-assessment-question-list">
                {loadingQuestions ? (
                  <div className="admin-loading">Loading questions...</div>
                ) : filteredQuestions.length === 0 ? (
                  <div className="admin-empty">No questions found.</div>
                ) : (
                  filteredQuestions.map((question) => (
                    <label className="admin-problem-item" key={question.id}>
                      <input
                        type="checkbox"
                        checked={selectedQuestionIds.includes(question.id)}
                        onChange={() => toggleQuestionSelection(question.id)}
                      />
                      <span className="admin-problem-title">{question.title}</span>
                      <span className={`admin-badge ${
                        question.difficulty === 'Easy'
                          ? 'admin-badge-easy'
                          : question.difficulty === 'Medium'
                            ? 'admin-badge-medium'
                            : 'admin-badge-hard'
                      }`}
                      >
                        {question.difficulty}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <button className="admin-btn admin-btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : `Create ${form.type === 'assignment' ? 'Assignment' : 'Assessment'}`}
            </button>
          </form>

          {error ? <div className="admin-error">{error}</div> : null}
          {success ? <div className="admin-loading">{success}</div> : null}

          {loading ? <div className="admin-loading">Loading assessments...</div> : null}

          {!loading && assessments.length === 0 ? (
            <div className="admin-empty">No assessments or assignments yet.</div>
          ) : null}

          {!loading && assessments.length > 0 ? (
            <div className="admin-assessment-grid">
              {assessments.map((assessment) => (
                <article className="admin-assessment-card" key={assessment.id}>
                  <div className="admin-assessment-top">
                    <span className={`admin-badge ${assessment.type === 'assignment' ? 'admin-badge-medium' : 'admin-badge-easy'}`}>
                      {assessment.type}
                    </span>
                    <button
                      type="button"
                      className="admin-btn admin-btn-danger"
                      onClick={() => onDeleteAssessment(assessment)}
                    >
                      Delete
                    </button>
                  </div>

                  <h3>{assessment.title}</h3>
                  <p>{assessment.description || 'No description provided.'}</p>

                  <div className="admin-assessment-meta">
                    <span>Questions: {assessment.question_count}</span>
                    <span>Difficulty: {assessment.difficulty || 'Not set'}</span>
                    <span>Category: {assessment.category || 'Not set'}</span>
                    <span>Time limit: {assessment.time_limit_minutes ? `${assessment.time_limit_minutes} mins` : 'Not set'}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </main>
    </section>
  );
}

export default AdminAssessmentsPage;
