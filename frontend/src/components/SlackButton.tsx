import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api, API_URL } from '../lib/api'

export default function SlackButton () {
  const { search } = useLocation()
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['slack'],
    queryFn: async () =>
      (await api.get<{ connected: boolean }>('/slack/status')).data
  })

  const disconnect = useMutation({
    mutationFn: () => api.delete('/slack'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slack'] })
      toast.success('Slack disconnected')
    },
    onError: () => toast.error('Failed to disconnect Slack')
  })

  useEffect(() => {
    const result = new URLSearchParams(search).get('slack')
    if (result === 'connected')
      toast.success('Slack connected', { id: 'slack' })
    if (result === 'error')
      toast.error('Slack connection failed', { id: 'slack' })
  }, [search])

  if (data?.connected) {
    return (
      <button
        onClick={() => disconnect.mutate()}
        className='rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50'
      >
        Disconnect Slack
      </button>
    )
  }

  return (
    <a
      href={`${API_URL}/api/slack/connect`}
      className='rounded-lg border border-green-600 px-4 py-2 text-sm text-green-600 hover:bg-green-50'
    >
      Connect Slack
    </a>
  )
}
