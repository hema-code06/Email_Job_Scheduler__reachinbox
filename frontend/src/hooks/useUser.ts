import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { User } from '../types'

export function useUser () {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get<User>('/auth/me')).data,
    retry: false
  })
}
