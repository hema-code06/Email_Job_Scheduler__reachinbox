import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'

export default function DashboardLayout () {
  return (
    <div className='flex min-h-screen'>
      <Sidebar />
      <div className='flex-1'>
        <Header />
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
