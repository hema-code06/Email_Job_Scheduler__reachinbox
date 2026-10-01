import { useState } from 'react'
import { formatDateTime } from '../lib/format'

const presets = [
  { label: 'Tomorrow, 10:00 AM', hour: 10 },
  { label: 'Tomorrow, 11:00 AM', hour: 11 },
  { label: 'Tomorrow, 3:00 PM', hour: 15 }
]

const toLocalInput = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)

const tomorrowAt = (hour: number) => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(hour, 0, 0, 0)
  return toLocalInput(d)
}

interface Props {
  value: string | null
  onChange: (iso: string | null) => void
}

export default function SendLaterPopover ({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')

  const openPopover = () => {
    setDraft(value ? toLocalInput(new Date(value)) : '')
    setOpen(true)
  }

  const done = () => {
    onChange(draft ? new Date(draft).toISOString() : null)
    setOpen(false)
  }

  return (
    <div className='relative'>
      <button
        onClick={openPopover}
        className='rounded-full border border-green-600 px-4 py-2 text-sm text-green-600 hover:bg-green-50'
      >
        {value ? formatDateTime(value) : 'Send Later'}
      </button>
      {open && (
        <div className='absolute right-0 z-10 mt-2 w-64 rounded-lg border border-gray-200 bg-white p-4 shadow-lg'>
          <p className='mb-2 text-sm font-medium'>Send Later</p>
          <input
            type='datetime-local'
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className='mb-3 w-full rounded border border-gray-200 p-2 text-sm'
          />
          {presets.map(p => (
            <button
              key={p.hour}
              onClick={() => setDraft(tomorrowAt(p.hour))}
              className='block w-full py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50'
            >
              {p.label}
            </button>
          ))}
          <div className='mt-4 flex justify-end gap-4 text-xs'>
            <button onClick={() => setOpen(false)}>Cancel</button>
            <button
              onClick={done}
              className='rounded-full border border-green-600 px-4 py-1 text-green-600'
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
