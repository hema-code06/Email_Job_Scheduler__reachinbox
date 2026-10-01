import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Sender } from '../types'

export function useSenders () {
  return useQuery({
    queryKey: ['senders'],
    queryFn: async () => (await api.get<Sender[]>('/senders')).data
  })
}
