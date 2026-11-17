import type { PersonProfileView } from '@matchpoynt/shared'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/utils/api/client'
import { queryKeys } from '@/utils/api/queryClient'

/** Someone's public profile by @username, with where the viewer stands with them. */
export function usePerson(username: string) {
  return useQuery({
    queryKey: queryKeys.person(username),
    queryFn: ({ signal }) => api<PersonProfileView>('GET', `/users/${encodeURIComponent(username)}`, { signal }),
    enabled: Boolean(username),
  })
}
