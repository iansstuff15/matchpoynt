import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { handleExpiredSignIn } from '@/utils/api/authExpiry'
import { ApiRequestError } from '@/utils/api/errors'

export const queryKeys = {
  config: ['config'] as const,
  me: ['me'] as const,
  activeSessions: ['sessions', 'active'] as const,
  session: (sessionId: string) => ['sessions', sessionId, 'board'] as const,
  latestEndedSession: ['sessions', 'latest-ended'] as const,
  endedSessions: ['sessions', 'ended-list'] as const,
  endedSession: (sessionId: string) => ['sessions', sessionId, 'ended'] as const,
  clubs: ['clubs'] as const,
  invite: (token: string) => ['invites', token] as const,
  memberSuggestions: (q: string, sportId: string, sessionId: string, exclude: string[]) => ['members', 'suggestions', sportId, sessionId, q, exclude] as const,
  club: (clubId: string) => ['clubs', clubId] as const,
  leaderboard: (sessionId: string) => ['sessions', sessionId, 'leaderboard'] as const,
  publicLeaderboard: (slug: string) => ['public', slug, 'leaderboard'] as const,
  publicTournament: (slug: string) => ['public', slug, 'tournament'] as const,
  checkInRoster: (slug: string) => ['public', slug, 'check-in'] as const,
}

export const queryClient: QueryClient = new QueryClient({
  // Any 401 outside /api/auth means the sign-in expired (utils/api/authExpiry).
  queryCache: new QueryCache({ onError: (error) => handleExpiredSignIn(queryClient, error, queryKeys.me) }),
  mutationCache: new MutationCache({ onError: (error) => handleExpiredSignIn(queryClient, error, queryKeys.me) }),
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      // Don't retry answers the server meant (401, 404, 409, ...).
      retry: (count, error) => !(error instanceof ApiRequestError && error.status > 0) && count < 2,
    },
  },
})
