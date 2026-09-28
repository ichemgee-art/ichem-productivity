import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoadingScreen from './components/LoadingScreen'
import LoginPage from './pages/LoginPage'
import AppLayout from './layouts/AppLayout'
import DashboardPage from './pages/DashboardPage'
import ProductivityPage from './pages/ProductivityPage'
import NewSubmissionPage from './pages/NewSubmissionPage'
import PeoplePage from './pages/PeoplePage'
import AttendancePage from './pages/AttendancePage'
import ProjectsPage from './pages/ProjectsPage'
import SectionsPage from './pages/SectionsPage'
import ComparisonPage from './pages/ComparisonPage'

function RequireAuth({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  return children
}

function RequireCreate({ children }) {
  const { permissions } = useAuth()
  return permissions.canCreateSubmission ? children : <Navigate to="/" replace />
}

export default function App() {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="productivity" element={<ProductivityPage />} />
        <Route path="productivity/new" element={<RequireCreate><NewSubmissionPage /></RequireCreate>} />
        <Route path="people/:role" element={<PeoplePage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="sections" element={<SectionsPage />} />
        <Route path="comparison" element={<ComparisonPage />} />
      </Route>
      <Route path="*" element={<Navigate to={session ? '/' : '/login'} replace />} />
    </Routes>
  )
}
