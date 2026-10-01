import { API_URL } from '../lib/api'

export default function LoginPage () {
  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-50'>
      <div className='w-full max-w-md rounded-2xl border border-gray-200 bg-white p-10'>
        <h1 className='mb-8 text-center text-4xl font-bold'>Login</h1>
        <a
          href={`${API_URL}/api/auth/google`}
          className='flex items-center justify-center rounded-lg bg-green-50 py-4 text-lg font-medium hover:bg-green-100'
        >
          Login with Google
        </a>
      </div>
    </div>
  )
}
