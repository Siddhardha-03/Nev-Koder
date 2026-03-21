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
  updateQuestion,
  uploadQuestionsBulkBoilerplate,
  uploadQuestionsBulkNoBoilerplate,
  downloadTemplateBoilerplate,
  downloadTemplateNoBoilerplate
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
  const [showBulkUploadBoilerplate, setShowBulkUploadBoilerplate] = useState(false);
  const [showBulkUploadNoBoilerplate, setShowBulkUploadNoBoilerplate] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkUploadResult, setBulkUploadResult] = useState(null);

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

  const handleBulkUploadBoilerplate = async () => {
    if (!bulkUploadFile) {
      setError('Please select a file');
      return;
    }

    setBulkUploading(true);
    setError('');
    setBulkUploadResult(null);

    const response = await uploadQuestionsBulkBoilerplate(bulkUploadFile);
    setBulkUploading(false);

    if (!response.success) {
      setError(response.message || 'Failed to upload questions');
      setBulkUploadResult({
        success: false,
        errors: response.errors || []
      });
      return;
    }

    setBulkUploadResult({
      success: true,
      createdCount: response.createdCount,
      totalRows: response.totalRows,
      errors: response.errors || []
    });

    await loadQuestions(search, difficulty);
    setBulkUploadFile(null);
  };

  const handleBulkUploadNoBoilerplate = async () => {
    if (!bulkUploadFile) {
      setError('Please select a file');
      return;
    }

    setBulkUploading(true);
    setError('');
    setBulkUploadResult(null);

    const response = await uploadQuestionsBulkNoBoilerplate(bulkUploadFile);
    setBulkUploading(false);

    if (!response.success) {
      setError(response.message || 'Failed to upload questions');
      setBulkUploadResult({
        success: false,
        errors: response.errors || []
      });
      return;
    }

    setBulkUploadResult({
      success: true,
      createdCount: response.createdCount,
      totalRows: response.totalRows,
      errors: response.errors || []
    });

    await loadQuestions(search, difficulty);
    setBulkUploadFile(null);
  };

  const closeBulkUploadModal = (isBoilerplate) => {
    if (isBoilerplate) {
      setShowBulkUploadBoilerplate(false);
    } else {
      setShowBulkUploadNoBoilerplate(false);
    }
    setBulkUploadFile(null);
    setBulkUploadResult(null);
    setError('');
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
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowBulkUploadBoilerplate(true)}>Upload Boilerplate</button>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowBulkUploadNoBoilerplate(true)}>Upload No-Boilerplate</button>
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

        {showBulkUploadBoilerplate ? (
          <div className="admin-modal-overlay">
            <div className="admin-modal" style={{ maxWidth: '600px' }}>
              <div className="admin-modal-header">
                <div>
                  <h3>Bulk Upload Boilerplate Questions</h3>
                  <p>Upload multiple questions with function signatures</p>
                </div>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => closeBulkUploadModal(true)}>Close</button>
              </div>
              <div className="admin-modal-content">
                {bulkUploadResult?.success ? (
                  <div className="admin-loading" style={{ background: '#e8f9ee', color: '#18794e', border: '1px solid #bde8cc' }}>
                    ✅ Successfully uploaded {bulkUploadResult.createdCount} of {bulkUploadResult.totalRows} questions
                    {bulkUploadResult.errors?.length > 0 ? (
                      <>
                        <strong style={{ display: 'block', marginTop: '0.5rem' }}>Failed rows:</strong>
                        {bulkUploadResult.errors.map((err, i) => (
                          <div key={i} style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
                            Row {err.row}: {err.title} - {err.message}
                          </div>
                        ))}
                      </>
                    ) : null}
                  </div>
                ) : null}

                {bulkUploadResult?.success === false ? (
                  <div className="admin-error">
                    ❌ Upload failed
                    {bulkUploadResult.errors?.length > 0 ? (
                      <>
                        <strong style={{ display: 'block', marginTop: '0.5rem' }}>Errors:</strong>
                        {bulkUploadResult.errors.map((err, i) => (
                          <div key={i} style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
                            Row {err.row}: {err.field} - {err.message}
                          </div>
                        ))}
                      </>
                    ) : null}
                  </div>
                ) : null}

                {!bulkUploadResult ? (
                  <>
                    <div style={{ marginBottom: '1rem' }}>
                      <p className="admin-label">Step 1: Download Template</p>
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        onClick={async () => {
                          const response = await downloadTemplateBoilerplate();
                          if (!response.success) {
                            setError(response.message || 'Failed to download boilerplate template.');
                          }
                        }}
                      >
                        📥 Download Excel Template
                      </button>
                    </div>

                    <div>
                      <p className="admin-label">Step 2: Upload Completed File</p>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={(e) => setBulkUploadFile(e.target.files?.[0])}
                        className="admin-input"
                        style={{ cursor: 'pointer' }}
                      />
                      <p className="admin-helper">
                        Selected file: {bulkUploadFile?.name || 'None'}
                      </p>
                    </div>
                  </>
                ) : null}
              </div>

              {!bulkUploadResult ? (
                <div className="admin-modal-footer">
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={() => closeBulkUploadModal(true)}>Cancel</button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={handleBulkUploadBoilerplate}
                    disabled={bulkUploading || !bulkUploadFile}
                  >
                    {bulkUploading ? 'Uploading...' : 'Upload Questions'}
                  </button>
                </div>
              ) : (
                <div className="admin-modal-footer">
                  <button type="button" className="admin-btn admin-btn-primary" onClick={() => closeBulkUploadModal(true)}>Done</button>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {showBulkUploadNoBoilerplate ? (
          <div className="admin-modal-overlay">
            <div className="admin-modal" style={{ maxWidth: '600px' }}>
              <div className="admin-modal-header">
                <div>
                  <h3>Bulk Upload No-Boilerplate Questions</h3>
                  <p>Upload multiple questions for full program I/O</p>
                </div>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => closeBulkUploadModal(false)}>Close</button>
              </div>
              <div className="admin-modal-content">
                {bulkUploadResult?.success ? (
                  <div className="admin-loading" style={{ background: '#e8f9ee', color: '#18794e', border: '1px solid #bde8cc' }}>
                    ✅ Successfully uploaded {bulkUploadResult.createdCount} of {bulkUploadResult.totalRows} questions
                    {bulkUploadResult.errors?.length > 0 ? (
                      <>
                        <strong style={{ display: 'block', marginTop: '0.5rem' }}>Failed rows:</strong>
                        {bulkUploadResult.errors.map((err, i) => (
                          <div key={i} style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
                            Row {err.row}: {err.title} - {err.message}
                          </div>
                        ))}
                      </>
                    ) : null}
                  </div>
                ) : null}

                {bulkUploadResult?.success === false ? (
                  <div className="admin-error">
                    ❌ Upload failed
                    {bulkUploadResult.errors?.length > 0 ? (
                      <>
                        <strong style={{ display: 'block', marginTop: '0.5rem' }}>Errors:</strong>
                        {bulkUploadResult.errors.map((err, i) => (
                          <div key={i} style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
                            Row {err.row}: {err.field} - {err.message}
                          </div>
                        ))}
                      </>
                    ) : null}
                  </div>
                ) : null}

                {!bulkUploadResult ? (
                  <>
                    <div style={{ marginBottom: '1rem' }}>
                      <p className="admin-label">Step 1: Download Template</p>
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        onClick={async () => {
                          const response = await downloadTemplateNoBoilerplate();
                          if (!response.success) {
                            setError(response.message || 'Failed to download no-boilerplate template.');
                          }
                        }}
                      >
                        📥 Download Excel Template
                      </button>
                    </div>

                    <div>
                      <p className="admin-label">Step 2: Upload Completed File</p>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={(e) => setBulkUploadFile(e.target.files?.[0])}
                        className="admin-input"
                        style={{ cursor: 'pointer' }}
                      />
                      <p className="admin-helper">
                        Selected file: {bulkUploadFile?.name || 'None'}
                      </p>
                    </div>
                  </>
                ) : null}
              </div>

              {!bulkUploadResult ? (
                <div className="admin-modal-footer">
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={() => closeBulkUploadModal(false)}>Cancel</button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={handleBulkUploadNoBoilerplate}
                    disabled={bulkUploading || !bulkUploadFile}
                  >
                    {bulkUploading ? 'Uploading...' : 'Upload Questions'}
                  </button>
                </div>
              ) : (
                <div className="admin-modal-footer">
                  <button type="button" className="admin-btn admin-btn-primary" onClick={() => closeBulkUploadModal(false)}>Done</button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </section>
  );
}

export default AdminQuestionsPage;
