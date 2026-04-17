import { useEffect, useMemo, useState } from 'react';
import LandingNavbar from '../../components/LandingNavbar';
import AdminTabs from '../../components/admin/AdminTabs';
import {
  createAdminQuiz,
  createAdminQuizQuestion,
  deleteAdminQuiz,
  deleteAdminQuizQuestion,
  downloadAdminQuizResults,
  getAdminQuizQuestions,
  getAdminQuizzes,
  updateAdminQuiz,
  updateAdminQuizQuestion
} from '../../services/quizService';
import './AdminPages.css';

const defaultQuizForm = {
  title: '',
  description: '',
  difficulty: 'Easy',
  isProctored: false,
  schedulingEnabled: false,
  availableFromUtc: '',
  availableUntilUtc: '',
  timeLimitMinutes: 15,
  passingScore: 60,
  maxAttempts: 3,
  autoSubmitOnViolation: false,
  violationAutoSubmitThreshold: '',
  status: 'draft'
};

const defaultQuestionForm = {
  questionText: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctOption: 'A',
  explanation: '',
  questionOrder: 1,
  points: 1
};

const normalizeText = (value) => String(value ?? '').trim();

const getFirstErrorMessage = (errors) => Object.values(errors).find(Boolean) || '';

const toDatetimeLocalInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatScheduleStatus = (quiz) => {
  if (!quiz?.scheduling_enabled) return 'No schedule';

  const now = Date.now();
  const fromMs = quiz.available_from_utc ? new Date(quiz.available_from_utc).getTime() : null;
  const untilMs = quiz.available_until_utc ? new Date(quiz.available_until_utc).getTime() : null;

  if (fromMs && now < fromMs) return 'Coming Soon';
  if (untilMs && now > untilMs) return 'Expired';
  return 'Available';
};

const validateQuizForm = (form) => {
  const errors = {};

  const title = normalizeText(form.title);
  const description = normalizeText(form.description);
  const timeLimitMinutes = Number(form.timeLimitMinutes);
  const passingScore = Number(form.passingScore);
  const maxAttempts = Number(form.maxAttempts);
  const thresholdRaw = form.violationAutoSubmitThreshold;
  const violationAutoSubmitThreshold = thresholdRaw === '' ? null : Number(thresholdRaw);
  const availableFromInput = String(form.availableFromUtc || '').trim();
  const availableUntilInput = String(form.availableUntilUtc || '').trim();

  const availableFromUtc = availableFromInput ? new Date(availableFromInput).toISOString() : null;
  const availableUntilUtc = availableUntilInput ? new Date(availableUntilInput).toISOString() : null;

  if (!title) {
    errors.title = 'Quiz title is required.';
  }

  if (!Number.isInteger(timeLimitMinutes) || timeLimitMinutes < 1 || timeLimitMinutes > 300) {
    errors.timeLimitMinutes = 'Time limit must be an integer between 1 and 300 minutes.';
  }

  if (!Number.isInteger(passingScore) || passingScore < 0 || passingScore > 100) {
    errors.passingScore = 'Passing score must be an integer between 0 and 100.';
  }

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 20) {
    errors.maxAttempts = 'Maximum attempts must be an integer between 1 and 20.';
  }

  if (form.autoSubmitOnViolation && !form.isProctored) {
    errors.autoSubmitOnViolation = 'Enable proctoring before enabling auto-submit on violations.';
  }

  if (form.autoSubmitOnViolation) {
    if (violationAutoSubmitThreshold === null) {
      errors.violationAutoSubmitThreshold = 'Violation threshold is required when auto-submit is enabled.';
    } else if (!Number.isInteger(violationAutoSubmitThreshold) || violationAutoSubmitThreshold < 1 || violationAutoSubmitThreshold > 20) {
      errors.violationAutoSubmitThreshold = 'Violation threshold must be an integer between 1 and 20.';
    }
  }

  if (form.schedulingEnabled && !availableFromInput) {
    errors.availableFromUtc = 'Schedule start is required when scheduling is enabled.';
  }

  if (availableFromInput && Number.isNaN(new Date(availableFromInput).getTime())) {
    errors.availableFromUtc = 'Schedule start must be a valid datetime.';
  }

  if (availableUntilInput && Number.isNaN(new Date(availableUntilInput).getTime())) {
    errors.availableUntilUtc = 'Schedule end must be a valid datetime.';
  }

  if (availableFromUtc && availableUntilUtc) {
    const fromMs = new Date(availableFromUtc).getTime();
    const untilMs = new Date(availableUntilUtc).getTime();
    if (untilMs <= fromMs) {
      errors.availableUntilUtc = 'Schedule end must be after schedule start.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    payload: {
      title,
      description,
      difficulty: form.difficulty,
      isProctored: Boolean(form.isProctored),
      timeLimitMinutes,
      passingScore,
      maxAttempts,
      autoSubmitOnViolation: Boolean(form.autoSubmitOnViolation),
      violationAutoSubmitThreshold,
      schedulingEnabled: Boolean(form.schedulingEnabled),
      availableFromUtc,
      availableUntilUtc,
      status: form.status
    }
  };
};

const validateQuestionForm = (form) => {
  const errors = {};

  const questionText = normalizeText(form.questionText);
  const optionA = normalizeText(form.optionA);
  const optionB = normalizeText(form.optionB);
  const optionC = normalizeText(form.optionC);
  const optionD = normalizeText(form.optionD);
  const explanation = normalizeText(form.explanation);
  const questionOrder = Number(form.questionOrder);
  const points = Number(form.points);

  if (!questionText) {
    errors.questionText = 'Question text is required.';
  }

  if (!optionA || !optionB || !optionC || !optionD) {
    errors.options = 'All options (A, B, C, D) are required.';
  }

  const uniqueOptions = new Set([optionA, optionB, optionC, optionD].map((value) => value.toLowerCase()));
  if (optionA && optionB && optionC && optionD && uniqueOptions.size < 4) {
    errors.options = 'Each option must be unique.';
  }

  if (!Number.isInteger(questionOrder) || questionOrder < 1 || questionOrder > 2000) {
    errors.questionOrder = 'Question order must be an integer between 1 and 2000.';
  }

  if (!Number.isInteger(points) || points < 1 || points > 100) {
    errors.points = 'Points must be an integer between 1 and 100.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    payload: {
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption: form.correctOption,
      explanation,
      questionOrder,
      points
    }
  };
};

const isQuestionFormDirty = (form, expectedOrder) => {
  const orderValue = Number(form.questionOrder);
  const defaultOrder = Number(expectedOrder || 1);

  return Boolean(
    normalizeText(form.questionText)
    || normalizeText(form.optionA)
    || normalizeText(form.optionB)
    || normalizeText(form.optionC)
    || normalizeText(form.optionD)
    || normalizeText(form.explanation)
    || form.correctOption !== 'A'
    || Number(form.points || 1) !== 1
    || orderValue !== defaultOrder
  );
};

function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [quizForm, setQuizForm] = useState({ ...defaultQuizForm });
  const [questionForm, setQuestionForm] = useState({ ...defaultQuestionForm });
  const [loading, setLoading] = useState(true);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [quizFormErrors, setQuizFormErrors] = useState({});
  const [questionFormErrors, setQuestionFormErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [isEditingQuiz, setIsEditingQuiz] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState(null);
  const [quizSearch, setQuizSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const onQuizFieldChange = (field, value) => {
    setQuizForm((prev) => ({ ...prev, [field]: value }));
    setQuizFormErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const onQuestionFieldChange = (field, value) => {
    setQuestionForm((prev) => ({ ...prev, [field]: value }));
    setQuestionFormErrors((prev) => ({ ...prev, [field]: '', options: '' }));
  };

  const selectedQuiz = useMemo(
    () => quizzes.find((quiz) => Number(quiz.id) === Number(selectedQuizId)) || null,
    [quizzes, selectedQuizId]
  );

  const filteredQuizzes = useMemo(() => {
    const term = quizSearch.trim().toLowerCase();

    return quizzes.filter((quiz) => {
      const matchesTerm = !term
        || String(quiz.title || '').toLowerCase().includes(term)
        || String(quiz.description || '').toLowerCase().includes(term);
      const matchesDifficulty = !difficultyFilter || quiz.difficulty === difficultyFilter;
      const matchesStatus = !statusFilter || quiz.status === statusFilter;
      return matchesTerm && matchesDifficulty && matchesStatus;
    });
  }, [quizzes, quizSearch, difficultyFilter, statusFilter]);

  const expectedOrder = (questions.length || 0) + 1;

  const confirmQuestionStateDiscard = () => {
    if (editingQuestionId || isQuestionFormDirty(questionForm, expectedOrder)) {
      return window.confirm('You have unsaved question changes. Discard and continue?');
    }
    return true;
  };

  const loadQuizzes = async () => {
    const response = await getAdminQuizzes();
    if (!response.success) {
      setError(response.message || 'Failed to load quizzes.');
      setQuizzes([]);
      return;
    }

    const allQuizzes = response.quizzes || [];
    setQuizzes(allQuizzes);

    if (allQuizzes.length === 0) {
      setSelectedQuizId(null);
      return;
    }

    if (selectedQuizId) {
      const stillExists = allQuizzes.some((quiz) => Number(quiz.id) === Number(selectedQuizId));
      if (stillExists) {
        return;
      }
    }

    setSelectedQuizId(allQuizzes[0].id);
  };

  const loadQuestions = async (quizId) => {
    if (!quizId) {
      setQuestions([]);
      return;
    }

    const response = await getAdminQuizQuestions(quizId);
    if (!response.success) {
      setError(response.message || 'Failed to load quiz questions.');
      setQuestions([]);
      return;
    }

    const loadedQuestions = response.questions || [];
    setQuestions(loadedQuestions);
    if (!editingQuestionId) {
      setQuestionForm((prev) => ({
        ...prev,
        questionOrder: loadedQuestions.length + 1
      }));
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await loadQuizzes();
      setLoading(false);
    };

    load();
  }, []);

  useEffect(() => {
    setEditingQuestionId(null);
    setQuestionForm({ ...defaultQuestionForm });
    setQuestionFormErrors({});
    loadQuestions(selectedQuizId);
  }, [selectedQuizId]);

  useEffect(() => {
    if (!isEditingQuiz || !editingQuizId || !selectedQuiz) return;
    if (Number(selectedQuiz.id) !== Number(editingQuizId)) {
      setIsEditingQuiz(false);
      setEditingQuizId(null);
      setQuizForm({ ...defaultQuizForm });
      setQuizFormErrors({});
    }
  }, [isEditingQuiz, editingQuizId, selectedQuiz]);

  const onSelectQuiz = (quizId) => {
    if (Number(quizId) === Number(selectedQuizId)) return;
    if (!confirmQuestionStateDiscard()) return;

    clearMessages();
    setSelectedQuizId(quizId);
    setActiveTab('details');
    setIsEditingQuiz(false);
    setEditingQuizId(null);
    setQuizForm({ ...defaultQuizForm });
    setQuizFormErrors({});
  };

  const onStartCreateQuiz = () => {
    if (!confirmQuestionStateDiscard()) return;

    clearMessages();
    setIsEditingQuiz(false);
    setEditingQuizId(null);
    setQuizForm({ ...defaultQuizForm });
    setQuizFormErrors({});
    setSelectedQuizId(null);
    setQuestions([]);
    setActiveTab('details');
  };

  const onStartEditQuiz = (quiz) => {
    if (!quiz) return;
    if (!confirmQuestionStateDiscard()) return;

    clearMessages();
    setSelectedQuizId(quiz.id);
    setIsEditingQuiz(true);
    setEditingQuizId(quiz.id);
    setActiveTab('details');
    setQuizFormErrors({});
    setQuizForm({
      title: quiz.title || '',
      description: quiz.description || '',
      difficulty: quiz.difficulty || 'Easy',
      isProctored: Boolean(quiz.is_proctored),
      schedulingEnabled: Boolean(quiz.scheduling_enabled),
      availableFromUtc: toDatetimeLocalInput(quiz.available_from_utc),
      availableUntilUtc: toDatetimeLocalInput(quiz.available_until_utc),
      timeLimitMinutes: Number(quiz.time_limit_minutes || 15),
      passingScore: Number(quiz.passing_score || 60),
      maxAttempts: Number(quiz.max_attempts || 3),
      autoSubmitOnViolation: Boolean(quiz.auto_submit_on_violation),
      violationAutoSubmitThreshold: quiz.violation_auto_submit_threshold === null
        ? ''
        : Number(quiz.violation_auto_submit_threshold),
      status: quiz.status || 'draft'
    });
  };

  const onCancelQuizEdit = () => {
    clearMessages();
    setIsEditingQuiz(false);
    setEditingQuizId(null);
    setQuizForm({ ...defaultQuizForm });
    setQuizFormErrors({});
  };

  const onSubmitQuiz = async (event) => {
    event.preventDefault();
    clearMessages();

    const { isValid, errors, payload } = validateQuizForm(quizForm);
    setQuizFormErrors(errors);
    if (!isValid) {
      setError(getFirstErrorMessage(errors));
      return;
    }

    if (payload.status === 'published') {
      if (!isEditingQuiz) {
        setError('Create the quiz as draft first. Add at least one question before publishing.');
        return;
      }

      const selectedCount = Number(selectedQuiz?.question_count ?? questions.length ?? 0);
      if (selectedCount <= 0) {
        setError('Cannot publish quiz with zero questions. Add at least one question first.');
        return;
      }
    }

    setSavingQuiz(true);

    const response = isEditingQuiz && editingQuizId
      ? await updateAdminQuiz(editingQuizId, payload)
      : await createAdminQuiz(payload);

    setSavingQuiz(false);

    if (!response.success) {
      setError(response.message || (isEditingQuiz ? 'Failed to update quiz.' : 'Failed to create quiz.'));
      return;
    }

    setSuccess(isEditingQuiz ? 'Quiz updated successfully.' : 'Quiz created successfully.');
    const createdQuizId = Number(response.quiz?.id || 0);

    if (createdQuizId > 0) {
      setSelectedQuizId(createdQuizId);
      setActiveTab('questions');
    }

    setIsEditingQuiz(false);
    setEditingQuizId(null);
    setQuizForm({ ...defaultQuizForm });
    setQuizFormErrors({});
    await loadQuizzes();
  };

  const onDeleteQuiz = async (quiz) => {
    if (!window.confirm(`Delete quiz "${quiz.title}"?`)) return;

    clearMessages();
    const response = await deleteAdminQuiz(quiz.id);

    if (!response.success) {
      setError(response.message || 'Failed to delete quiz.');
      return;
    }

    setSuccess('Quiz deleted successfully.');
    if (selectedQuizId === quiz.id) {
      setSelectedQuizId(null);
      setQuestions([]);
      setIsEditingQuiz(false);
      setEditingQuizId(null);
      setActiveTab('details');
    }
    await loadQuizzes();
  };

  const onExportQuiz = async (quizId) => {
    clearMessages();

    const response = await downloadAdminQuizResults(quizId);
    if (!response.success) {
      setError(response.message || 'Failed to export quiz results.');
      return;
    }

    setSuccess('Quiz export downloaded successfully.');
  };

  const onEditQuestion = (question) => {
    setEditingQuestionId(question.id);
    setQuestionFormErrors({});
    clearMessages();
    setQuestionForm({
      questionText: question.question_text || '',
      optionA: question.option_a || '',
      optionB: question.option_b || '',
      optionC: question.option_c || '',
      optionD: question.option_d || '',
      correctOption: question.correct_option || 'A',
      explanation: question.explanation || '',
      questionOrder: Number(question.question_order || 1),
      points: Number(question.points || 1)
    });
  };

  const onCancelEditQuestion = () => {
    setEditingQuestionId(null);
    setQuestionFormErrors({});
    clearMessages();
    setQuestionForm({
      ...defaultQuestionForm,
      questionOrder: questions.length + 1
    });
  };

  const onSubmitQuestion = async (event) => {
    event.preventDefault();
    if (!selectedQuizId) {
      setError('Select a quiz first.');
      return;
    }

    clearMessages();

    const { isValid, errors, payload } = validateQuestionForm(questionForm);
    setQuestionFormErrors(errors);
    if (!isValid) {
      setError(getFirstErrorMessage(errors));
      return;
    }

    setSavingQuestion(true);

    const response = editingQuestionId
      ? await updateAdminQuizQuestion(selectedQuizId, editingQuestionId, payload)
      : await createAdminQuizQuestion(selectedQuizId, payload);

    setSavingQuestion(false);

    if (!response.success) {
      setError(response.message || (editingQuestionId ? 'Failed to update question.' : 'Failed to add question.'));
      return;
    }

    setSuccess(editingQuestionId ? 'Question updated successfully.' : 'Question added successfully.');
    setQuestionFormErrors({});
    setEditingQuestionId(null);
    setQuestionForm({ ...defaultQuestionForm });
    await loadQuestions(selectedQuizId);
    await loadQuizzes();
  };

  const onDeleteQuestion = async (questionId) => {
    if (!selectedQuizId) return;

    if (!window.confirm('Delete this question?')) return;

    clearMessages();

    const response = await deleteAdminQuizQuestion(selectedQuizId, questionId);
    if (!response.success) {
      setError(response.message || 'Failed to delete question.');
      return;
    }

    setSuccess('Question deleted successfully.');
    if (editingQuestionId === questionId) {
      onCancelEditQuestion();
    }
    await loadQuestions(selectedQuizId);
    await loadQuizzes();
  };

  return (
    <section>
      <LandingNavbar />
      <main className="admin-shell">
        <header className="admin-header">
          <div>
            <p className="admin-header-badge">Quiz Operations</p>
            <h1>Quiz Management</h1>
            <p>Create proctored and non-proctored quizzes, manage questions, and export attempt results.</p>
          </div>
        </header>

        <AdminTabs />

        {error ? <div className="admin-error">{error}</div> : null}
        {success ? <div className="admin-loading">{success}</div> : null}

        <section className="admin-quizzes-workspace">
          <aside className="admin-content-card admin-quiz-sidebar">
            <div className="admin-quiz-sidebar-head">
              <h2 className="admin-subtitle">Quiz List</h2>
              <button type="button" className="admin-btn admin-btn-primary" onClick={onStartCreateQuiz}>
                Create New
              </button>
            </div>

            <div className="admin-quiz-sidebar-filters">
              <input
                className="admin-input"
                placeholder="Search quizzes"
                value={quizSearch}
                onChange={(event) => setQuizSearch(event.target.value)}
              />
              <div className="admin-inline-grid-2">
                <select className="admin-select" value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)}>
                  <option value="">All Difficulty</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
                <select className="admin-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            {loading ? <div className="admin-loading">Loading quizzes...</div> : null}
            {!loading && filteredQuizzes.length === 0 ? <div className="admin-empty">No quizzes match your filters.</div> : null}

            {!loading && filteredQuizzes.length > 0 ? (
              <div className="admin-quiz-compact-list">
                {filteredQuizzes.map((quiz) => {
                  const isSelected = Number(quiz.id) === Number(selectedQuizId);
                  return (
                    <button
                      type="button"
                      key={quiz.id}
                      className={isSelected ? 'admin-quiz-list-item admin-quiz-list-item-active' : 'admin-quiz-list-item'}
                      onClick={() => onSelectQuiz(quiz.id)}
                    >
                      <span className="admin-quiz-list-row">
                        <strong>{quiz.title}</strong>
                        <span className="admin-badge admin-badge-medium">{quiz.status}</span>
                      </span>
                      <span className="admin-quiz-list-meta">
                        <span>{quiz.difficulty}</span>
                        <span>{quiz.question_count} Qs</span>
                        <span>{quiz.is_proctored ? 'Proctored' : 'Open'}</span>
                        <span>{formatScheduleStatus(quiz)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </aside>

          <section className="admin-content-card admin-quiz-main">
            <div className="admin-quiz-main-head">
              <div>
                <h2 className="admin-subtitle">
                  {isEditingQuiz ? 'Edit Quiz Metadata' : 'Quiz Operations'}
                </h2>
                <p className="admin-form-hint">
                  {selectedQuiz
                    ? `${selectedQuiz.title} | ${selectedQuiz.status} | ${selectedQuiz.question_count} questions`
                    : 'Create a new quiz or select one from the list.'}
                </p>
              </div>

              <div className="admin-action-stack">
                {selectedQuiz && !isEditingQuiz ? (
                  <>
                    <button type="button" className="admin-btn" onClick={() => onStartEditQuiz(selectedQuiz)}>
                      Edit Metadata
                    </button>
                    <button type="button" className="admin-btn" onClick={() => onExportQuiz(selectedQuiz.id)}>
                      Export
                    </button>
                    <button type="button" className="admin-btn admin-btn-danger" onClick={() => onDeleteQuiz(selectedQuiz)}>
                      Delete
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            <div className="admin-quiz-tabs">
              <button
                type="button"
                className={activeTab === 'details' ? 'admin-btn admin-btn-secondary admin-tab-active' : 'admin-btn admin-btn-secondary'}
                onClick={() => setActiveTab('details')}
              >
                Quiz Details
              </button>
              <button
                type="button"
                className={activeTab === 'questions' ? 'admin-btn admin-btn-secondary admin-tab-active' : 'admin-btn admin-btn-secondary'}
                onClick={() => setActiveTab('questions')}
                disabled={!selectedQuizId}
              >
                Questions
              </button>
            </div>

            {activeTab === 'details' ? (
              <form className="admin-assessment-form admin-quiz-form-compact" onSubmit={onSubmitQuiz}>
            <input
              className="admin-input"
              placeholder="Quiz title"
              value={quizForm.title}
              onChange={(event) => onQuizFieldChange('title', event.target.value)}
              required
            />
            {quizFormErrors.title ? <p className="admin-form-error admin-form-group-full">{quizFormErrors.title}</p> : null}

            <select
              className="admin-select"
              value={quizForm.difficulty}
              onChange={(event) => onQuizFieldChange('difficulty', event.target.value)}
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>

            <input
              className="admin-input"
              type="number"
              min="1"
              max="300"
              placeholder="Time limit in minutes"
              value={quizForm.timeLimitMinutes}
              onChange={(event) => onQuizFieldChange('timeLimitMinutes', event.target.value)}
            />
            {quizFormErrors.timeLimitMinutes ? <p className="admin-form-error admin-form-group-full">{quizFormErrors.timeLimitMinutes}</p> : null}

            <input
              className="admin-input"
              type="number"
              min="0"
              max="100"
              placeholder="Passing score (%)"
              value={quizForm.passingScore}
              onChange={(event) => onQuizFieldChange('passingScore', event.target.value)}
            />
            {quizFormErrors.passingScore ? <p className="admin-form-error admin-form-group-full">{quizFormErrors.passingScore}</p> : null}

            <input
              className="admin-input"
              type="number"
              min="1"
              max="20"
              placeholder="Maximum attempts"
              value={quizForm.maxAttempts}
              onChange={(event) => onQuizFieldChange('maxAttempts', event.target.value)}
            />
            {quizFormErrors.maxAttempts ? <p className="admin-form-error admin-form-group-full">{quizFormErrors.maxAttempts}</p> : null}

            <select
              className="admin-select"
              value={quizForm.status}
              onChange={(event) => onQuizFieldChange('status', event.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>

            <label className="admin-form-checkbox">
              <input
                type="checkbox"
                checked={quizForm.isProctored}
                onChange={(event) => onQuizFieldChange('isProctored', event.target.checked)}
              />
              <span>Enable proctoring</span>
            </label>

            <label className="admin-form-checkbox">
              <input
                type="checkbox"
                checked={quizForm.schedulingEnabled}
                onChange={(event) => onQuizFieldChange('schedulingEnabled', event.target.checked)}
              />
              <span>Enable scheduling (optional)</span>
            </label>

            <input
              className="admin-input"
              type="datetime-local"
              value={quizForm.availableFromUtc}
              onChange={(event) => onQuizFieldChange('availableFromUtc', event.target.value)}
              disabled={!quizForm.schedulingEnabled}
            />
            {quizFormErrors.availableFromUtc ? <p className="admin-form-error admin-form-group-full">{quizFormErrors.availableFromUtc}</p> : null}

            <input
              className="admin-input"
              type="datetime-local"
              value={quizForm.availableUntilUtc}
              onChange={(event) => onQuizFieldChange('availableUntilUtc', event.target.value)}
              disabled={!quizForm.schedulingEnabled}
            />
            {quizFormErrors.availableUntilUtc ? <p className="admin-form-error admin-form-group-full">{quizFormErrors.availableUntilUtc}</p> : null}

            <label className="admin-form-checkbox">
              <input
                type="checkbox"
                checked={quizForm.autoSubmitOnViolation}
                onChange={(event) => onQuizFieldChange('autoSubmitOnViolation', event.target.checked)}
              />
              <span>Auto-submit on threshold violation</span>
            </label>
            {quizFormErrors.autoSubmitOnViolation ? <p className="admin-form-error admin-form-group-full">{quizFormErrors.autoSubmitOnViolation}</p> : null}

            <input
              className="admin-input"
              type="number"
              min="1"
              max="20"
              placeholder="Violation threshold (optional)"
              value={quizForm.violationAutoSubmitThreshold}
              onChange={(event) => onQuizFieldChange('violationAutoSubmitThreshold', event.target.value)}
              disabled={!quizForm.autoSubmitOnViolation}
            />
            {quizFormErrors.violationAutoSubmitThreshold ? <p className="admin-form-error admin-form-group-full">{quizFormErrors.violationAutoSubmitThreshold}</p> : null}

            <textarea
              className="admin-textarea admin-form-group-full"
              rows={3}
              placeholder="Quiz description"
              value={quizForm.description}
              onChange={(event) => onQuizFieldChange('description', event.target.value)}
            />

            <p className="admin-form-hint admin-form-group-full">
              Validation: time limit 1-300, passing score 0-100, max attempts 1-20. Auto-submit threshold is required only when auto-submit is enabled.
            </p>

            <p className="admin-form-hint admin-form-group-full">
              Scheduling uses UTC. Datetimes are converted to UTC before saving.
            </p>

                <div className="admin-action-stack admin-form-group-full">
                  <button className="admin-btn admin-btn-primary" type="submit" disabled={savingQuiz}>
                    {savingQuiz
                      ? (isEditingQuiz ? 'Updating...' : 'Creating...')
                      : (isEditingQuiz ? 'Update Quiz' : 'Create Quiz')}
                  </button>

                  {isEditingQuiz ? (
                    <button className="admin-btn admin-btn-secondary" type="button" onClick={onCancelQuizEdit}>
                      Cancel Edit
                    </button>
                  ) : null}
                </div>
              </form>
            ) : (
              <>
                <h3 className="admin-subtitle">
                  {editingQuestionId ? 'Edit Question' : 'Add Question'}
                  {selectedQuiz ? ` (${selectedQuiz.title})` : ''}
                </h3>

                {!selectedQuizId ? (
                  <div className="admin-empty">Select a quiz from the list to manage questions.</div>
                ) : (
                  <>
                    <form className="admin-assessment-form admin-quiz-form-compact" onSubmit={onSubmitQuestion}>
                      <textarea
                        className="admin-textarea admin-form-group-full"
                        rows={3}
                        placeholder="Question text"
                        value={questionForm.questionText}
                        onChange={(event) => onQuestionFieldChange('questionText', event.target.value)}
                        required
                      />
                      {questionFormErrors.questionText ? <p className="admin-form-error admin-form-group-full">{questionFormErrors.questionText}</p> : null}

                      <input
                        className="admin-input"
                        placeholder="Option A"
                        value={questionForm.optionA}
                        onChange={(event) => onQuestionFieldChange('optionA', event.target.value)}
                        required
                      />
                      <input
                        className="admin-input"
                        placeholder="Option B"
                        value={questionForm.optionB}
                        onChange={(event) => onQuestionFieldChange('optionB', event.target.value)}
                        required
                      />
                      <input
                        className="admin-input"
                        placeholder="Option C"
                        value={questionForm.optionC}
                        onChange={(event) => onQuestionFieldChange('optionC', event.target.value)}
                        required
                      />
                      <input
                        className="admin-input"
                        placeholder="Option D"
                        value={questionForm.optionD}
                        onChange={(event) => onQuestionFieldChange('optionD', event.target.value)}
                        required
                      />
                      {questionFormErrors.options ? <p className="admin-form-error admin-form-group-full">{questionFormErrors.options}</p> : null}

                      <select
                        className="admin-select"
                        value={questionForm.correctOption}
                        onChange={(event) => onQuestionFieldChange('correctOption', event.target.value)}
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>

                      <input
                        className="admin-input"
                        type="number"
                        min="1"
                        max="2000"
                        placeholder="Question order"
                        value={questionForm.questionOrder}
                        onChange={(event) => onQuestionFieldChange('questionOrder', event.target.value)}
                      />
                      {questionFormErrors.questionOrder ? <p className="admin-form-error admin-form-group-full">{questionFormErrors.questionOrder}</p> : null}

                      <input
                        className="admin-input"
                        type="number"
                        min="1"
                        max="100"
                        placeholder="Points"
                        value={questionForm.points}
                        onChange={(event) => onQuestionFieldChange('points', event.target.value)}
                      />
                      {questionFormErrors.points ? <p className="admin-form-error admin-form-group-full">{questionFormErrors.points}</p> : null}

                      <textarea
                        className="admin-textarea admin-form-group-full"
                        rows={2}
                        placeholder="Explanation (optional)"
                        value={questionForm.explanation}
                        onChange={(event) => onQuestionFieldChange('explanation', event.target.value)}
                      />

                      <p className="admin-form-hint admin-form-group-full">
                        Validation: all options required and unique, question order 1-2000, points 1-100.
                      </p>

                      <div className="admin-action-stack admin-form-group-full">
                        <button className="admin-btn admin-btn-primary" type="submit" disabled={savingQuestion}>
                          {savingQuestion ? (editingQuestionId ? 'Updating...' : 'Adding...') : (editingQuestionId ? 'Update Question' : 'Add Question')}
                        </button>
                        {editingQuestionId ? (
                          <button className="admin-btn admin-btn-secondary" type="button" onClick={onCancelEditQuestion}>
                            Cancel Edit
                          </button>
                        ) : null}
                      </div>
                    </form>

                    {questions.length === 0 ? (
                      <div className="admin-empty">No questions added for this quiz yet.</div>
                    ) : (
                      <div className="admin-problem-list admin-assessment-question-list admin-quiz-question-list">
                        {questions.map((question) => (
                          <article className="admin-problem-item" key={question.id}>
                            <div>
                              <strong>Q{question.question_order}</strong> {question.question_text}
                              <p>Correct: {question.correct_option} | Points: {question.points}</p>
                            </div>
                            <div className="admin-action-stack">
                              <button
                                type="button"
                                className="admin-btn"
                                onClick={() => onEditQuestion(question)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="admin-btn admin-btn-danger"
                                onClick={() => onDeleteQuestion(question.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </section>
        </section>
      </main>
    </section>
  );
}

export default AdminQuizzesPage;
