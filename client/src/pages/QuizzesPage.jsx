import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Edit3, Briefcase, Target, ShieldCheck, CheckCircle, Timer, TrendingUp } from 'lucide-react';
import LandingNavbar from '../components/LandingNavbar';
import { isAuthenticated } from '../services/authService';
import { getPublicQuizzes, getQuizAttemptHistory, startQuizAttempt } from '../services/quizService';
import './ProblemsPage.css';
import './QuizPages.css';

const formatAttemptStatus = (status) => {
  if (status === 'in_progress') return 'In Progress';
  if (status === 'auto_submitted') return 'Auto Submitted';
  return 'Submitted';
};

const formatAttemptDuration = (seconds) => {
  const total = Number(seconds || 0);
  if (total <= 0) return '-';
  const minutes = Math.floor(total / 60);
  const remSeconds = total % 60;
  return `${minutes}m ${remSeconds}s`;
};

const formatAttemptDate = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
};

const getQuizAvailabilityStatus = (quiz) => {
  const status = String(quiz?.availability_status || '').toLowerCase();
  if (status === 'coming_soon' || status === 'expired' || status === 'available') {
    return status;
  }

  if (!quiz?.scheduling_enabled) {
    return 'available';
  }

  const now = Date.now();
  const fromMs = quiz.available_from_utc ? new Date(quiz.available_from_utc).getTime() : null;
  const untilMs = quiz.available_until_utc ? new Date(quiz.available_until_utc).getTime() : null;

  if (fromMs && now < fromMs) return 'coming_soon';
  if (untilMs && now > untilMs) return 'expired';
  return 'available';
};

const formatScheduleHint = (quiz) => {
  if (!quiz?.scheduling_enabled) return 'Always available';

  const from = quiz.available_from_utc ? new Date(quiz.available_from_utc) : null;
  const until = quiz.available_until_utc ? new Date(quiz.available_until_utc) : null;
  const fromText = from && !Number.isNaN(from.getTime()) ? from.toUTCString() : 'Not set';
  const untilText = until && !Number.isNaN(until.getTime()) ? until.toUTCString() : 'No end time';

  return `${fromText} -> ${untilText}`;
};

function QuizzesPage() {
  const navigate = useNavigate();
  const loggedIn = isAuthenticated();
  const [quizzes, setQuizzes] = useState([]);
  const [attemptHistory, setAttemptHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [mode, setMode] = useState('');
  const [loading, setLoading] = useState(true);
  const [startingQuizId, setStartingQuizId] = useState(null);
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');

  const loadPageData = async (nextSearch = search, nextDifficulty = difficulty) => {
    setLoading(true);
    setError('');
    setHistoryError('');

    const [quizResponse, historyResponse] = await Promise.all([
      getPublicQuizzes({ search: nextSearch, difficulty: nextDifficulty }),
      loggedIn ? getQuizAttemptHistory() : Promise.resolve({ success: true, attempts: [] })
    ]);

    if (!quizResponse.success) {
      setError(quizResponse.message || 'Failed to load quizzes.');
      setQuizzes([]);
    } else {
      setQuizzes(quizResponse.quizzes || []);
    }

    if (historyResponse.success) {
      setAttemptHistory(historyResponse.attempts || []);
    } else {
      setAttemptHistory([]);
      setHistoryError(historyResponse.message || 'Failed to load your quiz attempt history.');
    }

    setLoading(false);
  };

  useEffect(() => {
    loadPageData();
  }, []);

  const attemptCountByQuiz = useMemo(() => {
    const map = new Map();
    for (const attempt of attemptHistory) {
      const quizId = Number(attempt.quiz_id);
      if (!Number.isInteger(quizId) || quizId <= 0) continue;
      map.set(quizId, (map.get(quizId) || 0) + 1);
    }
    return map;
  }, [attemptHistory]);

  const filteredQuizzes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return quizzes.filter((quiz) => {
      const matchesSearch = !term
        || String(quiz.title || '').toLowerCase().includes(term)
        || String(quiz.description || '').toLowerCase().includes(term);
      const matchesDifficulty = !difficulty || quiz.difficulty === difficulty;
      const matchesMode = !mode
        || (mode === 'proctored' && Boolean(quiz.is_proctored))
        || (mode === 'open' && !quiz.is_proctored);
      return matchesSearch && matchesDifficulty && matchesMode;
    });
  }, [quizzes, search, difficulty, mode]);

  const quizStats = useMemo(() => {
    const total = quizzes.length;
    const proctored = quizzes.filter((quiz) => quiz.is_proctored).length;
    const attempted = filteredQuizzes.filter((quiz) => (attemptCountByQuiz.get(Number(quiz.id)) || 0) > 0).length;

    const finalizedAttempts = attemptHistory.filter((attempt) => attempt.status !== 'in_progress');
    const avgAccuracy = finalizedAttempts.length
      ? Math.round(finalizedAttempts.reduce((sum, item) => sum + Number(item.accuracy_percent || 0), 0) / finalizedAttempts.length)
      : 0;

    const avgDuration = quizzes.length
      ? Math.round(quizzes.reduce((sum, item) => sum + Number(item.time_limit_minutes || 0), 0) / quizzes.length)
      : 0;

    return {
      total,
      proctored,
      attempted,
      avgAccuracy,
      avgDuration
    };
  }, [quizzes, filteredQuizzes, attemptCountByQuiz, attemptHistory]);

  const onStartQuiz = async (quizId) => {
    if (!isAuthenticated()) {
      navigate('/login', { state: { from: '/quizzes' } });
      return;
    }

    setStartingQuizId(quizId);
    const response = await startQuizAttempt(quizId);
    setStartingQuizId(null);

    if (!response.success) {
      if (response.code === 'QUIZ_COMING_SOON') {
        setError('This quiz is coming soon. Please try again after the scheduled start time.');
        return;
      }

      if (response.code === 'QUIZ_EXPIRED') {
        setError('This quiz has expired and is no longer available for new attempts.');
        return;
      }

      setError(response.message || 'Failed to start quiz.');
      return;
    }

    navigate(`/quizzes/attempts/${response.attempt.id}`);
  };

  return (
    <section className="quiz-page-shell">
      <LandingNavbar />
      <main className="problems-shell quiz-problems-shell">
        <header className="problems-header">
          <div className="problems-header-cards">
            <Link to="/learning-paths" className="progress-feature-card progress-card-learning">
              <div className="feature-top-row">
                <span className="feature-kicker">Guided</span>
                <span className="feature-arrow">→</span>
              </div>
              <span className="feature-icon"><BookOpen size={28} aria-hidden="true" /></span>
              <div className="feature-title">Learning Path</div>
              <div className="feature-subtitle">Follow quiz-aligned tracks topic by topic</div>
            </Link>

            <Link to="/practice-sheets" className="progress-feature-card progress-card-practice">
              <div className="feature-top-row">
                <span className="feature-kicker">Focused</span>
                <span className="feature-arrow">→</span>
              </div>
              <span className="feature-icon"><Edit3 size={28} aria-hidden="true" /></span>
              <div className="feature-title">Practice Sheets</div>
              <div className="feature-subtitle">Warm up with targeted practice before quizzes</div>
            </Link>

            <Link to="/interview-prep" className="progress-feature-card progress-card-interview">
              <div className="feature-top-row">
                <span className="feature-kicker">Career</span>
                <span className="feature-arrow">→</span>
              </div>
              <span className="feature-icon"><Briefcase size={28} aria-hidden="true" /></span>
              <div className="feature-title">Interview Prep</div>
              <div className="feature-subtitle">Bridge quiz practice with interview readiness</div>
            </Link>
          </div>
        </header>

        <section className="progress-block">
          <div className="progress-stat-card progress-card-primary">
            <span className="progress-stat-icon"><Target size={24} aria-hidden="true" /></span>
            <div className="progress-stat-content">
              <div className="progress-stat-label">Total Quizzes</div>
              <div className="progress-stat-value">{quizStats.total}</div>
            </div>
          </div>

          <div className="progress-stat-card progress-card-streak">
            <span className="progress-stat-icon"><ShieldCheck size={24} aria-hidden="true" /></span>
            <div className="progress-stat-content">
              <div className="progress-stat-label">Proctored</div>
              <div className="progress-stat-value">{quizStats.proctored}</div>
            </div>
          </div>

          <div className="progress-stat-card progress-card-easy">
            <span className="progress-stat-icon"><CheckCircle size={24} aria-hidden="true" /></span>
            <div className="progress-stat-content">
              <div className="progress-stat-label">Attempted</div>
              <div className="progress-stat-value">{quizStats.attempted}</div>
            </div>
          </div>

          <div className="progress-stat-card progress-card-medium">
            <span className="progress-stat-icon"><TrendingUp size={24} aria-hidden="true" /></span>
            <div className="progress-stat-content">
              <div className="progress-stat-label">Avg Accuracy</div>
              <div className="progress-stat-value">{quizStats.avgAccuracy}%</div>
            </div>
          </div>

          <div className="progress-stat-card progress-card-hard">
            <span className="progress-stat-icon"><Timer size={24} aria-hidden="true" /></span>
            <div className="progress-stat-content">
              <div className="progress-stat-label">Avg Duration</div>
              <div className="progress-stat-value">{quizStats.avgDuration}m</div>
            </div>
          </div>
        </section>

        <section className="problems-toolbar">
          <input
            className="problems-input"
            placeholder="Search quiz title"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="problems-select"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
          >
            <option value="">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
          <select className="problems-select" value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="">All Modes</option>
            <option value="open">Open</option>
            <option value="proctored">Proctored</option>
          </select>
          <button type="button" className="problems-btn problems-btn-primary" onClick={() => loadPageData(search, difficulty)}>
            Apply
          </button>
        </section>

        {loading ? <div className="problems-loading">Loading quizzes...</div> : null}
        {error ? <div className="problems-error">{error}</div> : null}

        {!loading && filteredQuizzes.length === 0 ? (
          <div className="problems-empty">No quizzes found. Try updating search or filters.</div>
        ) : null}

        {!loading && filteredQuizzes.length > 0 ? (
          <section className="quiz-grid" aria-label="Quiz cards">
            {filteredQuizzes.map((quiz, index) => {
              const attempts = attemptCountByQuiz.get(Number(quiz.id)) || 0;
              const availabilityStatus = getQuizAvailabilityStatus(quiz);
              const isScheduleLocked = availabilityStatus === 'coming_soon' || availabilityStatus === 'expired';

              const availabilityLabel = availabilityStatus === 'coming_soon'
                ? 'Coming Soon'
                : availabilityStatus === 'expired'
                  ? 'Expired'
                  : 'Available';

              const availabilityClass = availabilityStatus === 'coming_soon'
                ? 'quiz-chip-scheduled'
                : availabilityStatus === 'expired'
                  ? 'quiz-chip-expired'
                  : 'quiz-chip-available';

              return (
                <article className="quiz-card quiz-list-card" key={quiz.id}>
                  <div className="quiz-card-top">
                    <h3 className="quiz-list-title">
                      {index + 1}. {quiz.title}
                    </h3>
                    <div className="quiz-list-badges">
                      <span className={`quiz-chip quiz-chip-${String(quiz.difficulty || '').toLowerCase()}`}>
                        {quiz.difficulty}
                      </span>
                      <span className={`quiz-chip ${quiz.is_proctored ? 'quiz-chip-proctored' : 'quiz-chip-open'}`}>
                        {quiz.is_proctored ? 'Proctored' : 'Open'}
                      </span>
                      {quiz.scheduling_enabled ? (
                        <span className={`quiz-chip ${availabilityClass}`}>
                          {availabilityLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <p className="quiz-list-description">{quiz.description || 'No description provided.'}</p>

                  <div className="quiz-meta-row quiz-list-meta-row">
                    <span className="quiz-list-meta-item">{quiz.question_count} questions</span>
                    <span className="quiz-list-meta-item">{quiz.time_limit_minutes} min</span>
                    <span className="quiz-list-meta-item">Pass {quiz.passing_score}%</span>
                    {quiz.scheduling_enabled ? <span className="quiz-list-meta-item">UTC Schedule</span> : null}
                  </div>

                  {quiz.scheduling_enabled ? (
                    <p className="quiz-list-schedule-text">{formatScheduleHint(quiz)}</p>
                  ) : null}

                  <div className="quiz-list-footer">
                    <span className="quiz-list-attempt-status">
                      {attempts > 0 ? `Attempted ${attempts} time(s)` : 'Not attempted yet'}
                    </span>
                    <button
                      type="button"
                      className="quiz-btn quiz-btn-primary"
                      onClick={() => onStartQuiz(quiz.id)}
                      disabled={startingQuizId === quiz.id || isScheduleLocked}
                    >
                      {startingQuizId === quiz.id
                        ? 'Starting...'
                        : availabilityStatus === 'coming_soon'
                          ? 'Coming Soon'
                          : availabilityStatus === 'expired'
                            ? 'Expired'
                            : 'Start Quiz'}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        ) : null}

        {loggedIn ? (
          <section className="quiz-card quiz-history-card">
            <h2>Your Attempts</h2>
            {historyError ? <p className="quiz-error">{historyError}</p> : null}

            {!historyError && attemptHistory.length === 0 ? (
              <p className="quiz-empty">You have not started any quiz attempts yet.</p>
            ) : null}

            {!historyError && attemptHistory.length > 0 ? (
              <div className="quiz-history-table-wrap">
                <table className="quiz-history-table">
                  <thead>
                    <tr>
                      <th>Quiz</th>
                      <th>Attempt</th>
                      <th>Mode</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Accuracy</th>
                      <th>Time</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attemptHistory.map((attempt) => {
                      const isInProgress = attempt.status === 'in_progress';
                      const actionLabel = isInProgress ? 'Continue Attempt' : 'View Result';
                      const actionPath = isInProgress
                        ? `/quizzes/attempts/${attempt.id}`
                        : `/quizzes/attempts/${attempt.id}/result`;

                      return (
                        <tr key={attempt.id}>
                          <td data-label="Quiz">{attempt.title}</td>
                          <td data-label="Attempt">#{attempt.attempt_number}</td>
                          <td data-label="Mode">{attempt.is_proctored ? 'Proctored' : 'Open'}</td>
                          <td data-label="Status">{formatAttemptStatus(attempt.status)}</td>
                          <td data-label="Score">{attempt.score}/{attempt.total_points}</td>
                          <td data-label="Accuracy">{attempt.accuracy_percent}%</td>
                          <td data-label="Time">{formatAttemptDuration(attempt.time_spent_seconds)}</td>
                          <td data-label="Date">{formatAttemptDate(attempt.submitted_at || attempt.started_at)}</td>
                          <td data-label="Action">
                            <button
                              type="button"
                              className="quiz-btn quiz-btn-secondary"
                              onClick={() => navigate(actionPath)}
                            >
                              {actionLabel}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        ) : null}
      </main>
    </section>
  );
}

export default QuizzesPage;
