import { gifSearch, type GifSearchResponse } from '@matchpoynt/shared'
import { useInfiniteQuery } from '@tanstack/react-query'
import { api } from '@/utils/api/client'
import { useDebounced } from '@/utils/hooks/useDebounced'
import { clubBadgeUi } from '@/config/badges'

/**
 * GIF search for badge icons, through the API (which holds the GIPHY key).
 * Waits for typing to pause, then loads results a page at a time.
 */
export function useGifSearch(query: string, enabled: boolean) {
  const q = useDebounced(query.trim().slice(0, gifSearch.maxQueryLength), clubBadgeUi.gifSearchDebounceMs)
  return useInfiniteQuery({
    queryKey: ['gifs', q],
    queryFn: ({ signal, pageParam }) =>
      api<GifSearchResponse>('GET', `/gifs/search?${new URLSearchParams({ q, offset: String(pageParam) })}`, { signal }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    enabled: enabled && q.length > 0,
    staleTime: 5 * 60_000,
  })
}
