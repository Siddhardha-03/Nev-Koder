import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import CompilerPage from './pages/CompilerPage'
import HomePage from './pages/HomePage'
import ProblemsPage from './pages/ProblemsPage'
import ProblemPage from './pages/ProblemPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OTPVerificationPage from './pages/OTPVerificationPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminQuestionsPage from './pages/admin/AdminQuestionsPage'
import AdminLearningPathsPage from './pages/admin/AdminLearningPathsPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminAssessmentsPage from './pages/admin/AdminAssessmentsPage'
import LearningPathPage from './pages/LearningPathPage'
import PracticeSheetsPage from './pages/PracticeSheetsPage'
import InterviewPrepPage from './pages/InterviewPrepPage'
import QuizzesPage from './pages/QuizzesPage'
import QuizAttemptPage from './pages/QuizAttemptPage'
import QuizResultPage from './pages/QuizResultPage'
import { getStoredUser, isAuthenticated } from './services/authService'
import GlobalLoader from './components/GlobalLoader'
import AdminQuizzesPage from './pages/admin/AdminQuizzesPage'

const LOADER_MIN_DURATION_MS = 500
const LOADER_FADE_DURATION_MS = 280
const LOADER_MAX_WAIT_MS = 6500
// Delay before showing the global loader. Shorter on slow networks so
// users see progress quickly; longer on fast networks to avoid flicker.
const SHOW_DELAY_DEFAULT_MS = 250
const SHOW_DELAY_FAST_MS = 450
const SHOW_DELAY_SLOW_MS = 120

const wait = (duration) => new Promise((resolve) => {
  window.setTimeout(resolve, duration)
})

const waitForImages = () => {
  const images = Array.from(document.querySelectorAll('img:not([data-loader-ignore="true"])'))
  const pending = images.filter((image) => !image.complete)

  if (pending.length === 0) {
    return Promise.resolve()
  }

  return Promise.all(pending.map((image) => new Promise((resolve) => {
    image.addEventListener('load', resolve, { once: true })
    image.addEventListener('error', resolve, { once: true })
  }))).then(() => undefined)
}

const waitForWindowLoad = () => {
  if (document.readyState === 'complete') {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    window.addEventListener('load', resolve, { once: true })
  })
}

const waitForFonts = () => {
  if (!document.fonts?.ready) {
    return Promise.resolve()
  }

  return document.fonts.ready
}

function ProtectedRoute({ children }) {
  const location = useLocation()

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

function AdminRoute({ children }) {
  const location = useLocation()
  const user = getStoredUser()

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}

function AppRouterShell() {
  const location = useLocation()
  const loadCycleRef = useRef(0)
  const [showLoader, setShowLoader] = useState(false)
  const [isFading, setIsFading] = useState(false)

  useLayoutEffect(() => {
    loadCycleRef.current += 1
    // don't show the loader immediately; defer to the effect which
    // will decide whether to reveal it after a short delay
    setShowLoader(false)
    setIsFading(false)
  }, [location.key])

  useEffect(() => {
    const cycleId = loadCycleRef.current
    const startedAt = performance.now()
    let showTimer
    let revealTimer
    let fadeTimer
    const loaderShownAt = { current: 0 }

    const getShowDelay = () => {
      try {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
        const effective = conn?.effectiveType
        if (effective === 'slow-2g' || effective === '2g' || effective === '3g') return SHOW_DELAY_SLOW_MS
        if (effective === '4g') return SHOW_DELAY_FAST_MS
      } catch (e) {
        // ignore and fallthrough to default
      }
      return SHOW_DELAY_DEFAULT_MS
    }

    // schedule showing the loader after an adaptive delay
    showTimer = window.setTimeout(() => {
      if (cycleId !== loadCycleRef.current) return
      setShowLoader(true)
      loaderShownAt.current = performance.now()
    }, getShowDelay())

    const reveal = () => {
      if (cycleId !== loadCycleRef.current) return

      // If loader was never shown (operation finished before delay), cancel showing and return
      if (loaderShownAt.current === 0) {
        if (showTimer) window.clearTimeout(showTimer)
        return
      }

      const elapsed = performance.now() - loaderShownAt.current
      const remaining = Math.max(0, LOADER_MIN_DURATION_MS - elapsed)

      revealTimer = window.setTimeout(() => {
        if (cycleId !== loadCycleRef.current) return

        setIsFading(true)

        fadeTimer = window.setTimeout(() => {
          if (cycleId !== loadCycleRef.current) return
          setShowLoader(false)
          setIsFading(false)
        }, LOADER_FADE_DURATION_MS)
      }, remaining)
    }

    Promise.race([
      Promise.all([waitForWindowLoad(), waitForFonts(), waitForImages()]),
      wait(LOADER_MAX_WAIT_MS)
    ]).then(reveal)

    return () => {
      if (showTimer) window.clearTimeout(showTimer)
      if (revealTimer) window.clearTimeout(revealTimer)
      if (fadeTimer) window.clearTimeout(fadeTimer)
    }
  }, [location.key])

  return (
    <>
      <div className={`app-route-shell${showLoader ? ' app-route-shell-hidden' : ''}`}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/problems" element={<ProblemsPage />} />
          <Route path="/problems/:id" element={<ProblemPage />} />
          <Route path="/compiler" element={<CompilerPage />} />
          <Route path="/learning-paths" element={<LearningPathPage />} />
          <Route path="/learning-paths/:id" element={<LearningPathPage />} />
          <Route path="/practice-sheets" element={<PracticeSheetsPage />} />
          <Route path="/interview-prep" element={<InterviewPrepPage />} />
          <Route path="/quizzes" element={<QuizzesPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-otp" element={<OTPVerificationPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/dashboard"
            element={(
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/quizzes/attempts/:attemptId"
            element={(
              <ProtectedRoute>
                <QuizAttemptPage />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/quizzes/attempts/:attemptId/result"
            element={(
              <ProtectedRoute>
                <QuizResultPage />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/dashboard"
            element={(
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            )}
          />
          <Route
            path="/admin/questions"
            element={(
              <AdminRoute>
                <AdminQuestionsPage />
              </AdminRoute>
            )}
          />
          <Route
            path="/admin/learning-paths"
            element={(
              <AdminRoute>
                <AdminLearningPathsPage />
              </AdminRoute>
            )}
          />
          <Route
            path="/admin/quizzes"
            element={(
              <AdminRoute>
                <AdminQuizzesPage />
              </AdminRoute>
            )}
          />
          <Route
            path="/admin/users"
            element={(
              <AdminRoute>
                <AdminUsersPage />
              </AdminRoute>
            )}
          />
          <Route
            path="/admin/assessments"
            element={(
              <AdminRoute>
                <AdminAssessmentsPage />
              </AdminRoute>
            )}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {showLoader ? <GlobalLoader fading={isFading} /> : null}
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRouterShell />
    </BrowserRouter>
  )
}

export default App
