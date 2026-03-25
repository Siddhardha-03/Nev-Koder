import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import * as authService from '../services/authService'
import './AuthPages.css'

function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState('')
  const [serverError, setServerError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)

  function handleInputChange(event) {
    setEmail(event.target.value)
    setErrors('')
    setServerError('')
  }

  function validateForm() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErrors('Please enter a valid email address.')
      return false
    }
    return true
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
      const response = await authService.forgotPassword(email.trim().toLowerCase())

      if (response.success) {
        setSuccessMessage('If your account exists, a 6-digit reset OTP has been sent.')
        setTimeout(() => {
          navigate(`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`)
        }, 1000)
      } else {
        setServerError(response.message || 'Request failed.')
      }
    } catch (error) {
      setServerError('Request failed. Please try again.')
      console.error('Forgot password error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-shell">
      <div className="auth-card">
        <div className="auth-top-link">
          <Link to="/login">← Back to login</Link>
        </div>

        <div className="auth-brand">
          <img src="/Logo_nev.svg" alt="Nev Koder logo" />
          <span>Koder</span>
        </div>

        <h1 className="auth-title">Forgot Password?</h1>
        <p className="auth-subtitle">Enter your email to receive a password reset OTP.</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={handleInputChange}
              placeholder="you@yourmail.com"
              autoComplete="email"
            />
            {errors ? <p className="input-error">{errors}</p> : null}
          </div>

          {serverError ? <div className="form-error">{serverError}</div> : null}
          {successMessage ? <div className="form-success">{successMessage}</div> : null}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset OTP'}
          </button>
        </form>

        <div className="auth-footer">
          Remember your password? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </section>
  )
}

export default ForgotPasswordPage
