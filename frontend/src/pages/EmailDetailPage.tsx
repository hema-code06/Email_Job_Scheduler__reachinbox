import { useNavigate, useParams } from 'react-router-dom'
import { useEmail } from '../hooks/useEmail'
import { formatDateTime } from '../lib/format'
import StatusBadge from '../components/StatusBadge'

export default function EmailDetailPage () {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useEmail(id!)

  if (isLoading) return <p className='p-8 text-gray-500'>Loading...</p>
  if (isError || !data)
    return <p className='p-8 text-red-600'>Email not found</p>

  const time = data.sentAt ?? data.scheduledAt

  return (
    <div className='max-w-3xl p-6'>
      <div className='mb-6 flex items-center gap-3'>
        <button onClick={() => navigate(-1)} className='text-xl'>
          ←
        </button>
        <h1 className='text-xl font-medium'>{data.subject}</h1>
        <StatusBadge status={data.status} />
      </div>
      <div className='mb-6 text-sm'>
        <p className='font-medium'>From: {data.sender.email}</p>
        <p className='text-gray-500'>To: {data.toEmail}</p>
        <p className='text-gray-500'>{formatDateTime(time)}</p>
      </div>
      <p className='whitespace-pre-wrap text-sm'>
        {data.body.replace(/<br>/g, '\n')}
      </p>
      {data.error && (
        <p className='mt-6 text-sm text-red-600'>Error: {data.error}</p>
      )}
    </div>
  )
}
