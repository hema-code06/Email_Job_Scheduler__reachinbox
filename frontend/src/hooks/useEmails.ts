import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Email } from '../types'

export type EmailKind = 'scheduled' | 'sent'

export function useEmails (kind: EmailKind, q = '') {
  return useQuery({
    queryKey: ['emails', kind, q],
    queryFn: async () => {
      if (!q) return (await api.get<Email[]>(`/emails/${kind}`)).data
      const { data } = await api.get<Email[]>('/emails/search', {
        params: { q }
      })
      return data.filter(
        e =>
          (kind === 'sent') === (e.status === 'SENT' || e.status === 'FAILED')
      )
    },
    refetchInterval: 10000
  })
}
