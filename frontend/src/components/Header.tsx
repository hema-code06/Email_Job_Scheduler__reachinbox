import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../lib/api'
import { useUser } from '../hooks/useUser'
import SlackButton from './SlackButton'

export default function Header () {
  const { data: user } = useUser()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const logout = async () => {
    try {
      await api.post('/auth/logout')
      queryClient.clear()
      navigate('/login')
    } catch {
      toast.error('Logout failed')
    }
  }

  return (
    <header className='flex items-center justify-end gap-4 border-b border-gray-200 px-6 py-3'>
      <SlackButton />
      {user?.avatarUrl ? (
        <img
          src={user.avatarUrl}
          referrerPolicy='no-referrer'
          className='h-10 w-10 rounded-full'
        />
      ) : (
        <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gray-200'>
          {user?.name[0]}
        </div>
      )}
      <div className='text-sm'>
        <p className='font-medium'>{user?.name}</p>
        <p className='text-gray-500'>{user?.email}</p>
      </div>
      <button
        onClick={logout}
        className='rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50'
      >
        Logout
      </button>
    </header>
  )
}
