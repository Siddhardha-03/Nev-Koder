import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import LandingNavbar from '../../components/LandingNavbar';
import AdminTabs from '../../components/admin/AdminTabs';
import QuestionForm from '../../components/admin/QuestionForm';
import {
  createQuestion,
  deleteQuestion,
  getQuestionById,
  getQuestions,
  updateQuestion
} from '../../services/adminService';
import './AdminPages.css';

function AdminQuestionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [difficulty, setDifficulty] = useState(searchParams.get('difficulty') || '');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(searchParams.get('create') === '1');
  const [formMode, setFormMode] = useState('create');
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const normalizedQuestions = useMemo(() => questions || [], [questions]);

  const syncQuery = (nextSearch, nextDifficulty, createFlag = false) => {
    const nextParams = new URLSearchParams();
    if (nextSearch) nextParams.set('search', nextSearch);
    if (nextDifficulty) nextParams.set('difficulty', nextDifficulty);
    if (createFlag) nextParams.set('create', '1');
    setSearchParams(nextParams, { replace: true });
  };

  const loadQuestions = async (nextSearch = search, nextDifficulty = difficulty) => {
    setLoading(true);
    setError('');

    const response = await getQuestions({ search: nextSearch, difficulty: nextDifficulty });
    if (!response.success) {
      setError(response.message || 'Failed to load questions.');
      setQuestions([]);
    } else {
      setQuestions(response.questions || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadQuestions(search, difficulty);
  }, []);

  const openCreate = () => {
    setFormMode('create');
    setSelectedQuestion(null);
    setShowForm(true);
    syncQuery(search, difficulty, true);
  };

  const openEdit = async (questionId) => {
    setError('');
    const response = await getQuestionById(questionId);
    if (!response.success) {
      setError(response.message || 'Failed to load question details.');
      return;
    }

    setFormMode('edit');
    setSelectedQuestion(response.question || null);
    setShowForm(true);
    syncQuery(search, difficulty, false);
  };

  const closeForm = () => {
    setShowForm(false);
    setSelectedQuestion(null);
    syncQuery(search, difficulty, false);
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    setError('');

    const response = formMode === 'edit' && selectedQuestion?.id
      ? await updateQuestion(selectedQuestion.id, payload)
      : await createQuestion(payload);

    if (!response.success) {
      setError(response.message || 'Failed to save question.');
      setSaving(false);
      return;
    }

    await loadQuestions(search, difficulty);
    setSaving(false);
    closeForm();
  };

  const requestDelete = (question) => {
    setConfirmDelete(question);
  };

  const confirmDeleteQuestion = async () => {
    if (!confirmDelete) return;

    const response = await deleteQuestion(confirmDelete.id);
    if (!response.success) {
      setError(response.message || 'Failed to delete question.');
      setConfirmDelete(null);
      return;
    }

    setConfirmDelete(null);
    await loadQuestions(search, difficulty);
  };

  const applyFilters = async () => {
    syncQuery(search, difficulty, false);
    await loadQuestions(search, difficulty);
  };

  return (
    <section>
      <LandingNavbar />
      <main className="admin-shell">
        <header className="admin-header">
          <div>
            <h1>Question Management</h1>
            <p>Create, edit, delete questions and manage beginner boilerplate settings.</p>
          </div>
          <div className="admin-header-actions">
            <button type="button" className="admin-btn admin-btn-primary" onClick={openCreate}>Create Question</button>
          </div>
        </header>

        <AdminTabs />

        <section className="admin-content-card">
          <div className="admin-toolbar">
            <input
              className="admin-input"
              placeholder="Search by title"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select className="admin-select" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
              <option value="">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={applyFilters}>Apply</button>
          </div>

          {loading ? <div className="admin-loading">Loading questions...</div> : null}
          {error ? <div className="admin-error">{error}</div> : null}

          {!loading && !error && normalizedQuestions.length === 0 ? (
            <div className="admin-empty">No questions found for this filter.</div>
          ) : null}

          {!loading && normalizedQuestions.length > 0 ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Difficulty</th>
                    <th>Type</th>
                    <th>Tags</th>
                    <th>Boilerplate</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedQuestions.map((question) => {
                    const tags = question.tags?.tags || [];
                    return (
                      <tr key={question.id}>
                        <td>{question.title}</td>
                        <td>
                          <span className={`admin-badge admin-badge-${String(question.difficulty || '').toLowerCase()}`}>
                            {question.difficulty}
                          </span>
                        </td>
                        <td>{question.question_type || 'N/A'}</td>
                        <td>
                          <div className="admin-tags">
                            {tags.slice(0, 4).map((tag) => (
                              <span className="admin-tag" key={`${question.id}-${tag}`}>{tag}</span>
                            ))}
                          </div>
                        </td>
                        <td>{question.has_boilerplate ? 'Yes' : 'No'}</td>
                        <td>
                          <div className="admin-actions">
                            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => openEdit(question.id)}>Edit</button>
                            <button type="button" className="admin-btn admin-btn-danger" onClick={() => requestDelete(question)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <QuestionForm
          open={showForm}
          mode={formMode}
          question={selectedQuestion}
          saving={saving}
          onClose={closeForm}
          onSubmit={handleSubmit}
        />

        {confirmDelete ? (
          <div className="admin-modal-overlay">
            <div className="admin-modal" style={{ maxWidth: '500px' }}>
              <div className="admin-modal-header">
                <h3>Delete Question</h3>
              </div>
              <div className="admin-modal-content">
                <p>Are you sure you want to delete <strong>{confirmDelete.title}</strong>?</p>
                <p className="admin-helper">This action cannot be undone and removes associated test cases.</p>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
                <button type="button" className="admin-btn admin-btn-danger" onClick={confirmDeleteQuestion}>Delete</button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </section>
  );
}

export default AdminQuestionsPage;
