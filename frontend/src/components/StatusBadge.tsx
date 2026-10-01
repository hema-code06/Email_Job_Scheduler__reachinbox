import type { EmailStatus } from '../types'

const styles: Record<EmailStatus, string> = {
  SCHEDULED: 'bg-orange-50 text-orange-600',
  PROCESSING: 'bg-blue-50 text-blue-600',
  SENT: 'bg-green-50 text-green-700',
  FAILED: 'bg-red-50 text-red-600'
}

export default function StatusBadge ({ status }: { status: EmailStatus }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status.toLowerCase()}
    </span>
  )
}
