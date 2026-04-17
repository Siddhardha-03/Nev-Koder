import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getDashboardStats, getStoredUser, logout } from '../services/authService'
import { getQuizAttemptHistory } from '../services/quizService'
import LandingNavbar from '../components/LandingNavbar'
import './ProblemsPage.css'
import './DashboardPage.css'

const DASHBOARD_STYLE_STORAGE_KEY = 'dashboardStyleMode'

const formatRelativeAttemptTime = (dateLike) => {
  if (!dateLike) return 'No timestamp'

  const when = new Date(dateLike).getTime()
  if (Number.isNaN(when)) return 'Unknown time'

  const diffMs = Date.now() - when
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return new Date(dateLike).toLocaleDateString()
}

const formatAttemptStatus = (status) => {
  if (status === 'in_progress') return 'In Progress'
  if (status === 'auto_submitted') return 'Auto Submitted'
  return 'Submitted'
}

function DashboardPage() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [dashboardMode, setDashboardMode] = useState(
    () => localStorage.getItem(DASHBOARD_STYLE_STORAGE_KEY) || 'premium'
  )
  const [dashboardStats, setDashboardStats] = useState({
    solvedQuestions: 0,
    dayStreak: 0
  })
  const [attemptHistory, setAttemptHistory] = useState([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [error, setError] = useState('')

  const profileLetter = String(user?.name || 'Coder').charAt(0).toUpperCase()

  const rank = useMemo(
    () => Math.max(1000 - (dashboardStats.solvedQuestions * 5), 100),
    [dashboardStats.solvedQuestions]
  )

  const solvedProgress = useMemo(() => {
    const maxProblems = 75
    return Math.min(Math.round((dashboardStats.solvedQuestions / maxProblems) * 100), 100)
  }, [dashboardStats.solvedQuestions])

  const quizInsights = useMemo(() => {
    const totalAttempts = attemptHistory.length
    const completedAttempts = attemptHistory.filter((attempt) => attempt.status !== 'in_progress')
    const passedAttempts = completedAttempts.filter((attempt) => Boolean(attempt.passed)).length
    const proctoredAttempts = attemptHistory.filter((attempt) => Boolean(attempt.is_proctored)).length
    const inProgressAttempts = attemptHistory.filter((attempt) => attempt.status === 'in_progress').length

    const avgAccuracy = completedAttempts.length > 0
      ? Math.round(
        completedAttempts.reduce((sum, attempt) => sum + Number(attempt.accuracy_percent || 0), 0) / completedAttempts.length
      )
      : 0

    const passRate = completedAttempts.length > 0
      ? Math.round((passedAttempts / completedAttempts.length) * 100)
      : 0

    return {
      totalAttempts,
      completedAttempts: completedAttempts.length,
      passedAttempts,
      proctoredAttempts,
      inProgressAttempts,
      avgAccuracy,
      passRate
    }
  }, [attemptHistory])

  const recentAttempts = useMemo(
    () => (attemptHistory || []).slice(0, 5),
    [attemptHistory]
  )

  const topAreas = useMemo(() => {
    const easy = Math.max(Math.round(dashboardStats.solvedQuestions * 0.5), 0)
    const medium = Math.max(Math.round(dashboardStats.solvedQuestions * 0.35), 0)
    const hard = Math.max(dashboardStats.solvedQuestions - easy - medium, 0)
    const quizSkill = quizInsights.avgAccuracy
    return [
      { id: 'easy', label: 'Easy Problems', value: easy, max: 40, colorClass: 'bar-easy' },
      { id: 'medium', label: 'Medium Problems', value: medium, max: 25, colorClass: 'bar-medium' },
      { id: 'hard', label: 'Hard Problems', value: hard, max: 10, colorClass: 'bar-hard' },
      { id: 'quiz', label: 'Quiz Accuracy', value: quizSkill, max: 100, colorClass: 'bar-quiz', suffix: '%' }
    ]
  }, [dashboardStats.solvedQuestions, quizInsights.avgAccuracy])

  useEffect(() => {
    localStorage.setItem(DASHBOARD_STYLE_STORAGE_KEY, dashboardMode)
  }, [dashboardMode])

  useEffect(() => {
    const loadStats = async () => {
      setLoadingStats(true)
      setError('')

      const [statsResponse, historyResponse] = await Promise.all([
        getDashboardStats(),
        getQuizAttemptHistory()
      ])

      if (statsResponse.success) {
        setDashboardStats({
          solvedQuestions: Number(statsResponse.stats?.solvedQuestions || 0),
          dayStreak: Number(statsResponse.stats?.dayStreak || 0)
        })
      }

      if (historyResponse.success) {
        setAttemptHistory(historyResponse.attempts || [])
      } else {
        setAttemptHistory([])
      }

      if (!statsResponse.success && !historyResponse.success) {
        setError('Unable to load dashboard insights right now. Please refresh.')
      }

      setLoadingStats(false)
    }

    loadStats()
  }, [])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <section className={`dashboard-page dashboard-mode-${dashboardMode}`}>
      <LandingNavbar />

      <main className="dashboard-shell">
        <section className="dashboard-top-controls dashboard-panel">
          <p className="dashboard-top-title">{user?.name || 'Coder'} Dashboard</p>
          <div className="dashboard-mode-switch" role="group" aria-label="Dashboard style mode">
            <button
              type="button"
              className={dashboardMode === 'premium' ? 'mode-btn mode-btn-active' : 'mode-btn'}
              onClick={() => setDashboardMode('premium')}
            >
              Premium
            </button>
            <button
              type="button"
              className={dashboardMode === 'classic' ? 'mode-btn mode-btn-active' : 'mode-btn'}
              onClick={() => setDashboardMode('classic')}
            >
              Classic
            </button>
          </div>
        </section>

        <section className="dashboard-feature-wrap" aria-label="Learning features">
          <div className="problems-header-cards">
            <Link to="/learning-paths" className="progress-feature-card progress-card-learning">
              <div className="feature-top-row">
                <span className="feature-kicker">Guided</span>
                <span className="feature-arrow">→</span>
              </div>
              <span className="feature-icon" aria-hidden="true">🧭</span>
              <div className="feature-title">Learning Path</div>
              <div className="feature-subtitle">Follow structured tracks and build consistency topic by topic.</div>
            </Link>

            <Link to="/practice-sheets" className="progress-feature-card progress-card-practice">
              <div className="feature-top-row">
                <span className="feature-kicker">Focused</span>
                <span className="feature-arrow">→</span>
              </div>
              <span className="feature-icon" aria-hidden="true">📝</span>
              <div className="feature-title">Practice Sheets</div>
              <div className="feature-subtitle">Sharpen fundamentals with focused sheets and timed drills.</div>
            </Link>

            <Link to="/interview-prep" className="progress-feature-card progress-card-interview">
              <div className="feature-top-row">
                <span className="feature-kicker">Career</span>
                <span className="feature-arrow">→</span>
              </div>
              <span className="feature-icon" aria-hidden="true">💼</span>
              <div className="feature-title">Interview Prep</div>
              <div className="feature-subtitle">Prepare for coding rounds with curated interview-focused sets.</div>
            </Link>
          </div>
        </section>

        {error ? <div className="dashboard-error dashboard-panel">{error}</div> : null}

        <section className="dashboard-stats" aria-label="Performance highlights">
          <article className="dashboard-stat-card dashboard-panel">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <p className="dashboard-stat-label">Problems Solved</p>
              <p className="dashboard-stat-value">{loadingStats ? '...' : dashboardStats.solvedQuestions}</p>
            </div>
          </article>

          <article className="dashboard-stat-card dashboard-panel">
            <div className="stat-icon">🔥</div>
            <div className="stat-content">
              <p className="dashboard-stat-label">Current Streak</p>
              <p className="dashboard-stat-value">{loadingStats ? '...' : dashboardStats.dayStreak}</p>
            </div>
          </article>

          <article className="dashboard-stat-card dashboard-panel">
            <div className="stat-icon">🧪</div>
            <div className="stat-content">
              <p className="dashboard-stat-label">Quiz Attempts</p>
              <p className="dashboard-stat-value">{loadingStats ? '...' : quizInsights.totalAttempts}</p>
            </div>
          </article>

          <article className="dashboard-stat-card dashboard-panel">
            <div className="stat-icon">🏆</div>
            <div className="stat-content">
              <p className="dashboard-stat-label">Your Rank</p>
              <p className="dashboard-stat-value">#{loadingStats ? '...' : rank}</p>
            </div>
          </article>
        </section>

        <section className="dashboard-grid dashboard-grid-main">
          <article className="dashboard-progress-card dashboard-panel">
            <div className="section-heading-row">
              <h2>Mastery Progress</h2>
              <span className="section-chip">Target: 75 solved</span>
            </div>
            <div className="progress-container">
              <div className="progress-visual">
                <svg className="progress-circle" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" className="progress-bg" />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    className="progress-fill"
                    style={{
                      strokeDasharray: `${solvedProgress * 3.39} 339`,
                      transition: 'stroke-dasharray 0.5s ease'
                    }}
                  />
                  <text x="60" y="60" className="progress-text">{solvedProgress}%</text>
                </svg>
              </div>
              <div className="progress-breakdown">
                {topAreas.map((area) => {
                  const width = Math.min(Math.round((area.value / area.max) * 100), 100)
                  return (
                    <div key={area.id} className="progress-item">
                      <div className="progress-item-meta">
                        <span className="progress-label">{area.label}</span>
                        <span className="progress-count">{area.value}{area.suffix || ''}</span>
                      </div>
                      <div className="progress-bar-track">
                        <span className={`progress-bar-fill ${area.colorClass}`} style={{ width: `${width}%` }}></span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </article>

          <article className="dashboard-quiz-card dashboard-panel">
            <div className="section-heading-row">
              <h2>Quiz Command Center</h2>
              <span className="section-chip">New Feature</span>
            </div>

            <div className="quiz-metric-grid">
              <div className="quiz-metric">
                <span className="quiz-metric-label">Pass Rate</span>
                <strong>{quizInsights.passRate}%</strong>
              </div>
              <div className="quiz-metric">
                <span className="quiz-metric-label">Avg Accuracy</span>
                <strong>{quizInsights.avgAccuracy}%</strong>
              </div>
              <div className="quiz-metric">
                <span className="quiz-metric-label">Proctored</span>
                <strong>{quizInsights.proctoredAttempts}</strong>
              </div>
              <div className="quiz-metric">
                <span className="quiz-metric-label">Active</span>
                <strong>{quizInsights.inProgressAttempts}</strong>
              </div>
            </div>

            <div className="attempt-timeline">
              {recentAttempts.length === 0 ? (
                <p className="dashboard-empty-text">No quiz attempts yet. Start your first quiz run.</p>
              ) : (
                recentAttempts.map((attempt) => (
                  <div className="attempt-item" key={attempt.id}>
                    <div className="attempt-main">
                      <p className="attempt-title">{attempt.title}</p>
                      <p className="attempt-subtitle">
                        Attempt #{attempt.attempt_number} • {attempt.is_proctored ? 'Proctored' : 'Open'}
                      </p>
                    </div>
                    <div className="attempt-meta">
                      <span className="attempt-status">{formatAttemptStatus(attempt.status)}</span>
                      <span className="attempt-time">{formatRelativeAttemptTime(attempt.submitted_at || attempt.started_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <section className="dashboard-quick-actions dashboard-panel">
          <div className="section-heading-row">
            <h2>Quick Actions</h2>
            <span className="section-chip">Productivity</span>
          </div>
          <div className="quick-actions-grid">
            <button
              className="quick-action-card quick-action-primary"
              onClick={() => navigate('/problems')}
            >
              <span className="action-icon">▶️</span>
              <span className="action-label">Continue Solving</span>
            </button>
            <button
              className="quick-action-card"
              onClick={() => navigate('/quizzes')}
            >
              <span className="action-icon">🧪</span>
              <span className="action-label">Open Quizzes</span>
            </button>
            <button
              className="quick-action-card"
              onClick={() => navigate('/practice-sheets')}
            >
              <span className="action-icon">📝</span>
              <span className="action-label">Practice Sheets</span>
            </button>
            <button
              className="quick-action-card"
              onClick={() => navigate('/compiler')}
            >
              <span className="action-icon">⚙️</span>
              <span className="action-label">Open Compiler</span>
            </button>
            <button
              className="quick-action-card"
              onClick={() => navigate('/learning-paths')}
            >
              <span className="action-icon">🧭</span>
              <span className="action-label">Learning Paths</span>
            </button>
          </div>
        </section>

        <section className="dashboard-grid dashboard-grid-secondary">
          <article className="dashboard-activity dashboard-panel">
            <div className="section-heading-row">
              <h2>Recent Activity</h2>
              <span className="section-chip">Live</span>
            </div>
            <div className="activity-list">
              {recentAttempts.length === 0 ? (
                <p className="dashboard-empty-text">No recent quiz activity yet.</p>
              ) : (
                recentAttempts.map((attempt) => (
                  <div key={attempt.id} className="activity-item">
                    <div className="activity-info">
                      <p className="activity-problem">{attempt.title}</p>
                      <p className="activity-difficulty">Score {attempt.score}/{attempt.total_points}</p>
                    </div>
                    <div className="activity-meta">
                      <p className={`activity-status ${attempt.passed ? 'accepted' : 'failed'}`}>
                        {attempt.passed ? 'Passed' : formatAttemptStatus(attempt.status)}
                      </p>
                      <p className="activity-time">{formatRelativeAttemptTime(attempt.submitted_at || attempt.started_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <section className="dashboard-profile">
            <article className="profile-card dashboard-panel">
              <h2>Your Profile</h2>
              <div className="profile-content">
                <div className="profile-avatar">{profileLetter}</div>
                <div className="profile-info">
                  <p className="profile-name">{user?.name || 'Coder'}</p>
                  <p className="profile-email">{user?.email || 'N/A'}</p>
                </div>
              </div>
              <div className="profile-achievements">
                <div className="achievement">
                  <span className="achievement-icon">🔥</span>
                  <span className="achievement-label">{dashboardStats.dayStreak} Day Streak</span>
                </div>
                <div className="achievement">
                  <span className="achievement-icon">🎯</span>
                  <span className="achievement-label">{dashboardStats.solvedQuestions} Solved</span>
                </div>
                <div className="achievement">
                  <span className="achievement-icon">🛡️</span>
                  <span className="achievement-label">{quizInsights.proctoredAttempts} Proctored Attempts</span>
                </div>
                <div className="achievement">
                  <span className="achievement-icon">🚀</span>
                  <span className="achievement-label">{quizInsights.completedAttempts} Completed Quizzes</span>
                </div>
              </div>
              <button
                className="btn-logout"
                onClick={handleLogout}
              >
                Logout
              </button>
            </article>
          </section>
        </section>
      </main>
    </section>
  )
}

export default DashboardPage
