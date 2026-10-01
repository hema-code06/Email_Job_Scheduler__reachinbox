import { Link, NavLink } from 'react-router-dom'
import { useEmails } from '../hooks/useEmails'

const tabs = [
  { kind: 'scheduled', label: 'Scheduled' },
  { kind: 'sent', label: 'Sent' }
] as const

export default function Sidebar () {
  const scheduled = useEmails('scheduled')
  const sent = useEmails('sent')
  const counts = { scheduled: scheduled.data?.length, sent: sent.data?.length }

  return (
    <aside className='w-64 shrink-0 border-r border-gray-200 p-4'>
      <h1 className='mb-6 text-3xl font-black'>ONB</h1>
      <Link
        to='/compose'
        className='mb-6 block rounded-full border border-green-600 py-2 text-center font-medium text-green-600 hover:bg-green-50'
      >
        Compose
      </Link>
      <p className='mb-2 text-xs text-gray-400'>CORE</p>
      {tabs.map(t => (
        <NavLink
          key={t.kind}
          to={`/dashboard/${t.kind}`}
          className={({ isActive }) =>
            `mb-1 flex justify-between rounded-lg px-3 py-3 text-sm ${
              isActive
                ? 'bg-green-50 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`
          }
        >
          <span>{t.label}</span>
          <span className='text-gray-500'>{counts[t.kind] ?? '-'}</span>
        </NavLink>
      ))}
    </aside>
  )
}
