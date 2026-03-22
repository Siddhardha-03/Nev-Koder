import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import * as authService from '../services/authService'
import './AuthPages.css'

function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const email = (searchParams.get('email') || '').trim().toLowerCase()

  const [form, setForm] = useState({
    otp: '',
    newPassword: '',
    confirmPassword: ''
  })
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

    if (!/^\d{6}$/.test(form.otp)) {
      nextErrors.otp = 'OTP must be 6 digits.'
    }

    if (form.newPassword.length < 6) {
      nextErrors.newPassword = 'Password must be at least 6 characters.'
    }

    if (form.confirmPassword !== form.newPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setServerError('')
    setSuccessMessage('')

    if (!email) {
      setServerError('Invalid reset request. Please request a new OTP.')
      return
    }

    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)
      const response = await authService.resetPassword(
        email,
        form.otp,
        form.newPassword,
        form.confirmPassword
      )

      if (response.success) {
        setSuccessMessage('Password reset successfully! Redirecting to login...')
        setTimeout(() => navigate('/login'), 1500)
      } else {
        setServerError(response.message || 'Password reset failed.')
      }
    } catch (error) {
      setServerError('Password reset failed. Please try again.')
      console.error('Reset password error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!email) {
    return (
      <section className="auth-shell">
        <div className="auth-card">
          <div className="auth-top-link">
            <Link to="/login">← Back to login</Link>
          </div>
          <h1 className="auth-title">Invalid Reset Request</h1>
          <p className="auth-subtitle">This reset request is invalid or incomplete.</p>
          <Link to="/forgot-password" className="auth-submit" style={{ display: 'block', textAlign: 'center' }}>
            Request OTP
          </Link>
        </div>
      </section>
    )
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

        <h1 className="auth-title">Reset Password</h1>
        <p className="auth-subtitle">Enter the OTP sent to {email}, then set a new password.</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="otp">OTP Code</label>
            <input
              id="otp"
              name="otp"
              type="text"
              value={form.otp}
              onChange={handleInputChange}
              placeholder="6-digit OTP"
              maxLength="6"
              inputMode="numeric"
              autoComplete="one-time-code"
            />
            {errors.otp ? <p className="input-error">{errors.otp}</p> : null}
          </div>

          <div className="form-field">
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              value={form.newPassword}
              onChange={handleInputChange}
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
            {errors.newPassword ? <p className="input-error">{errors.newPassword}</p> : null}
          </div>

          <div className="form-field">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleInputChange}
              placeholder="Re-enter password"
              autoComplete="new-password"
            />
            {errors.confirmPassword ? <p className="input-error">{errors.confirmPassword}</p> : null}
          </div>

          {serverError ? <div className="form-error">{serverError}</div> : null}
          {successMessage ? <div className="form-success">{successMessage}</div> : null}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </section>
  )
}

export default ResetPasswordPage
