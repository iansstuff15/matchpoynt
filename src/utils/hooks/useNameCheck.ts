import type { NameCheckResponse } from '@matchpoynt/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/utils/api/client'
import { queryKeys } from '@/utils/api/queryClient'
import { useDebounced } from '@/utils/hooks/useDebounced'

/** How long typing pauses before a handle or username is checked. */
const checkDelayMs = 350

/**
 * Whether a club handle or a username is free, checked by the API as it's
 * typed (after a short pause). `club` is the club the handle is for, when
 * editing one, so its own handle counts as free. `ready` is true once the
 * answer is for what's in the field now.
 */
export function useNameCheck(kind: 'handle' | 'username', value: string, club?: string) {
  const typed = value.trim().replace(/^@+/, '')
  const settled = useDebounced(typed, checkDelayMs)
  const path = kind === 'handle' ? '/clubs/handle-check' : '/auth/username-check'
  const params = new URLSearchParams({ value: settled, ...(club && { club }) })
  const check = useQuery({
    queryKey: queryKeys.nameCheck(kind, settled, club ?? ''),
    queryFn: ({ signal }) => api<NameCheckResponse>('GET', `${path}?${params}`, { signal }),
    enabled: settled.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 5_000,
  })
  const ready = typed.length > 0 && settled === typed && !check.isFetching && check.data?.value === typed.toLowerCase()
  return { check, ready, available: ready && check.data?.available === true }
}
