import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import LandingNavbar from '../components/LandingNavbar';
import { getQuizAttempt } from '../services/quizService';
import './QuizPages.css';

function QuizResultPage() {
  const { attemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [result, setResult] = useState(location.state?.result || null);
  const [title, setTitle] = useState('Quiz Attempt');
  const [loading, setLoading] = useState(!location.state?.result);
  const [error, setError] = useState('');

  useEffect(() => {
    if (result) return;

    const load = async () => {
      setLoading(true);
      const response = await getQuizAttempt(attemptId);
      setLoading(false);

      if (!response.success) {
        setError(response.message || 'Failed to fetch quiz result.');
        return;
      }

      setTitle(response.attempt?.title || 'Quiz Attempt');
      setResult({
        id: response.attempt.id,
        status: response.attempt.status,
        score: response.attempt.score,
        total_points: response.attempt.total_points,
        accuracy_percent: response.attempt.accuracy_percent,
        time_spent_seconds: response.attempt.time_spent_seconds,
        passed: response.attempt.passed,
        tab_switch_count: response.attempt.tab_switch_count,
        violation_count: response.attempt.violation_count,
        submitted_at: response.attempt.submitted_at
      });
    };

    load();
  }, [attemptId, result]);

  if (loading) {
    return (
      <section className="quiz-page-shell">
        <LandingNavbar />
        <main className="quiz-page-container">
          <p className="quiz-loading">Loading result...</p>
        </main>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="quiz-page-shell">
        <LandingNavbar />
        <main className="quiz-page-container">
          <p className="quiz-error">{error || 'Result not available.'}</p>
          <button type="button" className="quiz-btn quiz-btn-primary" onClick={() => navigate('/quizzes')}>
            Back to Quizzes
          </button>
        </main>
      </section>
    );
  }

  const wasAutoSubmitted = result.status === 'auto_submitted' || location.state?.autoSubmitted;

  return (
    <section className="quiz-page-shell">
      <LandingNavbar />
      <main className="quiz-page-container">
        <section className="quiz-card quiz-result-card">
          <p className="quiz-page-kicker">Attempt Result</p>
          <h1>{title}</h1>
          <p className={result.passed ? 'quiz-pass' : 'quiz-fail'}>
            {result.passed ? 'Passed' : 'Not Passed'}
          </p>

          {wasAutoSubmitted ? (
            <p className="quiz-error">This attempt was auto-submitted due to proctoring violations.</p>
          ) : null}

          <div className="quiz-result-grid">
            <div className="quiz-result-item">
              <span>Score</span>
              <strong>{result.score}/{result.total_points}</strong>
            </div>
            <div className="quiz-result-item">
              <span>Accuracy</span>
              <strong>{result.accuracy_percent}%</strong>
            </div>
            <div className="quiz-result-item">
              <span>Time (sec)</span>
              <strong>{result.time_spent_seconds}</strong>
            </div>
            <div className="quiz-result-item">
              <span>Violations</span>
              <strong>{result.violation_count}</strong>
            </div>
            <div className="quiz-result-item">
              <span>Tab Switches</span>
              <strong>{result.tab_switch_count}</strong>
            </div>
            <div className="quiz-result-item">
              <span>Status</span>
              <strong>{result.status}</strong>
            </div>
          </div>

          <div className="quiz-submit-row">
            <button type="button" className="quiz-btn quiz-btn-secondary" onClick={() => navigate('/quizzes')}>
              Back to Quizzes
            </button>
            <button type="button" className="quiz-btn quiz-btn-primary" onClick={() => navigate('/quizzes')}>
              Retake Another Quiz
            </button>
          </div>
        </section>
      </main>
    </section>
  );
}

export default QuizResultPage;
