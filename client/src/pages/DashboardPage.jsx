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

  return (
    <section className="dashboard-page">
      <LandingNavbar />

      <main className="dashboard-shell">
        <header className="dashboard-header">
          <h1>Welcome, {user?.name || 'Coder'}!</h1>
          <p>Your coding progress at a glance.</p>
        </header>

        <section className="dashboard-stats" aria-label="User progress summary">
          <article className="dashboard-stat-card">
            <p className="dashboard-stat-label">Questions Solved</p>
            <p className="dashboard-stat-value">{loadingStats ? '...' : dashboardStats.solvedQuestions}</p>
          </article>

          <article className="dashboard-stat-card">
            <p className="dashboard-stat-label">Day Streak</p>
            <p className="dashboard-stat-value">{loadingStats ? '...' : dashboardStats.dayStreak}</p>
          </article>
        </section>

        <section className="dashboard-section" aria-label="Account details">
          <h2>Account Details</h2>
          <p>We will add detailed account information here in the next update.</p>
          <p className="dashboard-email">Current account: {user?.email || 'N/A'}</p>
        </section>

        <div className="dashboard-actions">
          <button className="dashboard-logout" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </main>
    </section>
  )
}

export default DashboardPage
