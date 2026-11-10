import type { LeaderboardView, PublicLeaderboardView, PublicTournamentView } from '@matchpoynt/shared'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/utils/api/client'
import { queryKeys } from '@/utils/api/queryClient'
import { tournamentPollMs } from '@/config/tournament'

/** Leaderboard for the Queue Master's session. Refreshed after every board change. */
export function useLeaderboard(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.leaderboard(sessionId),
    queryFn: ({ signal }) => api<LeaderboardView>('GET', `/sessions/${sessionId}/leaderboard`, { signal }),
  })
}

/** Public leaderboard behind a published link. Polls so players see results as they come in. */
export function usePublicLeaderboard(slug: string, pollMs = 15_000) {
  return useQuery({
    queryKey: queryKeys.publicLeaderboard(slug),
    queryFn: ({ signal }) => api<PublicLeaderboardView>('GET', `/public/sessions/${slug}/leaderboard`, { signal }),
    refetchInterval: pollMs,
  })
}

/** A published tournament, for its public page. Refreshes on its own. */
export function usePublicTournament(slug: string, pollMs = tournamentPollMs) {
  return useQuery({
    queryKey: queryKeys.publicTournament(slug),
    queryFn: ({ signal }) => api<PublicTournamentView>('GET', `/public/tournaments/${encodeURIComponent(slug)}`, { signal }),
    refetchInterval: pollMs,
  })
}
