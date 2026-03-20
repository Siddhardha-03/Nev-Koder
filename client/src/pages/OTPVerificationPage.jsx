import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import * as authService from '../services/authService'
import './AuthPages.css'

function OTPVerificationPage() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState(null)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    // Get userId from session storage (set during registration)
    const storedUserId = sessionStorage.getItem('registrationUserId')
    const storedEmail = sessionStorage.getItem('registrationEmail')
    const unverifiedUserId = sessionStorage.getItem('unverifiedUserId')

    if (storedUserId) {
      setUserId(parseInt(storedUserId))
      setEmail(storedEmail || '')
    } else if (unverifiedUserId) {
      setUserId(parseInt(unverifiedUserId))
    } else {
      // Redirect to register if no userId
      navigate('/register')
    }
  }, [navigate])

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  function handleOtpChange(event) {
    const value = event.target.value.replace(/\D/g, '').slice(0, 6)
    setOtp(value)
    setErrors({})
    setServerError('')
  }

  function validateForm() {
    const nextErrors = {}

    if (otp.length !== 6) {
      nextErrors.otp = 'OTP must be 6 digits.'
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

    if (!userId) {
      setServerError('User ID not found. Please register again.')
      return
    }

    try {
      setLoading(true)
      const response = await authService.verifyOTP(userId, otp)

      if (response.success) {
        setSuccessMessage('Email verified successfully! Redirecting to dashboard...')
        sessionStorage.removeItem('registrationUserId')
        sessionStorage.removeItem('registrationEmail')
        sessionStorage.removeItem('unverifiedUserId')
        setTimeout(() => navigate('/dashboard'), 1500)
      } else {
        setServerError(response.message || 'OTP verification failed.')
      }
    } catch (error) {
      setServerError('OTP verification failed. Please try again.')
      console.error('OTP verification error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleResendOtp() {
    if (!userId) {
      setServerError('User ID not found.')
      return
    }

    try {
      setResendLoading(true)
      const response = await authService.resendOTPCode(userId)

      if (response.success) {
        setSuccessMessage('OTP sent to your email!')
        setResendCooldown(60) // 60 second cooldown
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setServerError(response.message || 'Failed to resend OTP.')
      }
    } catch (error) {
      setServerError('Failed to resend OTP.')
      console.error('Resend OTP error:', error)
    } finally {
      setResendLoading(false)
    }
  }

  if (!userId) {
    return <div className="auth-shell"><p>Loading...</p></div>
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

        <h1 className="auth-title">Verify Your Email</h1>
        <p className="auth-subtitle">
          Enter the 6-digit code sent to {email || 'your email'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="otp">OTP Code</label>
            <input
              id="otp"
              name="otp"
              type="text"
              value={otp}
              onChange={handleOtpChange}
              maxLength="6"
              placeholder="000000"
              className="otp-input"
              inputMode="numeric"
              autoComplete="one-time-code"
            />
            {errors.otp ? <p className="input-error">{errors.otp}</p> : null}
          </div>

          {serverError ? <div className="form-error">{serverError}</div> : null}
          {successMessage ? <div className="form-success">{successMessage}</div> : null}

          <button className="auth-submit" type="submit" disabled={loading || otp.length !== 6}>
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>

          <div className="otp-footer">
            <p>Didn't receive the code?</p>
            <button
              type="button"
              className="resend-button"
              onClick={handleResendOtp}
              disabled={resendLoading || resendCooldown > 0}
            >
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : 'Resend OTP'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

export default OTPVerificationPage
