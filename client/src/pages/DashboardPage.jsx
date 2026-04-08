import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardStats, getStoredUser, logout } from '../services/authService'
import LandingNavbar from '../components/LandingNavbar'
import './DashboardPage.css'

function DashboardPage() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [dashboardStats, setDashboardStats] = useState({
    solvedQuestions: 0,
    dayStreak: 0
  })
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      setLoadingStats(true)
      const response = await getDashboardStats()
      if (response.success) {
        setDashboardStats({
          solvedQuestions: Number(response.stats?.solvedQuestions || 0),
          dayStreak: Number(response.stats?.dayStreak || 0)
        })
      }
      setLoadingStats(false)
    }

    loadStats()
  }, [])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  // Mock data for demonstration (replace with real data from backend)
  const problemStats = {
    easy: 12,
    medium: 8,
    hard: 3,
    total: 23
  }

  const recentActivity = [
    { id: 1, problem: 'Two Sum', status: 'Accepted', time: '2 hours ago', difficulty: 'Easy' },
    { id: 2, problem: 'Add Two Numbers', status: 'Accepted', time: '5 hours ago', difficulty: 'Medium' },
    { id: 3, problem: 'Longest Substring', status: 'Wrong Answer', time: '1 day ago', difficulty: 'Medium' },
    { id: 4, problem: 'Median of Two Arrays', status: 'Accepted', time: '2 days ago', difficulty: 'Hard' }
  ]

  const recommendedProblems = [
    { id: 1, title: 'Container With Most Water', difficulty: 'Medium', topic: 'Array', acceptance: '52%' },
    { id: 2, title: 'Regular Expression Matching', difficulty: 'Hard', topic: 'Dynamic Programming', acceptance: '28%' },
    { id: 3, title: 'Best Time to Buy Stock', difficulty: 'Easy', topic: 'Array', acceptance: '52%' },
    { id: 4, title: 'Merge Intervals', difficulty: 'Medium', topic: 'Array', acceptance: '48%' }
  ]

  const getProgressPercentage = () => {
    const maxProblems = 50
    return Math.min((dashboardStats.solvedQuestions / maxProblems) * 100, 100)
  }

  const getDifficultyColor = (difficulty) => {
    switch(difficulty?.toLowerCase()) {
      case 'easy': return '#10b981'
      case 'medium': return '#f59e0b'
      case 'hard': return '#ef4444'
      default: return '#6b7280'
    }
  }

  return (
    <section className="dashboard-page">
      <LandingNavbar />

      <main className="dashboard-shell">
        {/* Welcome Header */}
        <header className="dashboard-header">
          <div className="dashboard-header-content">
            <h1>Welcome back, {user?.name || 'Coder'}! 👋</h1>
            <p>Keep up the great work and master coding challenges.</p>
          </div>
        </header>

        {/* Stats Bar */}
        <section className="dashboard-stats" aria-label="User progress summary">
          <article className="dashboard-stat-card">
            <div className="stat-icon stat-icon-solved">📊</div>
            <div className="stat-content">
              <p className="dashboard-stat-label">Problems Solved</p>
              <p className="dashboard-stat-value">{loadingStats ? '...' : dashboardStats.solvedQuestions}</p>
            </div>
          </article>

          <article className="dashboard-stat-card">
            <div className="stat-icon stat-icon-streak">🔥</div>
            <div className="stat-content">
              <p className="dashboard-stat-label">Current Streak</p>
              <p className="dashboard-stat-value">{loadingStats ? '...' : dashboardStats.dayStreak}</p>
            </div>
          </article>

          <article className="dashboard-stat-card">
            <div className="stat-icon stat-icon-rank">🏆</div>
            <div className="stat-content">
              <p className="dashboard-stat-label">Your Rank</p>
              <p className="dashboard-stat-value">#{loadingStats ? '...' : Math.max(1000 - (dashboardStats.solvedQuestions * 5), 100)}</p>
            </div>
          </article>
        </section>

        {/* Progress Card */}
        <section className="dashboard-progress-section">
          <article className="dashboard-progress-card">
            <h2>Problem Solving Progress</h2>
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
                      strokeDasharray: `${getProgressPercentage() * 3.39} 339`,
                      transition: 'stroke-dasharray 0.5s ease'
                    }}
                  />
                  <text x="60" y="60" className="progress-text">{Math.round(getProgressPercentage())}%</text>
                </svg>
              </div>
              <div className="progress-breakdown">
                <div className="progress-item">
                  <span className="progress-color" style={{ backgroundColor: '#10b981' }}></span>
                  <span className="progress-label">Easy</span>
                  <span className="progress-count">{problemStats.easy}</span>
                </div>
                <div className="progress-item">
                  <span className="progress-color" style={{ backgroundColor: '#f59e0b' }}></span>
                  <span className="progress-label">Medium</span>
                  <span className="progress-count">{problemStats.medium}</span>
                </div>
                <div className="progress-item">
                  <span className="progress-color" style={{ backgroundColor: '#ef4444' }}></span>
                  <span className="progress-label">Hard</span>
                  <span className="progress-count">{problemStats.hard}</span>
                </div>
              </div>
            </div>
          </article>
        </section>

        {/* Quick Actions */}
        <section className="dashboard-quick-actions">
          <h2>Quick Actions</h2>
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
              onClick={() => navigate('/problems')}
            >
              <span className="action-icon">⭐</span>
              <span className="action-label">Daily Challenge</span>
            </button>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="dashboard-activity">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            {recentActivity.map(activity => (
              <div key={activity.id} className="activity-item">
                <div className="activity-info">
                  <p className="activity-problem">{activity.problem}</p>
                  <p className="activity-difficulty" style={{ color: getDifficultyColor(activity.difficulty) }}>
                    {activity.difficulty}
                  </p>
                </div>
                <div className="activity-meta">
                  <p className={`activity-status ${activity.status === 'Accepted' ? 'accepted' : 'failed'}`}>
                    {activity.status}
                  </p>
                  <p className="activity-time">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recommended Problems */}
        <section className="dashboard-recommended">
          <h2>Recommended for You</h2>
          <div className="recommended-grid">
            {recommendedProblems.map(problem => (
              <article 
                key={problem.id} 
                className="recommended-card"
                onClick={() => navigate(`/problems/${problem.id}`)}
              >
                <h3>{problem.title}</h3>
                <div className="recommended-badges">
                  <span className="badge difficulty" style={{ borderColor: getDifficultyColor(problem.difficulty) }}>
                    {problem.difficulty}
                  </span>
                  <span className="badge topic">{problem.topic}</span>
                </div>
                <p className="recommended-acceptance">{problem.acceptance} Acceptance Rate</p>
              </article>
            ))}
          </div>
        </section>

        {/* Profile Card */}
        <section className="dashboard-profile">
          <article className="profile-card">
            <h2>Your Profile</h2>
            <div className="profile-content">
              <div className="profile-avatar">
                {user?.name?.charAt(0).toUpperCase() || 'C'}
              </div>
              <div className="profile-info">
                <p className="profile-name">{user?.name || 'Coder'}</p>
                <p className="profile-email">{user?.email || 'N/A'}</p>
              </div>
            </div>
            <div className="profile-achievements">
              <div className="achievement">
                <span className="achievement-icon">🔥</span>
                <span className="achievement-label">Streak Maker</span>
              </div>
              <div className="achievement">
                <span className="achievement-icon">🎯</span>
                <span className="achievement-label">Problem Solver</span>
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
      </main>
    </section>
  )
}

export default DashboardPage
