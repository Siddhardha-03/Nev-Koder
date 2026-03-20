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
import LearningPathPage from './pages/LearningPathPage'
import PracticeSheetsPage from './pages/PracticeSheetsPage'
import InterviewPrepPage from './pages/InterviewPrepPage'
import { getStoredUser, isAuthenticated } from './services/authService'

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

function App() {
  return (
    <BrowserRouter>
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
