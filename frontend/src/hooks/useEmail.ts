import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { EmailDetail } from '../types'

export function useEmail (id: string) {
  return useQuery({
    queryKey: ['email', id],
    queryFn: async () => (await api.get<EmailDetail>(`/emails/${id}`)).data
  })
}
