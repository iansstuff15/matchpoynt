import type { MemberSuggestionsResponse, SportId } from '@matchpoynt/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/utils/api/client'
import { queryKeys } from '@/utils/api/queryClient'

interface SuggestionQuery {
  q: string
  sportId: SportId
  /** The running session (the API leaves out its players and puts its club first). */
  sessionId?: string
  /** Names already in a setup draft, left out too. */
  exclude?: string[]
}

/** Club members matching what's typed in a player-name field, ranked by the API. */
export function useMemberSuggestions({ q, sportId, sessionId, exclude = [] }: SuggestionQuery, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.memberSuggestions(q, sportId, sessionId ?? '', exclude),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ q, sportId })
      if (sessionId) params.set('sessionId', sessionId)
      for (const name of exclude) params.append('exclude', name)
      return (await api<MemberSuggestionsResponse>('GET', `/members/suggestions?${params}`, { signal })).suggestions
    },
    enabled: enabled && q.trim().length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}
