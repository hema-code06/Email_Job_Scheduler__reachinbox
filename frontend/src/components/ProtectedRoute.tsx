import { Navigate, Outlet } from 'react-router-dom'
import { useUser } from '../hooks/useUser'

export default function ProtectedRoute () {
  const { data, isLoading } = useUser()
  if (isLoading) return <div className='p-8'>Loading...</div>
  return data ? <Outlet /> : <Navigate to='/login' replace />
}
