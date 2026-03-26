import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import * as authService from '../services/authService'
import defaultLogo from '../assets/logo_nev_new.svg'
import './AuthPages.css'

function LoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)

  function handleInputChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
    setServerError('')
  }

  function validateForm() {
    const nextErrors = {}

    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!form.password) {
      nextErrors.password = 'Password is required.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setServerError('')
    setSuccessMessage('')

    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)
      const response = await authService.loginUser(
        form.email.trim().toLowerCase(),
        form.password
      )

      if (response.success) {
        setSuccessMessage('Login successful! Redirecting...')
        setTimeout(() => navigate('/', { replace: true }), 1500)
      } else if (response.message && response.message.includes('verify')) {
        setServerError('Please verify your email first.')
        sessionStorage.setItem('unverifiedUserId', response.userId)
        setTimeout(() => navigate('/verify-otp'), 2000)
      } else {
        setServerError(response.message || 'Login failed. Please check your credentials.')
      }
    } catch (error) {
      setServerError('Login failed. Please check your credentials.')
      console.error('Login error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-shell">
      <div className="auth-card">
        <div className="auth-top-link">
          <Link to="/">← Back to home</Link>
        </div>

        <div className="auth-brand">
          <img src={defaultLogo} alt="Nev Koder logo" />
        </div>

        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Sign in to continue practicing.</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleInputChange}
              placeholder="you@yourmail.com"
              autoComplete="email"
            />
            {errors.email ? <p className="input-error">{errors.email}</p> : null}
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            {errors.password ? <p className="input-error">{errors.password}</p> : null}
          </div>

          <div className="form-link">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          {serverError ? <div className="form-error">{serverError}</div> : null}
          {successMessage ? <div className="form-success">{successMessage}</div> : null}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          New here? <Link to="/register">Create an account</Link>
        </div>
      </div>
    </section>
  )
}

export default LoginPage
