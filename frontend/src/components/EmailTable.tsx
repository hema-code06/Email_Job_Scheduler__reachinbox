import { useState } from 'react'
import { useEmails, type EmailKind } from '../hooks/useEmails'
import { useDebounce } from '../hooks/useDebounce'
import { formatDateTime } from '../lib/format'
import StatusBadge from './StatusBadge'
import { useNavigate } from 'react-router-dom'

const text = {
  scheduled: { timeLabel: 'Scheduled time', empty: 'No scheduled emails' },
  sent: { timeLabel: 'Sent time', empty: 'No sent emails' }
}

export default function EmailTable ({ kind }: { kind: EmailKind }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const q = useDebounce(search.trim())
  const { data, isLoading, isError } = useEmails(kind, q)

  const renderBody = () => {
    if (isLoading) return <p className='p-8 text-gray-500'>Loading...</p>
    if (isError)
      return <p className='p-8 text-red-600'>Failed to load emails</p>
    if (!data?.length) {
      return (
        <p className='p-8 text-gray-500'>
          {q ? 'No matching emails' : text[kind].empty}
        </p>
      )
    }
    return (
      <table className='w-full text-left text-sm'>
        <thead className='border-b border-gray-200 text-gray-500'>
          <tr>
            <th className='px-6 py-3 font-medium'>Email</th>
            <th className='px-6 py-3 font-medium'>Subject</th>
            <th className='px-6 py-3 font-medium'>{text[kind].timeLabel}</th>
            <th className='px-6 py-3 font-medium'>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map(e => (
            <tr
              key={e.id}
              onClick={() => navigate(`/dashboard/emails/${e.id}`)}
              className='cursor-pointer border-b border-gray-100 hover:bg-gray-50'
            >
              <td className='px-6 py-4'>{e.toEmail}</td>
              <td className='px-6 py-4'>{e.subject}</td>
              <td className='px-6 py-4'>
                {formatDateTime(kind === 'sent' ? e.sentAt! : e.scheduledAt)}
              </td>
              <td className='px-6 py-4'>
                <StatusBadge status={e.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <div>
      <div className='px-6 py-4'>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder='Search'
          className='w-full rounded-full bg-gray-100 px-5 py-3 text-sm outline-none'
        />
      </div>
      {renderBody()}
    </div>
  )
}
