import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import * as authService from '../services/authService'
import defaultLogo from '../assets/logo_nev_new.svg'
import './AuthPages.css'

function OTPVerificationPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const canVerify = useMemo(() => !loading && otp.length === 6, [loading, otp.length])

  useEffect(() => {
    const pendingEmail = sessionStorage.getItem('pendingRegistrationEmail') || ''
    setEmail(pendingEmail)
  }, [])

  useEffect(() => {
    if (resendCooldown <= 0) {
      return
    }

    const timer = setTimeout(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearTimeout(timer)
  }, [resendCooldown])

  function handleOtpChange(event) {
    const value = event.target.value.replace(/\D/g, '').slice(0, 6)
    setOtp(value)
    setErrors({})
    setServerError('')
  }

  function validateForm() {
    const nextErrors = {}

    if (!/^\d{6}$/.test(otp)) {
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

    try {
      setLoading(true)
      const response = await authService.verifyRegistrationOTP(otp)

      if (response.success) {
        setSuccessMessage('Email verified successfully! Redirecting...')
        setTimeout(() => navigate('/dashboard', { replace: true }), 1200)
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
    setServerError('')
    setSuccessMessage('')

    try {
      setResendLoading(true)
      const response = await authService.resendRegistrationOTP()

      if (response.success) {
        setSuccessMessage(response.message || 'OTP sent to your email.')
        setResendCooldown(60)
      } else {
        setServerError(response.message || 'Failed to resend OTP.')

        const waitMatch = String(response.message || '').match(/wait\s+(\d+)\s+seconds/i)
        if (waitMatch) {
          setResendCooldown(Number(waitMatch[1]))
        }
      }
    } catch (error) {
      setServerError('Failed to resend OTP.')
      console.error('Resend OTP error:', error)
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <section className="auth-shell">
      <div className="auth-card">
        <div className="auth-top-link">
          <Link to="/login">← Back to login</Link>
        </div>

        <div className="auth-brand">
          <img src={defaultLogo} alt="Nev Koder logo" />
        </div>

        <h1 className="auth-title">Verify Your Email</h1>
        <p className="auth-subtitle">Enter the OTP sent to {email || 'your email address'}.</p>

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

          <button className="auth-submit" type="submit" disabled={!canVerify}>
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
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : (resendLoading ? 'Sending...' : 'Resend OTP')}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

export default OTPVerificationPage
