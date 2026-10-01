import type { ReactNode } from 'react'

export default function Field ({
  label,
  children
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className='flex items-center gap-4 border-b border-gray-100 py-3'>
      <span className='w-52 shrink-0 text-sm text-gray-600'>{label}</span>
      {children}
    </div>
  )
}
