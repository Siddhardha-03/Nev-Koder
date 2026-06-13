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
  const [questions, setQuestions] = useState(location.state?.questions || null);
  const [title, setTitle] = useState('Quiz Attempt');
  const [loading, setLoading] = useState(!location.state?.result);
  const [error, setError] = useState('');

  useEffect(() => {
    // If we already have a result AND question details, skip loading.
    if (result && questions) return;

    const load = async () => {
      setLoading(true);
      const response = await getQuizAttempt(attemptId);
      setLoading(false);

      if (!response.success) {
        setError(response.message || 'Failed to fetch quiz result.');
        return;
      }

      const attempt = response.attempt || {};
      setTitle(attempt.title || 'Quiz Attempt');

      // Merge or set the result summary
      setResult((prev) => prev || {
        id: attempt.id,
        status: attempt.status,
        score: attempt.score,
        total_points: attempt.total_points,
        accuracy_percent: attempt.accuracy_percent,
        time_spent_seconds: attempt.time_spent_seconds,
        passed: attempt.passed,
        tab_switch_count: attempt.tab_switch_count,
        violation_count: attempt.violation_count,
        submitted_at: attempt.submitted_at
      });

      // Attach questions (each includes selected_option, is_correct, explanation, options)
      setQuestions(attempt.questions || []);
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
        {questions && questions.length > 0 ? (
          <section className="quiz-card quiz-result-solutions">
            <p className="quiz-page-kicker">Solutions</p>
            <div className="quiz-question-list">
              {questions.map((q, idx) => (
                <article className="quiz-card quiz-question-card" key={q.id}>
                  <h3>Q{idx + 1}. <span className="quiz-question-text">{q.question_text}</span></h3>
                  <div className="quiz-options-grid">
                    {[
                      { key: 'A', text: q.option_a },
                      { key: 'B', text: q.option_b },
                      { key: 'C', text: q.option_c },
                      { key: 'D', text: q.option_d }
                    ].map((opt) => {
                      const isCorrect = String(opt.key) === String(q.correct_option || q.answer || '').toUpperCase();
                      const isSelected = String(opt.key) === String(q.selected_option || '').toUpperCase();

                      const baseStyle = { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', borderRadius: 10 };
                      const correctStyle = isCorrect ? { background: '#ecffef', border: '1px solid #bbf0c5' } : {};
                      const wrongSelectedStyle = isSelected && !isCorrect ? { background: '#fff5f5', border: '1px solid #ffcccc' } : {};

                      return (
                        <div className="quiz-option" key={opt.key} style={{ ...baseStyle, ...correctStyle, ...wrongSelectedStyle }}>
                          <strong style={{ minWidth: 22 }}>{opt.key}.</strong>
                          <span style={{ color: '#142d55' }}>{opt.text}</span>
                          {isSelected ? <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{isCorrect ? 'Your answer (Correct)' : 'Your answer'}</span> : null}
                          {isCorrect && !isSelected ? <span style={{ marginLeft: 'auto', color: '#047857', fontWeight: 700 }}>Correct Answer</span> : null}
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation ? <p className="quiz-question-explanation">{q.explanation}</p> : null}

                  <div className="quiz-answer-row">
                    <div className="quiz-answer-pill quiz-answer-pill-user">
                      Your answer: {' '}
                      {q.selected_option ? (
                        (() => {
                          const key = String(q.selected_option).toUpperCase();
                          const text = key === 'A' ? q.option_a : key === 'B' ? q.option_b : key === 'C' ? q.option_c : key === 'D' ? q.option_d : '';
                          return `${key}. ${text}`;
                        })()
                      ) : 'No answer'}
                    </div>

                    <div className="quiz-answer-pill quiz-answer-pill-correct">
                      Correct answer: {' '}
                      {q.correct_option ? (
                        (() => {
                          const key = String(q.correct_option).toUpperCase();
                          const text = key === 'A' ? q.option_a : key === 'B' ? q.option_b : key === 'C' ? q.option_c : key === 'D' ? q.option_d : '';
                          return `${key}. ${text}`;
                        })()
                      ) : '—'}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </section>
  );
}

export default QuizResultPage;
