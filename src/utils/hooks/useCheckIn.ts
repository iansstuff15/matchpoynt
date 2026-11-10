import type { CheckInInput, CheckInResponse, CheckInRosterView } from '@matchpoynt/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/utils/api/client'
import { queryKeys } from '@/utils/api/queryClient'

/** The names a player can check in as, behind a check-in QR. */
export function useCheckInRoster(slug: string) {
  return useQuery({
    queryKey: queryKeys.checkInRoster(slug),
    queryFn: ({ signal }) => api<CheckInRosterView>('GET', `/public/check-in/${slug}`, { signal }),
  })
}

/** Checks the chosen player in. The roster refreshes so their name shows as checked in. */
export function useCheckIn(slug: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: CheckInInput) => api<CheckInResponse>('POST', `/public/check-in/${slug}`, { body: input }),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.checkInRoster(slug) }),
  })
}
