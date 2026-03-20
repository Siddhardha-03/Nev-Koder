import { useNavigate } from 'react-router-dom'
import { getStoredUser, logout } from '../services/authService'
import './AuthPages.css'

function DashboardPage() {
  const navigate = useNavigate()
  const user = getStoredUser()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <section className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-title">Welcome, {user?.name || 'Coder'}!</h1>
        <p className="auth-subtitle">You are logged in successfully.</p>

        <div className="form-success">
          Email: {user?.email || 'N/A'}
        </div>

        <button className="auth-submit" type="button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </section>
  )
}

export default DashboardPage
