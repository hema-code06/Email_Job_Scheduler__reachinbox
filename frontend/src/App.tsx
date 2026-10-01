import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './components/DashboardLayout'
import EmailTable from './components/EmailTable'
import LoginPage from './pages/LoginPage'
import ComposePage from './pages/ComposePage'
import EmailDetailPage from './pages/EmailDetailPage'

export default function App () {
  return (
    <Routes>
      <Route path='/login' element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path='/compose' element={<ComposePage />} />
        <Route path='/dashboard' element={<DashboardLayout />}>
          <Route index element={<Navigate to='scheduled' replace />} />
          <Route path='scheduled' element={<EmailTable kind='scheduled' />} />
          <Route path='sent' element={<EmailTable kind='sent' />} />
          <Route path='emails/:id' element={<EmailDetailPage />} />
        </Route>
      </Route>
      <Route path='*' element={<Navigate to='/dashboard' replace />} />
    </Routes>
  )
}
