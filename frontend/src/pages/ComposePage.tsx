import { useRef, useState, type ChangeEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../lib/api'
import { useSenders } from '../hooks/useSenders'
import { parseEmails } from '../lib/parseEmails'
import Field from '../components/Field'
import SendLaterPopover from '../components/SendLaterPopover'
import type { Sender } from '../types'

const inputClass = 'flex-1 bg-transparent text-sm outline-none'

export default function ComposePage () {
  const { data: senders } = useSenders()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const idempotencyKey = useRef(crypto.randomUUID())

  const [senderId, setSenderId] = useState('')
  const [recipients, setRecipients] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [delaySeconds, setDelaySeconds] = useState('5')
  const [hourlyLimit, setHourlyLimit] = useState('100')
  const [startTime, setStartTime] = useState<string | null>(null)

  const activeSender = senderId || senders?.[0]?.id

  const schedule = useMutation({
    mutationFn: () =>
      api.post<{ count: number }>(
        '/emails/schedule',
        {
          senderId: activeSender,
          subject,
          body: body.replace(/\n/g, '<br>'),
          recipients,
          startTime: startTime ?? new Date().toISOString(),
          delaySeconds: Number(delaySeconds),
          hourlyLimit: Number(hourlyLimit)
        },
        { headers: { 'Idempotency-Key': idempotencyKey.current } }
      ),
    onSuccess: ({ data }) => {
      toast.success(`${data.count} emails scheduled`)
      queryClient.invalidateQueries({ queryKey: ['emails'] })
      navigate('/dashboard/scheduled')
    },
    onError: () => toast.error('Failed to schedule emails')
  })

  const addSender = useMutation({
    mutationFn: () => api.post<Sender>('/senders/ethereal'),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ['senders'] })
      setSenderId(data.id)
      toast.success(`Sender ${data.email} created`)
    },
    onError: () => toast.error('Failed to create sender')
  })

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const found = parseEmails(await file.text())
    setRecipients(found)
    if (found.length) toast.success(`${found.length} email addresses detected`)
    else toast.error('No email addresses found in this file')
    e.target.value = ''
  }

  const submit = () => {
    if (!activeSender) return toast.error('Add a sender first')
    if (!recipients.length)
      return toast.error('Upload a list with email addresses')
    if (!subject.trim() || !body.trim())
      return toast.error('Subject and body are required')
    if (Number(hourlyLimit) < 1)
      return toast.error('Hourly limit must be at least 1')
    schedule.mutate()
  }

  return (
    <div className='mx-auto max-w-4xl p-6'>
      <div className='mb-6 flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Link to='/dashboard/scheduled' className='text-xl'>
            ←
          </Link>
          <h1 className='text-xl font-medium'>Compose New Email</h1>
        </div>
        <div className='flex items-center gap-3'>
          <SendLaterPopover value={startTime} onChange={setStartTime} />
          <button
            onClick={submit}
            disabled={schedule.isPending}
            className='rounded-full bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50'
          >
            {schedule.isPending ? 'Scheduling...' : 'Schedule'}
          </button>
        </div>
      </div>

      <Field label='From'>
        <select
          value={activeSender ?? ''}
          onChange={e => setSenderId(e.target.value)}
          className={inputClass}
        >
          {!senders?.length && <option value=''>No senders added</option>}
          {senders?.map(s => (
            <option key={s.id} value={s.id}>
              {s.email}
            </option>
          ))}
        </select>
        <button
          onClick={() => addSender.mutate()}
          disabled={addSender.isPending}
          className='text-sm text-green-600'
        >
          + New sender
        </button>
      </Field>

      <Field label='To'>
        <div className='flex flex-1 flex-wrap items-center gap-2'>
          {recipients.slice(0, 3).map(r => (
            <span
              key={r}
              className='rounded-full border border-green-600 bg-green-50 px-3 py-0.5 text-xs'
            >
              {r}
            </span>
          ))}
          {recipients.length > 3 && (
            <span className='rounded-full border border-green-600 bg-green-50 px-3 py-0.5 text-xs'>
              +{recipients.length - 3}
            </span>
          )}
          {recipients.length > 0 && (
            <span className='text-xs text-gray-500'>
              {recipients.length} email addresses detected
            </span>
          )}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className='text-sm text-green-600'
        >
          Upload List
        </button>
        <input
          ref={fileRef}
          type='file'
          accept='.csv,.txt'
          onChange={onFile}
          className='hidden'
        />
      </Field>

      <Field label='Subject'>
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder='Subject'
          className={inputClass}
        />
      </Field>

      <Field label='Delay between 2 emails (sec)'>
        <input
          type='number'
          min={0}
          value={delaySeconds}
          onChange={e => setDelaySeconds(e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label='Hourly Limit'>
        <input
          type='number'
          min={1}
          value={hourlyLimit}
          onChange={e => setHourlyLimit(e.target.value)}
          className={inputClass}
        />
      </Field>

      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder='Type Your Reply...'
        className='mt-4 h-72 w-full resize-none rounded-lg bg-gray-50 p-4 text-sm outline-none'
      />
    </div>
  )
}
