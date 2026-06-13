import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LandingNavbar from '../components/LandingNavbar';
import ProctoringWarningModal from '../components/quiz/ProctoringWarningModal';
import useProctoring from '../hooks/useProctoring';
import { getQuizAttempt, submitQuizAttempt } from '../services/quizService';
import './QuizPages.css';

function QuizAttemptPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(null);

  const loadAttempt = async () => {
    setLoading(true);
    setError('');

    const response = await getQuizAttempt(attemptId);
    if (!response.success) {
      setError(response.message || 'Failed to load quiz attempt.');
      setAttempt(null);
      setLoading(false);
      return;
    }

    const loadedAttempt = response.attempt;
    setAttempt(loadedAttempt);

    const nextAnswers = {};
    for (const question of loadedAttempt.questions || []) {
      if (question.selected_option) {
        nextAnswers[question.id] = question.selected_option;
      }
    }
    setAnswers(nextAnswers);

    if (loadedAttempt.status === 'in_progress') {
      const startedAt = new Date(loadedAttempt.started_at).getTime();
      const timeLimitMillis = Number(loadedAttempt.time_limit_minutes || 0) * 60 * 1000;
      const elapsedMillis = Date.now() - startedAt;
      const timeLeft = Math.max(0, Math.floor((timeLimitMillis - elapsedMillis) / 1000));
      setRemainingSeconds(timeLeft);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadAttempt();
  }, [attemptId]);

  useEffect(() => {
    if (!attempt || attempt.status !== 'in_progress' || remainingSeconds === null) return undefined;
    if (remainingSeconds <= 0) {
      onSubmit();
      return undefined;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current === null) return null;
        return Math.max(0, current - 1);
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [attempt, remainingSeconds]);

  const onAutoSubmitted = (result) => {
    navigate(`/quizzes/attempts/${attemptId}/result`, {
      state: {
        result,
        autoSubmitted: true
      }
    });
  };

  const { warning, closeWarning } = useProctoring({
    enabled: Boolean(attempt?.is_proctored && attempt?.status === 'in_progress'),
    attemptId,
    onAutoSubmitted
  });

  const formattedTime = useMemo(() => {
    if (remainingSeconds === null) return null;
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [remainingSeconds]);

  const onSelectAnswer = (questionId, selectedOption) => {
    setAnswers((prev) => ({ ...prev, [questionId]: selectedOption }));
  };

  const onSubmit = async () => {
    if (!attempt || submitting) return;

    setSubmitting(true);
    setError('');

    const payload = Object.entries(answers).map(([questionId, selectedOption]) => ({
      quiz_question_id: Number(questionId),
      selected_option: selectedOption
    }));

    const response = await submitQuizAttempt(attempt.id, payload);
    setSubmitting(false);

    if (!response.success) {
      setError(response.message || 'Failed to submit quiz.');
      return;
    }

    navigate(`/quizzes/attempts/${attempt.id}/result`, {
      state: {
        result: response.result
      }
    });
  };

  if (loading) {
    return (
      <section className="quiz-page-shell">
        <LandingNavbar />
        <main className="quiz-page-container">
          <p className="quiz-loading">Loading attempt...</p>
        </main>
      </section>
    );
  }

  if (!attempt) {
    return (
      <section className="quiz-page-shell">
        <LandingNavbar />
        <main className="quiz-page-container">
          <p className="quiz-error">{error || 'Attempt not found.'}</p>
          <button type="button" className="quiz-btn quiz-btn-primary" onClick={() => navigate('/quizzes')}>
            Back to Quizzes
          </button>
        </main>
      </section>
    );
  }

  return (
    <section className="quiz-page-shell">
      <LandingNavbar />
      <main className="quiz-page-container">
        <header className="quiz-page-header quiz-attempt-header">
          <div>
            <p className="quiz-page-kicker">{attempt.is_proctored ? 'Proctored Attempt' : 'Open Attempt'}</p>
            <h1>{attempt.title}</h1>
            <p>{attempt.description || 'Answer all questions and submit when done.'}</p>
          </div>
          {formattedTime ? (
            <div className="quiz-timer" aria-live="polite">
              <span>Time Left</span>
              <strong>{formattedTime}</strong>
            </div>
          ) : null}
        </header>

        {attempt.status !== 'in_progress' ? (
          <section className="quiz-card">
            <p>This attempt is already finalized.</p>
            <button
              type="button"
              className="quiz-btn quiz-btn-primary"
              onClick={() => navigate(`/quizzes/attempts/${attempt.id}/result`)}
            >
              View Result
            </button>
          </section>
        ) : (
          <>
            {error ? <p className="quiz-error">{error}</p> : null}

            <section className="quiz-question-list">
              {(attempt.questions || []).map((question, index) => (
                <article className="quiz-card quiz-question-card" key={question.id}>
                  <h3>
                    Q{index + 1}. <span className="quiz-question-text">{question.question_text}</span>
                  </h3>
                  <div className="quiz-options-grid">
                    {[
                      { key: 'A', text: question.option_a },
                      { key: 'B', text: question.option_b },
                      { key: 'C', text: question.option_c },
                      { key: 'D', text: question.option_d }
                    ].map((option) => (
                      <label className="quiz-option" key={option.key}>
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          checked={answers[question.id] === option.key}
                          onChange={() => onSelectAnswer(question.id, option.key)}
                        />
                        <span>{option.key}. {option.text}</span>
                      </label>
                    ))}
                  </div>
                </article>
              ))}
            </section>

            <section className="quiz-submit-row">
              <button type="button" className="quiz-btn quiz-btn-secondary" onClick={() => navigate('/quizzes')}>
                Exit Quiz
              </button>
              <button type="button" className="quiz-btn quiz-btn-primary" onClick={onSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            </section>
          </>
        )}
      </main>

      <ProctoringWarningModal warning={warning} onClose={closeWarning} />
    </section>
  );
}

export default QuizAttemptPage;
