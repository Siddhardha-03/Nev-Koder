import { Link, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import * as authService from '../services/authService'
import './AuthPages.css'

function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const canSubmit = useMemo(() => !loading, [loading])

  function handleInputChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
    setServerError('')
  }

  function validateForm() {
    const nextErrors = {}

    if (form.name.trim().length < 2) {
      nextErrors.name = 'Name must be at least 2 characters.'
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (form.password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.'
    }

    if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = 'Passwords do not match.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSuccessMessage('')
    setServerError('')

    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)
      const response = await authService.registerUser(
        form.name.trim(),
        form.email.trim().toLowerCase(),
        form.password,
        form.confirmPassword
      )

      if (response.success) {
        const nextMessage = response.deliveryMode === 'log'
          ? 'OTP generated in local log mode. Check backend logs for the OTP, then continue verification...'
          : (response.message || 'OTP sent to your email. Redirecting to verification...')
        setSuccessMessage(nextMessage)
        setTimeout(() => navigate('/verify-otp'), 1200)
      } else {
        setServerError(response.message || 'Registration failed. Please try again.')
      }
    } catch (error) {
      setServerError('Registration failed. Please try again.')
      console.error('Registration error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setSuccessMessage('')
    setServerError('')

    try {
      setLoading(true)
      const response = await authService.continueWithGoogle()

      if (response.success) {
        setSuccessMessage('Registration successful! Redirecting...')
        setTimeout(() => navigate('/dashboard'), 1200)
      } else if (response.requiresOtp) {
        const nextMessage = response.deliveryMode === 'log'
          ? 'OTP generated in local log mode. Check backend logs for the OTP, then continue verification...'
          : (response.message || 'OTP sent to your email. Redirecting to verification...')
        setSuccessMessage(nextMessage)
        setTimeout(() => navigate('/verify-otp'), 1200)
      } else {
        setServerError(response.message || 'Google sign-up failed. Please try again.')
      }
    } catch (error) {
      setServerError('Google sign-up failed. Please try again.')
      console.error('Google sign-up error:', error)
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
          <img src="/Logo_nev.svg" alt="Nev Koder logo" />
          <span>Koder</span>
        </div>

        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Start your learning journey in minutes.</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleInputChange}
              placeholder="Enter your name"
              autoComplete="name"
            />
            {errors.name ? <p className="input-error">{errors.name}</p> : null}
          </div>

          <div className="form-field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleInputChange}
              placeholder="you@example.com"
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
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
            {errors.password ? <p className="input-error">{errors.password}</p> : null}
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

          <button className="auth-submit" type="submit" disabled={!canSubmit}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <div className="auth-divider">or</div>

          <button
            className="auth-submit auth-submit-google"
            type="button"
            disabled={!canSubmit}
            onClick={handleGoogleSignIn}
          >
            {loading ? 'Please wait...' : 'Continue With Google'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </section>
  )
}

export default RegisterPage
